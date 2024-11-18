import Axios from 'axios'
import { addToken, catchOriginError } from './utils'
import { downloadLocal } from '../download'
import { Message } from '../element'

const download = Axios.create({
  baseURL: import.meta.env.baseURL,
  responseType: 'blob'
})

download.interceptors.request.use(addToken, (error) => {
  console.log(error) // for debug
  return Promise.reject(error)
})

download.interceptors.response.use(
  (res) => {
    return res
  },
  (error) => catchOriginError(error)
)

/**根据后端返回header中content-disposition信息作为文件名，自动下载文件*/
const download2 = Axios.create({ responseType: 'blob' })
download2.interceptors.request.use(addToken, (error) => {
  console.log(error) // for debug
  return Promise.reject(error)
})

download2.interceptors.response.use(
  async (res) => {
    try {
      const p = await res.data.text()
      JSON.parse(p)
      Message.warning('导出失败')
      return
    } catch {}
    //设置文件名
    const filename = res.headers['content-disposition'].match(/filename="?([^"]+)"?$/)[1]
    downloadLocal(res.data, decodeURIComponent(filename))

    return res.data
  },
  (error) => catchOriginError(error)
)

export { download, download2 }
