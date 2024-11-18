// 拦截器，拦截所有请求

import { AxiosInstance, AxiosRequestConfig } from 'axios'
import { cloneDeep } from 'lodash-es'
import { httpNormalize, genKey } from './utils'

declare module 'axios' {
  interface AxiosRequestConfig {
    expired?: number
  }
}

type IOption = {
  expired: number
}

export const createHttpCache = (
  http: AxiosInstance,
  { expired }: IOption = { expired: Infinity }
) => {
  const map = new Map()

  let clearTimer = 0
  // 30秒后触发清理
  const clearData = (time = 1000 * 30) => {
    if (clearTimer) return

    let count = 0
    clearTimer = setTimeout(() => {
      clearTimer = 0
      // copy
      new Map(map).forEach((v, key) => {
        const { expired } = v
        if (expired <= Date.now()) {
          count++
          map.delete(key)
        }
      })

      console.log('clear http cache:', count)
    }, time)
  }

  const request = async (config: AxiosRequestConfig) => {
    const key = genKey(config)
    // clear
    if (expired !== Infinity) clearData()
    if (map.has(key)) {
      const { res, expired } = map.get(key)
      if (expired > Date.now()) {
        //在过期时间内
        console.log('hit cache')
        return res.then((res: any) => cloneDeep(res))
      } else {
        console.log('expired cache')
        map.delete(key)
      }
    }
    try {
      const res = http(config)
      let _expired = config.expired || config.expired === 0 ? config.expired : expired
      map.set(key, { res, expired: _expired + Date.now() }) // 不管成不成功，记录下来(promise),以便拦截后续请求
      return await res //return res 不会出发catch
    } catch (err) {
      console.log('del cache')
      map.delete(key) // 失败了，把之前记录的删掉
      return Promise.reject(err)
    }
  }

  return httpNormalize(http, request)
}
