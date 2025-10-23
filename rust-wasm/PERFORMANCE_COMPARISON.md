# 🚀 WebAssembly vs JavaScript 性能对比示例

这个项目展示了在复杂图形计算场景下，WebAssembly (Rust) 相比纯 JavaScript 的性能优势。

## 📊 测试项目

### 1. **Mandelbrot 分形集合**
- **描述**: 经典的分形图形，需要大量数学运算
- **复杂度**: O(width × height × iterations)
- **特点**: 密集的浮点数运算、循环嵌套
- **适用场景**: 科学计算、图形渲染

### 2. **Julia 分形集合**
- **描述**: 另一种美丽的分形图案
- **复杂度**: O(width × height × iterations)
- **特点**: 与 Mandelbrot 类似的计算密集型操作
- **适用场景**: 数据可视化、艺术创作

### 3. **粒子系统模拟**
- **描述**: 200个粒子的物理模拟，包含重力、碰撞检测
- **复杂度**: O(n² × iterations) - 最密集的计算
- **特点**: 
  - 重力模拟
  - 边界碰撞检测
  - 粒子间碰撞检测 (O(n²))
  - 物理引擎计算
- **适用场景**: 游戏开发、物理仿真

### 4. **热扩散模拟**
- **描述**: 模拟热量在二维平面上的扩散过程
- **复杂度**: O(width × height × iterations)
- **特点**: 
  - 拉普拉斯算子计算
  - 多次迭代求解
  - 边界条件处理
- **适用场景**: 科学模拟、流体力学

## 🎯 性能测试配置

### 画布尺寸
- **400 × 300** (快速) - 120,000 像素
- **600 × 450** (中等) - 270,000 像素
- **800 × 600** (慢速) - 480,000 像素
- **1000 × 750** (非常慢) - 750,000 像素

### 迭代次数
- 默认: 100 次迭代
- 范围: 10 - 500 次
- 影响: 迭代次数越多，计算量越大，性能差异越明显

## 🔬 实现细节

### WebAssembly (Rust) 实现
```rust
// Rust 代码位于 src/lib.rs
- 编译优化: --release 模式
- 类型安全: 静态类型系统
- 内存管理: 零成本抽象
- SIMD: 编译器自动向量化优化
```

### JavaScript 实现
```javascript
// JavaScript 代码位于 performance.js
- 与 WASM 完全相同的算法
- 使用 TypedArray 优化内存
- 尽可能的性能优化
```

## 📈 预期性能提升

根据测试场景的不同，WebAssembly 的性能提升约为：

| 测试项目 | 预期提升 | 备注 |
|---------|---------|------|
| Mandelbrot 分形 | **2-5倍** | 数学运算密集 |
| Julia 分形 | **2-5倍** | 类似 Mandelbrot |
| 粒子系统 | **3-8倍** | O(n²) 算法，最明显 |
| 热扩散 | **2-4倍** | 数组操作密集 |

*实际性能取决于浏览器、硬件和问题规模*

## 🚀 快速开始

### 1. 编译 WASM 模块
```bash
cd rust-wasm
./build.sh
```

### 2. 启动本地服务器
```bash
# 使用 Python
python3 -m http.server 8080

# 或使用 Node.js http-server
npx http-server -p 8080
```

### 3. 打开浏览器
访问: `http://localhost:8080/performance.html`

## 🎮 使用说明

### 基本操作
1. **选择测试项目**: 从下拉菜单选择要测试的算法
2. **设置参数**: 选择画布尺寸和迭代次数
3. **运行对比**: 点击"开始性能对比"同时测试两种实现
4. **查看结果**: 观察性能汇总和实时渲染

### 功能按钮
- 🔄 **开始性能对比**: 同时运行 WASM 和 JS 版本并对比
- ⚡ **仅运行 WASM**: 只测试 WebAssembly 版本
- 📊 **仅运行 JavaScript**: 只测试纯 JS 版本
- 🗑️ **清空画布**: 重置所有画布和统计数据

### 性能指标
- **计算时间**: 纯算法执行时间（核心性能指标）
- **渲染时间**: Canvas 绘制时间
- **总耗时**: 计算 + 渲染的总时间

## 💡 优化技巧

### Rust/WASM 侧
1. ✅ 使用 `--release` 编译获得最佳性能
2. ✅ 使用 `wasm-opt` 优化 WASM 文件大小和速度
3. ✅ 避免频繁的 JS ↔ WASM 数据传输
4. ✅ 使用 `Vec<u8>` 直接返回像素数据
5. ✅ 利用 Rust 的零成本抽象

