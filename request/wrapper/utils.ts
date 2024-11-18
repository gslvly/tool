import type { AxiosRequestConfig, AxiosPromise, AxiosInstance } from 'axios'
type IMethod = 'get' | 'post' | 'delete' | 'put' | 'patch'
import md5 from 'md5'
/**将所有请求规整为aixos(config)请求*/
export const httpNormalize = (
  http: AxiosInstance,
  request: (config: AxiosRequestConfig) => AxiosPromise
): AxiosInstance => {
  const fn = (method: 'get' | 'post' | 'delete' | 'put' | 'patch') => {
    if (method === 'put' || method === 'post') {
      return (url: string, data: any, config: AxiosRequestConfig) => {
        return request({ url, method, data, ...config })
      }
    }
    return (url: string, config: AxiosRequestConfig) => {
      return request({ url, method, ...config })
    }
  }

  const methods = ['get', 'post', 'delete', 'put', 'patch']
  const set = new Set(methods)

  return new Proxy(http, {
    get(target, key: string) {
      if (set.has(key.toLowerCase())) {
        return fn(key as IMethod)
      }
      return http[key as keyof AxiosInstance]
    },

    apply(target, thisBinding, args) {
      return request(args[0])
    }
  }) as AxiosInstance
}

export const genKey = (config: AxiosRequestConfig) => {
  return md5(JSON.stringify(config)).substring(0, 8)
}
