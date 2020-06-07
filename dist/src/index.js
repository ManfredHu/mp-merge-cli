"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var commander_1 = tslib_1.__importDefault(require("commander"));
var package_json_1 = tslib_1.__importDefault(require("../package.json"));
var fs_1 = tslib_1.__importDefault(require("fs"));
var path_1 = tslib_1.__importDefault(require("path"));
var ora_1 = tslib_1.__importDefault(require("ora"));
var debug_1 = tslib_1.__importDefault(require("debug"));
var shelljs_1 = tslib_1.__importDefault(require("shelljs"));
var _debug = debug_1.default('mm:index');
function index() {
    commander_1.default
        .version(package_json_1.default.version) // 与package.version的版本一一对应
        .option('-c, --sourceCmd <sourceCmd>', '源目录编译命令', 'npm run build')
        .option('-C, --targetCmd <targetCmd>', '目标目录编译命令', 'npm run build')
        .option('-o, --sourceOutput <sourceOutput>', '源目录产物目录')
        .option('-O, --targetOutput <targetOutput>', '目标目录产物目录')
        .option('-e, --enterPage <enterPage>', '分包入口页面相对路径')
        .option('cleanOutput', '清空产物目录')
        .option('independent', '是否独立分包')
        .parse(process.argv);
    var spinner = ora_1.default().start('正在处理请稍后');
    // source/cmd目录编译命令 target/cmd目录编译命令
    // source目录编译类型 
    // source/output目录 target/output 目录
    _debug("program.sourceCmd", commander_1.default.sourceCmd);
    _debug("program.targetCmd", commander_1.default.targetCmd);
    _debug("program.sourceOutput", commander_1.default.sourceOutput);
    _debug("program.targetOutput", commander_1.default.targetOutput);
    _debug("program.cleanOutput", commander_1.default.cleanOutput);
    // ------------------------------------
    // check参数
    // ------------------------------------
    if (!commander_1.default.sourceOutput || !commander_1.default.targetOutput) {
        spinner.fail("\u8BF7\u8F93\u5165-o \u6E90\u76EE\u5F55\u4EA7\u7269\u76EE\u5F55\u548C-O \u76EE\u6807\u76EE\u5F55\u4EA7\u7269\u76EE\u5F55");
        shelljs_1.default.exit(1);
    }
    var sourceOutput = path_1.default.resolve(commander_1.default.sourceOutput);
    var targetOutput = path_1.default.resolve(commander_1.default.targetOutput);
    if (commander_1.default.cleanOutput) {
        if (typeof commander_1.default.sourceOutput === 'string') {
            if (fs_1.default.existsSync(sourceOutput)) {
                _debug("\u9700\u8981\u5220\u9664\u7684\u76EE\u5F55", sourceOutput);
                shelljs_1.default.rm('-rf', path_1.default.resolve(commander_1.default.sourceOutput));
                spinner.succeed("\u5220\u9664\u76EE\u5F55" + sourceOutput + "\u6210\u529F");
            }
            else {
                _debug("\u9700\u8981\u5220\u9664\u76EE\u5F55\uFF0C\u68C0\u6D4B\u6587\u4EF6\u76EE\u5F55\u4E0D\u5B58\u5728", sourceOutput);
                spinner.fail("\u5220\u9664\u76EE\u5F55" + sourceOutput + "\u5931\u8D25");
            }
        }
        if (typeof commander_1.default.targetOutput === 'string') {
            if (fs_1.default.existsSync(targetOutput)) {
                _debug("\u9700\u8981\u5220\u9664\u7684\u76EE\u5F55", targetOutput);
                shelljs_1.default.rm('-rf', path_1.default.resolve(commander_1.default.targetOutput));
                spinner.succeed("\u5220\u9664\u76EE\u5F55" + targetOutput + "\u6210\u529F");
            }
            else {
                _debug("\u9700\u8981\u5220\u9664\u76EE\u5F55\uFF0C\u68C0\u6D4B\u6587\u4EF6\u76EE\u5F55\u4E0D\u5B58\u5728", targetOutput);
                spinner.fail("\u5220\u9664\u76EE\u5F55" + targetOutput + "\u5931\u8D25");
            }
        }
    }
    // ------------------------------------
    // 编译优化源目录文件
    // ------------------------------------
    var sourcePath = path_1.default.dirname(sourceOutput);
    var sourcePathRst = shelljs_1.default.exec("cd " + sourcePath + " && " + commander_1.default.sourceCmd);
    if (sourcePathRst.code === 0) {
        spinner.succeed("\u6E90\u76EE\u5F55" + sourcePath + "\u7F16\u8BD1\u6210\u529F");
    }
    // 记录下需要注入的page后面使用
    var sourceAppJson = fs_1.default.readFileSync(path_1.default.resolve(sourceOutput, 'app.json'), 'utf8');
    _debug("sourceAppJson", sourceAppJson);
    // 这里对源产物进行分包优化
    // wepy 去除app.wxss和app.json
    var deleteFileList = ['./app.wxss', './app.json'];
    deleteFileList.forEach(function (item) {
        var rstPath = path_1.default.resolve(sourceOutput, item);
        _debug("\u5220\u9664\u6E90\u76EE\u5F55\u4EA7\u7269\u6587\u4EF6" + rstPath);
        shelljs_1.default.rm(rstPath);
    });
    try {
        var enterPage = commander_1.default.enterPage;
        if (!enterPage) {
            // 从app.json第一个page取
            var sourceAppObj = JSON.parse(sourceAppJson);
            enterPage = path_1.default.resolve(sourceOutput, sourceAppObj.pages[0]) + ".js";
            _debug('自动获取enterPage路径', enterPage);
            spinner.succeed("\u81EA\u52A8\u83B7\u53D6enterPage\u8DEF\u5F84" + enterPage);
        }
        else {
            enterPage = path_1.default.resolve(sourceOutput, enterPage) + ".js";
            _debug('获取enterPage路径', enterPage);
            spinner.succeed("\u83B7\u53D6enterPage\u8DEF\u5F84" + enterPage);
        }
        // 主页面插入app.js执行
        var fileContent = fs_1.default.readFileSync(enterPage).toString('utf8');
        // 如果有 "use strict";则插入后面，如果没有则直接插入开头
        fs_1.default.writeFileSync(enterPage, fileContent.replace(/^(['"]use strict['"];)?/, '$1require("../app.js");'), 'utf8');
        _debug(enterPage + "\u6587\u4EF6\u6CE8\u5165\u4EE3\u7801\u6210\u529F");
        spinner.succeed("\u5206\u5305\u4EE3\u7801\u4F18\u5316\u5B8C\u6210");
    }
    catch (err) {
        _debug("\u4EE3\u7801\u6CE8\u5165\u5931\u8D25", err);
        spinner.fail("\u4EE3\u7801\u6CE8\u5165\u5931\u8D25");
    }
    // ------------------------------------
    // 编译目标目录文件
    // ------------------------------------
    var targetPath = path_1.default.dirname(targetOutput);
    var targetPathRst = shelljs_1.default.exec("cd " + targetPath + " && " + commander_1.default.sourceCmd);
    if (targetPathRst.code === 0) {
        spinner.succeed("\u76EE\u6807\u76EE\u5F55" + targetPath + "\u7F16\u8BD1\u6210\u529F");
    }
    // ------------------------------------
    // 拷贝代码并注入页面
    // ------------------------------------
    _debug("sourceOutput", sourceOutput);
    _debug("targetOutput", targetOutput);
    shelljs_1.default.cp('-R', sourceOutput, targetOutput);
    spinner.succeed("\u62F7\u8D1D\u76EE\u5F55" + sourceOutput + "\u5230" + targetOutput + "\u6210\u529F");
    // 注入page
    var targetAppJson = fs_1.default.readFileSync(path_1.default.resolve(targetOutput, 'app.json'), 'utf8');
    _debug('sourceAppJson', sourceAppJson);
    _debug('targetAppJson', targetAppJson);
    try {
        var sourceAppObj = JSON.parse(sourceAppJson);
        var targetAppObj = JSON.parse(targetAppJson);
        if (!Array.isArray(targetAppObj.subpackages)) {
            targetAppObj.subpackages = [];
        }
        var insertSubpackItme = {
            root: path_1.default.basename(sourceOutput) + "/",
            pages: sourceAppObj.pages,
            independent: !!commander_1.default.independent,
        };
        targetAppObj.subpackages.push(insertSubpackItme);
        fs_1.default.writeFileSync(path_1.default.resolve(targetOutput, 'app.json'), JSON.stringify(targetAppObj), 'utf8');
        _debug("\u6CE8\u5165page\u6210\u529F");
        spinner.succeed("\u6CE8\u5165page\u6210\u529F");
    }
    catch (err) {
        _debug("\u6CE8\u5165page\u5931\u8D25", err);
        spinner.fail("\u6CE8\u5165page\u5931\u8D25");
        console.log(err);
    }
    spinner.succeed("\u5408\u5305\u5B8C\u6210");
}
exports.default = index;
