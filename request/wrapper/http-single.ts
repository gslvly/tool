import axios, { AxiosInstance, AxiosRequestConfig, CancelTokenSource } from 'axios'
import { httpNormalize } from './utils'

/**相同的url和method重复，取消之前的请求*/
export const createHttpSingle = (http: AxiosInstance) => {
  const CancelToken = axios.CancelToken
  const map = new Map<string, { source: CancelTokenSource; cnt: number }>()
  const genKey = (config: AxiosRequestConfig) => {
    return `${config.method}:${config.url}` // 只要url和method
  }

  return httpNormalize(http, (config) => {
    const key = genKey(config)
    let cnt = 0
    if (map.has(key)) {
      map.get(key)!.source.cancel('cancel')
      cnt = map.get(key)!.cnt
    }

    const source = CancelToken.source()
    config.cancelToken = source.token

    map.set(key, { source, cnt: cnt + 1 })
    return http(config).finally(() => {
      // cancel 依然会触发finally，这样可能将新的删掉,每次请求增加数量，每次触发减少数量，当数量为0 才删除
      const record = map.get(key)!
      record.cnt--
      if (record.cnt === 0) {
        map.delete(key)
      }
    })
  })
}
