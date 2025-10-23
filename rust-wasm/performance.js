import init, { 
    generate_mandelbrot, 
    generate_julia,
    simulate_particles,
    calculate_heat_diffusion,
    heat_to_color
} from './pkg/rust_wasm_demo.js';

let wasmModule;
let wasmReady = false;

// 初始化 WASM
async function initWasm() {
    try {
        wasmModule = await init();
        wasmReady = true;
        console.log('✅ WebAssembly 模块加载成功！');
    } catch (error) {
        console.error('❌ WebAssembly 加载失败:', error);
        alert('WebAssembly 加载失败，请确保已经编译了 WASM 模块');
    }
}

// ==================== JavaScript 实现 ====================

// JavaScript 版本的 Mandelbrot 生成
function generateMandelbrotJS(width, height, maxIterations) {
    const data = new Uint8ClampedArray(width * height * 4);
    const scaleX = 3.5 / width;
    const scaleY = 2.0 / height;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cx = x * scaleX - 2.5;
            const cy = y * scaleY - 1.0;
            
            let zx = 0.0;
            let zy = 0.0;
            let iteration = 0;
            
            while (zx * zx + zy * zy < 4.0 && iteration < maxIterations) {
                const temp = zx * zx - zy * zy + cx;
                zy = 2.0 * zx * zy + cy;
                zx = temp;
                iteration++;
            }
            
            const idx = (y * width + x) * 4;
            if (iteration === maxIterations) {
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
            } else {
                const t = iteration / maxIterations;
                data[idx] = Math.floor(9.0 * (1.0 - t) * t * t * t * 255.0);
                data[idx + 1] = Math.floor(15.0 * (1.0 - t) * (1.0 - t) * t * t * 255.0);
                data[idx + 2] = Math.floor(8.5 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t * 255.0);
            }
            data[idx + 3] = 255;
        }
    }
    
    return data;
}

// JavaScript 版本的 Julia 生成
function generateJuliaJS(width, height, maxIterations, cReal, cImag) {
    const data = new Uint8ClampedArray(width * height * 4);
    const scaleX = 4.0 / width;
    const scaleY = 4.0 / height;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let zx = x * scaleX - 2.0;
            let zy = y * scaleY - 2.0;
            let iteration = 0;
            
            while (zx * zx + zy * zy < 4.0 && iteration < maxIterations) {
                const temp = zx * zx - zy * zy + cReal;
                zy = 2.0 * zx * zy + cImag;
                zx = temp;
                iteration++;
            }
            
            const idx = (y * width + x) * 4;
            if (iteration === maxIterations) {
                data[idx] = 0;
                data[idx + 1] = 0;
                data[idx + 2] = 0;
            } else {
                const t = iteration / maxIterations;
                data[idx] = Math.floor(9.0 * (1.0 - t) * t * t * t * 255.0);
                data[idx + 1] = Math.floor(15.0 * (1.0 - t) * (1.0 - t) * t * t * 255.0);
                data[idx + 2] = Math.floor(8.5 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t * 255.0);
            }
            data[idx + 3] = 255;
        }
    }
    
    return data;
}

// JavaScript 版本的粒子模拟
function simulateParticlesJS(posX, posY, velX, velY, width, height, deltaTime) {
    const particleCount = posX.length;
    const gravity = 200.0;
    const damping = 0.99;
    
    for (let i = 0; i < particleCount; i++) {
        velY[i] += gravity * deltaTime;
        
        posX[i] += velX[i] * deltaTime;
        posY[i] += velY[i] * deltaTime;
        
        if (posX[i] < 0.0) {
            posX[i] = 0.0;
            velX[i] = -velX[i] * damping;
        } else if (posX[i] > width) {
            posX[i] = width;
            velX[i] = -velX[i] * damping;
        }
        
        if (posY[i] < 0.0) {
            posY[i] = 0.0;
            velY[i] = -velY[i] * damping;
        } else if (posY[i] > height) {
            posY[i] = height;
            velY[i] = -velY[i] * damping;
        }
    }
    
    for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
            const dx = posX[j] - posX[i];
            const dy = posY[j] - posY[i];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 10.0 && distance > 0.0) {
                const nx = dx / distance;
                const ny = dy / distance;
                
                const relativeVx = velX[j] - velX[i];
                const relativeVy = velY[j] - velY[i];
                
                const impulse = (relativeVx * nx + relativeVy * ny) * 0.5;
                
                velX[i] += impulse * nx;
                velY[i] += impulse * ny;
                velX[j] -= impulse * nx;
                velY[j] -= impulse * ny;
                
                const overlap = 10.0 - distance;
                posX[i] -= nx * overlap * 0.5;
                posY[i] -= ny * overlap * 0.5;
                posX[j] += nx * overlap * 0.5;
                posY[j] += ny * overlap * 0.5;
            }
        }
    }
}

