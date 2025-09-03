//新窗口
export type IPos = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const setStorage = (key: string, value: any) => {
  if (!key) throw new Error("需要key");
  localStorage.setItem(key, JSON.stringify(value));
};

const getStorage = (key: string) => {
  const v = localStorage.getItem(key);
  try {
    return v && JSON.parse(v);
  } catch {
    return v;
  }
};

type IWin =
  | (Window & { channel: BroadcastChannel; domWrapper: HTMLDivElement })
  | undefined;
const getOldPos = () =>
  getStorage("dlg-win-pos") || { x: 0, y: 0, with: 500, height: 600 };
/**
 * @description 父窗口不可见时（document.hidden === true），js无法运行，必须同步禁止使用子窗口
 */
export const createOpenerManger = () => {
  let w: IWin;
  const key = "" + Math.random();
  let closeTimeout = 0;

  const cloneNode = (node: HTMLElement | SVGSymbolElement) => {
    return w!.document.importNode(node, true);
  };
  const moveNode = (node: HTMLElement) => {
    return w!.document.adoptNode(node);
  };

  const getPos = () => {
    if (!w) return null;
    return {
      height: w.outerHeight,
      width: w.outerWidth,
      x: w.screenX,
      y: w.screenY,
    };
  };

  const _open = (dom: HTMLElement) => {
    if (w && w.document.contains(dom)) {
      return true;
    }

    if (w) {
      w.domWrapper.innerHTML = "";
      w.domWrapper.appendChild(moveNode(dom));
      w.focus();
      // 避免注册多个事件
      return true;
    }

    const pos = getOldPos();

    w = window.open(
      "",
      key,
      `popup=true,width=${pos?.width || 500},height=${pos?.height || 600}`
    ) as IWin;

    if (!w) return false;
    w!.document.title = document.title;
    pos && w.moveTo(pos.x, pos.y);

    const text = document.documentElement.style.cssText;
    w.document.documentElement.style.cssText = text;

    const style = document.querySelectorAll("style");
    style.forEach((it) => w!.document.head.appendChild(cloneNode(it)));

    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach((it) => w!.document.head.appendChild(cloneNode(it)));

    const symbolIcon = document.querySelectorAll("symbol");
    const svg = w.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:link", "http://www.w3.org/1999/xlink");

    symbolIcon.forEach((it) => svg.appendChild(cloneNode(it)));
    // 必须渲染在body中才会生效，否则复杂svg可能不会渲染成功
    w.document.body.insertBefore(svg, w.document.body.firstChild);

    w.domWrapper = w.document.createElement("div");
    w.domWrapper.appendChild(moveNode(dom));
    w.document.body.appendChild(w.domWrapper);
    // 传递事件
    // select使用mouseup收起来
    w.addEventListener("mouseup", (e) => {
      const isSelectOrInput = (it: EventTarget) =>
        ((it as HTMLElement).className?.includes?.("el-input") &&
          !(it as HTMLElement).className?.includes?.("el-input-number")) ||
        (it as HTMLElement).className?.includes?.("el-select");

      if (e.composedPath().some(isSelectOrInput)) return;
      document.dispatchEvent(new Event("mouseup"));
      window.dispatchEvent(new Event("mouseup"));
    });
    // popper使用click事件收起来
    w.addEventListener("click", (e) => {
      const paths = e.composedPath();
      if (
        paths.some((it) =>
          (it as HTMLElement).className?.includes?.("el-popover")
        )
      ) {
        return;
      }

      document.dispatchEvent(new Event("click"));
      window.dispatchEvent(new Event("click"));
    });

    w.onbeforeunload = (e) => {
      if (!w) return;
      console.log("close");
      setStorage("dlg-win-pos", getPos());
      res.onclose?.();
      w = undefined;
    };

    window.w = w;
    return true;
  };
  /**不触发onClose */
  const _close = () => {
    if (!w) return;
    setStorage("dlg-win-pos", getPos());
    w.onbeforeunload = null;
    w.close();

    w = undefined;
  };

  const a = window.onbeforeunload;
  window.onbeforeunload = function (e) {
    _close();
    return a?.call(window, e);
  };

  const close = (delay = 200) => {
    if (!delay) _close();
    else {
      closeTimeout = window.setTimeout(_close, 200);
    }
  };

  const open = (dom: HTMLElement) => {
    clearTimeout(closeTimeout);
    return _open(dom);
  };

  const res = {
    onclose: null as null | (() => void),
    get win() {
      return w;
    },
    getPos,
    open,
    close,
  };

  return res;
};

export const opener = createOpenerManger();
