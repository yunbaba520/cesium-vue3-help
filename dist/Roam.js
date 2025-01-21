/*global viewer*/
/*global Cesium*/
class CesiumUtilRoam {
  constructor(_marks, pitchValue, callback) {
    this.marks = _marks || [] //点集
    this.marksIndex = 1 //默认节点
    this.pitchValue = pitchValue || -20 //俯仰角
    this.changeCameraTime = 0.5 //转向时间1秒
    this.flySpeed = 20 //飞行速度
    this.loop = true
    this.Exection = {}
    this.callback = callback
  }
  dataInit = () => {
    this.marksIndex = 1 //默认节点
    this.marks = []
    this.Exection = {}
  }
  cartesian3ToWGS84(point) {
    var cartesian33 = new Cesium.Cartesian3(point.x, point.y, point.z)
    var cartographic = Cesium.Cartographic.fromCartesian(cartesian33)
    var lat = Cesium.Math.toDegrees(cartographic.latitude)
    var lon = Cesium.Math.toDegrees(cartographic.longitude)
    var alt = cartographic.height
    return { lon: lon, lat: lat, height: alt }
  }

  //开始飞行
  startFly = () => {
    this.marksIndex = 1
    if (Object.keys(this.Exection).length > 0) {
      this.exitFly()
    }
    this.flyExtent()
  }
  //停止飞行
  stopFly = () => {
    viewer.clock.shouldAnimate = false
    const { Exection } = this
    viewer.clock.onTick.removeEventListener(Exection)
  }
  //继续飞行
  continueFly = () => {
    viewer.clock.shouldAnimate = true
    const { Exection } = this
    viewer.clock.onTick.addEventListener(Exection)
  }
  //退出飞行
  exitFly = () => {
    viewer.clock.onTick.removeEventListener(this.Exection)
    this.dataInit()
  }
  flyExtent = () => {
    let marks = this.marks
    let pitchValue = this.pitchValue
    let marksIndex = this.marksIndex
    if (marks.length == 0) {
      return
    }
    let self = this

    // 相机看点的角度，如果大于0那么则是从地底往上看，所以要为负值
    const pitch = Cesium.Math.toRadians(pitchValue)
    // 时间间隔2秒钟
    let flytime = 0
    if (marksIndex == 0) {
      flytime = 3
    } else {
      flytime = getDistance(marks[marksIndex], marks[marksIndex - 1]) / this.flySpeed
    }
    // console.log(marksIndex, flytime)
    // setExtentTime(marks[marksIndex].flytime);
    setExtentTime(flytime)
    this.Exection = function TimeExecution() {
      let preIndex = marksIndex - 1
      if (marksIndex == 0) {
        preIndex = marks.length - 1
      }
      //计算偏航角
      let heading = bearing(
        marks[preIndex].lat,
        marks[preIndex].lng,
        marks[marksIndex].lat,
        marks[marksIndex].lng
      )
      // 当前已经过去的时间，单位s
      const delTime = Cesium.JulianDate.secondsDifference(
        viewer.clock.currentTime,
        viewer.clock.startTime
      )
      const originLat = marksIndex == 0 ? marks[marks.length - 1].lat : marks[marksIndex - 1].lat
      const originLng = marksIndex == 0 ? marks[marks.length - 1].lng : marks[marksIndex - 1].lng

      //临时点
      let p = {
        lng: originLng + ((marks[marksIndex].lng - originLng) / flytime) * delTime,
        lat: originLat + ((marks[marksIndex].lat - originLat) / flytime) * delTime,
        height: marks[marksIndex].height
      }

      //计算临时点对应的 相机位置
      let objp = getCenterLatlng(
        p.lng,
        p.lat,
        heading - 180,
        p.height / Math.tan((-pitchValue * Math.PI) / 180)
      )
      Object.assign(objp, { height: p.height })

      //定位到相机
      viewer.scene.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(objp.lng, objp.lat, objp.height),
        orientation: {
          heading: Cesium.Math.toRadians(heading),
          pitch: pitch
        }
      })
      if (Cesium.JulianDate.compare(viewer.clock.currentTime, viewer.clock.stopTime) >= 0) {
        viewer.clock.onTick.removeEventListener(self.Exection)
        if (self.changeCameraTime) {
          //有转向的功能 ，传入相机当前位置
          self.changeCameraHeading(objp)
        } else {
          //无转向功能
          self.marksIndex++
          self.flyExtent()
        }
      }
    }
    viewer.clock.onTick.addEventListener(this.Exection)
  }
  flyCallBack = () => {
    return new Promise((resolve, reject) => {
      if (this.callback) {
        let deviceIds = this.marks[this.marksIndex].deviceIds
        this.callback(deviceIds).then(() => {
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
  // 相机原地定点转向，objStart :相机当前位置
  // 没问题
  changeCameraHeading = (objStart) => {
    let marks = this.marks
    let pitchValue = this.pitchValue
    let changeCameraTime = this.changeCameraTime
    let marksIndex = this.marksIndex

    let self = this

    let nextIndex = this.marksIndex + 1
    if (marksIndex == marks.length - 1) {
      //最后一个点位(是否循环)
      if (this.loop) {
        this.startFly()
      }
      return
    }
    // 计算两点之间的方向
    const heading = bearing(
      marks[marksIndex].lat,
      marks[marksIndex].lng,
      marks[nextIndex].lat,
      marks[nextIndex].lng
    )
    // 相机看点的角度，如果大于0那么则是从地底往上看，所以要为负值
    const pitch = Cesium.Math.toRadians(pitchValue)

    //记录当前点
    let p = marks[marksIndex]

    //计算最终相机位置
    let objEnd = getCenterLatlng(
      p.lng,
      p.lat,
      heading - 180,
      p.height / Math.tan((-pitchValue * Math.PI) / 180)
    )

    // 给定飞行一周所需时间，比如10s, 那么每秒转动度数
    let angle = 0
    let isRight = _judgeDirection([marks[marksIndex - 1], marks[marksIndex], marks[nextIndex]])
    // console.log('isRight', isRight)
    if (!isRight) {
      // 顺时针
      // console.log('顺时针')
      if (Cesium.Math.toDegrees(viewer.camera.heading) > heading) {
        angle =
          (Cesium.Math.toDegrees(Cesium.Math.TWO_PI - viewer.camera.heading) + heading) /
          changeCameraTime
      } else {
        angle = (heading - Cesium.Math.toDegrees(viewer.camera.heading)) / changeCameraTime
      }
    } else {
      // console.log('逆时针')
      if (Cesium.Math.toDegrees(viewer.camera.heading) < heading) {
        angle =
          (Cesium.Math.toDegrees(Cesium.Math.toRadians(heading) - Cesium.Math.TWO_PI) -
            Cesium.Math.toDegrees(viewer.camera.heading)) /
          changeCameraTime
      } else {
        angle = (heading - Cesium.Math.toDegrees(viewer.camera.heading)) / changeCameraTime
      }
    }

    // const angle = (heading - Cesium.Math.toDegrees(viewer.camera.heading)) / changeCameraTime;
    // 时间间隔2秒钟
    setExtentTime(changeCameraTime)
    // 相机的当前heading
    const initialHeading = viewer.camera.heading
    this.Exection = function TimeExecution() {
      // 当前已经过去的时间，单位s

      const delTime = Cesium.JulianDate.secondsDifference(
        viewer.clock.currentTime,
        viewer.clock.startTime
      )

      //记算临时偏航角
      let heading = Cesium.Math.toRadians(delTime * angle) + initialHeading

      //临时点，折角过大时有盲区
      let ptemp = {
        lng: objStart.lng + ((objEnd.lng - objStart.lng) / changeCameraTime) * delTime,
        lat: objStart.lat + ((objEnd.lat - objStart.lat) / changeCameraTime) * delTime,
        height: p.height
      }
      //定位到相机

      viewer.scene.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(ptemp.lng, ptemp.lat, ptemp.height),
        orientation: {
          heading: heading,
          pitch: pitch
        }
      })

      if (Cesium.JulianDate.compare(viewer.clock.currentTime, viewer.clock.stopTime) >= 0) {
        viewer.clock.onTick.removeEventListener(self.Exection)
        self.flyCallBack().then(() => {
          self.marksIndex = ++self.marksIndex >= marks.length ? 0 : self.marksIndex
          if (self.marksIndex != 0) {
            self.flyExtent()
          }
        })
      }
    }
    viewer.clock.onTick.addEventListener(this.Exection)
  }
}

// 设置飞行的时间到viewer的时钟里
let setExtentTime = (time) => {
  let startTime = Cesium.JulianDate.fromDate(new Date())
  let stopTime = Cesium.JulianDate.addSeconds(startTime, time, new Cesium.JulianDate())
  viewer.clock.startTime = startTime.clone() // 开始时间
  viewer.clock.stopTime = stopTime.clone() // 结速时间
  viewer.clock.currentTime = startTime.clone() // 当前时间
  viewer.clock.clockRange = Cesium.ClockRange.CLAMPED // 行为方式-达到终止时间后停止
  viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK // 时钟设置为当前系统时间; 忽略所有其他设置。
}
/**
 * 获取两点之间的距离
 * @param p1
 * @param p2
 * @returns {*}
 */
const getDistance = (p1, p2) => {
  // console.log(p1, p2)
  // 经纬度转换为世界坐标
  var start_position = Cesium.Cartesian3.fromDegrees(Number(p1.lng), Number(p1.lat), 0)
  var end_position = Cesium.Cartesian3.fromDegrees(Number(p2.lng), Number(p2.lat), 0)
  // 返回两个坐标的距离（单位：米）
  return Cesium.Cartesian3.distance(start_position, end_position)
}
/**
 * 判断点的顺序是顺时针还是逆时针
 * @param {[{lng:33,lat:123},{lng:33,lat:123},{lng:33,lat:123}]} points
 */
const _judgeDirection = (points) => {
  const lnglat1 = points[0]
  const lnglat2 = points[1]
  const lnglat3 = points[2]
  const x1 = lnglat1.lng,
    y1 = lnglat1.lat,
    x2 = lnglat2.lng,
    y2 = lnglat2.lat,
    x3 = lnglat3.lng,
    y3 = lnglat3.lat,
    dirRes = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2)

  const isR = dirRes > 0
  return isR
}
//计算偏航角
let bearing = (startLat, startLng, destLat, destLng) => {
  startLat = toRadians(startLat)

  startLng = toRadians(startLng)
  destLat = toRadians(destLat)
  destLng = toRadians(destLng)

  let y = Math.sin(destLng - startLng) * Math.cos(destLat)
  let x =
    Math.cos(startLat) * Math.sin(destLat) -
    Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng)
  let brng = Math.atan2(y, x)
  let brngDgr = toDegrees(brng)

  return (brngDgr + 360) % 360
}

/** 相机视角飞行 结束 **/
/** 飞行时 camera的方向调整(heading) 开始 **/
// 角度转弧度
let toRadians = (degrees) => {
  return (degrees * Math.PI) / 180
}
// 弧度转角度
let toDegrees = (radians) => {
  return (radians * 180) / Math.PI
}

//参数 lng、lat为90俯视时的中心，bring为 heading 角度，取反方向,dist

let getCenterLatlng = (lng, lat, brng, dist) => {
  var a = 6378137
  var b = 6356752.3142
  var f = 1 / 298.257223563

  var lon1 = lng * 1
  var lat1 = lat * 1
  var s = dist
  var alpha1 = brng * (Math.PI / 180)
  var sinAlpha1 = Math.sin(alpha1)
  var cosAlpha1 = Math.cos(alpha1)
  var tanU1 = (1 - f) * Math.tan(lat1 * (Math.PI / 180))
  var cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1),
    sinU1 = tanU1 * cosU1
  var sigma1 = Math.atan2(tanU1, cosAlpha1)
  var sinAlpha = cosU1 * sinAlpha1
  var cosSqAlpha = 1 - sinAlpha * sinAlpha
  var uSq = (cosSqAlpha * (a * a - b * b)) / (b * b)
  var A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)))
  var B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)))
  var sigma = s / (b * A),
    sigmaP = 2 * Math.PI
  while (Math.abs(sigma - sigmaP) > 1e-12) {
    var cos2SigmaM = Math.cos(2 * sigma1 + sigma)
    var sinSigma = Math.sin(sigma)
    var cosSigma = Math.cos(sigma)
    var deltaSigma =
      B *
      sinSigma *
      (cos2SigmaM +
        (B / 4) *
          (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
            (B / 6) *
              cos2SigmaM *
              (-3 + 4 * sinSigma * sinSigma) *
              (-3 + 4 * cos2SigmaM * cos2SigmaM)))
    sigmaP = sigma
    sigma = s / (b * A) + deltaSigma
  }

  var tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1
  var lat2 = Math.atan2(
    sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1,
    (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp)
  )
  var lambda = Math.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1)
  var C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha))
  var L =
    lambda -
    (1 - C) *
      f *
      sinAlpha *
      (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)))

  var lngLatObj = { lng: lon1 + L * (180 / Math.PI), lat: lat2 * (180 / Math.PI) }
  return lngLatObj
}

export default CesiumUtilRoam