// JavaScript 版本的热扩散
function calculateHeatDiffusionJS(current, width, height, diffusionRate) {
    const next = new Float64Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const top = (y - 1) * width + x;
            const bottom = (y + 1) * width + x;
            const left = y * width + (x - 1);
            const right = y * width + (x + 1);
            
            const laplacian = current[top] + current[bottom] + current[left] + current[right] - 4.0 * current[idx];
            
            next[idx] = current[idx] + diffusionRate * laplacian;
            
            if (next[idx] < 0.0) next[idx] = 0.0;
            if (next[idx] > 1.0) next[idx] = 1.0;
        }
    }
    
    for (let x = 0; x < width; x++) {
        next[x] = 0.0;
        next[(height - 1) * width + x] = 0.0;
    }
    for (let y = 0; y < height; y++) {
        next[y * width] = 0.0;
        next[y * width + width - 1] = 0.0;
    }
    
    return next;
}

// JavaScript 版本的热力图转颜色
function heatToColorJS(heatData) {
    const colorData = new Uint8ClampedArray(heatData.length * 4);
    
    for (let i = 0; i < heatData.length; i++) {
        const heat = heatData[i];
        let r, g, b;
        
        if (heat < 0.5) {
            const t = heat * 2.0;
            r = Math.floor(t * 255.0);
            g = 0;
            b = Math.floor((1.0 - t) * 255.0);
        } else {
            const t = (heat - 0.5) * 2.0;
            r = 255;
            g = Math.floor(t * 255.0);
            b = 0;
        }
        
        colorData[i * 4] = r;
        colorData[i * 4 + 1] = g;
        colorData[i * 4 + 2] = b;
        colorData[i * 4 + 3] = 255;
    }
    
    return colorData;
}

// ==================== 测试函数 ====================

