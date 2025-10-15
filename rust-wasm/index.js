import init, { 
    greet, 
    fibonacci, 
    is_prime, 
    generate_mandelbrot 
} from './pkg/rust_wasm_demo.js';

let wasmModule;

async function initWasm() {
    try {
        wasmModule = await init();
        console.log('✅ WebAssembly 模块加载成功！');
        
        // 初始化时调用一次欢迎函数
        greet('Web3 开发者');
        
        // 默认绘制一次 Mandelbrot
        drawMandelbrot();
    } catch (error) {
        console.error('❌ WebAssembly 加载失败:', error);
        alert('WebAssembly 加载失败，请确保已经编译了 WASM 模块');
    }
}

// 计算斐波那契数
window.calculateFib = function() {
    const input = document.getElementById('fibInput');
    const result = document.getElementById('fibResult');
    const n = parseInt(input.value);
    
    if (isNaN(n) || n < 0) {
        result.textContent = '请输入一个非负整数！';
        result.classList.remove('hidden');
        return;
    }
    
    if (n > 50) {
        result.textContent = '数字太大了！请输入小于 50 的数字';
        result.classList.remove('hidden');
        return;
    }
    
    console.time('Fibonacci 计算时间');
    const fib = fibonacci(n);
    console.timeEnd('Fibonacci 计算时间');
    
    result.textContent = `fibonacci(${n}) = ${fib}`;
    result.classList.remove('hidden');
    
    console.log(`🔢 fibonacci(${n}) = ${fib}`);
}

// 检查质数
window.checkPrime = function() {
    const input = document.getElementById('primeInput');
    const result = document.getElementById('primeResult');
    const n = parseInt(input.value);
    
    if (isNaN(n) || n < 2) {
        result.textContent = '请输入大于 1 的整数！';
        result.classList.remove('hidden');
        return;
    }
    
    console.time('质数检测时间');
    const prime = is_prime(n);
    console.timeEnd('质数检测时间');
    
    if (prime) {
        result.textContent = `✅ ${n} 是质数！`;
        result.classList.remove('bg-red-100');
        result.classList.add('bg-green-100');
    } else {
        result.textContent = `❌ ${n} 不是质数`;
        result.classList.remove('bg-green-100');
        result.classList.add('bg-red-100');
    }
    result.classList.remove('hidden');
    
    console.log(`🔍 ${n} ${prime ? '是' : '不是'}质数`);
}

// 绘制 Mandelbrot 分形
window.drawMandelbrot = function() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    console.log('🎨 开始生成 Mandelbrot 分形...');
    console.time('Mandelbrot 生成时间');
    
    // 调用 Rust 函数生成 Mandelbrot 数据（已经是 RGBA 格式）
    const data = generate_mandelbrot(width, height, 100);
    
    console.timeEnd('Mandelbrot 生成时间');
    
    // 创建 ImageData（data 已经是 RGBA 格式）
    const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
    
    // 绘制到 canvas
    ctx.putImageData(imageData, 0, 0);
    
    console.log('✨ Mandelbrot 分形绘制完成！');
}

// 页面加载时初始化
initWasm();


