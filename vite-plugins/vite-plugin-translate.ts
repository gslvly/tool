import * as fs from 'fs'
import { resolve } from 'path'
import { Plugin, ResolvedConfig, ViteDevServer, normalizePath } from 'vite'
import MagicString from 'magic-string'
import { parse } from 'acorn'
import chokidar, { FSWatcher } from 'chokidar'

type Options = {
  exclude?: (id: string) => boolean
  paths?: string[]
  autoImport?: string
  clear?: boolean
}
type Lang = { [p: string]: string | string[] }
type FileManagerMap = Map<string, Lang>

// 搜集数据并且将原代码中中文变为 t('中文')
const createTransform = (autoImport: string) => {
  return (code: string, id: string) => {
    // 将JavaScript代码转换为AST

    const ast = parse(code, { sourceType: 'module', ecmaVersion: 'latest' })
    // 遍历AST树的节点
    const chineseStrings = new Set<string>()
    const magicString = new MagicString(code)
    const imported = new Map<string, { start: number; end: number }>()
    const _collect = (value: string) => {
      // 只翻译文字，排除前后的字符串
      const data = /^([^\u4e00-\u9fa5]*)([\s\S]+?)([^\u4e00-\u9fa5]*$)/.exec(value)
      return { str: data[2], last: data[3].replace('。', '.'), pre: data[1].replace('。', '.') }
    }

    function traverse(node: any, parent: any = null, isDirective = false) {
      if (!node || typeof node !== 'object') return
      if (node.type === 'ThrowStatement') return
      node.parent = parent

      const calleeName = node?.callee?.name || node?.callee?.object?.name
      if (calleeName === 'console') return
      if (calleeName === '_createCommentVNode') return
      if (calleeName === 'RegExp') return
      if (isDirective && node.type === 'Property' && node.key?.name === 'expression') return

      if (node.type === 'ImportDeclaration' && autoImport) {
        for (const it of node.specifiers) {
          if (it.local.name === 't' || it.local.name === 'tc') {
            imported.set(it.local.name, node)
          }
        }
        return
      }
      if (node.type === 'Property' && node?.key?.name === 'directives') {
        node.value?.elements?.forEach((it) => {
          traverse(it, node, true)
        })
        return
      }
      const val = node.type === 'TemplateElement' ? node.value.cooked : node.value

      if (/[\u4e00-\u9fa5]/.test(val)) {
        const value = val
        // vue2 v-tip="t('xxx')"有多余的数据
        // if (value.includes('t(')) {
        //   debugger
        // }

        if (value.startsWith('t(') || value.startsWith('tc(')) {
          return
        }
        const fn =
          parent?.callee?.name ||
          parent?.callee?.property?.name ||
          (node.type === 'TemplateElement' && parent?.parent?.callee?.property?.name)

        if (fn === 't' || fn === 'tc') {
          chineseStrings.add(value)
          return
        }

        // 处理中文
        const { str, pre, last } = _collect(value)

        chineseStrings.add(str)
        const v =
          node.type === 'TemplateElement'
            ? `${pre}\${t(${JSON.stringify(str)})}${last}`
            : `${pre ? `${JSON.stringify(pre)}+` : ''}t(${JSON.stringify(str)})${
                last ? `+${JSON.stringify(last)}` : ''
              }`
        magicString.overwrite(node.start, node.end, v)
        return
      }
      Object.keys(node).forEach((key) => {
        if (key === 'parent') return
        if (Array.isArray(node[key])) {
          node[key].forEach((it) => {
            if (typeof it !== 'object') return

            traverse(it, node, isDirective)
          })
        } else {
          if (typeof node[key] === 'object') {
            traverse(node[key], node, isDirective)
          }
        }
      })
    }
    traverse(ast)

    if (autoImport && chineseStrings.size && !imported.has('tc') && !imported.has('t')) {
      magicString.append(`\n${autoImport}`)
    }
    return {
      chineseStrings,
      code: magicString.toString(),
      sourceMap: magicString.generateMap(),
      ast
    }
  }
}

/**只返回有值的json */
const jsonFilterHasValue = (lang: Lang) => {
  const res = {}
  Object.keys(lang).forEach((key) => {
    if (lang[key] !== '') res[key] = lang[key]
  })

  return res
}
const read = (path: string) => {
  const str = fs.readFileSync(path, 'utf-8').trim()
  if (str) {
    const data = new Function(`return ${str}`)()
    return data
  }
  return {}
}