async function testMandelbrot(useWasm, width, height, iterations) {
    const canvas = useWasm ? document.getElementById('wasmCanvas') : document.getElementById('jsCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    const calcStart = performance.now();
    
    let data;
    if (useWasm) {
        data = generate_mandelbrot(width, height, iterations);
    } else {
        data = generateMandelbrotJS(width, height, iterations);
    }
    
    const calcEnd = performance.now();
    const calcTime = calcEnd - calcStart;
    
    const renderStart = performance.now();
    const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
    ctx.putImageData(imageData, 0, 0);
    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;
    
    return { calcTime, renderTime, totalTime: calcTime + renderTime };
}

async function testJulia(useWasm, width, height, iterations) {
    const canvas = useWasm ? document.getElementById('wasmCanvas') : document.getElementById('jsCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    const cReal = -0.7;
    const cImag = 0.27015;
    
    const calcStart = performance.now();
    
    let data;
    if (useWasm) {
        data = generate_julia(width, height, iterations, cReal, cImag);
    } else {
        data = generateJuliaJS(width, height, iterations, cReal, cImag);
    }
    
    const calcEnd = performance.now();
    const calcTime = calcEnd - calcStart;
    
    const renderStart = performance.now();
    const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
    ctx.putImageData(imageData, 0, 0);
    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;
    
    return { calcTime, renderTime, totalTime: calcTime + renderTime };
}

async function testParticles(useWasm, width, height, iterations) {
    const canvas = useWasm ? document.getElementById('wasmCanvas') : document.getElementById('jsCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    const particleCount = 200;
    const posX = new Float64Array(particleCount);
    const posY = new Float64Array(particleCount);
    const velX = new Float64Array(particleCount);
    const velY = new Float64Array(particleCount);
    
    // 初始化粒子
    for (let i = 0; i < particleCount; i++) {
        posX[i] = Math.random() * width;
        posY[i] = Math.random() * height * 0.5;
        velX[i] = (Math.random() - 0.5) * 200;
        velY[i] = (Math.random() - 0.5) * 200;
    }
    
    const calcStart = performance.now();
    
    // 运行多次模拟
    for (let i = 0; i < iterations; i++) {
        if (useWasm) {
            simulate_particles(posX, posY, velX, velY, width, height, 0.016);
        } else {
            simulateParticlesJS(posX, posY, velX, velY, width, height, 0.016);
        }
    }
    
    const calcEnd = performance.now();
    const calcTime = calcEnd - calcStart;
    
    const renderStart = performance.now();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#00ff00';
    for (let i = 0; i < particleCount; i++) {
        ctx.beginPath();
        ctx.arc(posX[i], posY[i], 5, 0, Math.PI * 2);
        ctx.fill();
    }
    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;
    
    return { calcTime, renderTime, totalTime: calcTime + renderTime };
}

async function testHeatDiffusion(useWasm, width, height, iterations) {
    const canvas = useWasm ? document.getElementById('wasmCanvas') : document.getElementById('jsCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    // 初始化热力图 - 中心几个热源
    let heatData = new Float64Array(width * height);
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // 添加几个热源
    for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        heatData[y * width + x] = 1.0;
    }
    
    const calcStart = performance.now();
    
    // 运行多次扩散
    for (let i = 0; i < iterations; i++) {
        if (useWasm) {
            heatData = calculate_heat_diffusion(heatData, width, height, 0.1);
        } else {
            heatData = calculateHeatDiffusionJS(heatData, width, height, 0.1);
        }
    }
    
    // 转换为颜色
    let colorData;
    if (useWasm) {
        colorData = heat_to_color(heatData);
    } else {
        colorData = heatToColorJS(heatData);
    }
    
    const calcEnd = performance.now();
    const calcTime = calcEnd - calcStart;
    
    const renderStart = performance.now();
    const imageData = new ImageData(new Uint8ClampedArray(colorData), width, height);
    ctx.putImageData(imageData, 0, 0);
    const renderEnd = performance.now();
    const renderTime = renderEnd - renderStart;
    
    return { calcTime, renderTime, totalTime: calcTime + renderTime };
}

// ==================== UI 控制函数 ====================

function showLoading(useWasm) {
    const loading = useWasm ? document.getElementById('wasmLoading') : document.getElementById('jsLoading');
    loading.classList.remove('hidden');
}

function hideLoading(useWasm) {
    const loading = useWasm ? document.getElementById('wasmLoading') : document.getElementById('jsLoading');
    loading.classList.add('hidden');
}

function updateStats(useWasm, calcTime, renderTime, totalTime) {
    const prefix = useWasm ? 'wasm' : 'js';
    document.getElementById(`${prefix}CalcTime`).textContent = `${calcTime.toFixed(2)} ms`;
    document.getElementById(`${prefix}RenderTime`).textContent = `${renderTime.toFixed(2)} ms`;
    document.getElementById(`${prefix}TotalTime`).textContent = `${totalTime.toFixed(2)} ms`;
    document.getElementById(`${prefix}Progress`).style.width = '100%';
}

function updateSummary(wasmTime, jsTime) {
    document.getElementById('summarySection').classList.remove('hidden');
    document.getElementById('wasmTime').textContent = wasmTime.toFixed(2);
    document.getElementById('jsTime').textContent = jsTime.toFixed(2);
    
    const speedup = jsTime / wasmTime;
    const timeSaved = ((jsTime - wasmTime) / jsTime * 100);
    
    document.getElementById('speedup').textContent = speedup.toFixed(2);
    document.getElementById('timeSaved').textContent = timeSaved.toFixed(1);
    
    // 标记胜者
    const wasmCard = document.getElementById('wasmCard');
    const jsCard = document.getElementById('jsCard');
    wasmCard.classList.remove('gradient-winner');
    jsCard.classList.remove('gradient-winner');
    
    if (wasmTime < jsTime) {
        wasmCard.classList.add('gradient-winner');
    } else {
        jsCard.classList.add('gradient-winner');
    }
}

function resetProgress() {
    document.getElementById('wasmProgress').style.width = '0%';
    document.getElementById('jsProgress').style.width = '0%';
}

// ==================== 主要接口函数 ====================

window.runComparison = async function() {
    if (!wasmReady) {
        alert('WebAssembly 还未加载完成，请稍候...');
        return;
    }
    
    resetProgress();
    
    const testType = document.getElementById('testType').value;
    const sizeStr = document.getElementById('canvasSize').value;
    const [width, height] = sizeStr.split(',').map(Number);
    const iterations = parseInt(document.getElementById('iterations').value);
    
    console.log(`🚀 开始性能对比测试: ${testType}, ${width}x${height}, ${iterations} 迭代`);
    
    let testFunc;
    switch(testType) {
        case 'mandelbrot': testFunc = testMandelbrot; break;
        case 'julia': testFunc = testJulia; break;
        case 'particles': testFunc = testParticles; break;
        case 'heat': testFunc = testHeatDiffusion; break;
    }
    
    // 测试 WASM
    showLoading(true);
    await new Promise(resolve => setTimeout(resolve, 10));
    const wasmResult = await testFunc(true, width, height, iterations);
    hideLoading(true);
    updateStats(true, wasmResult.calcTime, wasmResult.renderTime, wasmResult.totalTime);
    console.log(`⚡ WASM 完成: ${wasmResult.totalTime.toFixed(2)} ms`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 测试 JavaScript
    showLoading(false);
    await new Promise(resolve => setTimeout(resolve, 10));
    const jsResult = await testFunc(false, width, height, iterations);
    hideLoading(false);
    updateStats(false, jsResult.calcTime, jsResult.renderTime, jsResult.totalTime);
    console.log(`📊 JavaScript 完成: ${jsResult.totalTime.toFixed(2)} ms`);
    
    // 更新汇总
    updateSummary(wasmResult.totalTime, jsResult.totalTime);
    
    const speedup = jsResult.totalTime / wasmResult.totalTime;
    console.log(`🏆 WASM 比 JavaScript 快 ${speedup.toFixed(2)} 倍!`);
};

window.runWasmOnly = async function() {
    if (!wasmReady) {
        alert('WebAssembly 还未加载完成，请稍候...');
        return;
    }
    
    document.getElementById('wasmProgress').style.width = '0%';
    
    const testType = document.getElementById('testType').value;
    const sizeStr = document.getElementById('canvasSize').value;
    const [width, height] = sizeStr.split(',').map(Number);
    const iterations = parseInt(document.getElementById('iterations').value);
    
    let testFunc;
    switch(testType) {
        case 'mandelbrot': testFunc = testMandelbrot; break;
        case 'julia': testFunc = testJulia; break;
        case 'particles': testFunc = testParticles; break;
        case 'heat': testFunc = testHeatDiffusion; break;
    }
    
    showLoading(true);
    await new Promise(resolve => setTimeout(resolve, 10));
    const result = await testFunc(true, width, height, iterations);
    hideLoading(true);
    updateStats(true, result.calcTime, result.renderTime, result.totalTime);
    console.log(`⚡ WASM 完成: ${result.totalTime.toFixed(2)} ms`);
};

window.runJsOnly = async function() {
    document.getElementById('jsProgress').style.width = '0%';
    
    const testType = document.getElementById('testType').value;
    const sizeStr = document.getElementById('canvasSize').value;
    const [width, height] = sizeStr.split(',').map(Number);
    const iterations = parseInt(document.getElementById('iterations').value);
    
    let testFunc;
    switch(testType) {
        case 'mandelbrot': testFunc = testMandelbrot; break;
        case 'julia': testFunc = testJulia; break;
        case 'particles': testFunc = testParticles; break;
        case 'heat': testFunc = testHeatDiffusion; break;
    }
    
    showLoading(false);
    await new Promise(resolve => setTimeout(resolve, 10));
    const result = await testFunc(false, width, height, iterations);
    hideLoading(false);
    updateStats(false, result.calcTime, result.renderTime, result.totalTime);
    console.log(`📊 JavaScript 完成: ${result.totalTime.toFixed(2)} ms`);
};

window.clearCanvas = function() {
    const wasmCanvas = document.getElementById('wasmCanvas');
    const jsCanvas = document.getElementById('jsCanvas');
    const wasmCtx = wasmCanvas.getContext('2d');
    const jsCtx = jsCanvas.getContext('2d');
    
    wasmCtx.fillStyle = '#000';
    wasmCtx.fillRect(0, 0, wasmCanvas.width, wasmCanvas.height);
    jsCtx.fillStyle = '#000';
    jsCtx.fillRect(0, 0, jsCanvas.width, jsCanvas.height);
    
    resetProgress();
    document.getElementById('summarySection').classList.add('hidden');
    
    console.log('🗑️ 画布已清空');
};

// 页面加载时初始化
initWasm();

