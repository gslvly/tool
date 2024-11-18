<template>
  <div class="screen" ref="page">
    <div class="screen-content" ref="content" :style="style">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
// 此组件与img 的object-fit属性效果相同<screen style="width:100px;height:100px" fit="contain"></screen>

const props = withDefaults(
  defineProps<{
    fit: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
  }>(),
  {
    fit: 'none'
  }
)

const style = reactive({ transform: 'scale(1)' })
const page = ref<HTMLDivElement>()
const content = ref<HTMLDivElement>()

const fill = (w: number, h: number, width: number, height: number, s: typeof style): void => {
  s.transform = `scale(${w / width},${h / height})`
}

const contain = (w: number, h: number, width: number, height: number, s: typeof style): void => {
  if ((width / height) * h > w) {
    // 网页太宽
    s.transform = `scale(${w / width})`
  } else {
    // 网页太高
    s.transform = `scale(${h / height})`
  }
}
const cover = (w: number, h: number, width: number, height: number, s: typeof style): void => {
  if ((width / height) * h > w) {
    // 网页太宽
    s.transform = `scale(${h / height})`
  } else {
    // 网页太高
    s.transform = `scale(${w / width})`
  }
}

const scaleDown = (w: number, h: number, width: number, height: number, s: typeof style): void => {
  if (w > width || h > height) {
    return contain(w, h, width, height, s)
  }
}

const resize = () => {
  // page尺寸只会在window.onresize变化时,
  // pageContent尺寸变化不会引起page尺寸变化。
  if (props.fit === 'none' || !page.value || !content.value) return
  let w = page.value.clientWidth
  let h = page.value.clientHeight
  // pageContent大小随内部元素大小变化。
  const width = content.value.clientWidth
  const height = content.value.clientHeight
  if (props.fit === 'fill') return fill(w, h, width, height, style)
  else if (props.fit === 'contain') return contain(w, h, width, height, style)
  else if (props.fit === 'cover') return cover(w, h, width, height, style)
  else if (props.fit === 'scale-down') return scaleDown(w, h, width, height, style)
}

const rs = new ResizeObserver((e) => {
  resize()
})
onUnmounted(() => {
  rs.disconnect()
})
onMounted(async () => {
  // 他们变化时将触发resize()
  rs.observe(page.value!)
  rs.observe(content.value!)
  watch(() => props.fit, resize)
})
</script>

<style lang="scss" scoped>
.screen {
  background: #000;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.screen-content {
  flex: 0 0 auto;
}
</style>
