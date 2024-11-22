<template>
  <div class="v-popover">
    <div class="v-popover-btn" @click.stop="toggle" ref="btn">
      <slot name="btn"></slot>
    </div>
    <div
      ref="dom"
      @click.stop="show = false"
      class="v-popover-pop"
      v-if="show"
      :class="[{ 'is-show': show }, popperClass]"
    >
      <i :class="[iClassName, 'arrow']" :style="{ left: arrow }"></i>
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup name="VPopover">
import { calcPos } from './tip'
import { useAnimationFrame, useWindowEvent } from '../use'
defineProps<{
  popperClass?: string
}>()
const slots = useSlots()
const dom = ref<HTMLElement>()
const btn = ref<HTMLElement>()
const show = ref(false)
const toggle = () => {
  show.value = !show.value
}
const arrow = ref('')
const iClassName = ref('')

const refreshPos = () => {
  if (!show.value || !btn.value || !dom.value) return
  const info = calcPos(btn.value, dom.value, 'bottom')
  if (!info) {
    return
  }

  const { top, left, pos, right, bottom, arrowLeft } = info
  dom.value.style.cssText = `left:${left}px;top:${top}px;right:${right}px;bottom:${bottom}px`

  arrow.value = `${arrowLeft}px`
  iClassName.value = pos
}

useAnimationFrame(() => {
  refreshPos()
})

watch(
  () => show.value,
  (v) => {
    if (v) showDom()
    else removeDom()
  }
)

const showDom = async () => {
  await nextTick()
  const doc = btn.value!.ownerDocument
  doc.body.appendChild(dom.value!)
}

const removeDom = () => {
  dom.value!.remove()
}
onUnmounted(() => {
  dom.value?.remove()
})
useWindowEvent('click', () => (show.value = false))
</script>

<style lang="scss">
.v-popover-btn {
  display: inline-flex;
  align-items: center;
}
.v-popover-pop {
  width: max-content;
  display: none;
  position: fixed;
  background-color: #fff;
  padding: 16px;
  min-width: 80px;

  --bg: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  z-index: 1000;
  height: fit-content;
  &.is-show {
    display: block;
  }
  .item {
    padding: 0 16px;
    font-size: 14px;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #001640;
    height: 34px;
    line-height: 34px;
    box-sizing: border-box;
    cursor: pointer;
    &.active {
      color: var(--main-color) !important;
    }
    &:hover {
      background-color: #f5f7fa;
    }
  }

  .arrow {
    --w: 8px;
    position: absolute;
    width: var(--w);
    height: var(--w);
    display: inline-block;

    border: 4px solid transparent;
    border-right: 4px solid var(--bg);
    border-top: 4px solid var(--bg);
    &.top {
      bottom: 0;
      transform: translateY(50%) rotate(135deg);
    }

    &.bottom {
      transform: translateY(-50%) rotate(-45deg);
      top: 0;
    }
  }
}
</style>
