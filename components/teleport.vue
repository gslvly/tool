<template>
  <div id="teleport" ref="wrap" :class="{ disabled: disabled }">
    <slot></slot>
  </div>
</template>
<script setup lang="ts" name="Teleport">
import { createUseLifeCircle, useDomMutation } from '@/utils/use'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    to?: string | HTMLElement
  }>(),
  {
    to: 'body'
  }
)
const slots = useSlots()

let mountedSlot = false

const wrap = ref<HTMLElement>()
let doc: Document
function mount() {
  if (mountedSlot) return
  console.log('mounted', props.to)
  let doc = wrap.value!.ownerDocument
  let el = typeof props.to === 'string' ? doc.querySelector(props.to) : props.to
  if (!el) {
    console.error('没有找到to元素')
    return
  }
  slots.default?.().forEach((it) => {
    el.appendChild(it.elm)
  })
  mountedSlot = true
}
function unMount() {
  slots.default?.().forEach((it) => {
    it.elm?.remove()
  })
  mountedSlot = false
  console.log('unmount', props.to)
}
onMounted(() => {
  mount()
})
onUnmounted(() => unMount())
onActivated(() => {
  if (props.to === '#headerSlot') {
    mount()
  }
})
onDeactivated(() => {
  if (props.to === '#headerSlot') {
    unMount()
  }
})
</script>
<style>
#teleport {
  display: none;
  width: 0;
  height: 0;
  &.disabled {
    display: flex;
    width: auto;
    height: auto;
  }
}
</style>
