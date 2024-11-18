## pure-tool

普通工具函数,其中 createDialog 能够让 vue 在 ts 文件中直接使用方法调用弹窗，但需要将弹窗代码写入全局中，并且引入其参数。

## sass1.77.7-fix
放在目录下 node sass.1.77.7-fix.mjs 可以将 sass 代码中的
```css
.a {
  color: red;
  .b {
    font-size: 14px;
  }
  background: blue;
}
```
修复为：
```css
.a {
  color: red;
  background: blue;
  .b {
    font-size: 14px;
  }
}
```
## set.ts
里面数组操作函数的效率远高于lodash
## use.ts
按照vue生命周期，自动注册或者删除定时器，事件等
## translate.ts
翻译函数，配合`./vite-plugins/vite-plugin-translate.ts` 插件使用
## v-tip
超小内存占用的tip插件,使用v-tip="'tip内容'"。替代简单的el-tooltip（在table中渲染大量的dom,导致卡顿）
## request
```ts
import { createHttpCache } from './request/wrapper/http-cache'
import {createHttpSingle} from './request/wrapper/http-single'
const http = axios.create({
    baseURL:'xx'
})
const httpCache = createHttpCache(http, {expired: 60*1000}) // 它会缓存1分钟，并且继承http的拦截信息
const httpSingle = createHttpSingle(http) // 如果同时请求相同的url method，他会取消掉第一次的请求，用于快速翻页场景。
```
## pool
数据池，模版函数会创建一个简单的数据池，请求发出时，会立即返回一个shallowRef数据，并且在数据获取成功后更新数据。也提供async获取。
creator函数会将各个分散的请求集合起来批量请求，提高效率。
场景：列表中有10个用户，需要显示10个用户的关联应行卡，需要提供的是根据用户id获取电话的通用接口。比如getCardsByIds(arr)。
使用时则可以拆解，它将会搜集所有id后发出一个请求，返回所有数据。
```ts 
const card = computed(() => pool.getCardById(id).value) // 直接拿card去渲染。
```

详见 `pool/temp.ts`