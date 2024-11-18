// 共用搜集信息处
import  http  from 'axios'
import { createPool } from './creator'

export type IRealNameInfo = {
  address: string
  platform: string
  realNames: ITaskRealNameInfo[] | null
}
export type ITaskRealNameInfo = {
  taskId: number
  idCard: string
  idCardCode: string
  idCardOwnership: string
  name: string
  mobileInfos: { mobile: string; mobileOwnership: string }[]
}
type IParams = { address: string; platform: string }

const createDefault = (params: IRealNameInfo | IParams) => {
  return {
    ...params,
    realNames: null
  }
}

const request = (postData: IParams[]) =>
  http
    .post('/xxx', { addresses: postData })
    .then((res) => res.data || [])

const {
  get: getRealNameInfo,
  getAsync: getRealNameInfoAsync,
  set: setRealNameInfo,
  clear: realNamePoolClear
} = createPool<{ platform: string; address: string }, IRealNameInfo>({
  key: (v) => `${v.platform}-${v.address}`,
  createDefault,
  cacheTime: 10 * 1000,
  request
})

export { getRealNameInfo, getRealNameInfoAsync, setRealNameInfo, realNamePoolClear }
