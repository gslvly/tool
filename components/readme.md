## v-screen
它将内容按照类似图片显示，“内容”将显示占满300宽400高的空间。可用于大屏展示
```html
<v-screen fit="contain" style="width: 300px;height: 400px">
    内容
</v-screen>
```
## v-input
传入error会显示error信息，简单表单时，不需要使用全套el-form组件

## teleport
vue2中兼容vue3 teleport组件

## v-dialog
简单的弹窗组件，从外部使用`v-if`关闭。
```vue
  <v-dialog v-if="show" class="export-excel-wrap" @close="emit('close')">
    <template #header> 导出数据 </template>
    内容
  </v-dialog>
```