const isEmpty = (v: unknown) => v === null || v === undefined

type Messages = {
  [p: string]: {
    [k: string]: string | string[]
  }
}
type TOptions = Record<string | number, string | number>
type Options = {
  keyLang: string
  messages: Messages
  getLang: () => string
}

export const createTranslate = ({ keyLang, messages, getLang }: Options) => {
  const _translate = (msg?: string | undefined, options?: TOptions) => {
    if (!msg || !options) return msg || ''
    return msg.replace(/\{(\w+)\}/g, (v, b) => {
      return String(options[b])
    })
  }
  const _getValue = (key: string) => {
    if (getLang() === keyLang) return key
    const msg = messages[getLang()]?.[key]
    if (!msg) {
      console.warn(key + '：没有找到翻译')
    }
    return msg
  }
  const tc = (key: string, index = 0, options: TOptions) => {
    const msg = _getValue(key) as string[]
    if (!msg) return key
    if (!Array.isArray(msg)) {
      console.error(new Error(key + '的value不是数组'))
      return key
    }
    const m = _translate(msg[index], options)
    if (!isEmpty(m)) return m
    console.warn(`${key}：没有找到第${index || 0}个`)
    return key
  }
  const t = (key: string, options?: TOptions) => {
    const msg = _getValue(key)
    if (!msg) return key
    if (Array.isArray(msg)) {
      console.error(key + `有多个翻译，请使用:tc`, msg)
      return key
    }

    return _translate(msg, options)
  }
  return {
    t,
    tc
  }
}
