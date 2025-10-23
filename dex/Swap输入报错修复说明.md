# Swap 输入报错修复说明

## 🐛 问题描述

在 Swap 页面输入 TokenA 数量后，系统报错：

```
Error: execution reverted: "Unexpected error"
```

导致无法计算出 TokenB 的数量。

## 🔍 问题原因

### 1. "Unexpected error" 的来源

这个错误来自 `SwapRouter.sol` 合约中的 `parseRevertReason` 函数：

```solidity
function parseRevertReason(bytes memory reason) private pure returns (int256, int256) {
    if (reason.length != 64) {
        if (reason.length < 68) revert("Unexpected error");  // ⬅️ 这里抛出错误
        assembly {
            reason := add(reason, 0x04)
        }
        revert(abi.decode(reason, (string)));
    }
    return abi.decode(reason, (int256, int256));
}
```

这个函数用于解析 swap 调用的 revert 数据：

- 如果 revert 数据正好是 64 字节，说明是正常的报价数据（两个 int256）
- 如果 revert 数据 >= 68 字节，说明是一个字符串错误消息
- **如果 revert 数据 < 68 字节但不等于 64，说明出现了异常情况**

### 2. 根本原因

"Unexpected error" 通常是由以下几种情况导致的：

1. **池子不存在** ⬅️ 最常见

   - 用户选择的代币对和费率对应的池子没有创建
   - 合约会返回 "Pool not found" 错误

2. **池子没有流动性** ⬅️ 次常见

   - 池子虽然创建了，但没有添加流动性
   - 无法执行 swap 计算

3. **其他合约错误**
   - 价格限制错误 (SPL)
   - 金额错误 (AS)
   - 等等

## ✅ 解决方案

### 修改内容

在 `web/src/components/Swap.tsx` 中添加了池子存在性检查：

#### 1. 导入 `usePoolManager` Hook

```typescript
import { useSwapRouter, useEthersSigner, usePoolManager } from "../hooks/useContract"
```

#### 2. 添加 PoolManager 实例

```typescript
const poolManager = usePoolManager()
const poolManagerRef = useRef(poolManager)
poolManagerRef.current = poolManager
```

#### 3. 在获取报价前检查池子

```typescript
// 检查池子是否存在
const poolAddress = await manager.getPool(token0, token1, selectedFeeTier?.index ?? 1)

if (!poolAddress || poolAddress === "0x0000000000000000000000000000000000000000") {
  message.error(
    `Pool does not exist for ${tokenIn.symbol}/${tokenOut.symbol} with ${selectedFeeTier?.label} fee tier. Please create the pool first in the Liquidity page.`
  )
  setAmountOut("")
  setQuoteLoading(false)
  return
}
```

#### 4. 添加更友好的错误提示

```typescript
catch (error: any) {
  let errorMessage = 'Failed to get quote';

  if (error.message?.includes('Unexpected error')) {
    errorMessage = `Pool might have no liquidity. Please add liquidity to ${tokenIn.symbol}/${tokenOut.symbol} pool first.`;
  } else if (error.message?.includes('Pool not found')) {
    errorMessage = `Pool does not exist for ${tokenIn.symbol}/${tokenOut.symbol}. Please create the pool first.`;
  } else if (error.message?.includes('SPL')) {
    errorMessage = 'Price limit error. Please try a different amount.';
  } else if (error.message?.includes('AS')) {
    errorMessage = 'Invalid swap amount.';
  }

  message.warning(errorMessage);
  setAmountOut('');
}
```

## 🎯 修复效果

### Before (错误状态)

```
用户输入金额 → 调用 quoteExactInput
                ↓
          Pool 不存在/无流动性
                ↓
          Unexpected error
                ↓
          用户困惑：不知道哪里出错了 ❌
```

### After (修复后)

```
用户输入金额 → 检查 Pool 是否存在
                ↓
          Pool 不存在
                ↓
          显示友好提示：
          "Pool does not exist for MNTokenA/MNTokenB with 0.30% fee tier.
           Please create the pool first in the Liquidity page."
                ↓
          用户明白：需要先创建池子 ✅
```

