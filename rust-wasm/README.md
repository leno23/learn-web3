# 🦀 Rust WebAssembly Demo

这是一个演示如何使用 Rust 编译成 WebAssembly 并在浏览器中运行的项目。

## ✨ 功能特性

### 基础示例 (index.html)
- **斐波那契数列计算**：使用 Rust 高效计算斐波那契数
- **质数检测**：判断一个数字是否为质数
- **Mandelbrot 分形**：生成美丽的分形图像
- **现代化 UI**：漂亮的渐变设计和交互效果

### 🚀 性能对比示例 (performance.html) - **推荐**
- **4种复杂绘图计算场景**：Mandelbrot分形、Julia分形、粒子系统、热扩散模拟
- **实时性能对比**：直观比较 WASM vs JavaScript 的性能差异
- **可调节参数**：支持不同画布尺寸和迭代次数
- **详细性能指标**：计算时间、渲染时间、性能提升倍数
- **并排显示**：同时查看 WASM 和 JS 的渲染结果

💡 **性能提升**: WebAssembly 通常比纯 JavaScript 快 **2-8倍**！

## 📋 前置要求

1. 安装 Rust：
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. 添加 wasm32 目标：
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

3. 安装 wasm-pack（构建脚本会自动安装，也可以手动安装）：
   ```bash
   cargo install wasm-pack
   ```

## 🚀 快速开始

### ⚡ 一键启动（最快方式）

```bash
chmod +x build.sh start-server.sh
./start-server.sh
```

然后在浏览器中访问：
- **性能对比**: http://localhost:8080/performance.html （推荐！）
- **基础示例**: http://localhost:8080/index.html

### 方法二：手动构建和运行

1. 编译 WASM 模块：
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

2. 启动 HTTP 服务器：
   ```bash
   # 使用 Python（推荐）
   python3 -m http.server 8080
   
   # 或使用 Node.js
   npx http-server -p 8080
   ```

3. 在浏览器中打开：
   ```
   http://localhost:8080/performance.html
   ```

## 🎮 使用指南

### 性能对比示例 (performance.html)

1. **选择测试项目**：
   - Mandelbrot 分形：经典分形渲染，密集数学运算
   - Julia 分形：美丽的分形图案
   - 粒子系统：200个粒子的物理模拟 (O(n²) 复杂度最高)
   - 热扩散：热传导模拟

2. **设置参数**：
   - 画布尺寸：从 400×300 到 1000×750
   - 迭代次数：10 - 500 次

3. **运行测试**：
   - 🔄 **开始性能对比**：同时测试 WASM 和 JS 并对比
   - ⚡ **仅运行 WASM**：只测试 WebAssembly 版本
   - 📊 **仅运行 JavaScript**：只测试纯 JS 版本

4. **查看结果**：
   - 左侧显示 WASM (Rust) 的渲染结果和性能
   - 右侧显示 JavaScript 的渲染结果和性能
   - 顶部显示性能汇总：耗时对比、提升倍数、时间节省

💡 **提示**：画布越大、迭代次数越多，WASM 的性能优势越明显！

## 📁 项目结构

```
rust-wasm/
├── Cargo.toml                    # Rust 项目配置
├── src/
│   └── lib.rs                   # Rust 源代码（包含所有 WASM 导出函数）
├── index.html                   # 基础示例界面
├── index.js                     # 基础示例 JavaScript 代码
├── performance.html             # 性能对比示例界面（推荐）
├── performance.js               # 性能对比 JavaScript 代码（含 JS 实现）
├── build.sh                     # 编译脚本
├── start-server.sh              # 启动服务器脚本
├── README.md                    # 项目说明
├── QUICKSTART.md                # 快速开始指南
├── PERFORMANCE_COMPARISON.md    # 性能对比详细文档
└── pkg/                         # 编译生成的 WASM 文件（运行构建后生成）
    ├── rust_wasm_demo.js        # WASM 包装器
    ├── rust_wasm_demo_bg.wasm   # WASM 二进制文件
    └── ...
```

## 🎯 核心代码说明

### Rust 代码 (src/lib.rs)

#### 基础函数
- `add(a, b)`: 简单加法运算
- `greet(name)`: 返回欢迎消息
- `fibonacci(n)` / `fibonacci_fast(n)`: 计算斐波那契数（递归/迭代版本）
- `is_prime(n)`: 检查是否为质数
- `primes_in_range(start, end)`: 生成范围内的质数列表

#### 图形计算函数（性能关键）
- `generate_mandelbrot(width, height, max_iterations)`: 生成 Mandelbrot 分形 RGBA 数据
- `generate_julia(width, height, max_iterations, c_real, c_imag)`: 生成 Julia 分形数据
- `simulate_particles(...)`: 粒子物理模拟（包含碰撞检测）
- `calculate_heat_diffusion(...)`: 热扩散计算
- `heat_to_color(heat_data)`: 热力图转换为颜色数据

### JavaScript 集成

通过 ES6 模块导入 WASM 函数：
```javascript
import init, { 
    generate_mandelbrot, 
    generate_julia,
    simulate_particles,
    calculate_heat_diffusion 
} from './pkg/rust_wasm_demo.js';

// 初始化 WASM 模块
await init();

// 调用 WASM 函数
const data = generate_mandelbrot(800, 600, 100);
```

### 性能对比实现

`performance.js` 中包含了所有算法的纯 JavaScript 实现版本，与 WASM 版本使用完全相同的算法，确保公平对比。

## 🔧 开发说明

1. 修改 Rust 代码后，重新运行构建：
   ```bash
   ./build.sh
   ```

2. 刷新浏览器即可看到更新

3. 打开浏览器控制台可以看到详细的日志输出

## 🌟 扩展建议

- ✅ **已实现**：4种复杂图形计算算法
- ✅ **已实现**：完整的性能对比系统
- 💡 添加更多分形算法（Burning Ship、Newton）
- 💡 实现游戏逻辑（如贪吃蛇、俄罗斯方块）
- 💡 添加图像处理功能（滤镜、卷积）
- 💡 实现加密/解密算法（AES、RSA）
- 💡 创建实时数据可视化
- 💡 添加音频处理功能
- 💡 实现机器学习推理

## 📊 性能测试结果示例

在现代浏览器中，使用 600×450 画布和 100 次迭代的典型测试结果：

| 测试项目 | WASM (Rust) | JavaScript | 性能提升 |
|---------|-------------|------------|---------|
| Mandelbrot | ~15-25ms | ~60-120ms | **3-5倍** |
| Julia | ~15-25ms | ~60-120ms | **3-5倍** |
| 粒子系统 (200个) | ~30-50ms | ~180-400ms | **5-8倍** |
| 热扩散 | ~20-35ms | ~80-150ms | **3-5倍** |

*注：实际性能取决于硬件、浏览器和具体参数*

## 🔬 深入了解

想要深入了解性能对比的实现细节？查看 [PERFORMANCE_COMPARISON.md](./PERFORMANCE_COMPARISON.md)

该文档包含：
- 详细的算法说明
- 性能优化技巧
- 代码对比分析
- WASM 性能优势来源
- 最佳实践建议

## 📚 参考资源

- [Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen 文档](https://rustwasm.github.io/wasm-bindgen/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License


