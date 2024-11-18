import fs from 'fs'
import { resolve } from 'path'
import { Plugin } from 'vite'

export const generateVersion = (): Plugin => {
  const version = Date.now() + ''
  return {
    name: 'generate-version',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(code) {
      return code.replace('<head>', `<head><script>window.appVersion="${version}"</script>`)
    },

    writeBundle(outputOptions) {
      // 获取输出目录的路径
      const outputDir = outputOptions.dir || 'dist'
      // 生成额外文件的完整路径
      const extraFilePath = resolve(outputDir, 'version')
      fs.writeFileSync(extraFilePath, version)
    }
  }
}
