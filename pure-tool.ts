//此文件不能包含导入，必须全部是导出，以避免循环引用导致错误
/**T:参数，R：弹窗返回 */
export const createDialog = <T, R>() => {
  const option = ref<T | null>()
  let resolveCall: any
  let rejectCall: any

  const open = (v: T) => {
    option.value = v
    return new Promise<R | undefined>((r, j) => {
      resolveCall = r
      rejectCall = j
    })
  }

  const resolve = (info?: R) => {
    option.value = undefined
    resolveCall(info)
  }

  const reject = () => {
    option.value = undefined
    rejectCall()
  }

  return {
    open,
    option,
    resolve,
    reject
  }
}

/**v = single(() => promise);v(xxx)多次调用，返回后才调用第二次 */
export const single = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
  let loading = 0
  return ((...args) => {
    if (loading) return
    loading = 1
    fn(...args).finally(() => (loading = 0))
  }) as T
}

export const toUrl = (str: string, mimeType?: string) =>
  URL.createObjectURL(new Blob([str], { type: mimeType }))

export const mergeObjKeys = (
  obj: Record<string, any>,
  obj2: Record<string, any> | undefined | null
) => {
  if (!obj2) return obj
  Object.keys(obj).forEach((it) => {
    // 与object.assign 相同
    if (Object.prototype.hasOwnProperty.call(obj2, it)) obj[it] = obj2[it]
  })
}

/**将关键词染色，"abcd" ['ab','bc'] 将染色abc
 * @param i 是否忽略大小写
 */
export const renderKeywords = (str: string, keywords: string[], i = true) => {
  str = str.trim()
  if (!str) return ''

  keywords = i ? keywords.filter(Boolean).map((it) => it.toLowerCase()) : keywords
  if (!keywords.length) return str

  const lower = i ? str.toLowerCase() : str

  const colors = new Array(str.length).fill(0) // 0代表没有命中，1代表命中

  keywords.forEach((it) => {
    let i = lower.indexOf(it)
    while (i > -1) {
      colors[i]++
      colors[i + it.length]--
      i = lower.indexOf(it, i + 1)
    }
  })

  let res = '',
    blue = ''
  if (colors[0] === 1) blue = str[0]
  else res = str[0]

  for (let i = 1; i < str.length; i++) {
    colors[i] += colors[i - 1]
    if (colors[i] === 0) {
      if (blue) {
        res += `<span class="keywords">${blue}</span>`
        blue = ''
      }
      res += str[i]
    } else {
      blue += str[i]
    }
  }
  if (blue) res += `<span class="keywords">${blue}</span>`

  return res
}

export const toAutoNumber = (v: string | undefined) => {
  if (v === undefined || typeof v === 'number') return v
  const res = v.replace(/^\D*(\d*(?:\.\d{0,6})?).*$/g, '$1')
  return !res ? undefined : +res
}

/**只能使用getVersionStorage获取 */
export const setVersionStorage = (key: string, value: any, version: number) => {
  if (!key) throw new Error('需要key')
  if (!version) throw new Error('需要version')
  localStorage.setItem(key, JSON.stringify([version, value]))
}

/**如果版本不对会返回null*/
export const getVersionStorage = (key: string, version: number) => {
  const v = localStorage.getItem(key)
  if (!v) return null
  const val = JSON.parse(v)
  return val && val[0] === version ? val[1] : null
}