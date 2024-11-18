## vite 使用

```ts
import { analysis } from "./plugins/vite-plugin-analysis";
import { elementUIPlugin } from "./plugins/vite-plugin-element-ui";
import { setupName } from "./plugins/vite-plugin-setup-name";
import { generateVersion } from "./plugins/vite-plugin-version";
import { iconStats } from "./plugins/vite-plugin-icon-stats";
import { prefetch } from "./plugins/vite-plugin-prefetch";
export default defineConfig(({ command, mode }) => {
  return {
    plugins: [
      elementUIPlugin({
        globalImport: command === "serve",
        entry: "src/main.ts",
      }),
      setupName(),
      generateVersion(),
      iconStats({
        svgDir: [
          resolve(process.cwd(), "src/assets/img"), // 此文件夹内的svg是被其他插件生成了symbol标签，并且id就是文件名
        ],
        src: resolve("src"),
        iconfont: resolve("xx/iconfont.js"), // iconfont地址
        clean: command === "build", // 打包清理iconfont图标（不支持清理svg，因为将svg生产symbol信息的不是此插件）
      }),
      prefetch(), // 自动处理首页必须资源请求为preload,否则为prefetch。
      translate({
        exclude: (id) => !id.includes("/src/") || id.includes("translate/"),
        paths: ["src/translate/en.json", "src/translate/zh_TW.json"],
        clear: cfg.command === "build", // 在本地运行build会清理翻译的json文件
        autoImport: 'import {t,tc} from "@/translate"', // 当有需要的翻译内容时，自动加上这一句
      }),
      //   svg({ dir: resolve('src/assets/img'), prefix: 'svg' }),
      //   analysis()
    ],
  };
});
```

## vite-plugin-analysis
同步依赖： a需要b来渲染，则a同步依赖b。常见于强制拆包的情况 
此插件可以追踪文件之间的依赖关系，分为同步依赖与异步依赖。插件将合并同步依赖，再将各个依赖使用点线图渲染出来。 
依赖以entry文件作为初始文件，如果a依赖b，b依赖c，则a,b,c会合成到a中，并以chunks字段存在。点击图上的点，会显示此点的组成 
## vite-plugin-element-ui
用于兼容element-ui 自动导入，在dev环境中导入全部element-ui内容。避免在dev环境中按需加载导致的首次运行多次刷新页面。
## vite-plugin-icon-stats
用于svg标签信息的分析。它可以搜集项目中使用的svg标签，iconfont symbol模式的标签，并且在打包时清理掉多余的iconfont标签。
此插件提供一个api,可以根据`fetch('/icon-stats')`返回已经使用，未被使用的svg和iconfont 资源。
## vite-plugin-prefetch
index.html中注入prefetch和preload，以提前加载全站的资源。 
它会分析依赖关系，如果是entry文件的同步依赖，则使用link preload（index.html的 script除外），如果是其他异步页面的信息，则使用link prefetch添加到首页中。
## vite-plugin-setup-name
允许`<script setup name="xxx">` 来命名组件
## vite-plugin-svg
允许dir内的svg直接按名字作为标签使用，比如aa.svg。则可以使用`<aa></aa>`,aa组件的内容就是svg内容
## vite-plugin-translate
将所有文件使用的中文搜集起来，并且生成 paths参数的文件，若为en.json `{搜集到的中文：""}`。 
如果是t或者tc函数的参数，则不会被符号打断，比如使用中`{{t('a好')}}` 会搜集到”a好“而不是"好",可以用于`t('这是第{x}页',{x: 10})`。t函数需要自己实现
## vite-plugin-version
发版后提示版本跟新用。在index.html中注入版本号，并且打包后生成version文件。可以`fetch('/version').then(v => v.text())`来与`window.version`，若不同则提示刷新页面