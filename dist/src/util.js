"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var path_1 = tslib_1.__importDefault(require("path"));
var fs_1 = tslib_1.__importDefault(require("fs"));
var debug_1 = tslib_1.__importDefault(require("debug"));
var _debug = debug_1.default('mm:index');
/**
 * 递归寻找文件，返回相对nowPath的目录
 * @param nowPath 现在的目录
 * @param fileName 寻找的文件名
 */
function getFilePath(nowPath, fileName, limit) {
    // 是否以/结尾，是则是目录
    var basePath = /\/$/.test(nowPath) ? nowPath : path_1.default.dirname(nowPath);
    var nowDir = basePath;
    // 递归寻找
    while (!fs_1.default.existsSync(path_1.default.resolve(nowDir, fileName)) &&
        (!limit || (limit && limit !== path_1.default.resolve(nowDir, fileName)))) {
        nowDir = path_1.default.dirname(nowDir);
        _debug("\u9012\u5F52\u76EE\u5F55\u5BFB\u627E" + nowDir);
    }
    var appFilePath = path_1.default.resolve(nowDir, fileName);
    if (fs_1.default.existsSync(appFilePath)) {
        _debug("\u9012\u5F52\u76EE\u5F55\u5BFB\u627E\u6587\u4EF6" + fileName + "\u6210\u529F\uFF0C\u6587\u4EF6\u76EE\u5F55\u662F" + appFilePath);
        return {
            rst: true,
            relativePath: path_1.default.relative(basePath, appFilePath)
        };
    }
    return {
        rst: false,
        relativePath: '',
    };
}
exports.getFilePath = getFilePath;
