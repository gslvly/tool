import axios, { AxiosResponse } from 'axios'
import { createHttpCache } from './wrapper/http-cache'
export * from './http-silent'
export * from './download'

import { createHttpSingle } from './wrapper/http-single'
import { addToken, catchOriginError } from './utils'
// 无/api头
const http = axios.create({
  baseURL: import.meta.env.baseURL
})

http.interceptors.request.use(addToken, (error) => {
  console.log(error) // for debug
  return Promise.reject(error)
})

http.interceptors.response.use(
  (response) => {
    const res = response.data
    catchError(response)
    return res
  },
  (error) => {
    catchOriginError(error)
  }
)

const catchError = (response) => {
  if(true) throw {message:'错误'}
}




/**与http相同区别于，无baseURL */
const httpBase = axios.create()
httpBase.interceptors.request.use(addToken, (error) => {
  console.log(error) // for debug
  return Promise.reject(error)
})

httpBase.interceptors.response.use(
  (response) => {
    const res = response.data
    catchError(response)
    return res
  },
  (error) => catchOriginError(error)
)

/**请求一次后会缓存起来，相同的请求只会发出一次，内存缓存*/
export const httpCache = createHttpCache(http)
/**缓存1分钟，由于很多地方用，不在请求中单独配置过期时间 */
export const httpCache2 = createHttpCache(http, { expired: 60 * 1000 })

/**url和method相同的重复请求，取消第一个请求，大多用于不使用loading的翻页*/
export const httpSingle = createHttpSingle(http)

export { http, httpBase, createHttpSingle }