/**当删除某个中文的时候，需要将无翻译的中文字断删掉 */
const createDataManager = () => {
  const map: FileManagerMap = new Map() // 保存文件原始信息
  const chineseMap = new Map<string, Set<string>>() // 保存搜集的信息

  const collect = (id: string, set: Set<string>) => {
    chineseMap.set(id, set)
  }

  /**将搜集的数据生成文件 */
  const write = (() => {
    let timeOut: NodeJS.Timeout
    return (clear = false) => {
      if (timeOut) {
        clearTimeout(timeOut)
      }
      timeOut = setTimeout(() => {
        const allChinese = new Set<string>()
        chineseMap.forEach((it) => {
          it.forEach((s) => allChinese.add(s))
        })

        for (let path of map.keys()) {
          let change = false
          const json = jsonFilterHasValue(map.get(path))

          let res = clear ? {} : json
          let empty = [] as string[] // 将空的数据显示在最后吗
          allChinese.forEach((chinese) => {
            if (!json[chinese]) {
              // 新增了
              if (json[chinese] === undefined) {
                change = true
              }
              empty.push(chinese)
            } else {
              res[chinese] = json[chinese]
            }
          })

          if (change) {
            empty.forEach((k) => (res[k] = ''))
            console.log('write:', path)
            fs.writeFileSync(path, JSON.stringify(res, null, 2))
          }
        }
      }, 500)
    }
  })()

  /**当文件手动更改时，刷新旧数据*/
  const checkChange = (path: string) => {
    const newObj = jsonFilterHasValue(read(path))
    const oldObj = jsonFilterHasValue(map.get(path))
    let isChanged = false

    for (let key of Object.keys(newObj)) {
      if (oldObj[key] !== newObj[key]) {
        isChanged = true
        break
      }
    }

    return isChanged
  }

  const get = (path: string) => map.get(path)
  const _read = (path: string) => {
    map.set(path, read(path))
  }

  const load = (path: string) => {
    return map.get(path)
  }
  return {
    get,
    load,
    read: _read,
    write,
    collect,
    checkChange
  }
}

const writeFileDefaultJson = (path: string) => {
  path = normalizePath(resolve(path))
  const dir = path.split('/').slice(0, -1).join('/')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, '{}')
  }
}

export const translate = ({
  exclude = (id: string) => id.includes('/node_module/'),
  paths,
  autoImport = '',
  clear
}: Options): Plugin => {
  if (!paths?.length) {
    // console.warn('\x1b[41m', 'translate plugin 需要path参数用于存放翻译数据,否则使用默认参数["src/translate/zh.json"]')')
    console.warn(
      'translate plugin 需要path参数用于存放翻译数据,否则使用默认参数["src/translate/zh.json"]'
    )
    paths = [normalizePath(resolve('src/translate/zh.json'))]
  } else {
    paths = paths.map((it: string) => normalizePath(resolve(it)))
  }
  paths.forEach(writeFileDefaultJson)

  let config: ResolvedConfig
  const manager = createDataManager() // 保存的是虚拟文件的内容，翻译是有值的

  const _transform = createTransform(autoImport)
  const buildTransform = (code: string, id: string) => {
    if (
      id.includes('?vue&type=style') ||
      (!id.endsWith('.ts') &&
        !id.endsWith('.js') &&
        !id.endsWith('.vue') &&
        !id.endsWith('.jsx') &&
        !id.endsWith('.tsx'))
    ) {
      return { code, map: null }
    }

    const { code: c, sourceMap, chineseStrings } = _transform(code, id)
    manager.collect(id, chineseStrings)
    return { code: c, map: sourceMap }
  }
  const serverTransform = (code: string, id: string) => {
    if (
      id.includes('?vue&type=style') ||
      (!id.endsWith('.ts') &&
        !id.endsWith('.js') &&
        !id.endsWith('.vue') &&
        !id.endsWith('.jsx') &&
        !id.endsWith('.tsx'))
    ) {
      // 不搜集数据
      return { code, map: null }
    }
    const { code: c, sourceMap, chineseStrings } = _transform(code, id)
    manager.collect(id, chineseStrings)
    manager.write()
    return { code: c, map: sourceMap }
  }
  let watcher: FSWatcher
  return {
    name: 'translate',
    load(id) {
      if (paths.includes(id)) {
        return JSON.stringify(manager.load(id))
      }
    },

    configureServer(viteServer) {
      const server = viteServer

      server.watcher.unwatch(paths)

      watcher = chokidar.watch(paths).on('change', (path: string) => {
        path = normalizePath(path)
        if (manager.checkChange(path)) {
          console.log('change:', path)
          server.watcher.emit('change', path)
        }
        manager.read(path)
      })
    },

    configResolved(cfg) {
      config = cfg
      paths.forEach((path) => manager.read(path))
    },
    transform(code, id) {
      if (exclude(id)) return { code, map: null }
      if (config.command === 'build') {
        return buildTransform(code, id)
      } else {
        return serverTransform(code, id)
      }
    },
    buildEnd() {
      if (config.command === 'build') {
        console.log('end')
        manager.write(clear)
      }
    },
    closeWatcher() {
      watcher.close()
    }
  }
}
