import Axios, { AxiosRequestConfig } from 'axios'

export const addToken = (config: AxiosRequestConfig) => {
  if (getToken()) {
    config.headers['Authorization'] = 'Bearer ' + getToken()
  }
  return config
}


export const catchOriginError = (error: any) => {
  if (error.code === 'ECONNABORTED') {
    throw { timeout: true }
  }

  if (error.response?.status === 401) {
   // to login
    console.log(error) // for debug
    return Promise.reject(error)
  }
  if (Axios.isCancel(error)) {
    return Promise.reject(error)
  }

  console.error({
    message: error.message || error,
    showClose: true,
    duration: 5 * 1000
  })
  return Promise.reject(error)
}
