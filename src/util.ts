import path from 'path'
import fs from 'fs'
import debug from 'debug'
const _debug = debug('mm:index')
/**
 * 递归寻找文件，返回相对nowPath的目录
 * @param nowPath 现在的目录
 * @param fileName 寻找的文件名
 */
export function getFilePath(
  nowPath: string,
  fileName: string,
  limit: string
) {
  // 是否以/结尾，是则是目录
  const basePath = /\/$/.test(nowPath) ? nowPath : path.dirname(nowPath)
  let nowDir = basePath

  // 递归寻找
  while (
    !fs.existsSync(path.resolve(nowDir, fileName)) &&
    (!limit || (limit && limit !== path.resolve(nowDir, fileName)))
  ) {
    nowDir = path.dirname(nowDir)
    _debug(`递归目录寻找${nowDir}`)
  }
  const appFilePath = path.resolve(nowDir, fileName)
  if (fs.existsSync(appFilePath)) {
    _debug(`递归目录寻找文件${fileName}成功，文件目录是${appFilePath}`)
    return {
      rst: true,
      relativePath: path.relative(basePath, appFilePath)
    }
  }
  return {
    rst: false,
    relativePath: '',
  }
}
