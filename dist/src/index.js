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
var util_1 = require("./util");
var glob_1 = require("glob");
var _debug = debug_1.default('mm:index');
// babel/uglifyjs等命令路径
var cmdBinPath = path_1.default.resolve(__dirname, '../../node_modules/.bin');
function index() {
    commander_1.default
        .version(package_json_1.default.version) // 与package.version的版本一一对应
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
        .parse(process.argv);
    var spinner = ora_1.default().start('正在处理请稍后');
    // source/cmd目录编译命令 target/cmd目录编译命令
    // source目录编译类型 
    // source/output目录 target/output 目录
    _debug("cmdBinPath", cmdBinPath);
    _debug("program.sourceCmd", commander_1.default.sourceCmd);
    _debug("program.targetCmd", commander_1.default.targetCmd);
    _debug("program.sourceOutput", commander_1.default.sourceOutput);
    _debug("program.targetOutput", commander_1.default.targetOutput);
    _debug("program.cleanTargetOutput", commander_1.default.cleanTargetOutput);
    _debug("program.cleanSourceOutput", commander_1.default.cleanSourceOutput);
    _debug("program.babelCompile", commander_1.default.babelCompile);
    _debug("program.uglifyjsCompress", commander_1.default.uglifyjsCompress);
    _debug("program.glob", commander_1.default.glob);
    // ------------------------------------
    // check参数
    // ------------------------------------
    if (!commander_1.default.sourceOutput || !commander_1.default.targetOutput) {
        spinner.fail("\u8BF7\u8F93\u5165-o \u6E90\u76EE\u5F55\u4EA7\u7269\u76EE\u5F55\u548C-O \u76EE\u6807\u76EE\u5F55\u4EA7\u7269\u76EE\u5F55");
        shelljs_1.default.exit(1);
    }
    var sourceOutput = path_1.default.resolve(commander_1.default.sourceOutput);
    var targetOutput = path_1.default.resolve(commander_1.default.targetOutput);
    if (commander_1.default.cleanTargetOutput || commander_1.default.cleanSourceOutput) {
        if (typeof commander_1.default.sourceOutput === 'string' && commander_1.default.cleanSourceOutput) {
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
        if (typeof commander_1.default.targetOutput === 'string' && commander_1.default.cleanTargetOutput) {
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
    if (commander_1.default.sourceCmd) {
        var sourcePathRst = shelljs_1.default.exec("" + commander_1.default.sourceCmd);
        if (sourcePathRst.code === 0) {
            spinner.succeed("\u6E90\u76EE\u5F55" + process.cwd() + "\u6267\u884C" + commander_1.default.sourceCmd + "\u7F16\u8BD1\u6210\u529F");
        }
        else {
            spinner.fail("\u6E90\u76EE\u5F55" + process.cwd() + "\u7F16\u8BD1\u5931\u8D25\uFF0C\u547D\u4EE4\u4E3A: " + commander_1.default.sourceCmd);
            return;
        }
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
    if (commander_1.default.babelCompile) {
        // 整个目录进行babel7编译
        var sourcePathRst = shelljs_1.default.exec(cmdBinPath + "/babel " + sourceOutput + " -d " + sourceOutput + " --presets=" + path_1.default.resolve(cmdBinPath, '../@babel/preset-env'));
        if (sourcePathRst.code === 0) {
            spinner.succeed("\u6E90\u76EE\u5F55" + sourceOutput + "\u8FDB\u884Cbabel7\u7F16\u8BD1\u6210\u529F");
        }
        else {
            spinner.fail("\u6E90\u76EE\u5F55" + sourceOutput + "\u8FDB\u884Cbabel7\u7F16\u8BD1\u5931\u8D25");
            return;
        }
    }
    if (commander_1.default.uglifyjsCompress) {
        // 使用uglifyjs压缩目录下所有js文件
        // globFiles is array, may be []
        var globFiles = glob_1.sync(commander_1.default.glob, {
            cwd: sourceOutput,
            ignore: commander_1.default.globIgnore,
            absolute: true,
        });
        _debug("globFiles", globFiles);
        for (var _i = 0, globFiles_1 = globFiles; _i < globFiles_1.length; _i++) {
            var file = globFiles_1[_i];
            var shellRst = shelljs_1.default.exec(cmdBinPath + "/uglifyjs " + file + " -cmo " + file);
            if (shellRst.code !== 0) {
                _debug("uglifyjs\u538B\u7F29\u6587\u4EF6" + file + "\u5931\u8D25");
                spinner.fail("uglifyjs\u538B\u7F29\u6587\u4EF6" + file + "\u5931\u8D25");
            }
            else {
                _debug("uglifyjs\u538B\u7F29\u6587\u4EF6" + file + "\u6210\u529F");
                spinner.succeed("uglifyjs\u538B\u7F29\u6587\u4EF6" + file + "\u6210\u529F");
            }
        }
    }
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
        // 根据enterPage路径向上寻找app.js文件
        var _a = util_1.getFilePath(enterPage, 'app.js', path_1.default.resolve(commander_1.default.sourceOutput)), rst = _a.rst, relativePath = _a.relativePath;
        _debug("\u9012\u5F52\u5BFB\u627Eapp.js\u6587\u4EF6\u7ED3\u679C", rst, relativePath);
        if (rst) {
            // 如果有 "use strict";则插入后面，如果没有则直接插入开头
            fs_1.default.writeFileSync(enterPage, fileContent.replace(/^(['"]use strict['"];)?/, "$1require(\"" + relativePath + "\");"), 'utf8');
            _debug(enterPage + "\u6587\u4EF6\u6CE8\u5165\u4EE3\u7801\u6210\u529F");
            spinner.succeed("\u5206\u5305\u4EE3\u7801\u4F18\u5316\u5B8C\u6210");
        }
        else {
            _debug("\u4EE3\u7801\u6CE8\u5165\u5931\u8D25", rst, relativePath);
            spinner.fail("\u4EE3\u7801\u6CE8\u5165\u5931\u8D25");
        }
    }
    catch (err) {
        _debug("\u4EE3\u7801\u6CE8\u5165\u5931\u8D25", err);
        spinner.fail("\u4EE3\u7801\u6CE8\u5165\u5931\u8D25");
    }
    // ------------------------------------
    // 编译目标目录文件
    // ------------------------------------
    if (commander_1.default.targetCmd) {
        var targetPath = path_1.default.dirname(targetOutput);
        var targetPathRst = shelljs_1.default.exec("cd " + targetPath + " && " + commander_1.default.targetCmd);
        if (targetPathRst.code === 0) {
            spinner.succeed("\u76EE\u6807\u76EE\u5F55" + targetPath + "\u7F16\u8BD1\u6210\u529F");
        }
    }
    // ------------------------------------
    // 拷贝代码并注入页面
    // ------------------------------------
    _debug("sourceOutput", sourceOutput);
    _debug("targetOutput", targetOutput);
    if (commander_1.default.rename) {
        // 拼接targetOutput，如kbone的dist/mp改名为xxx等等
        var targetOutputRenamePath = path_1.default.resolve(targetOutput, commander_1.default.rename);
        _debug("rename targetOutput", targetOutputRenamePath);
        shelljs_1.default.cp('-R', sourceOutput, targetOutputRenamePath);
    }
    else {
        shelljs_1.default.cp('-R', sourceOutput, targetOutput);
    }
    spinner.succeed("\u62F7\u8D1D\u76EE\u5F55" + sourceOutput + "\u5230" + targetOutput + "\u6210\u529F");
    // 注入page
    var targetAppJson = fs_1.default.readFileSync(path_1.default.resolve(targetOutput, 'app.json'), 'utf8');
    _debug('sourceAppJson', sourceAppJson);
    _debug('targetAppJson', targetAppJson);
    try {
        var sourceAppObj = JSON.parse(sourceAppJson);
        var targetAppObj = JSON.parse(targetAppJson);
        if (!Array.isArray(targetAppObj.subPackages)) {
            targetAppObj.subPackages = [];
        }
        var insertSubpackItme = {
            root: commander_1.default.rename ? "" + commander_1.default.rename : path_1.default.basename(sourceOutput) + "/",
            pages: sourceAppObj.pages,
            independent: !!commander_1.default.independent,
        };
        targetAppObj.subPackages.push(insertSubpackItme);
        if (commander_1.default.preloadSubpackages) {
            _debug("\u6CE8\u5165\u5206\u5305\u9884\u52A0\u8F7D\u4FE1\u606F\u6210\u529F", JSON.stringify(sourceAppObj.preloadRule));
            spinner.succeed("\u6CE8\u5165\u5206\u5305\u9884\u52A0\u8F7D\u4FE1\u606F\u6210\u529F: " + JSON.stringify(sourceAppObj.preloadRule));
            targetAppObj.preloadRule = sourceAppObj.preloadRule;
        }
        fs_1.default.writeFileSync(path_1.default.resolve(targetOutput, 'app.json'), JSON.stringify(targetAppObj), 'utf8');
        _debug("\u6CE8\u5165page\u6210\u529F");
        // console
        sourceAppObj.pages.forEach(function (item) {
            spinner.succeed("\u6CE8\u5165\u9875\u9762\u6210\u529F: " + path_1.default.basename(sourceOutput) + "/" + item);
        });
    }
    catch (err) {
        _debug("\u6CE8\u5165page\u5931\u8D25", err);
        spinner.fail("\u6CE8\u5165page\u5931\u8D25");
        console.log(err);
    }
    spinner.succeed("\u5408\u5305\u5B8C\u6210");
}
exports.default = index;
