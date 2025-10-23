# MetaNodeSwap Frontend

一个基于 UniswapV3 简化版本智能合约的去中心化交易所前端应用。

## 功能特性

- 🔄 **代币交换 (Swap)**: 支持不同 ERC20 代币之间的兑换
- 💧 **流动性管理 (Liquidity)**: 添加和移除流动性
- 📊 **持仓查看 (Positions)**: 查看和管理您的流动性持仓
- 👛 **钱包连接**: 支持 MetaMask 等主流钱包
- 🎨 **现代化 UI**: 美观的渐变设计和流畅的动画效果

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Wagmi** - 以太坊 React Hooks
- **Ethers.js v6** - 以太坊交互库
- **React Router** - 路由管理

## 合约信息

部署在 Sepolia 测试网络：

### 测试代币

- MNTokenA: `0x4798388e3adE569570Df626040F07DF71135C48E`
- MNTokenB: `0x5A4eA3a013D42Cfd1B1609d19f6eA998EeE06D30`
- MNTokenC: `0x86B5df6FF459854ca91318274E47F4eEE245CF28`
- MNTokenD: `0x7af86B1034AC4C925Ef5C3F637D1092310d83F03`

### Swap 合约

- PoolManager: `0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B`
- PositionManager: `0xbe766Bf20eFfe431829C5d5a2744865974A0B610`
- SwapRouter: `0xD2c220143F5784b3bD84ae12747d97C8A36CeCB2`

## 安装和运行

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 WalletConnect (可选)

如果需要支持 WalletConnect，请在 `src/config/wagmi.ts` 中替换 `YOUR_PROJECT_ID`。

在 [WalletConnect Cloud](https://cloud.walletconnect.com/) 获取免费的 Project ID。

### 3. 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:3000 启动。

### 4. 构建生产版本

```bash
pnpm build
```

构建产物将生成在 `dist` 目录。

## 使用指南

### 准备工作

1. **安装 MetaMask 钱包**

   - 下载并安装 [MetaMask](https://metamask.io/)

2. **切换到 Sepolia 测试网**

   - 在 MetaMask 中添加 Sepolia 测试网络
   - 获取测试 ETH：[Sepolia Faucet](https://sepoliafaucet.com/)

3. **获取测试代币**
   - 使用合约地址导入测试代币到 MetaMask
   - 或联系项目方获取测试代币

### 交换代币 (Swap)

1. 连接钱包
2. 选择要交换的代币对
3. 输入交换数量，系统会自动计算输出
4. 点击 "Approve" 授权代币
5. 点击 "Swap" 执行交换

### 添加流动性 (Liquidity)

1. 连接钱包
2. 选择要提供流动性的代币对
3. 输入两种代币的数量
4. 点击 "Approve Tokens" 授权
5. 点击 "Add Liquidity" 添加流动性

### 管理持仓 (Positions)

1. 在 Positions 页面查看所有持仓
2. 可以收取手续费 (Collect Fees)
3. 可以移除流动性 (Remove Liquidity)

## 项目结构

```
web/
├── src/
│   ├── components/          # React 组件
│   │   ├── Header.tsx       # 头部导航
│   │   ├── Swap.tsx         # 交换界面
│   │   ├── Liquidity.tsx    # 流动性界面
│   │   └── Positions.tsx    # 持仓界面
│   ├── config/              # 配置文件
│   │   ├── contracts.ts     # 合约地址
│   │   ├── abis.ts          # 合约 ABI
│   │   └── wagmi.ts         # Wagmi 配置
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useContract.ts   # 合约实例 Hook
│   │   └── useTokenBalance.ts # 代币余额 Hook
│   ├── App.tsx              # 主应用
│   ├── App.css              # 应用样式
│   ├── main.tsx             # 入口文件
│   └── index.css            # 全局样式
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 注意事项

⚠️ **重要提示**：

- 这是一个测试网应用，仅用于学习和测试
- 请勿在主网使用测试代币
- 交易前请仔细检查代币地址和数量
- 建议设置合理的滑点容差

## 常见问题

**Q: 为什么交易失败？**
A: 可能的原因包括：

- 余额不足
- 未授权代币
- 滑点设置过低
- Gas 费不足

**Q: 如何获取测试代币？**
A: 请联系项目方或使用水龙头获取测试 ETH 后，在合约中铸造测试代币。

**Q: 支持哪些钱包？**
A: 目前支持 MetaMask 和其他兼容 WalletConnect 的钱包。

## 开发

### 添加新的代币

在 `src/config/contracts.ts` 中的 `TOKEN_LIST` 数组添加新代币信息：

```typescript
{
  symbol: 'TOKEN',
  name: 'Token Name',
  address: '0x...',
  decimals: 18,
}
```

### 修改样式

主要样式文件：

- `src/index.css` - 全局样式和 CSS 变量
- `src/App.css` - 组件样式

## License

MIT

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
