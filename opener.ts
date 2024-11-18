//新窗口
export type IPos = {
  height: number
  width: number
  x: number
  y: number
}
type IWin = (Window & { channel: BroadcastChannel }) | undefined

export const createOpenerManger = (opt: {
  onClose: (v: IPos) => void
  getPos: () => IPos | undefined
}) => {
  let w: IWin
  let closeTimeout: number
  const open = (dom: HTMLElement) => {
    clearTimeout(closeTimeout)
    closeTimeout = -1

    if (w && w.document.contains(dom)) {
      w.focus()
      return
    }
    const oldPos = opt.getPos()
    if (w) {
      w.document.body.innerHTML = ''
      w.document.body.appendChild(dom)
      w.focus()
      return
    }

    w = window.open(
      '',
      'detail',
      `popup=true,width=${oldPos?.width || 500},height=${oldPos?.height || 600}`
    ) as IWin

    if (!w) return
    console.log('move', oldPos)
    oldPos && w.moveTo(oldPos.x, oldPos.y)

    w.document.body.appendChild(dom)

    const style = document.querySelectorAll('style')
    style.forEach((it) => w!.document.head.appendChild(it.cloneNode(true)))

    const symbolIcon = document.querySelectorAll('symbol')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    symbolIcon.forEach((it) => svg.appendChild(it.cloneNode(true)))
    w.document.head.appendChild(svg)

    // 传递事件
    // select使用mouseup收起来
    w.addEventListener('mouseup', (e) => {
      const isSelectOrInput = (it: EventTarget) =>
        it.className?.includes?.('el-input') || it.className?.includes?.('el-select')

      if (e.composedPath().some(isSelectOrInput)) return
      document.dispatchEvent(new Event('mouseup'))
    })
    // popper使用click事件收起来
    w.addEventListener('click', (e) => {
      if (e.composedPath().some((it) => it.className?.includes?.('el-popover'))) return
      document.dispatchEvent(new Event('click'))
    })

    w.onbeforeunload = (e) => {
      if (!w) return
      const pos = {
        height: w!.outerHeight,
        width: w!.outerWidth,
        x: w!.screenX,
        y: w!.screenY
      }
      opt?.onClose?.(pos)
    }
  }

  const close = (notice = true) => {
    if (!w) return
    if (notice) {
      closeTimeout = window.setTimeout(() => {
        console.log('close')
        w?.close()
        w = undefined
      }, 200)
    } else {
      w.onbeforeunload = null
      w.close()
      w = undefined
    }
  }

  window.addEventListener('beforeunload', () => {
    w?.close()
  })

  return {
    open,
    close
  }
}
