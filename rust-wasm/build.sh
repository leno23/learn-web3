#!/bin/bash

echo "🦀 开始构建 Rust WebAssembly 项目..."

# 检查是否安装了 wasm-pack
if ! command -v wasm-pack &> /dev/null
then
    echo "❌ wasm-pack 未安装"
    echo "📦 正在安装 wasm-pack..."
    cargo install wasm-pack
fi

# 构建 WASM
echo "🔨 编译 Rust 代码到 WebAssembly..."
wasm-pack build --target web

if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    echo ""
    echo "📂 生成的文件在 pkg/ 目录中"
    echo ""
    echo "🚀 运行以下命令启动开发服务器："
    echo "   npm install -g http-server"
    echo "   http-server -p 8080"
    echo ""
    echo "然后在浏览器中访问："
    echo "   http://localhost:8080"
else
    echo "❌ 构建失败"
    exit 1
fi


