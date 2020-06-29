import program from 'commander'
import pkg from '../package.json'
import fs from 'fs'
import path from 'path'
import ora from 'ora'
import debug from 'debug'
import shell from 'shelljs'
import { getFilePath } from './util';
import { sync } from 'glob'
const _debug = debug('mm:index')

// babel/uglifyjs等命令路径
const cmdBinPath = path.resolve(__dirname, '../../node_modules/.bin')

export default function index(): void {
  program
    .version(pkg.version) // 与package.version的版本一一对应
    .option('-c, --sourceCmd <sourceCmd>', '源目录编译命令', 'npm run build')
    .option('-C, --targetCmd <targetCmd>', '目标目录编译命令', 'npm run build')
    .option('-o, --sourceOutput <sourceOutput>', '源目录产物目录')
    .option('-O, --targetOutput <targetOutput>', '目标目录产物目录')
    .option('-e, --enterPage <enterPage>', '分包入口页面相对路径')
    .option('-r, --rename <rename>', '重命名目录名')
    .option('cleanTargetOutput', '清空目标目录产物目录')
    .option('cleanSourceOutput', '清空源目录产物目录')
    .option('independent', '是否独立分包')
    .option('preloadSubpackages', '是否复制分包预加载信息')
    .option('babelCompile', '是否使用babel7编译')
    .option('uglifyjsCompress', '是否使用uglifyjs压缩所有js文件')
    .option('-g, --glob <glob>', 'glob匹配压缩文件', './**/*.js')
    .option('-i, --globIgnore <globIgnore>', 'glob忽略文件', '**/node_modules/**')
    .parse(process.argv)

  const spinner = ora().start('正在处理请稍后')

  // source/cmd目录编译命令 target/cmd目录编译命令
  // source目录编译类型 
  // source/output目录 target/output 目录
  _debug(`cmdBinPath`, cmdBinPath)
  _debug(`program.sourceCmd`, program.sourceCmd)
  _debug(`program.targetCmd`, program.targetCmd)
  _debug(`program.sourceOutput`, program.sourceOutput)
  _debug(`program.targetOutput`, program.targetOutput)
  _debug(`program.cleanTargetOutput`, program.cleanTargetOutput)
  _debug(`program.cleanSourceOutput`, program.cleanSourceOutput)
  _debug(`program.babelCompile`, program.babelCompile)
  _debug(`program.uglifyjsCompress`, program.uglifyjsCompress)
  _debug(`program.glob`, program.glob)

  // ------------------------------------
  // check参数
  // ------------------------------------
  if (!program.sourceOutput || !program.targetOutput) {
    spinner.fail(`请输入-o 源目录产物目录和-O 目标目录产物目录`)
    shell.exit(1)
  }
  const sourceOutput = path.resolve(program.sourceOutput)
  const targetOutput = path.resolve(program.targetOutput)
  if (program.cleanTargetOutput || program.cleanSourceOutput) {
    if (typeof program.sourceOutput === 'string' && program.cleanSourceOutput) {
      if (fs.existsSync(sourceOutput)) {
        _debug(`需要删除的目录`, sourceOutput)
        shell.rm('-rf', path.resolve(program.sourceOutput))
        spinner.succeed(`删除目录${sourceOutput}成功`)
      } else {
        _debug(`需要删除目录，检测文件目录不存在`, sourceOutput)
        spinner.fail(`删除目录${sourceOutput}失败`)
      }
    }
    if (typeof program.targetOutput === 'string' && program.cleanTargetOutput) {
      if (fs.existsSync(targetOutput)) {
        _debug(`需要删除的目录`, targetOutput)
        shell.rm('-rf', path.resolve(program.targetOutput))
        spinner.succeed(`删除目录${targetOutput}成功`)
      } else {
        _debug(`需要删除目录，检测文件目录不存在`, targetOutput)
        spinner.fail(`删除目录${targetOutput}失败`)
      }
    }
  }

  // ------------------------------------
  // 编译优化源目录文件
  // ------------------------------------
  if (program.sourceCmd) {
    const sourcePathRst = shell.exec(`${program.sourceCmd}`)
    if (sourcePathRst.code === 0) {
      spinner.succeed(`源目录${process.cwd()}执行${program.sourceCmd}编译成功`)
    } else {
      spinner.fail(`源目录${process.cwd()}编译失败，命令为: ${program.sourceCmd}`)
      return
    }
  }

  // 记录下需要注入的page后面使用
  const sourceAppJson = fs.readFileSync(path.resolve(sourceOutput, 'app.json'), 'utf8')
  _debug(`sourceAppJson`, sourceAppJson)

  // 这里对源产物进行分包优化
  // wepy 去除app.wxss和app.json
  const deleteFileList = ['./app.wxss', './app.json']
  deleteFileList.forEach(item => {
    const rstPath = path.resolve(sourceOutput, item)
    _debug(`删除源目录产物文件${rstPath}`)
    shell.rm(rstPath)
  })
  if (program.babelCompile) {
    // 整个目录进行babel7编译
    const sourcePathRst = shell.exec(
      `${cmdBinPath}/babel ${sourceOutput} -d ${sourceOutput} --presets=${path.resolve(
        cmdBinPath,
        '../@babel/preset-env',
      )}`,
    )
    if (sourcePathRst.code === 0) {
      spinner.succeed(`源目录${sourceOutput}进行babel7编译成功`)
    } else {
      spinner.fail(`源目录${sourceOutput}进行babel7编译失败`)
      return
    }
  }
  if (program.uglifyjsCompress) {
    // 使用uglifyjs压缩目录下所有js文件

    // globFiles is array, may be []
    const globFiles = sync(program.glob, {
      cwd: sourceOutput,
      ignore: program.globIgnore,
      absolute: true,
    })
    _debug(`globFiles`, globFiles)
    for (const file of globFiles) {
      const shellRst = shell.exec(`${cmdBinPath}/uglifyjs ${file} -cmo ${file}`)
      if (shellRst.code !== 0) {
        _debug(`uglifyjs压缩文件${file}失败`)
        spinner.fail(`uglifyjs压缩文件${file}失败`)
      } else {
        _debug(`uglifyjs压缩文件${file}成功`)
        spinner.succeed(`uglifyjs压缩文件${file}成功`)
      }
    }
  }

  try {
    let enterPage = program.enterPage
    if (!enterPage) {
      // 从app.json第一个page取
      const sourceAppObj = JSON.parse(sourceAppJson)
      enterPage = `${path.resolve(sourceOutput, sourceAppObj.pages[0])}.js`
      _debug('自动获取enterPage路径', enterPage)
      spinner.succeed(`自动获取enterPage路径${enterPage}`)
    } else {
      enterPage = `${path.resolve(sourceOutput, enterPage)}.js`
      _debug('获取enterPage路径', enterPage)
      spinner.succeed(`获取enterPage路径${enterPage}`)
    }
    
    // 主页面插入app.js执行
    const fileContent = fs.readFileSync(enterPage).toString('utf8')

    // 根据enterPage路径向上寻找app.js文件
    const { rst, relativePath } = getFilePath(enterPage, 'app.js', path.resolve(program.sourceOutput))
    _debug(`递归寻找app.js文件结果`, rst, relativePath)
    if (rst) {
      // 如果有 "use strict";则插入后面，如果没有则直接插入开头
      fs.writeFileSync(enterPage, fileContent.replace(/^(['"]use strict['"];)?/, `$1require("${relativePath}");`), 'utf8')
      _debug(`${enterPage}文件注入代码成功`)
      spinner.succeed(`分包代码优化完成`)
    } else {
      _debug(`代码注入失败`, rst, relativePath)
      spinner.fail(`代码注入失败`)  
    }
  } catch (err) {
    _debug(`代码注入失败`, err)
    spinner.fail(`代码注入失败`)
  }

  // ------------------------------------
  // 编译目标目录文件
  // ------------------------------------
  if (program.targetCmd) {
    const targetPath = path.dirname(targetOutput)
    const targetPathRst = shell.exec(`cd ${targetPath} && ${program.targetCmd}`)
    if (targetPathRst.code === 0) {
      spinner.succeed(`目标目录${targetPath}编译成功`)
    }
  }
  
  // ------------------------------------
  // 拷贝代码并注入页面
  // ------------------------------------
  _debug(`sourceOutput`, sourceOutput)
  _debug(`targetOutput`, targetOutput)
  if (program.rename) {
    // 拼接targetOutput，如kbone的dist/mp改名为xxx等等
    const targetOutputRenamePath = path.resolve(targetOutput, program.rename)
    _debug(`rename targetOutput`, targetOutputRenamePath)
    shell.cp('-R', sourceOutput, targetOutputRenamePath)
  } else {
    shell.cp('-R', sourceOutput, targetOutput)
  }
  
  spinner.succeed(`拷贝目录${sourceOutput}到${targetOutput}成功`)

  // 注入page
  const targetAppJson = fs.readFileSync(path.resolve(targetOutput, 'app.json'), 'utf8')
  _debug('sourceAppJson', sourceAppJson)
  _debug('targetAppJson', targetAppJson)
  
  try {
    const sourceAppObj = JSON.parse(sourceAppJson)
    const targetAppObj = JSON.parse(targetAppJson)
    if (!Array.isArray(targetAppObj.subPackages)) {
      targetAppObj.subPackages = []
    }

    const insertSubpackItme: InsertSubpackItme = {
      root: program.rename ? `${program.rename}` : `${path.basename(sourceOutput)}/`,
      pages: sourceAppObj.pages,
      independent: !!program.independent,
    }
    targetAppObj.subPackages.push(insertSubpackItme)

    if (program.preloadSubpackages) {
      _debug(`注入分包预加载信息成功`, JSON.stringify(sourceAppObj.preloadRule))
      spinner.succeed(`注入分包预加载信息成功: ${JSON.stringify(sourceAppObj.preloadRule)}`)
      targetAppObj.preloadRule = sourceAppObj.preloadRule
    }

    fs.writeFileSync(path.resolve(targetOutput, 'app.json'), JSON.stringify(targetAppObj), 'utf8')
    _debug(`注入page成功`)

    // console
    sourceAppObj.pages.forEach((item: any) => {
      spinner.succeed(`注入页面成功: ${path.basename(sourceOutput)}/${item}`)
    })
  } catch(err){
    _debug(`注入page失败`, err)
    spinner.fail(`注入page失败`)
    console.log(err)
  }
  spinner.succeed(`合包完成`)
}

interface InsertSubpackItme {
  root: string;
  pages: string;
  independent?: boolean;
}
