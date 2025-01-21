# cesium-vue3-help

基于 cesium v1.118.2、vue3 开发的一个工具库，帮助你快速开发三维地图应用。

- v1.0.0: 2024-07-19：第一次发布
- v1.0.1: 2024-07-19：修复 bug
- v1.0.2: 2024-07-19：修改文档
- v1.0.3: 2024-07-19：添加 github
- v1.1.0: 2025-01-21：添加漫游

# 功能列表

### 1.将 vue 组件作为 cesium 的标签（类似广告牌效果）

```
new HtmlDialog(position,vueCpn,propsOption,viewer)
```

- position：弹窗位置，数组 ，经纬度与高度
- vueCpn：vue 组件
- propsOption: 组件的 props
- viewer：Cesium.Viewer

使用案列

```
import { HtmlDialog } from 'cesium-vue3-help'
// 弹窗
const dialogs = ref(null)
function addDialog() {
  if (dialogs.value) {
    // 只允许一个弹窗出现
    dialogs.value.windowClose()
  }
  // 实例化弹窗
  dialogs.value = new HtmlDialog(
    [104.01268758872706, 30.564069838861073, 26.096806737264696],
    TestDialog,
    {
      id: 'xxxx'
    },
    viewer
  )
}
```

### 2.漫游

- markss：点集（经纬度，高度）
- pitchValue：俯仰角度
- callBack: 到达一个点后的回调函数

使用案例

```
<script setup>
onMounted(() => {
  initRoam()
})
onBeforeUnmount(() => {
  if (!_cesiumUtilRoam) {
    if (viewer) {
      setTimeout(() => {
        _cesiumUtilRoam.exitFly()
        clearTimeout(timer.value)
      }, 1000)
    }
  } else {
    if (viewer) {
      _cesiumUtilRoam.exitFly()
    }
  }
  clearTimeout(timer.value)
})
const { proxy } = getCurrentInstance()

// 定时器
const timer = ref(null)
let _cesiumUtilRoam = null

function changeManyou() {
  isFly.value = !isFly.value
  if (isFly.value) {
    console.log('打开漫游')
    flyContinue()
  } else {
    console.log('关闭漫游')
    flyStop()
  }
}

function initRoam() {
  _cesiumUtilRoam = new CesiumUtilRoam(markss, pitchValue, callBack)
  flyStart()
  flyStop()
}
function callBack(deviceIds) {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
function flyStart() {
  if (_cesiumUtilRoam) _cesiumUtilRoam.startFly()
}
function flyStop() {
  isFly.value = false
  clearTimeout(timer.value)
  if (_cesiumUtilRoam) _cesiumUtilRoam.stopFly()
}
function flyContinue() {
  isFly.value = true
  if (_cesiumUtilRoam) _cesiumUtilRoam.continueFly()
}
</script>


```
