#!/bin/bash

# npm i
cd wepy-wechat-demo && npm i && cd ..

# -r means rename kbone
cd kbone-demo1 && npm i && mm cleanTargetOutput cleanSourceOutput babelCompile uglifyjsCompress independent -r "kbone" -c "npm run mp" -o './dist/mp' -O '../wepy-wechat-demo/dist'


