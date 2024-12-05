// 共用搜集信息处
import { createMap, removeItem, uniqWith } from '../set'
import type { ShallowRef } from 'vue'

type IData<T> = {
  val: ShallowRef<T>
  time: number
  status: IStatus
  loading?: Promise<any>
}

/** -1:created 0:loading 1:success 2:error 3:expired */
type IStatus = -1 | 0 | 1 | 2 | 3

/**返回request和clear */
export const createMergeRequest = <T, R>({
  request,
  requestParamMaxLen = Infinity
}: {
  request: (arr: { data: T; resolve: (v: R) => void }[]) => void
  requestParamMaxLen: number
}) => {
  const arr = [] as { data: T; resolve: (v: R) => void }[]
  let timeout = 0

  const execute = () => {
    request(arr.slice())
    arr.length = 0
  }
  const getData = (data: T) => {
    const wrap = { data, resolve: (v: R) => {} }
    const res = new Promise<R>((r) => (wrap.resolve = r))
    arr.push(wrap)
    if (timeout) clearTimeout(timeout)

    if (requestParamMaxLen === arr.length) {
      execute()
      return res
    }

    timeout = window.setTimeout(execute, 100)
    return res
  }

  const clear = () => {
    window.clearTimeout(timeout)
    arr.length = 0
  }

  return {
    request: getData,
    clear
  }
}

const createCacheMap = <T>(cacheTime?: number) => {
  const map = new Map<string, IData<T>>()
  const get = (key: string) => {
    const data = map.get(key)

    if (!cacheTime || !data) {
      return data
    }
    if (data.status === 1 && data.time + cacheTime < Date.now()) {
      data.status = 3
    }
    return data
  }
  return new Proxy(map, {
    get(target: typeof map, k: keyof typeof map) {
      return k === 'get' ? get : typeof map[k] === 'function' ? map[k].bind(map) : map[k]
    }
  })
}

const mergeExecute = <T>(
  task: (v: T[]) => void,
  sleep: () => Promise<any> = () => Promise.resolve()
) => {
  let arr = [] as T[]

  return async (v: T | T[]) => {
    let sleeping = !!arr.length
    arr = arr.concat(v)
    if (sleeping) {
      return
    }

    await sleep()
    task(arr)
    arr.length = 0
  }
}

export const createChangeEvent = <T>() => {
  const changeNoticeFns = [] as ((v: T[]) => void)[]

  const triggerChange = (v: T[]) => {
    changeNoticeFns.forEach((fn) => {
      fn(v as T[])
    })
  }

  const onChange = (fn: (v: T[]) => void) => {
    changeNoticeFns.push(fn)
    return () => offChange(fn)
  }

  const offChange = (fn: (v: T[]) => void) => {
    removeItem(changeNoticeFns, (v) => v === fn)
  }

  return {
    triggerChange,
    onChange,
    offChange
  }
}

/**
 * K请求参数，T返回,不对返回数据自动入库，只会请求数据
 * 1. 所有数据使用一份
 * 2. getAsync返回正常数据，其他返回ShallowRef类型数据
 * 3. onChange 返回正常数据
 * 4. 有缓存时间，缓存到期后自动更新
 */
export const createPool = <K, T>({
  request,
  key,
  createDefault,
  cacheTime = Infinity,
  onChange,
  requestParamMaxLen = Infinity
}: {
  request: (arr: (K | T)[]) => Promise<T[]>
  key: (data: T | K) => string
  createDefault: (param: K | T) => T
  cacheTime?: number
  onChange?: (v: T[]) => void
  requestParamMaxLen?: number
}) => {
  const map = createCacheMap<T>(cacheTime)

  const createWrappedData = (k: K | T) => {
    return {
      val: shallowRef(createDefault(k)),
      status: -1 as IStatus,
      time: Date.now()
    } as IData<T>
  }

  // 记录pending状态的请求,返回的请求没有对应pending状态，则认为是清理数据了，不再记录
  const pending = new Set<number>()

  const { request: _collectFetch, clear: _clearBatchRequest } = createMergeRequest<
    K | T,
    ShallowRef<T>
  >({
    request: (arr) => {
      const batchId = Date.now()
      pending.add(batchId)
      request(
        uniqWith(
          arr.map((it) => it.data),
          key
        )
      )
        .then((resData) => {
          // 返回没有发现之前的pending,则认为是清理掉了，这些垃圾数据不入库
          if (!pending.has(batchId)) return

          const m = createMap(resData, key)
          arr.forEach((it) => {
            const k = key(it.data)
            const v = m.get(k) || createDefault(it.data)
            setWithNotice(v)
            it.resolve(map.get(k)!.val)
          })
        })
        .catch((err) => {
          if (!pending.has(batchId)) return
          console.error(err)
          arr.forEach((it) => {
            const k = key(it.data)
            const data = map.get(k) || createWrappedData(it.data)
            // getAsync 可能没添加上数据
            data!.status = 2
            map.set(k, data)
            notice(data.val.value)

            it.resolve(map.get(k)!.val)
          })
        })
        .finally(() => pending.delete(batchId))
    },
    requestParamMaxLen
  })

  const fetchData = (v: K | T) => {
    map.get(key(v))!.status = 0
    return _collectFetch(v)
  }

  const set = (data: T) => {
    const res = map.get(key(data)) || createWrappedData(data)
    res.val.value = data
    res.time = Date.now()
    res.status = 1 as IStatus
    map.set(key(data), res)
  }

  const addToMapEmptyData = (k: K | T) => {
    const emptyData = createWrappedData(k)
    map.set(key(k), emptyData)
    return emptyData
  }

  const get = (k: K) => {
    const data = map.get(key(k)) || addToMapEmptyData(k)
    if (data.status === 1 || data.status === 0) return data.val
    data.loading = fetchData(k)
    return data.val
  }

  const getAsync = async (k: K) => {
    const data = map.get(key(k)) || addToMapEmptyData(k)
    if (data.status === 1) return data.val.value
    data.loading = data.status === 0 ? data.loading : fetchData(k)
    await data.loading
    return data.val.value
  }

  const getLocal = (k: K) => {
    return map.get(key(k))?.val
  }

  /**若有参数，则只刷新参数内容，若没有参数，则刷新所有内容 */
  const update = (data?: (T | K)[] | T | K) => {
    if (!data) {
      data = [...map.values()].map((it) => it.val.value)
    }
    if (!Array.isArray(data)) data = [data]

    return Promise.all(
      data.map((it) => {
        const k = key(it)

        const v = map.get(k) || addToMapEmptyData(it)
        if (v.status === 0) return v.loading
        v.loading = fetchData(it)
        return v.loading
      })
    )
  }

  const clear = () => {
    map.clear()
    _clearBatchRequest()
    pending.clear()
  }

  const notice = mergeExecute<T>((arr) => onChange?.(arr))

  const setWithNotice = (data: T | T[]) => {
    Array.isArray(data) ? data.forEach(set) : set(data)
    notice(data)
  }

  return {
    get,
    set: setWithNotice,
    getAsync,
    getLocal,
    clear,
    update
  }
}

/**返回一个onChange函数，它多次注册只会有最后一次生效 */
export const createSingleOnChange = <T>(onChange: (fn: (v: T) => void) => () => void) => {
  let stop: () => void
  return (fn: (v: T) => void) => {
    stop?.()
    stop = onChange(fn)
    return stop
  }
}
