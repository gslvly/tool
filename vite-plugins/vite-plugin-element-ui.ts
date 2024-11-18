// import * as path from 'path'
import type { Plugin, ResolvedConfig } from 'vite'
import Components from 'unplugin-vue-components/vite'
import { ElementUiResolver } from 'unplugin-vue-components/resolvers'
export function elementUIPlugin({ globalImport, entry }: { globalImport: boolean; entry: string }) {
  if (!globalImport) {
    // 无法使用message等功能
    return Components({
      resolvers: [ElementUiResolver()],
      dirs: []
    })
  }
  // 如果是普通开发，
  return <Plugin>{
    name: 'element-ui-all-import',
    transform(code, id) {
      if (id.endsWith(entry)) {
        const name = 'ElementUI'
        const prepend = `import Vue from 'vue';
        import ${name} from 'element-ui';
        import 'element-ui/lib/theme-chalk/index.css';
        Vue.use(${name})
        `
        code = code.replace(/import.+from\s['"]vue['"]/, '')
        return prepend + code
      }
      return code
    }
  }
}