## 📝 如何解决报错

当看到以下错误信息时：

### 1. "Pool does not exist"

**原因**: 选择的代币对和费率对应的池子未创建

**解决方法**:

1. 前往 **Liquidity** 页面
2. 选择相同的代币对（如 MNTokenA/MNTokenB）
3. 选择相同的费率（如 0.30%）
4. 设置初始价格
5. 点击 **Create Pool** 创建池子
6. 返回 Swap 页面重试

### 2. "Pool might have no liquidity"

**原因**: 池子已创建但没有流动性

**解决方法**:

1. 前往 **Liquidity** 页面
2. 选择相同的代币对和费率
3. 输入要添加的流动性数量
4. 先 **Approve** 代币
5. 点击 **Add Liquidity** 添加流动性
6. 返回 Swap 页面重试

### 3. "Price limit error"

**原因**: 交易价格超出限制

**解决方法**:

- 尝试减少输入金额
- 检查池子流动性是否充足

### 4. "Invalid swap amount"

**原因**: 输入金额无效（如 0 或负数）

**解决方法**:

- 输入有效的正数金额

## 🔧 技术细节

### Pool 检查流程

```typescript
// 1. 确定 token0 和 token1（按地址大小排序）
const zeroForOne = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
const token0 = zeroForOne ? tokenIn.address : tokenOut.address;
const token1 = zeroForOne ? tokenOut.address : tokenIn.address;

// 2. 获取池子地址
const poolAddress = await poolManager.getPool(token0, token1, feeIndex);

// 3. 检查池子是否存在
if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
  // 池子不存在，显示错误
  return;
}

// 4. 池子存在，继续获取报价
const quote = await router.quoteExactInput.staticCall({...});
```

### 为什么需要 token0 < token1？

在 Uniswap V3 架构中，池子地址是通过 CREATE2 确定性计算的，要求：

- `token0` 地址必须小于 `token1` 地址
- 这样无论用户以何种顺序输入代币，都能找到同一个池子

例如：

```typescript
// 用户选择 MNTokenB → MNTokenA
// 地址: 0x5A4e... → 0x4798...

// 系统自动排序为:
// token0 = 0x4798... (MNTokenA)
// token1 = 0x5A4e... (MNTokenB)

// 这样就能找到正确的池子
```

## 📊 调试信息

修复后，控制台会显示更详细的调试信息：

```javascript
🔍 Checking pool...
{
  token0: '0x4798388e...',
  token1: '0x5A4eA3a0...',
  index: 1
}

📍 Pool address: 0x0000000000000000000000000000000000000000

❌ Pool does not exist for MNTokenA/MNTokenB with 0.30% fee tier
```

这样可以快速定位问题所在。

## 🎉 总结

此次修复：

1. ✅ **添加了池子存在性检查**

   - 在调用报价前验证池子是否存在
   - 避免触发 "Unexpected error"

2. ✅ **提供了友好的错误提示**

   - 明确告知用户问题原因
   - 指导用户如何解决问题

3. ✅ **改善了用户体验**

   - 从"不知道哪里错了"到"知道需要创建池子"
   - 减少用户困惑

4. ✅ **增强了调试能力**
   - 添加详细的控制台日志
   - 便于开发者排查问题

## 📖 相关文档

- [报价功能修复说明.md](./报价功能修复说明.md) - sqrtPriceLimitX96 参数问题
- [错误修复说明.md](./错误修复说明.md) - useEthersSigner Hook 问题
- [功能说明.md](./功能说明.md) - Swap 功能使用说明

## 🚀 下一步

如果仍然遇到问题：

1. **检查合约部署**

   - 确认所有合约已正确部署到 Sepolia 网络
   - 检查 `MetaNodeSwap合约地址.md` 中的地址是否正确

2. **创建测试池**

   - 为常用代币对创建池子
   - 添加充足的流动性

3. **查看控制台日志**

   - 打开浏览器开发者工具
   - 查看详细的错误信息和调试日志

4. **联系开发者**
   - 如果问题仍未解决
   - 提供完整的错误日志和交易哈希
