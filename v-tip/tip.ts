
type IEl = HTMLElement & {
  tooltip: HTMLElement | null
  /**删除tooltip的延时 */
  removeTimeout: number
  /**延迟添加leaving */
  addLeavingTimeout: number
  /**内容 */
  tips: string
  /**延迟显示的延迟 */
  delayShowTimeout: number
  stopRefreshPos?: () => void
  refreshShow: (el: IEl) => void
}
type IBinding = { value: any; arg?: 'noDelay'; modifiers: { local?: boolean } }

const useFrame = (fn: () => void) => {
  let stopFlag = false
  let start = () => {
    if (stopFlag) return
    fn()
    requestAnimationFrame(start)
  }
  start()

  return () => {
    stopFlag = true
  }
}

export const calcPos = (
  el: HTMLElement,
  pop: HTMLElement,
  placement = 'top' as 'top' | 'bottom'
) => {
  const { height, width } = pop.getBoundingClientRect()
  const p = el.getBoundingClientRect()
  if (p.width === 0 && p.height === 0) return null

  const innerWidth = el.ownerDocument.documentElement.clientWidth
  const innerHeight = el.ownerDocument.documentElement.clientHeight

  let pos = 'top' as 'top' | 'bottom'

  let bottom = p.bottom + 4 + height
  let top = p.top - 4 - height

  const toTop = () => {
    pos = 'top'
    top = Math.max(0, top)
    bottom = top + height
  }
  const toBottom = () => {
    pos = 'bottom'
    bottom = Math.min(innerHeight, bottom)
    top = bottom - height
  }

  if (placement === 'bottom') {
    if (bottom > innerHeight && top > 0) toTop()
    else toBottom()
  } else {
    if (top < 0 && bottom < innerHeight) toBottom()
    else toTop()
  }

  let left = p.left - (width - p.width) / 2
  let right = left + width

  if (right > innerWidth) {
    left -= right - innerWidth
  }

  if (left < 0) left = 0

  const _right = innerWidth - width - left

  let arrowLeft =
    ((p.left < 0 ? 0 : p.left) + (p.right > innerWidth ? innerWidth : p.right)) / 2 - 4
  return {
    left,
    top,
    pos,
    right: _right < 0 ? 0 : _right,
    bottom,
    arrowLeft: arrowLeft - left
  }
}

/**在鼠标放上去的时候，创建tooltip,移出时删除dom。 */
const tip = () => {
  if (!window) return {}

  const removeTipDelay = (el: IEl) => {
    if (el.removeTimeout) clearTimeout(el.removeTimeout)
    if (el.addLeavingTimeout) clearTimeout(el.addLeavingTimeout)

    if (!el.tooltip) return
    el.addLeavingTimeout = window.setTimeout(() => {
      if (el.tooltip) {
        el.tooltip.classList.add('leaving')
      }
      el.removeTimeout = window.setTimeout(() => {
        removeTip(el)
      }, 300)
    }, 100)
  }

  const stopRemoveTip = (el: IEl) => {
    el.tooltip?.classList.remove('leaving')
    el.removeTimeout && window.clearTimeout(el.removeTimeout)
    if (el.addLeavingTimeout) clearTimeout(el.addLeavingTimeout)
  }

  const removeTip = (el: IEl) => {
    el.tooltip?.remove()
    el.tooltip = null
    el.stopRefreshPos?.()
  }

  const append = (el: IEl, binding: IBinding, div: HTMLElement) => {
    if (binding.modifiers.local) {
      el.appendChild(div)
    } else {
      el.ownerDocument.body.appendChild(div)
    }
  }

  const leave = (el: IEl) => {
    removeTipDelay(el)
    el.delayShowTimeout && clearTimeout(el.delayShowTimeout)
  }

  const create = (el: IEl, binding: IBinding) => {
    el.tooltip?.remove()

    el.onmouseenter = () => {
      if (!el.tips) return
      if (el.tooltip) {
        stopRemoveTip(el)
        return
      }

      if (binding.arg === 'noDelay') {
        show()
      } else {
        el.delayShowTimeout = window.setTimeout(show, 500)
      }
    }

    el.onmouseleave = () => leave(el)

    el.tips = binding.value

    const show = () => {
      if (!el.ownerDocument.contains(el)) return // 判断延时结束的时候该元素是否还存在
      const div = document.createElement('div')

      div.style.display = 'block'
      div.setAttribute('id', 'v-tip')
      div.onmouseenter = () => {
        stopRemoveTip(el)
      }

      div.onclick = (e) => {
        e.stopPropagation()
      }

      div.onmouseleave = () => leave(el)
      el.tooltip = div

      // 下方的箭头
      const i = document.createElement('i')
      div.appendChild(i)
      const span = document.createElement('span')
      span.innerHTML = el.tips
      div.appendChild(span)
      append(el, binding, div)

      let last = el.tips

      const refreshPos = () => {
        if (div.className.includes('leaving')) return

        if (last !== el.tips) {
          last = el.tips
          span.innerHTML = el.tips
        }
        const info = calcPos(el, div)
        if (!info) {
          removeTip(el)
          return
        }

        const { top, left, pos, right, bottom, arrowLeft } = info

        div.style.cssText = `left:${left}px;top:${top}px;right:${right}px;bottom:${bottom}px`

        i.style.cssText = `left: ${arrowLeft}px;`
        i.className = pos
      }

      el.stopRefreshPos?.()
      el.stopRefreshPos = useFrame(refreshPos)
    }
  }

  return {
    bind: (el: IEl, binding: IBinding) => {
      create(el, binding)
    },
    update(el: IEl, binding: IBinding) {
      el.tips = binding.value
      if (!binding.value) {
        removeTip(el)
        return
      }
      if (el.tooltip) {
        el.tooltip.querySelector('span')!.innerHTML = el.tips
      }
    },
    unbind(el: IEl) {
      removeTip(el)
    }
  }
}

export { tip }
