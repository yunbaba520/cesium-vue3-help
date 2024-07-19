/*global Cesium*/
var vue = require("vue");

// 弹窗
/**
 * @param {*} val
 */
class HtmlDialog {
  constructor(position, vueCpn, propsOption, viewer) {
    this.viewer = viewer;
    this.position = Cesium.Cartesian3.fromDegrees(
      position[0],
      position[1],
      position[2]
    );

    const { vmInstance } = createDialog(vueCpn, { ...propsOption });
    if (this.vmInstance) {
      this.windowClose.bind(this);
    } else {
      this.vmInstance = vmInstance;
    }
    viewer.cesiumWidget.container.appendChild(vmInstance.$el);
    this.addPostRender();
  }
  //添加场景事件
  addPostRender() {
    this.viewer.scene.postRender.addEventListener(this.postRender, this);
  }
  postRender() {
    if (!this.vmInstance.$el || !this.vmInstance.$el.style) return;
    // 画布高度
    const canvasHeight = this.viewer.scene.canvas.height;
    // 实例化屏幕坐标
    const windowPosition = new Cesium.Cartesian2();
    // 将WGS84 经纬度坐标转换成屏幕坐标，这通常用于将 HTML 元素放置在与场景中的对象相同的屏幕位置。
    Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      this.viewer.scene,
      this.position,
      windowPosition
    );
    // 调整弹窗的位置
    this.vmInstance.$el.style.bottom =
      canvasHeight - windowPosition.y + 0 + "px";
    const elWidth = this.vmInstance.$el.offsetWidth;
    this.vmInstance.$el.style.left = windowPosition.x - elWidth / 2 + 0 + "px";

    // 控制边界值(比如：地图缩放比较小的时候，弹窗消失)
    // const camerPosition = this.viewer.camera.position
    // let height = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(camerPosition).height
    // height += this.viewer.scene.globe.ellipsoid.maximumRadius
    // if (
    //   !(Cesium.Cartesian3.distance(camerPosition, this.position) > height) &&
    //   this.viewer.camera.positionCartographic.height < 50000000
    // ) {
    //   this.vmInstance.$el.style.display = 'block'
    // } else {
    //   this.vmInstance.$el.style.display = 'none'
    // }
  }
  //关闭弹窗
  windowClose() {
    console.log("触发弹窗关闭");
    if (this.vmInstance) {
      this.vmInstance.$el.remove();
    }
    this.viewer.scene.postRender.removeEventListener(this.postRender, this); //移除事件监听
  }
}
// 弹窗挂载的父节点
let parentNode = null;
function createDialog(vueCpn, propsOption) {
  if (parentNode) {
    document.body.removeChild(parentNode);
    parentNode = null;
  }
  const app = vue.createApp({
    render() {
      return vue.h(vueCpn, {
        ...propsOption,
      });
    },
  });
  parentNode = document.createElement("div");
  parentNode.id = "dialog";
  // 将Popup组件挂载到父级div中，生成弹窗实例
  const instance = app.mount(parentNode);
  document.body.appendChild(parentNode);
  return {
    vmInstance: instance,
  };
}

exports.HtmlDialog = HtmlDialog;
