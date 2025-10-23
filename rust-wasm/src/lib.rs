use wasm_bindgen::prelude::*;
use web_sys::console;

// 当 wasm 模块加载时调用
#[wasm_bindgen(start)]
pub fn main() {
    console::log_1(&"🦀 Rust WASM 模块已加载!".into());
}

// 导出一个简单的加法函数
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    console::log_1(&format!("正在计算 {} + {} ...", a, b).into());
    a + b
}

// 导出一个问候函数
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("你好, {}! 欢迎来到 Rust + WebAssembly 的世界! 🎉", name)
}

// 斐波那契数列计算（展示 Rust 的性能）
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

// 优化版本的斐波那契（使用迭代而不是递归）
#[wasm_bindgen]
pub fn fibonacci_fast(n: u32) -> u64 {
    if n == 0 {
        return 0;
    }
    let mut a = 0u64;
    let mut b = 1u64;
    for _ in 1..n {
        let temp = a + b;
        a = b;
        b = temp;
    }
    b
}

// 计算数组的总和
#[wasm_bindgen]
pub fn sum_array(arr: &[i32]) -> i32 {
    arr.iter().sum()
}

// 反转字符串
#[wasm_bindgen]
pub fn reverse_string(s: &str) -> String {
    s.chars().rev().collect()
}

// 判断是否为质数
#[wasm_bindgen]
pub fn is_prime(n: u32) -> bool {
    if n < 2 {
        return false;
    }
    if n == 2 {
        return true;
    }
    if n % 2 == 0 {
        return false;
    }
    let sqrt_n = (n as f64).sqrt() as u32;
    for i in (3..=sqrt_n).step_by(2) {
        if n % i == 0 {
            return false;
        }
    }
    true
}

// 生成范围内的质数列表
#[wasm_bindgen]
pub fn primes_in_range(start: u32, end: u32) -> Vec<u32> {
    (start..=end).filter(|&n| is_prime(n)).collect()
}

// 生成 Mandelbrot 集合数据（返回RGBA数据）
#[wasm_bindgen]
pub fn generate_mandelbrot(width: u32, height: u32, max_iterations: u32) -> Vec<u8> {
    let mut data = Vec::with_capacity((width * height * 4) as usize);
    
    let scale_x = 3.5 / width as f64;
    let scale_y = 2.0 / height as f64;
    
    for y in 0..height {
        for x in 0..width {
            // 将像素坐标映射到复平面
            let cx = x as f64 * scale_x - 2.5;
            let cy = y as f64 * scale_y - 1.0;
            
            let mut zx = 0.0;
            let mut zy = 0.0;
            let mut iteration = 0;
            
            // 迭代计算 Mandelbrot 集合
            while zx * zx + zy * zy < 4.0 && iteration < max_iterations {
                let temp = zx * zx - zy * zy + cx;
                zy = 2.0 * zx * zy + cy;
                zx = temp;
                iteration += 1;
            }
            
            // 根据迭代次数生成彩色值
            let (r, g, b) = if iteration == max_iterations {
                (0, 0, 0)
            } else {
                let t = iteration as f64 / max_iterations as f64;
                (
                    (9.0 * (1.0 - t) * t * t * t * 255.0) as u8,
                    (15.0 * (1.0 - t) * (1.0 - t) * t * t * 255.0) as u8,
                    (8.5 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t * 255.0) as u8,
                )
            };
            
            data.push(r);
            data.push(g);
            data.push(b);
            data.push(255);
        }
    }
    
    data
}

// 生成 Julia 集合数据
#[wasm_bindgen]
pub fn generate_julia(width: u32, height: u32, max_iterations: u32, c_real: f64, c_imag: f64) -> Vec<u8> {
    let mut data = Vec::with_capacity((width * height * 4) as usize);
    
    let scale_x = 4.0 / width as f64;
    let scale_y = 4.0 / height as f64;
    
    for y in 0..height {
        for x in 0..width {
            let mut zx = x as f64 * scale_x - 2.0;
            let mut zy = y as f64 * scale_y - 2.0;
            let mut iteration = 0;
            
            while zx * zx + zy * zy < 4.0 && iteration < max_iterations {
                let temp = zx * zx - zy * zy + c_real;
                zy = 2.0 * zx * zy + c_imag;
                zx = temp;
                iteration += 1;
            }
            
            let (r, g, b) = if iteration == max_iterations {
                (0, 0, 0)
            } else {
                let t = iteration as f64 / max_iterations as f64;
                (
                    (9.0 * (1.0 - t) * t * t * t * 255.0) as u8,
                    (15.0 * (1.0 - t) * (1.0 - t) * t * t * 255.0) as u8,
                    (8.5 * (1.0 - t) * (1.0 - t) * (1.0 - t) * t * 255.0) as u8,
                )
            };
            
            data.push(r);
            data.push(g);
            data.push(b);
            data.push(255);
        }
    }
    
    data
}

