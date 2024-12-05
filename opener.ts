//新窗口
export type IPos = {
  height: number
  width: number
  x: number
  y: number
}
type IWin = (Window & { channel: BroadcastChannel; domWrapper: HTMLDivElement }) | undefined


/**
 * @param onClose 只有浏览器原生关闭按钮会触发它
 * @description 父窗口不可见时（document.hidden === true），js无法运行，必须同步禁止使用子窗口
 */
export const createOpenerManger = (opt: {
  onClose?: (v: IPos) => void
  getPos?: () => IPos | undefined
}) => {
  let w: IWin
  const key = Date.now() + ''

  const cloneNode = (node: HTMLElement | SVGSymbolElement) => {
    return w!.document.importNode(node, true)
  }
  const moveNode = (node: HTMLElement) => {
    return w!.document.adoptNode(node)
  }
  const open = (dom: HTMLElement) => {
    if (w && w.document.contains(dom)) {
      w.focus()
      return true
    }

    const oldPos = opt.getPos?.()
    if (w) {
      w.domWrapper.innerHTML = ''
      w.domWrapper.appendChild(moveNode(dom))
      w.focus()
      // 避免注册多个事件
      return true
    }

    w = window.open(
      '',
      key,
      `popup=true,width=${oldPos?.width || 500},height=${oldPos?.height || 600}`
    ) as IWin

    if (!w) return false

    console.log('move', oldPos)
    oldPos && w.moveTo(oldPos.x, oldPos.y)

    const style = document.querySelectorAll('style')
    style.forEach((it) => w!.document.head.appendChild(cloneNode(it)))

    const links = document.querySelectorAll('link[rel="stylesheet"]')
    links.forEach((it) => w!.document.head.appendChild(cloneNode(it)))

    const symbolIcon = document.querySelectorAll('symbol')
    const svg = w.document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svg.setAttribute('xmlns:link', 'http://www.w3.org/1999/xlink')

    symbolIcon.forEach((it) => svg.appendChild(cloneNode(it)))
    // 必须渲染在body中才会生效，否则复杂svg可能不会渲染成功
    w.document.body.insertBefore(svg, w.document.body.firstChild)

    w.domWrapper = w.document.createElement('div')
    w.domWrapper.appendChild(moveNode(dom))
    w.document.body.appendChild(w.domWrapper)
    // 传递事件
    // select使用mouseup收起来
    w.addEventListener('mouseup', (e) => {
      const isSelectOrInput = (it: EventTarget) =>
        (it as HTMLElement).className?.includes?.('el-input') ||
        (it as HTMLElement).className?.includes?.('el-select')

      if (e.composedPath().some(isSelectOrInput)) return
      document.dispatchEvent(new Event('mouseup'))
      window.dispatchEvent(new Event('mouseup'))
    })
    // popper使用click事件收起来
    w.addEventListener('click', (e) => {
      console.log('click')
      if (e.composedPath().some((it) => (it as HTMLElement).className?.includes?.('el-popover'))) {
        return
      }
      document.dispatchEvent(new Event('click'))
      window.dispatchEvent(new Event('click'))
    })

    w.onbeforeunload = (e) => {
      if (!w) return
      opt?.onClose?.(getPos()!)
    }
    return true
  }

  const getPos = () => {
    if (!w) return null
    return {
      height: w.outerHeight,
      width: w.outerWidth,
      x: w.screenX,
      y: w.screenY
    }
  }

  /**不触发onClose */
  const close = () => {
    if (!w) return
    console.log('close')
    w.onbeforeunload = null
    w.close()
    w = undefined
  }

  return {
    get win() {
      return w
    },
    getPos,
    open,
    close
  }
}