### JavaScript 侧
1. ✅ 使用 `TypedArray` (Float64Array, Uint8ClampedArray)
2. ✅ 避免动态类型转换
3. ✅ 减少对象创建和垃圾回收
4. ✅ 使用 `ImageData` 直接操作像素
5. ✅ 算法与 WASM 版本保持一致

## 🔍 代码对比

### Mandelbrot 核心循环

**Rust 版本** (编译为机器码):
```rust
while zx * zx + zy * zy < 4.0 && iteration < max_iterations {
    let temp = zx * zx - zy * zy + cx;
    zy = 2.0 * zx * zy + cy;
    zx = temp;
    iteration += 1;
}
```

**JavaScript 版本** (解释执行):
```javascript
while (zx * zx + zy * zy < 4.0 && iteration < maxIterations) {
    const temp = zx * zx - zy * zy + cx;
    zy = 2.0 * zx * zy + cy;
    zx = temp;
    iteration++;
}
```

虽然代码几乎相同，但 Rust 编译为优化的机器码，而 JavaScript 需要 JIT 编译和运行时优化。

## 🎯 性能优势来源

### WebAssembly 的优势
1. **提前编译 (AOT)**: 编译为接近机器码的字节码
2. **静态类型**: 消除运行时类型检查开销
3. **可预测性能**: 没有 GC 暂停，内存布局确定
4. **编译器优化**: LLVM 的深度优化
5. **SIMD 支持**: 自动向量化指令

### JavaScript 的挑战
1. **JIT 编译**: 需要"热身"时间
2. **动态类型**: 运行时类型检查
3. **垃圾回收**: 不可预测的 GC 暂停
4. **优化限制**: V8 优化有限制条件

## 📊 测试建议

### 获得最明显的性能差异
1. 选择 **800×600** 或更大的画布
2. 设置 **200+** 迭代次数
3. 测试 **粒子系统** (O(n²) 复杂度最高)
4. 多次运行取平均值

### 真实世界场景
- **游戏物理引擎**: 粒子系统测试
- **科学可视化**: Mandelbrot/Julia 测试
- **模拟仿真**: 热扩散测试

## 🛠️ 技术栈

- **Rust**: 1.70+ (系统编程语言)
- **wasm-bindgen**: Rust ↔ JavaScript 绑定
- **wasm-pack**: WASM 构建工具
- **Canvas API**: 图形渲染
- **ES6 Modules**: 模块化 JavaScript

## 📚 相关资源

- [Rust WebAssembly Book](https://rustwasm.github.io/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

## 🤔 何时使用 WASM？

### ✅ 适合使用 WASM
- 计算密集型任务 (游戏物理、图像处理)
- 需要可预测性能的场景
- 已有 C/C++/Rust 代码需要复用
- 大规模数据处理
- 加密解密操作

### ❌ 不适合使用 WASM
- 简单的 DOM 操作
- 频繁与 JavaScript 通信
- 文件体积敏感的场景
- 简单的业务逻辑

## 🎓 学习要点

通过这个示例，你可以学到：
1. ✅ WASM 在计算密集型任务中的性能优势
2. ✅ 如何使用 Rust 编写 WASM 模块
3. ✅ JavaScript 和 WASM 的互操作
4. ✅ 性能测试和基准测试方法
5. ✅ 复杂算法的实现 (分形、物理模拟)
6. ✅ Canvas 图形渲染技术

## 🐛 故障排除

### WASM 加载失败
```bash
# 确保已编译 WASM
cd rust-wasm
./build.sh

# 确保使用 HTTP 服务器，不要直接打开 HTML 文件
python3 -m http.server 8080
```

### 性能不如预期
- 确保使用 Release 模式编译
- 检查浏览器是否支持 WASM
- 尝试更大的画布和更多迭代
- 清空浏览器缓存重新测试

## 📝 总结

这个性能对比示例清楚地展示了 WebAssembly 在计算密集型场景下的性能优势。在实际开发中，可以将计算密集的核心算法用 Rust 实现并编译为 WASM，而 UI 交互仍使用 JavaScript，从而获得最佳的性能和开发体验。

---

**作者**: Web3 学习项目  
**日期**: 2025年10月  
**许可**: MIT


