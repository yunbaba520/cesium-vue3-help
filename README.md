# cesium-vue3-help

基于 cesium v1.118.2、vue3 开发的一个工具库，帮助你快速开发三维地图应用。

- v1.0.0: 2024-07-19：第一次发布
- v1.0.1: 2024-07-19：修复 bug
- v1.0.2: 2024-07-19：修改文档

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
