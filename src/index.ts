import program from 'commander'
import pkg from '../package.json'
import fs from 'fs'
import path from 'path'
import ora from 'ora'
import debug from 'debug'
import shell from 'shelljs'
const _debug = debug('mm:index')

export default function index(): void {
  program
    .version(pkg.version) // 与package.version的版本一一对应
    .option('-c, --sourceCmd <sourceCmd>', '源目录编译命令', 'npm run build')
    .option('-C, --targetCmd <targetCmd>', '目标目录编译命令', 'npm run build')
    .option('-o, --sourceOutput <sourceOutput>', '源目录产物目录')
    .option('-O, --targetOutput <targetOutput>', '目标目录产物目录')
    .option('-e, --enterPage <enterPage>', '分包入口页面相对路径')
    .option('cleanOutput', '清空产物目录')
    .option('independent', '是否独立分包')
    .parse(process.argv)

  const spinner = ora().start('正在处理请稍后')

  // source/cmd目录编译命令 target/cmd目录编译命令
  // source目录编译类型 
  // source/output目录 target/output 目录
  _debug(`program.sourceCmd`, program.sourceCmd)
  _debug(`program.targetCmd`, program.targetCmd)
  _debug(`program.sourceOutput`, program.sourceOutput)
  _debug(`program.targetOutput`, program.targetOutput)
  _debug(`program.cleanOutput`, program.cleanOutput)

  // ------------------------------------
  // check参数
  // ------------------------------------
  if (!program.sourceOutput || !program.targetOutput) {
    spinner.fail(`请输入-o 源目录产物目录和-O 目标目录产物目录`)
    shell.exit(1)
  }
  const sourceOutput = path.resolve(program.sourceOutput)
  const targetOutput = path.resolve(program.targetOutput)
  if (program.cleanOutput) {
    if (typeof program.sourceOutput === 'string') {
      if (fs.existsSync(sourceOutput)) {
        _debug(`需要删除的目录`, sourceOutput)
        shell.rm('-rf', path.resolve(program.sourceOutput))
        spinner.succeed(`删除目录${sourceOutput}成功`)
      } else {
        _debug(`需要删除目录，检测文件目录不存在`, sourceOutput)
        spinner.fail(`删除目录${sourceOutput}失败`)
      }
    }
    if (typeof program.targetOutput === 'string') {
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
  const sourcePath = path.dirname(sourceOutput)
  const sourcePathRst = shell.exec(`cd ${sourcePath} && ${program.sourceCmd}`)
  if (sourcePathRst.code === 0) {
    spinner.succeed(`源目录${sourcePath}编译成功`)
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
  if (program.enterPage) {
    try {
      const rstPath = `${path.resolve(sourceOutput, program.enterPage)}.js`
      // 主页面插入app.js执行
      const fileContent = fs.readFileSync(rstPath).toString('utf8')
      // 如果有 "use strict";则插入后面，如果没有则直接插入开头
      fs.writeFileSync(
        rstPath,
        fileContent.replace(/^(['"]use strict['"];)?/, '$1require("../app.js");'),
        'utf8',
      )
      _debug(`${rstPath}文件注入代码成功`)
      spinner.succeed(`分包代码优化完成`)
    } catch(err) {
      _debug(`代码注入失败`, err)
      spinner.fail(`代码注入失败`)
    }
  } else {
    spinner.fail('请输入 -e 分包入口页面相对路径')
  }

  // ------------------------------------
  // 编译目标目录文件
  // ------------------------------------
  const targetPath = path.dirname(targetOutput)
  const targetPathRst = shell.exec(`cd ${targetPath} && ${program.sourceCmd}`)
  if (targetPathRst.code === 0) {
    spinner.succeed(`目标目录${targetPath}编译成功`)
  }

  // ------------------------------------
  // 拷贝代码并注入页面
  // ------------------------------------
  _debug(`sourceOutput`, sourceOutput)
  _debug(`targetOutput`, targetOutput)
  shell.cp('-R', sourceOutput, targetOutput)
  spinner.succeed(`拷贝目录${sourceOutput}到${targetOutput}成功`)

  // 注入page
  const targetAppJson = fs.readFileSync(path.resolve(targetOutput, 'app.json'), 'utf8')
  _debug('sourceAppJson', sourceAppJson)
  _debug('targetAppJson', targetAppJson)
  
  try {
    const sourceAppObj = JSON.parse(sourceAppJson)
    const targetAppObj = JSON.parse(targetAppJson)
    if (!Array.isArray(targetAppObj.subpackages)) {
      targetAppObj.subpackages = []
    }

    const insertSubpackItme: InsertSubpackItme = {
      root: `${path.basename(sourceOutput)}/`,
      pages: sourceAppObj.pages,
      independent: !!program.independent,
    }
    targetAppObj.subpackages.push(insertSubpackItme)
    fs.writeFileSync(path.resolve(targetOutput, 'app.json'), JSON.stringify(targetAppObj), 'utf8')
    _debug(`注入page成功`)
    spinner.succeed(`注入page成功`)
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
