export const createUseLifeCircle = (start: () => void, stop: () => void) => {
  let isActive = false
  const _start = () => {
    if (!isActive) {
      isActive = true
      start()
    }
  }
  const _stop = () => {
    if (isActive) {
      isActive = false
      stop()
    }
  }
  // keep-alive中的子、孙组建会触发，keep-alive的直接子组建会在mounted时同时触发，onMounted -> onActivated
  onMounted(_start)
  onActivated(_start)

  // keep-alive的直接子组建会在onMounted时同时触发，onDeactivated -> onUnmounted
  onDeactivated(_stop)
  onBeforeUnmount(_stop)
}

export const useSetInterval = (fn: () => void, time: number) => {
  let interval: number
  const _setInterval = () => {
    clearInterval(interval)
    interval = window.setInterval(() => {
      fn()
    }, time)
  }

  // keep-alive中的子、孙组建会触发，keep-alive的直接子组建会在mounted时同时触发，onMounted -> onActivated
  onActivated(() => {
    _setInterval()
  })
  onBeforeUnmount(() => clearInterval(interval))

  // keep-alive的直接子组建会在onMounted时同时触发，onDeactivated -> onUnmounted
  onDeactivated(() => clearInterval(interval))
  _setInterval()
}

export const useBeforeunloadPrompt = () => {
  if (import.meta.env.DEV) return

  window.onbeforeunload = () => true

  onBeforeUnmount(() => {
    window.onbeforeunload = null
  })
  onDeactivated(() => {
    window.onbeforeunload = null
  })

  onActivated(() => (window.onbeforeunload = () => true))
}

/**注册事件，在组建删除时自动删除 */
export const useWindowEvent = <T extends keyof WindowEventMap>(
  e: T,
  fn: (v?: WindowEventMap[T]) => void
) => {
  createUseLifeCircle(
    () => window.addEventListener(e, fn),
    () => window.removeEventListener(e, fn)
  )
}

export const useAnimationFrame = (fn: () => void) => {
  let isActive = false

  const nextFrame = () => {
    if (isActive) {
      fn()
      requestAnimationFrame(() => nextFrame())
    }
  }

  const start = () => {
    isActive = true
    nextFrame()
  }

  const stop = () => {
    isActive = false
  }

  createUseLifeCircle(start, stop)
}

export const useDomMutation = (
  dom: HTMLElement,
  config: MutationObserverInit,
  fn: MutationCallback
) => {
  let ob = new MutationObserver(fn)

  createUseLifeCircle(
    () => {
      ob.observe(dom, config)
    },
    () => {
      ob.disconnect()
    }
  )
}

export const useDomResize = (el: HTMLElement, onresize: () => void) => {
  const ob = new ResizeObserver(() => {
    onresize()
  })

  createUseLifeCircle(
    () => {
      ob.observe(el)
    },
    () => {
      ob.disconnect()
    }
  )
}
