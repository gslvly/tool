import Axios from 'axios'
import { addToken, code401 } from './utils'

/**
 * code 不正常，不会弹窗: httpSilent.get(xxx).then(xxx).catch(手动处理错误).catch(error)
 * httpSilent.get(xxx).then().catch(err) 最后需要catch才有报错
 */

const createHttpSilent = (withToken?: boolean) => {
  const httpSilent = Axios.create({
    baseURL: import.meta.env.baseURL
  })

  if (withToken) {
    httpSilent.interceptors.request.use(addToken, (error) => {
      console.log(error) // for debug
      return Promise.reject(error)
    })
  }

  httpSilent.interceptors.response.use(
    (response) => {
      const res = response.data
      // 全部抛出错误，但是不弹窗
      if (res.code !== 200 && res.code !== '100000000' && res.code !== '0000') throw res
      return res
    },
    (error) => {
      if (error.code === 'ECONNABORTED') {
        throw { timeout: true }
      }

      if (error.response?.status === 401) {
        return Promise.reject({ code: 401, message: '登录过期' })
      }

      return Promise.reject({
        code: error.response?.status,
        message: error.message,
        url: error.config?.url
      })
    }
  )
  return httpSilent
}

export const httpSilent = createHttpSilent(true)

export const httpNoTokenSilent = createHttpSilent(false)

export const error = (err: {
  code: string | number
  message?: string
  msg?: string
  url?: string
}) => {
  if (err.message === 'cancel') return

  if (err.code === 401 || err.code === '401') {
    code401(err.msg || err.message || '', err.url)
  } else {
    const msg = err.message || err.msg
    if (msg) {
      // Message.error(msg)
    }
  }
  console.error(err)
}