// 粒子系统模拟（计算密集型）
#[wasm_bindgen]
pub fn simulate_particles(
    positions_x: &mut [f64],
    positions_y: &mut [f64],
    velocities_x: &mut [f64],
    velocities_y: &mut [f64],
    width: f64,
    height: f64,
    delta_time: f64,
) {
    let particle_count = positions_x.len();
    let gravity = 200.0;
    let damping = 0.99;
    
    for i in 0..particle_count {
        // 应用重力
        velocities_y[i] += gravity * delta_time;
        
        // 更新位置
        positions_x[i] += velocities_x[i] * delta_time;
        positions_y[i] += velocities_y[i] * delta_time;
        
        // 边界碰撞检测
        if positions_x[i] < 0.0 {
            positions_x[i] = 0.0;
            velocities_x[i] = -velocities_x[i] * damping;
        } else if positions_x[i] > width {
            positions_x[i] = width;
            velocities_x[i] = -velocities_x[i] * damping;
        }
        
        if positions_y[i] < 0.0 {
            positions_y[i] = 0.0;
            velocities_y[i] = -velocities_y[i] * damping;
        } else if positions_y[i] > height {
            positions_y[i] = height;
            velocities_y[i] = -velocities_y[i] * damping;
        }
    }
    
    // 粒子间碰撞检测（O(n²) 计算密集型）
    for i in 0..particle_count {
        for j in (i + 1)..particle_count {
            let dx = positions_x[j] - positions_x[i];
            let dy = positions_y[j] - positions_y[i];
            let distance = (dx * dx + dy * dy).sqrt();
            
            if distance < 10.0 && distance > 0.0 {
                let nx = dx / distance;
                let ny = dy / distance;
                
                let relative_vx = velocities_x[j] - velocities_x[i];
                let relative_vy = velocities_y[j] - velocities_y[i];
                
                let impulse = (relative_vx * nx + relative_vy * ny) * 0.5;
                
                velocities_x[i] += impulse * nx;
                velocities_y[i] += impulse * ny;
                velocities_x[j] -= impulse * nx;
                velocities_y[j] -= impulse * ny;
                
                // 分离粒子
                let overlap = 10.0 - distance;
                positions_x[i] -= nx * overlap * 0.5;
                positions_y[i] -= ny * overlap * 0.5;
                positions_x[j] += nx * overlap * 0.5;
                positions_y[j] += ny * overlap * 0.5;
            }
        }
    }
}

// 热力图计算（模拟热扩散）
#[wasm_bindgen]
pub fn calculate_heat_diffusion(
    current: &[f64],
    width: u32,
    height: u32,
    diffusion_rate: f64,
) -> Vec<f64> {
    let mut next = vec![0.0; (width * height) as usize];
    
    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let idx = (y * width + x) as usize;
            let top = ((y - 1) * width + x) as usize;
            let bottom = ((y + 1) * width + x) as usize;
            let left = (y * width + (x - 1)) as usize;
            let right = (y * width + (x + 1)) as usize;
            
            // 拉普拉斯算子
            let laplacian = current[top] + current[bottom] + current[left] + current[right] - 4.0 * current[idx];
            
            next[idx] = current[idx] + diffusion_rate * laplacian;
            
            // 边界条件
            if next[idx] < 0.0 {
                next[idx] = 0.0;
            }
            if next[idx] > 1.0 {
                next[idx] = 1.0;
            }
        }
    }
    
    // 复制边界
    for x in 0..width {
        next[x as usize] = 0.0;
        next[((height - 1) * width + x) as usize] = 0.0;
    }
    for y in 0..height {
        next[(y * width) as usize] = 0.0;
        next[(y * width + width - 1) as usize] = 0.0;
    }
    
    next
}

// 将热力图数据转换为颜色数据
#[wasm_bindgen]
pub fn heat_to_color(heat_data: &[f64]) -> Vec<u8> {
    let mut color_data = Vec::with_capacity(heat_data.len() * 4);
    
    for &heat in heat_data {
        let (r, g, b) = if heat < 0.5 {
            let t = heat * 2.0;
            ((t * 255.0) as u8, 0, ((1.0 - t) * 255.0) as u8)
        } else {
            let t = (heat - 0.5) * 2.0;
            (255, (t * 255.0) as u8, 0)
        };
        
        color_data.push(r);
        color_data.push(g);
        color_data.push(b);
        color_data.push(255);
    }
    
    color_data
}


