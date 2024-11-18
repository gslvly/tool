import { Plugin } from 'vite'
import * as fs from 'fs'
import path from 'path'
import { normalizePath } from 'vite'
export const iconStats = ({
  svgDir,
  iconfont,
  src,
  clean = false
}: {
  svgDir?: string[]
  iconfont?: string
  src: string
  clean: boolean
}): Plugin => {
  /**没有使用的 */
  let iconfontNotUsed = [] as string[]
  let svgNotUsed = [] as string[]
  const iconfontUsed = [] as string[]
  const svgUsed = [] as string[]

  iconfont = iconfont && path.resolve(iconfont)
  const collectIconfonts = () => {
    if (!iconfont) return
    const code = fs.readFileSync(iconfont, 'utf-8')
    iconfontNotUsed = code.match(/(?<=symbol\s*id=")(.+?)(?=")/g) || []
  }

  const findFiles = (dir: string, fn: (file: string) => boolean) => {
    const res = [] as string[]
    const dfs = (dir: string) => {
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
  const collectSvgIcons = () => {
    if (!svgDir) return
    svgDir.forEach((dir) => {
      const files = findFiles(dir, (file) => path.extname(file) === '.svg')
      svgNotUsed = svgNotUsed.concat(files.map((file) => path.basename(file, '.svg')))
    })
    svgNotUsed = [...new Set(svgNotUsed)]
  }

  const collectUsed = () => {
    const files = findFiles(src, (v) => {
      if (v === iconfont) return false
      const ext = path.extname(v)
      return ext === '.vue' || ext === '.ts' || ext === '.js' || ext === '.jsx' || ext === 'tsx'
    })
    const markUsed = (arr: string[], usedArr: string[], code: string) => {
      for (let i = 0; i < arr.length; i++) {
        while (arr[i] && code.includes(arr[i])) {
          usedArr.push(arr[i])
          ;[arr[i], arr[arr.length - 1]] = [arr[arr.length - 1], arr[i]]
          arr.pop()
        }
      }
    }

    files.forEach((it) => {
      const code = fs.readFileSync(it, 'utf-8')
      markUsed(iconfontNotUsed, iconfontUsed, code)
      markUsed(svgNotUsed, svgUsed, code)
    })
  }

  const startCollect = () => {
    console.time('load')
    collectSvgIcons()
    collectIconfonts()
    collectUsed()
    console.timeEnd('load')
  }
  const loadIconfont = () => {
    startCollect()
    const used = new Set(iconfontUsed || [])
    const code = fs.readFileSync(iconfont, 'utf-8')

    const res = code.replace(/<symbol\s+.+?<\/symbol>/g, (v) => {
      const id = v.match(/id="(.+?)"/)?.[1]
      return used.has(id) ? v : ''
    })

    return res
  }

  return {
    name: 'iconStats',
    enforce: 'pre',
    resolveId(id) {
      if (clean && id === iconfont) {
        return id
      }
      return null
    },
    configureServer: ({ middlewares }) => {
      middlewares.use(async (req, res, next) => {
        const url = normalizePath(req.url)
        // console.log({ url }, url === '/icon-stats', req.method === 'get')
        if (url === '/icon-stats' && req.method === 'GET') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Authorization')

          res.setHeader('Content-Type', 'text/json')
          res.setHeader('Cache-Control', 'no-cache')
          startCollect()
          const code = JSON.stringify({
            iconfontNotUsed: clean ? [] : iconfontNotUsed,
            svgNotUsed,
            svgUsed,
            iconfontUsed
          })

          res.statusCode = 200
          res.end(code)
        } else {
          next()
        }
      })
    },
    load(id) {
      if (id === iconfont && clean) {
        return loadIconfont()
      }
    }
  }
}
