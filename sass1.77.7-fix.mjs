// 需要安装postcss
import { parse } from 'postcss'
import * as fs from 'fs'
import * as path from 'path'

const dir = path.resolve('./src')

const findFiles = (dir, fn) => {
  const res = []
  const dfs = (dir) => {
    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath)

      if (stats.isDirectory()) {
        dfs(filePath) // 递归子目录
      } else if (stats.isFile() && fn(filePath)) {
        res.push(filePath)
      }
    })
  }
  dfs(dir)

  return res
}
// 读取 Vue 文件中的 Sass 代码

const vueFiles = findFiles(dir, (k) => k.endsWith('.vue'))
const sassFiles = findFiles(dir, (k) => k.endsWith('.sass'))

const transform = (originCode) => {
  if (!originCode) return ''
  const code = originCode.replace(/\s*\/\/.*/g, '') // 删除双斜杠注视 （//）
  const root = parse(code)
  const getOriginStr = (node) => {
    return `${node.raws.before || ''}${code.slice(
      node.source.start.offset, // 包含
      node.source.end.offset // 不包含
    )}`
  }
  const dfs = (node) => {
    if (!node.nodes?.length) {
      return getOriginStr(node)
    }

    const decls = [],
      other = []
    for (let i = 0; i < node.nodes.length; i++) {
      const it = node.nodes[i]
      const str = dfs(it)
      if (it.type === 'decl' || it.type === 'comment') {
        decls.push(str)
      } else {
        other.push(str)
      }
    }

    const res = decls.concat(other).join('')
    const before = node.raws.before || '' // 字符串之前的内容
    const between = node.raws.between || '' // .a {color:red} .a与 { 之间的空格
    const after = node.raws.after || '' // red与 } 之间的内容

    if (node.type === 'atrule') {
      return `${before}@${node.name} ${node.params}${between}{${res}${after}}`
    }

    if (node.type === 'rule') {
      return `${before}${node.selector}${between}{${res}${after}}`
    }
    if (node.type === 'root') {
      return `${res}${after}`
    }
  }
  return dfs(root)
}

const transformVue = (code) => {
  return code.replace(/(?<=<style[^>]*lang="scss"[^>]*>)[\s\S]*?(?=<\/style>)/g, (v) => {
    return transform(v)
  })
}

const errInfo = []

vueFiles.forEach((it) => {
  try {
    const code = fs.readFileSync(it, 'utf-8')
    const newCode = transformVue(code)
    fs.writeFileSync(it, newCode)
  } catch (err) {
    errInfo.push(it)
  }
})

sassFiles.forEach((it) => {
  try {
    const code = fs.readFileSync(it, 'utf-8')
    const newCode = transform(code)
    fs.writeFileSync(it, newCode)
  } catch (err) {
    errInfo.push(it)
  }
})

if (errInfo.length) {
  console.warn('定制的sass语法postcss无法解析,会自动略过!!!')
  console.log({ skipped: errInfo })
}
