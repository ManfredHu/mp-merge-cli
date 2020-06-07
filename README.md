# 小程序分包合并命令行工具
工具主要提供微信小程序独立分包的合包功能

## 背景
小程序新的特性独立分包，我们可以把两个工程通过本项目命令合并为一个项目。各个项目开发时各自独立，在编译阶段合并在一起，这样各个小程序开发、访问各自独立。且不会有小程序跳转的弹窗，可以适应较大程序的分治管理。

本工具与具体的小程序框架无关，是建立在小程序分包的基础上的。如wepy1的两个项目合并，wepy1的项目合并wepy2的项目都可以用本工具实现。或原生小程序和wepy的项目合并。

## 原理
![](https://manfredhu-1252588796.cos.ap-guangzhou.myqcloud.com/mp-merge-cli%E5%8E%9F%E7%90%86.png)

## 安装

```bash
sudo npm i -g mp-merge-cli@latest
```

## 使用
如A为子项目，B为主项目，A项目build后产物路径相对当前路径为`./indepent`，B项目build后产物路径相对当前路径为`../B/dist`，A包的主入口为`./pages/main`。
则命令执行如下，工具会自动清空目录构建两个项目并注入脚本完成分包合并。

```bash
mm cleanOutput independent -o './indepent' -O '../B/dist' -e './pages/main'

# 上下一样
mp-merge cleanOutput independent -o './indepent' -O '../B/dist' -e './pages/main'
```

## 参数说明

| 参数名               | 含义                 | 默认值        | 是否必传 |
| -------------------- | -------------------- | ------------- | -------- |
| -c或--sourceCmd      | 源目录编译命令       | npm run build | 是       |
| -C或--targetCmd      | 目标目录编译命令     | npm run build | 是       |
| -o或者--sourceOutput | 源目录产物目录       | 无            | 是       |
| -O或者--targetOutput | 目标目录产物目录     | 无            | 是       |
| -e或者--enterPage    | 分包入口页面相对路径 | 无            | 是       |
| cleanOutput          | 清空产物目录         | false         | 否       |
| independent          | 是否独立分包         | false         | 否       |


## 调试
其中`DEBUG=mm:*`为环境变量，调试用。

```bash
DEBUG=mm:* xxx
```

## 帮助
安装后可以命令行查看命令
```
mm --help
```

