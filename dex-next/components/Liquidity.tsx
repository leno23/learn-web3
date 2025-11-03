'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import { parseUnits, MaxUint256, Contract } from 'ethers';
import { usePositionManager, useEthersSigner } from '../hooks/useContract';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { TOKEN_LIST } from '../config/contracts';
import { CONTRACTS } from '../config/contracts';
import { ERC20_ABI } from '../config/abis';
import { Card, Button, InputNumber, Select, Space, Spin, message, Typography, Row, Col, Segmented, Divider, Alert, Modal } from 'antd';
import { PlusOutlined, CheckCircleOutlined, InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import PoolList from './PoolList';
import CreatePool from './CreatePool';

const { Text, Title } = Typography;

// 费率选项
const FEE_TIERS = [
  { label: '0.05%', value: 500, index: 0 },
  { label: '0.30%', value: 3000, index: 1 },
  { label: '1.00%', value: 10000, index: 2 },
];

export default function Liquidity() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const [token0, setToken0] = useState(TOKEN_LIST[0]);
  const [token1, setToken1] = useState(TOKEN_LIST[1]);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState(FEE_TIERS[1].value); // 默认 0.30%
  const [fromPool, setFromPool] = useState(false); // 标记是否来自池子列表
  const [poolRefreshKey, setPoolRefreshKey] = useState(0); // 用于触发 PoolList 刷新
  const [showCreatePoolModal, setShowCreatePoolModal] = useState(false);
  const [showAddLiquidityModal, setShowAddLiquidityModal] = useState(false);

  const { balance: balance0, refetch: refetchBalance0, loading: loadingBalance0 } = useTokenBalance(token0.address);
  const { balance: balance1, refetch: refetchBalance1, loading: loadingBalance1 } = useTokenBalance(token1.address);
  const positionManager = usePositionManager();
  const signer = useEthersSigner();
  
  // 检查 signer 是否准备好
  const isSignerReady = !!signer;

  // ✅ 处理从 PoolList 传递过来的参数
  useEffect(() => {
    const token0Addr = searchParams.get('token0');
    const token1Addr = searchParams.get('token1');
    const feeIndex = searchParams.get('feeIndex');
    
    if (token0Addr && token1Addr) {
      const t0 = TOKEN_LIST.find(t => t.address.toLowerCase() === token0Addr.toLowerCase());
      const t1 = TOKEN_LIST.find(t => t.address.toLowerCase() === token1Addr.toLowerCase());
      
      if (t0 && t1) {
        console.log('🔗 [Liquidity] Received params from PoolList');
        setToken0(t0);
        setToken1(t1);
        
        if (feeIndex) {
          const feeTier = FEE_TIERS.find(tier => tier.index === parseInt(feeIndex));
          if (feeTier) {
            setSelectedFee(feeTier.value);
          }
        }
        
        setFromPool(true);
        message.success(`Pre-filled for ${t0.symbol}/${t1.symbol} pool`);
      }
    }
  }, [searchParams]);

  // 调试信息：监控钱包和signer状态
  useEffect(() => {
    console.log('💡 Liquidity Page - Wallet Status:', {
      isConnected,
      address,
      hasPositionManager: !!positionManager,
      hasSigner: !!signer,
      isSignerReady
    });
  }, [isConnected, address, positionManager, signer, isSignerReady]);

  // 使用 useRef 保存 refetch 函数，避免依赖问题
  const refetchBalance0Ref = useRef(refetchBalance0);
  const refetchBalance1Ref = useRef(refetchBalance1);
  
  // 更新 ref
  refetchBalance0Ref.current = refetchBalance0;
  refetchBalance1Ref.current = refetchBalance1;

  // ✅ 当代币切换时强制刷新余额（不依赖 refetch 函数）
  useEffect(() => {
    console.log('🔄 Token changed, refreshing balances...', {
      token0: token0.symbol,
      token1: token1.symbol,
    });
    // 使用 ref 访问最新的 refetch 函数
    refetchBalance0Ref.current();
    refetchBalance1Ref.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token0.address, token1.address]); // ✅ 只依赖地址，不依赖函数

  // 授权代币
  const approveTokens = async () => {
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

      // 使用 signer 创建合约实例，确保可以发送交易
      const token0ContractWithSigner = new Contract(token0.address, ERC20_ABI, signer);
      const token1ContractWithSigner = new Contract(token1.address, ERC20_ABI, signer);

      // 授权 token0
      console.log('Approving token0...');
      const tx0 = await token0ContractWithSigner.approve(CONTRACTS.PositionManager, MaxUint256);
      await tx0.wait();
      console.log('Token0 approved!');

      // 授权 token1
      console.log('Approving token1...');
      const tx1 = await token1ContractWithSigner.approve(CONTRACTS.PositionManager, MaxUint256);
      await tx1.wait();
      console.log('Token1 approved!');

      message.success('Approval successful!');
    } catch (error) {
      console.error('Error approving:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Approval failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 添加流动性
  const addLiquidity = async () => {
    if (!amount0 || !amount1) {
      message.warning('Please enter amounts');
      return;
    }

    if (!isConnected) {
      message.warning('Please connect wallet first');
      return;
    }

    if (!positionManager) {
      message.error('Position manager not found. Please wait a moment and try again.');
      return;
    }

    try {
      setLoading(true);
      const amount0Wei = parseUnits(amount0, 18);
      const amount1Wei = parseUnits(amount1, 18);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      const selectedFeeTier = FEE_TIERS.find(fee => fee.value === selectedFee);

      const tx = await positionManager.mint({
        token0: token0.address,
        token1: token1.address,
        index: selectedFeeTier?.index ?? 1, // 使用选择的费率对应的索引
        amount0Desired: amount0Wei,
        amount1Desired: amount1Wei,
        recipient: address,
        deadline: deadline,
      });

      await tx.wait();
      message.success('Liquidity added successfully!');
      setAmount0('');
      setAmount1('');
      // 刷新余额
      refetchBalance0();
      refetchBalance1();
      // 触发 PoolList 刷新
      setPoolRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error adding liquidity:', error);
      
      // 提供更友好的错误提示
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('UNSUPPORTED_OPERATION')) {
          errorMessage = 'Please make sure your wallet is connected and unlocked.';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected.';
        }
      }
      
      message.error(`Add liquidity failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="liquidity-container" style={{ padding: '24px' }}>
      {/* 顶部操作按钮 */}
      <Card style={{ marginBottom: 24, borderRadius: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>Liquidity Management</Title>
            <Text type="secondary">Manage your liquidity positions and pools</Text>
          </Col>
          <Col>
            <Space size="middle">
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={() => setShowCreatePoolModal(true)}
              >
                Create Pool
              </Button>
              <Button
                type="default"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setShowAddLiquidityModal(true)}
              >
                Add Liquidity
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 池子列表 */}
      <PoolList refreshKey={poolRefreshKey} />

      {/* Create Pool Modal */}
      <Modal
        title={null}
        open={showCreatePoolModal}
        onCancel={() => setShowCreatePoolModal(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <CreatePool 
          onPoolCreated={() => {
            setPoolRefreshKey(prev => prev + 1);
            setShowCreatePoolModal(false);
          }} 
        />
      </Modal>

      {/* Add Liquidity Modal */}
      <Modal
        title={null}
        open={showAddLiquidityModal}
        onCancel={() => setShowAddLiquidityModal(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Card 
          style={{ border: 'none' }}
          className="liquidity-card"
        >
          <Title level={2} style={{ marginBottom: 24 }}>Add Liquidity</Title>

              {/* 来自池子列表的提示 */}
              {fromPool && (
                <Alert
                  message="Pool Pre-selected"
                  description={`Adding liquidity to ${token0.symbol}/${token1.symbol} pool`}
                  type="info"
                  icon={<InfoCircleOutlined />}
                  showIcon
                  closable
                  onClose={() => setFromPool(false)}
                  style={{ marginBottom: 24 }}
                />
              )}

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
              
              {/* Token 0 Input */}
              <Card 
                size="small" 
                style={{ marginBottom: 16 }}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Token 0</Text>
                <Row gutter={12} align="middle">
                  <Col flex="auto">
                    <InputNumber
                      style={{ width: '100%', fontSize: 24, fontWeight: 600 }}
                      bordered={false}
                      placeholder="0.0"
                      value={amount0 ? parseFloat(amount0) : undefined}
                      onChange={(val) => setAmount0(val?.toString() || '')}
                      disabled={loading}
                      controls={false}
                      min={0}
                      stringMode
                    />
                  </Col>
                  <Col>
                    <Select
                      value={token0.address}
                      onChange={(val) => setToken0(TOKEN_LIST.find(t => t.address === val) || TOKEN_LIST[0])}
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
                    Balance: {loadingBalance0 ? (
                      <Spin size="small" />
                    ) : (
                      <Text strong>{parseFloat(balance0).toFixed(4)}</Text>
                    )}
                  </Text>
                </div>
              </Card>

              <Divider style={{ margin: '16px 0' }}>
                <PlusOutlined style={{ color: '#999' }} />
              </Divider>

              {/* Token 1 Input */}
              <Card 
                size="small" 
                style={{ marginBottom: 24 }}
              >
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Token 1</Text>
                <Row gutter={12} align="middle">
                  <Col flex="auto">
                    <InputNumber
                      style={{ width: '100%', fontSize: 24, fontWeight: 600 }}
                      bordered={false}
                      placeholder="0.0"
                      value={amount1 ? parseFloat(amount1) : undefined}
                      onChange={(val) => setAmount1(val?.toString() || '')}
                      disabled={loading}
                      controls={false}
                      min={0}
                      stringMode
                    />
                  </Col>
                  <Col>
                    <Select
                      value={token1.address}
                      onChange={(val) => setToken1(TOKEN_LIST.find(t => t.address === val) || TOKEN_LIST[1])}
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
                    Balance: {loadingBalance1 ? (
                      <Spin size="small" />
                    ) : (
                      <Text strong>{parseFloat(balance1).toFixed(4)}</Text>
                    )}
                  </Text>
                </div>
              </Card>

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
                  <Button 
                    type="default"
                    size="large" 
                    onClick={approveTokens}
                    disabled={loading}
                    block
                    icon={<CheckCircleOutlined />}
                  >
                    {loading ? 'Approving...' : 'Approve Tokens'}
                  </Button>
                  <Button 
                    type="primary"
                    size="large" 
                    onClick={addLiquidity}
                    disabled={loading || !amount0 || !amount1}
                    block
                    loading={loading}
                    icon={<PlusOutlined />}
                  >
                    {loading ? 'Adding...' : 'Add Liquidity'}
                  </Button>
                </Space>
              )}
        </Card>
      </Modal>
    </div>
  );
}
