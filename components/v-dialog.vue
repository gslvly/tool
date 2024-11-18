<template>
  <div :class="['v-dialog', center ? 'center' : 'fixed-top']">
    <div class="v-dialog-body" v-loading="loading">
      <span class="el-icon-close" @click="close" v-if="showClose"></span>
      <header class="header v-dialog-header" v-if="$scopedSlots.header?.()">
        <slot name="header"></slot>
      </header>
      <main class="content v-dialog-content">
        <slot></slot>
      </main>
      <div class="v-dialog-footer" v-if="$scopedSlots.footer?.()">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="VDialog">
const props = withDefaults(
  defineProps<{
    center?: boolean // 上下居中 
    showClose?: boolean
    loading?: boolean
  }>(),
  { center: false, showClose: true }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()
const close = () => {
  emit('close')
}
</script>

<style lang="scss" scoped>
.v-dialog {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 30;
  display: flex;
  &.center {
    flex-direction: column;
    align-items: center;

    &::after {
      flex: 2 0 0px;
      content: '';
    }
    &::before {
      content: '';
      flex: 1 0 0px;
    }
    .v-dialog-body {
      flex: 0 0 auto;
      max-height: 90vh;
      height: fit-content;
    }
    .v-dialog-content {
      flex: 1 1 auto;
    }
  }
  &.fixed-top {
    display: flex;
    justify-content: center;
    padding-top: 15vh;
    .v-dialog-body {
      max-height: 75vh;
      height: fit-content;
    }
  }
  .v-dialog-body {
    width: 800px;
    box-shadow: 0 8px 16px 0 rgba(0, 11, 32, 0.15);
    border-radius: 6px;
    background-color: #fff;

    display: flex;
    flex-direction: column;
    position: relative;
    .el-icon-close {
      cursor: pointer;
      position: absolute;
      right: 16px;
      font-size: 16px;
      top: 16px;
      color: #66738c;
    }
    .el-icon-close:hover {
      color: var(--main-color);
    }
  }
  .v-dialog-header {
    min-height: 50px;
    flex: 0 0 auto;
    padding: 32px 32px 16px;
    font-weight: bold;
    box-sizing: border-box;
    font-size: 20px;
    color: #001640;
  }
  .v-dialog-content {
    padding: 0 32px 24px;
    overflow: auto;
    height: auto;
  }
  .v-dialog-footer {
    padding: 0 32px 32px;
    flex: 0 0 auto;
  }
}
</style>
