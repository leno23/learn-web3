'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits, MaxUint256, Contract } from 'ethers';
import { useSwapRouter, useEthersSigner, usePoolManager } from '../hooks/useContract';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useEthBalance } from '../hooks/useEthBalance';
import { TOKEN_LIST } from '../config/contracts';
import { CONTRACTS } from '../config/contracts';
import { ERC20_ABI } from '../config/abis';
import { Card, Button, InputNumber, Select, Space, Spin, message, Typography, Row, Col, Segmented, Tag } from 'antd';
import { SwapOutlined, ReloadOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

// 格式化余额显示
const formatBalance = (balance: string): string => {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
  return (num / 1000000).toFixed(2) + 'M';
};

// 费率选项
const FEE_TIERS = [
  { label: '0.05%', value: 500, index: 0 },
  { label: '0.30%', value: 3000, index: 1 },
  { label: '1.00%', value: 10000, index: 2 },
];

export default function Swap() {
  const { address, isConnected } = useAccount();
  const [tokenIn, setTokenIn] = useState(TOKEN_LIST[0]);
  const [tokenOut, setTokenOut] = useState(TOKEN_LIST[1]);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState(FEE_TIERS[1].value); // 默认 0.30%
  const [allowance, setAllowance] = useState('0');
  const [checkingAllowance, setCheckingAllowance] = useState(false);
  
  const { balance: balanceIn, refetch: refetchBalanceIn, loading: loadingBalanceIn } = useTokenBalance(tokenIn.address);
  const { balance: balanceOut, refetch: refetchBalanceOut, loading: loadingBalanceOut } = useTokenBalance(tokenOut.address);
  const { balance: ethBalance, refetch: refetchEthBalance } = useEthBalance();
  const swapRouter = useSwapRouter();
  const poolManager = usePoolManager();
  const signer = useEthersSigner();
  
  // 检查 signer 是否准备好
  const isSignerReady = !!signer;

  // 使用 useRef 保存 refetch 函数，避免依赖问题
  const refetchBalanceInRef = useRef(refetchBalanceIn);
  const refetchBalanceOutRef = useRef(refetchBalanceOut);
  const refetchEthBalanceRef = useRef(refetchEthBalance);
  
  // 更新 ref
  refetchBalanceInRef.current = refetchBalanceIn;
  refetchBalanceOutRef.current = refetchBalanceOut;
  refetchEthBalanceRef.current = refetchEthBalance;

  // 刷新所有余额
  const refreshBalances = () => {
    console.log('🔄 Manually refreshing all balances...');
    refetchBalanceInRef.current();
    refetchBalanceOutRef.current();
    refetchEthBalanceRef.current();
  };

  // 检查代币授权额度
  const checkAllowance = useCallback(async () => {
    if (!isConnected || !address || !signer) {
      setAllowance('0');
      return;
    }

    try {
      setCheckingAllowance(true);
      const tokenContract = new Contract(tokenIn.address, ERC20_ABI, signer);
      const currentAllowance = await tokenContract.allowance(address, CONTRACTS.SwapRouter);
      setAllowance(currentAllowance.toString());
      console.log('💰 Current allowance:', formatUnits(currentAllowance, 18));
    } catch (error) {
      console.error('Error checking allowance:', error);
      setAllowance('0');
    } finally {
      setCheckingAllowance(false);
    }
  }, [isConnected, address, signer, tokenIn.address]);

  // ✅ 当代币切换时强制刷新余额（不依赖 refetch 函数）
  useEffect(() => {
    console.log('🔄 Token changed, refreshing balances...', {
      tokenIn: tokenIn.symbol,
      tokenOut: tokenOut.symbol,
    });
    // 使用 ref 访问最新的 refetch 函数
    refetchBalanceInRef.current();
    refetchBalanceOutRef.current();
    refetchEthBalanceRef.current();
    // 检查授权额度
    checkAllowance();
  }, [tokenIn.address, tokenOut.address, checkAllowance]); // ✅ 只依赖地址，不依赖函数

  // 当连接钱包或 signer 准备好时检查授权
  useEffect(() => {
    if (isConnected && signer) {
      checkAllowance();
    }
  }, [isConnected, signer, tokenIn.address, checkAllowance]);

  // 判断是否需要授权
  const needsApproval = () => {
    if (!amountIn || parseFloat(amountIn) <= 0) return false;
    try {
      const amountInWei = parseUnits(amountIn, 18);
      return BigInt(allowance) < amountInWei;
    } catch {
      return true;
    }
  };

  // 设置最大输入金额
  const setMaxAmount = () => {
    if (parseFloat(balanceIn) > 0) {
      const maxAmount = parseFloat(balanceIn);
      setAmountIn(maxAmount.toString());
    }
  };

  // 使用 useRef 保存 swapRouter 和 poolManager，避免依赖问题
  const swapRouterRef = useRef(swapRouter);
  swapRouterRef.current = swapRouter;
  const poolManagerRef = useRef(poolManager);
  poolManagerRef.current = poolManager;

  // 获取报价
  const getQuote = useCallback(async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setAmountOut('');
      return;
    }

    const router = swapRouterRef.current;
    const manager = poolManagerRef.current;
    
    if (!router) {
      console.log('⏳ Swap router not ready');
      return;
    }

    if (!manager) {
      console.log('⏳ Pool manager not ready');
      return;
    }

    setQuoteLoading(true);
    try {
      const amountInWei = parseUnits(amount, 18);
      const selectedFeeTier = FEE_TIERS.find(fee => fee.value === selectedFee);
      
      // 计算 zeroForOne (token 地址比较大小)
      const zeroForOne = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
      
      // 确定 token0 和 token1 (按地址大小排序)
      const token0 = zeroForOne ? tokenIn.address : tokenOut.address;
      const token1 = zeroForOne ? tokenOut.address : tokenIn.address;
      
      console.log('🔍 Checking pool...', {
        token0: token0.slice(0, 10) + '...',
        token1: token1.slice(0, 10) + '...',
        index: selectedFeeTier?.index,
      });
      
      // 检查池子是否存在
      const poolAddress = await manager.getPool(token0, token1, selectedFeeTier?.index ?? 1);
      console.log('📍 Pool address:', poolAddress);
      
      if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
        message.error(`Pool does not exist for ${tokenIn.symbol}/${tokenOut.symbol} with ${selectedFeeTier?.label} fee tier. Please create the pool first in the Liquidity page.`);
        setAmountOut('');
        setQuoteLoading(false);
        return;
      }
      
      // 设置价格限制：不限制价格时使用极限值
      // MIN_SQRT_PRICE = 4295128739
      // MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342
      const sqrtPriceLimitX96 = zeroForOne 
        ? BigInt('4295128740')  // MIN_SQRT_PRICE + 1
        : BigInt('1461446703485210103287273052203988822378723970341');  // MAX_SQRT_PRICE - 1
      
      console.log('💰 Getting quote...', {
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        amountIn: amount,
        fee: selectedFeeTier?.label,
        zeroForOne,
      });
      
      // 调用 quoteExactInput 获取报价 (使用 staticCall 进行只读调用)
      const quote = await router.quoteExactInput.staticCall({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        indexPath: [selectedFeeTier?.index ?? 1], // 使用选择的费率对应的索引
        amountIn: amountInWei,
        sqrtPriceLimitX96: sqrtPriceLimitX96,
      });

      const formattedQuote = formatUnits(quote, 18);
      setAmountOut(formattedQuote);
      console.log('✅ Quote received:', formattedQuote);
    } catch (error: any) {
      console.error('❌ Error getting quote:', error);
      
      // 提供更友好的错误信息
      let errorMessage = 'Failed to get quote';
      
      if (error.message?.includes('Unexpected error')) {
        errorMessage = `Pool might have no liquidity. Please add liquidity to ${tokenIn.symbol}/${tokenOut.symbol} pool first.`;
      } else if (error.message?.includes('Pool not found')) {
        errorMessage = `Pool does not exist for ${tokenIn.symbol}/${tokenOut.symbol}. Please create the pool first.`;
      } else if (error.message?.includes('SPL')) {
        errorMessage = 'Price limit error. Please try a different amount.';
      } else if (error.message?.includes('AS')) {
        errorMessage = 'Invalid swap amount.';
      } else if (error.shortMessage) {
        errorMessage = error.shortMessage;
      }
      
      message.warning(errorMessage);
      setAmountOut('');
    } finally {
      setQuoteLoading(false);
    }
  }, [tokenIn.address, tokenIn.symbol, tokenOut.address, tokenOut.symbol, selectedFee]);

  // 处理输入金额变化 - 自动获取报价
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amountIn) {
        console.log('🔄 Input changed, getting quote for:', amountIn);
        getQuote(amountIn);
      } else {
        setAmountOut('');
      }
    }, 500); // 防抖 500ms

    return () => clearTimeout(timer);
  }, [amountIn, getQuote]);

  // 授权代币
  const approveToken = async () => {
    if (!isConnected) {
      message.warning('Please connect wallet first');
      return;
    }

    if (!signer) {
      message.warning('Wallet is initializing, please wait a moment...');
      return;
    }

    try {
      setLoading(true);
      const tokenContract = new Contract(tokenIn.address, ERC20_ABI, signer);
      const tx = await tokenContract.approve(CONTRACTS.SwapRouter, MaxUint256);
      await tx.wait();
      
      message.success('Approval successful!');
      // 重新检查授权额度
      await checkAllowance();
    } catch (error: any) {
      console.error('Error approving:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('UNSUPPORTED_OPERATION')) {
        errorMessage = 'Please make sure your wallet is connected and unlocked.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected.';
      }
      
      message.error(`Approval failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 执行交换
  const handleSwap = async () => {
    if (!amountIn || !amountOut) {
      message.warning('Please enter amount');
      return;
    }

    if (!isConnected) {
      message.warning('Please connect wallet first');
      return;
    }

    if (!swapRouter) {
      message.error('Swap router not found. Please wait a moment and try again.');
      return;
    }

    try {
      setLoading(true);
      const amountInWei = parseUnits(amountIn, 18);
      const amountOutMin = parseUnits((parseFloat(amountOut) * 0.95).toString(), 18); // 5% slippage
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      const selectedFeeTier = FEE_TIERS.find(fee => fee.value === selectedFee);

      // 计算 zeroForOne (token 地址比较大小)
      const zeroForOne = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
      
      // 设置价格限制：不限制价格时使用极限值
      const sqrtPriceLimitX96 = zeroForOne 
        ? BigInt('4295128740')  // MIN_SQRT_PRICE + 1
        : BigInt('1461446703485210103287273052203988822378723970341');  // MAX_SQRT_PRICE - 1

      const tx = await swapRouter.exactInput({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        indexPath: [selectedFeeTier?.index ?? 1],
        recipient: address,
        deadline: deadline,
        amountIn: amountInWei,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: sqrtPriceLimitX96,
      });

      await tx.wait();
      message.success('Swap successful!');
      setAmountIn('');
      setAmountOut('');
      // 刷新余额
      refreshBalances();
    } catch (error: any) {
      console.error('Error swapping:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('UNSUPPORTED_OPERATION')) {
        errorMessage = 'Please make sure your wallet is connected and unlocked.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected.';
      }
      
      message.error(`Swap failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 交换代币位置
  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setAmountOut('');
  };

  return (
    <div className="swap-container">
      <Card 
        style={{ maxWidth: 540, margin: '0 auto', borderRadius: 16 }}
        className="swap-card"
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Swap</Title>
          </Col>
          <Col>
            {isConnected && (
              <Space>
                <Tag color="blue" style={{ padding: '4px 12px', fontSize: '14px' }}>
                  💰 {formatBalance(ethBalance)} ETH
                </Tag>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={refreshBalances}
                  disabled={loading}
                  shape="circle"
                />
              </Space>
            )}
          </Col>
        </Row>

        {/* 费率选择 */}
        <div style={{ marginBottom: 24 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Fee Tier</Text>
          <Segmented
            options={FEE_TIERS.map(fee => ({
              label: fee.label,
              value: fee.value,
            }))}
            value={selectedFee}
            onChange={(val) => setSelectedFee(val as number)}
            block
            disabled={loading}
          />
        </div>
        
        {/* From Input */}
        <Card 
          size="small" 
          style={{ marginBottom: 8 }}
        >
          <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
            <Col>
              <Text type="secondary">From</Text>
            </Col>
            <Col>
              <Button 
                type="primary" 
                size="small" 
                onClick={setMaxAmount}
                disabled={loading || parseFloat(balanceIn) === 0}
                icon={<ThunderboltOutlined />}
              >
                MAX
              </Button>
            </Col>
          </Row>
          <Row gutter={12} align="middle">
            <Col flex="auto">
              <InputNumber
                style={{ width: '100%', fontSize: 24, fontWeight: 600 }}
                bordered={false}
                placeholder="0.0"
                value={amountIn ? parseFloat(amountIn) : undefined}
                onChange={(val) => setAmountIn(val?.toString() || '')}
                disabled={loading}
                controls={false}
                min={0}
                stringMode
              />
            </Col>
            <Col>
              <Select
                value={tokenIn.address}
                onChange={(val) => setTokenIn(TOKEN_LIST.find(t => t.address === val) || TOKEN_LIST[0])}
                disabled={loading}
                style={{ width: 120 }}
                size="large"
              >
                {TOKEN_LIST.map((token) => (
                  <Select.Option key={token.address} value={token.address}>
                    {token.symbol}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Balance: {loadingBalanceIn ? (
                <Spin size="small" />
              ) : (
                <Text strong>{formatBalance(balanceIn)} {tokenIn.symbol}</Text>
              )}
            </Text>
          </div>
        </Card>

        {/* Switch Button */}
        <Row justify="center" style={{ margin: '8px 0' }}>
          <Button 
            icon={<SwapOutlined />}
            onClick={switchTokens} 
            disabled={loading}
            shape="circle"
            size="large"
            type="default"
          />
        </Row>

        {/* To Input */}
        <Card 
          size="small" 
          style={{ marginBottom: 16 }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>To (estimated)</Text>
          <Row gutter={12} align="middle">
            <Col flex="auto">
              <InputNumber
                style={{ width: '100%', fontSize: 24, fontWeight: 600 }}
                bordered={false}
                placeholder="0.0"
                value={amountOut ? parseFloat(amountOut) : undefined}
                disabled
                controls={false}
                stringMode
              />
            </Col>
            <Col>
              <Select
                value={tokenOut.address}
                onChange={(val) => setTokenOut(TOKEN_LIST.find(t => t.address === val) || TOKEN_LIST[1])}
                disabled={loading}
                style={{ width: 120 }}
                size="large"
              >
                {TOKEN_LIST.map((token) => (
                  <Select.Option key={token.address} value={token.address}>
                    {token.symbol}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Balance: {loadingBalanceOut ? (
                <Spin size="small" />
              ) : (
                <Text strong>{formatBalance(balanceOut)} {tokenOut.symbol}</Text>
              )}
            </Text>
          </div>
        </Card>

        {quoteLoading && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Space>
              <Spin size="small" />
              <Text type="secondary">Getting quote...</Text>
            </Space>
          </div>
        )}

        {!isConnected ? (
          <Button type="primary" size="large" block disabled>
            Connect Wallet
          </Button>
        ) : !isSignerReady ? (
          <Button type="primary" size="large" block disabled loading>
            Initializing Wallet...
          </Button>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            {needsApproval() && (
              <Button 
                type="default"
                size="large" 
                onClick={approveToken}
                disabled={loading || checkingAllowance}
                block
                icon={<CheckCircleOutlined />}
                loading={checkingAllowance}
              >
                {loading ? 'Approving...' : checkingAllowance ? 'Checking...' : `Approve ${tokenIn.symbol}`}
              </Button>
            )}
            <Button 
              type="primary"
              size="large" 
              onClick={handleSwap}
              disabled={loading || !amountIn || !amountOut || needsApproval()}
              block
              loading={loading}
              icon={<SwapOutlined />}
            >
              {loading ? 'Swapping...' : 'Swap'}
            </Button>
          </Space>
        )}
      </Card>
    </div>
  );
}
