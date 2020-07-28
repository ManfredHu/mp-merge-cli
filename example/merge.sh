#!/bin/bash

# -r means rename kbone
cd kbone-demo1 && mm cleanTargetOutput cleanSourceOutput babelCompile uglifyjsCompress independent -r "kbone" -c "npm run mp" -o './dist/mp' -O '../wepy-wechat-demo/dist'


