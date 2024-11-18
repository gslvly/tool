v-tip 只有一个dom.
el-tooltip 一个实例会渲染一个dom，可能导致性能问题。
简单的tip可使用v-tip="'tip内容'"
vue2使用，vue3需要自行改生命周期函数