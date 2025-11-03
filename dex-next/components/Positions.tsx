'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, Contract, parseUnits, MaxUint256 } from 'ethers';
import { usePositionManager, useEthersSigner, usePoolManager } from '../hooks/useContract';
import { TOKEN_LIST, CONTRACTS } from '../config/contracts';
import { ERC20_ABI, POOL_ABI, Pair } from '../config/abis';
import { Card, Button, Space, message, Typography, Row, Col, List, Tag, Empty, Descriptions, Statistic, Divider, Modal, Select, InputNumber, Alert } from 'antd';
import { ReloadOutlined, DollarOutlined, DeleteOutlined, WalletOutlined, PlusOutlined, CheckCircleOutlined, PauseCircleOutlined, PlayCircleOutlined, LinkOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Position {
  id: bigint;
  owner: string;
  token0: string;
  token1: string;
  index: number;
  fee: bigint;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
}

interface PositionWithBalances extends Position {
  poolAddress?: string;
  poolToken0Balance?: bigint;
  poolToken1Balance?: bigint;
  userToken0Share?: bigint;
  userToken1Share?: bigint;
  poolTotalLiquidity?: bigint;
  poolToken0BalanceStr?: string;
  poolToken1BalanceStr?: string;
  userToken0ShareStr?: string;
  userToken1ShareStr?: string;
  status?: 'running' | 'stopped';
}

// Fee tier map
const FEE_TIER_MAP: Record<number, string> = {
  0: '0.05%',
  1: '0.30%',
  2: '1.00%',
};

export default function Positions() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<PositionWithBalances[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const positionManager = usePositionManager();
  const poolManager = usePoolManager();
  const signer = useEthersSigner();
  
  // Add Position Modal
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [selectedPair, setSelectedPair] = useState<Pair | null>(null);
  const [availablePools, setAvailablePools] = useState<any[]>([]);
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [addPositionLoading, setAddPositionLoading] = useState(false);
  
  console.log(positions);
  

  // 根据地址查找代币符号
  const getTokenSymbol = (address: string): string => {
    const token = TOKEN_LIST.find(t => t.address.toLowerCase() === address?.toLowerCase());
    return token?.symbol || `${address?.slice(0, 6)}...${address?.slice(-4)}`;
  };

  // 获取持仓的token余额信息
  const fetchPositionBalances = async (position: Position): Promise<PositionWithBalances> => {
    if (!signer || !poolManager) {
      return { ...position };
    }

    try {
      // 获取pool地址
      const poolAddress = await poolManager.getPool(position.token0, position.token1, position.index);
      
      if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
        console.warn('Invalid pool address for position:', position.id.toString());
        return { ...position };
      }

      // 创建pool合约实例
      const poolContract = new Contract(poolAddress, POOL_ABI, signer);
      
      // 获取pool的总流动性
      const poolTotalLiquidity = await poolContract.liquidity();
      
      // 获取token合约
      const token0Contract = new Contract(position.token0, ERC20_ABI, signer);
      const token1Contract = new Contract(position.token1, ERC20_ABI, signer);

      // 获取pool的token余额
      const [poolToken0Balance, poolToken1Balance] = await Promise.all([
        token0Contract.balanceOf(poolAddress),
        token1Contract.balanceOf(poolAddress),
      ]);

      // 计算用户的份额（基于流动性比例）
      let userToken0Share = 0n;
      let userToken1Share = 0n;
      
      if (poolTotalLiquidity > 0n) {
        // 用户份额 = (用户流动性 / 总流动性) * 池子token余额
        userToken0Share = (position.liquidity * poolToken0Balance) / poolTotalLiquidity;
        userToken1Share = (position.liquidity * poolToken1Balance) / poolTotalLiquidity;
      }

      return {
        ...position,
        poolAddress,
        poolToken0Balance,
        poolToken1Balance,
        userToken0Share,
        userToken1Share,
        poolTotalLiquidity,
        // 添加字符串版本避免BigInt序列化问题
        poolToken0BalanceStr: poolToken0Balance.toString(),
        poolToken1BalanceStr: poolToken1Balance.toString(),
        userToken0ShareStr: userToken0Share.toString(),
        userToken1ShareStr: userToken1Share.toString(),
      };
    } catch (error) {
      console.error('Error fetching position balances for position:', position.id.toString(), error);
      // 即使获取余额失败，也返回持仓基本信息
      return { ...position };
    }
  };

  // 获取所有持仓
  const fetchPositions = async () => {
    console.log('🔍 [Positions] fetchPositions called:', {
      isConnected,
      address,
      hasPositionManager: !!positionManager
    });

    if (!isConnected || !address || !positionManager) {
      console.log('⚠️ [Positions] Missing requirements, skipping fetch');
      return;
    }

    setLoading(true);
    try {
      console.log('📡 [Positions] Calling positionManager.getAllPositions()...');
      const allPositions = await positionManager.getAllPositions();
      console.log('✅ [Positions] All positions:', allPositions);
      
      // 将 ethers Result 类型转换为普通对象数组
      const positionsArray = allPositions.map((pos: any) => {
        const obj = pos.toObject();
        console.log('📦 Position object:', obj);
        return obj as Position;
      });
      
      // 过滤当前用户的持仓
      const userPositions = positionsArray.filter(
        (pos: any) => pos.owner.toLowerCase() === address.toLowerCase()
      );
      
      console.log('👤 [Positions] User positions:', userPositions);
      
      // 获取每个持仓的token余额信息和状态
      if (userPositions.length > 0 && signer && poolManager) {
        console.log('💰 [Positions] Fetching token balances for positions...');
        const positionsWithBalances = await Promise.all(
          userPositions.map(async (pos: Position) => {
            const balances = await fetchPositionBalances(pos);
            
            // 尝试获取position的状态
            let status: 'running' | 'stopped' = 'running';
            try {
              const isPaused = await positionManager.isPaused(pos.id);
              status = isPaused ? 'stopped' : 'running';
            } catch (error) {
              console.log('Cannot get position status, defaulting to running');
            }
            
            return { ...balances, status };
          })
        );
        setPositions(positionsWithBalances);
        console.log('✅ [Positions] Positions with balances:', positionsWithBalances);
      } else {
      setPositions(userPositions);
      }
      
      if (userPositions.length === 0) {
        console.log('ℹ️ [Positions] No positions found for user:', address);
      }
    } catch (error: any) {
      console.error('❌ [Positions] Error fetching positions:', error);
      message.error(`Failed to fetch positions: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 [Positions] useEffect triggered, fetching positions...');
    fetchPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, positionManager, poolManager, signer]);

  // 获取所有交易对
  const fetchPairs = async () => {
    if (!poolManager) return;
    
    try {
      const allPairs = await poolManager.getPairs();
      console.log('Available pairs:', allPairs);
      setPairs(allPairs);
    } catch (error) {
      console.error('Error fetching pairs:', error);
      message.error('Failed to fetch trading pairs');
    }
  };

  // 获取选定交易对的所有池子
  const fetchPoolsForPair = async (pair: Pair) => {
    if (!poolManager) return;
    
    try {
      const allPools = await poolManager.getAllPools();
      const filteredPools = allPools.filter((pool: any) => 
        pool.token0.toLowerCase() === pair.token0.toLowerCase() &&
        pool.token1.toLowerCase() === pair.token1.toLowerCase()
      );
      
      console.log('Pools for pair:', filteredPools);
      setAvailablePools(filteredPools);
      
      // 自动选择第一个池子
      if (filteredPools.length > 0) {
        setSelectedPoolIndex(filteredPools[0].index);
      }
    } catch (error) {
      console.error('Error fetching pools for pair:', error);
      message.error('Failed to fetch pools');
    }
  };

  // 当打开弹窗时获取交易对
  useEffect(() => {
    if (showAddPositionModal && poolManager) {
      fetchPairs();
    }
  }, [showAddPositionModal, poolManager]);

  // 当选择交易对时获取池子
  useEffect(() => {
    if (selectedPair) {
      fetchPoolsForPair(selectedPair);
    } else {
      setAvailablePools([]);
      setSelectedPoolIndex(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair]);

  // 授权代币
  const approveTokens = async () => {
    if (!selectedPair || !signer) {
      message.warning('Please select a trading pair first');
      return;
    }

    try {
      setAddPositionLoading(true);
      const token0Contract = new Contract(selectedPair.token0, ERC20_ABI, signer);
      const token1Contract = new Contract(selectedPair.token1, ERC20_ABI, signer);

      const tx0 = await token0Contract.approve(CONTRACTS.PositionManager, MaxUint256);
      await tx0.wait();
      
      const tx1 = await token1Contract.approve(CONTRACTS.PositionManager, MaxUint256);
      await tx1.wait();

      message.success('Tokens approved successfully!');
    } catch (error) {
      console.error('Error approving tokens:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Approval failed: ${errorMessage}`);
    } finally {
      setAddPositionLoading(false);
    }
  };

  // 添加头寸（mint）
  const addPosition = async () => {
    if (!selectedPair || selectedPoolIndex === null || !amount0 || !amount1) {
      message.warning('Please fill in all fields');
      return;
    }

    if (!positionManager || !address) {
      message.error('Position manager not found');
      return;
    }

    try {
      setAddPositionLoading(true);
      const amount0Wei = parseUnits(amount0, 18);
      const amount1Wei = parseUnits(amount1, 18);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      const tx = await positionManager.mint({
        token0: selectedPair.token0,
        token1: selectedPair.token1,
        index: selectedPoolIndex,
        amount0Desired: amount0Wei,
        amount1Desired: amount1Wei,
        recipient: address,
        deadline: deadline,
      });

      await tx.wait();
      message.success('Position added successfully!');
      
      // 重置表单
      setAmount0('');
      setAmount1('');
      setSelectedPair(null);
      setSelectedPoolIndex(null);
      setShowAddPositionModal(false);
      
      // 刷新持仓列表
      fetchPositions();
    } catch (error) {
      console.error('Error adding position:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Add position failed: ${errorMessage}`);
    } finally {
      setAddPositionLoading(false);
    }
  };

  // 暂停头寸
  const pausePosition = async (positionId: number) => {
    if (!positionManager) {
      message.error('Position manager not found');
      return;
    }

    try {
      setActionLoading(positionId);
      const tx = await positionManager.pause(positionId);
      await tx.wait();
      message.success('Position paused successfully!');
      fetchPositions();
    } catch (error) {
      console.error('Error pausing position:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Pause failed: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 恢复头寸
  const unpausePosition = async (positionId: number) => {
    if (!positionManager) {
      message.error('Position manager not found');
      return;
    }

    try {
      setActionLoading(positionId);
      const tx = await positionManager.unpause(positionId);
      await tx.wait();
      message.success('Position unpaused successfully!');
      fetchPositions();
    } catch (error) {
      console.error('Error unpausing position:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.error(`Unpause failed: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 在区块链浏览器中查看
  const viewInExplorer = (positionId: number) => {
    // 使用 Sepolia 测试网络的区块链浏览器
    const explorerUrl = `https://sepolia.etherscan.io/address/${CONTRACTS.PositionManager}`;
    window.open(explorerUrl, '_blank');
  };

  // 移除流动性
  const removeLiquidity = async (positionId: number) => {
    if (!positionManager) {
      message.error('Position manager not found');
      return;
    }

    try {
      setActionLoading(positionId);
      const tx = await positionManager.burn(positionId);
      await tx.wait();

      message.success('Liquidity removed successfully!');
      fetchPositions(); // 刷新持仓列表
    } catch (error: any) {
      console.error('Error removing liquidity:', error);
      message.error(`Remove liquidity failed: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 提取手续费
  const collectFees = async (positionId: number) => {
    if (!positionManager) {
      message.error('Position manager not found');
      return;
    }

    try {
      setActionLoading(positionId);
      const tx = await positionManager.collect(positionId, address);
      await tx.wait();

      message.success('Fees collected successfully!');
      fetchPositions(); // 刷新持仓列表
    } catch (error: any) {
      console.error('Error collecting fees:', error);
      message.error(`Collect fees failed: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="positions-container">
        <Card 
          style={{ maxWidth: 900, margin: '0 auto', borderRadius: 16 }}
          className="positions-card"
        >
          <Title level={2} style={{ marginBottom: 24 }}>Your Positions</Title>
          <Empty description="Please connect your wallet to view positions" />
        </Card>
      </div>
    );
  }

  return (
    <div className="positions-container">
      <Card 
        style={{ maxWidth: 900, margin: '0 auto', borderRadius: 16 }}
        className="positions-card"
      >
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Your Positions</Title>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowAddPositionModal(true)}
              >
                Add Position
              </Button>
            <Button 
              onClick={fetchPositions} 
              disabled={loading}
              icon={<ReloadOutlined />}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            </Space>
          </Col>
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">Loading positions...</Text>
          </div>
        ) : positions.length === 0 ? (
          <Empty description="No positions found" />
        ) : (
          <List
            dataSource={positions}
            renderItem={(position) => (
              <Card 
                key={position.id.toString()}
                style={{ marginBottom: 16 }}
                size="small"
              >
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <Col>
                    <Space>
                      <Title level={4} style={{ margin: 0 }}>Position #{position.id.toString()}</Title>
                      <Tag color="blue">{(position.fee / 10000n)}%</Tag>
                      <Tag 
                        color={position.status === 'running' ? 'green' : 'red'} 
                        icon={position.status === 'running' ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                      >
                        {position.status === 'running' ? 'Running' : 'Stopped'}
                      </Tag>
                    </Space>
                  </Col>
                </Row>
                
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Token 0">
                    <Space>
                      <Text strong>{getTokenSymbol(position.token0)}</Text>
                      <Text code style={{ fontSize: 11 }}>
                      {position.token0.slice(0, 6)}...{position.token0.slice(-4)}
                    </Text>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Token 1">
                    <Space>
                      <Text strong>{getTokenSymbol(position.token1)}</Text>
                      <Text code style={{ fontSize: 11 }}>
                      {position.token1.slice(0, 6)}...{position.token1.slice(-4)}
                    </Text>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Liquidity">
                    {parseFloat(formatUnits(position.liquidity, 18)).toFixed(4)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tick Range">
                    {position.tickLower} → {position.tickUpper}
                  </Descriptions.Item>
                  <Descriptions.Item label="Fees Earned">
                    <Space split={<Text type="secondary">/</Text>}>
                      <Text>{parseFloat(formatUnits(position.tokensOwed0, 18)).toFixed(4)} {getTokenSymbol(position.token0)}</Text>
                      <Text>{parseFloat(formatUnits(position.tokensOwed1, 18)).toFixed(4)} {getTokenSymbol(position.token1)}</Text>
                    </Space>
                  </Descriptions.Item>
                </Descriptions>

                {/* Token Amounts in Position */}
                {(position.userToken0Share || position.userToken1Share) && (
                  <>
                    <Divider style={{ margin: '16px 0' }}>
                      <Space>
                        <WalletOutlined />
                        <Text type="secondary" style={{ fontSize: 12 }}>Your Token Amounts</Text>
                      </Space>
                    </Divider>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Statistic
                          title={
                            <Space size={4}>
                              <Text style={{ fontSize: 12 }}>{getTokenSymbol(position.token0)}</Text>
                              <Tag color="blue" style={{ fontSize: 9, padding: '0 4px', margin: 0 }}>T0</Tag>
                            </Space>
                          }
                          value={position.userToken0Share ? parseFloat(formatUnits(position.userToken0Share, 18)).toFixed(4) : '0'}
                          valueStyle={{ fontSize: 16, fontWeight: 600, color: '#1890ff' }}
                        />
                        {position.poolToken0Balance && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Pool: {parseFloat(formatUnits(position.poolToken0Balance, 18)).toFixed(2)}
                          </Text>
                        )}
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={
                            <Space size={4}>
                              <Text style={{ fontSize: 12 }}>{getTokenSymbol(position.token1)}</Text>
                              <Tag color="cyan" style={{ fontSize: 9, padding: '0 4px', margin: 0 }}>T1</Tag>
                            </Space>
                          }
                          value={position.userToken1Share ? parseFloat(formatUnits(position.userToken1Share, 18)).toFixed(4) : '0'}
                          valueStyle={{ fontSize: 16, fontWeight: 600, color: '#13c2c2' }}
                        />
                        {position.poolToken1Balance && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Pool: {parseFloat(formatUnits(position.poolToken1Balance, 18)).toFixed(2)}
                          </Text>
                        )}
                      </Col>
                    </Row>
                    {position.poolTotalLiquidity && position.poolTotalLiquidity > 0n && (
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Your share: {((Number(position.liquidity) / Number(position.poolTotalLiquidity)) * 100).toFixed(2)}% of pool liquidity
                        </Text>
                      </div>
                    )}
                  </>
                )}

                <Space style={{ marginTop: 16, width: '100%' }} direction="horizontal" wrap>
                  <Button
                    onClick={() => collectFees(Number(position.id))}
                    disabled={actionLoading !== null}
                    loading={actionLoading === Number(position.id)}
                    icon={<DollarOutlined />}
                    type="primary"
                  >
                    {actionLoading === Number(position.id) ? 'Processing...' : 'Collect Fees'}
                  </Button>
                  <Button
                    onClick={() => removeLiquidity(Number(position.id))}
                    disabled={actionLoading !== null}
                    loading={actionLoading === Number(position.id)}
                    icon={<DeleteOutlined />}
                    danger
                  >
                    {actionLoading === Number(position.id) ? 'Processing...' : 'Remove Liquidity'}
                  </Button>
                  {position.status === 'running' ? (
                    <Button
                      onClick={() => pausePosition(Number(position.id))}
                      disabled={actionLoading !== null}
                      loading={actionLoading === Number(position.id)}
                      icon={<PauseCircleOutlined />}
                    >
                      {actionLoading === Number(position.id) ? 'Pausing...' : 'Pause'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => unpausePosition(Number(position.id))}
                      disabled={actionLoading !== null}
                      loading={actionLoading === Number(position.id)}
                      icon={<PlayCircleOutlined />}
                    >
                      {actionLoading === Number(position.id) ? 'Unpausing...' : 'Unpause'}
                    </Button>
                  )}
                  <Button
                    onClick={() => viewInExplorer(Number(position.id))}
                    icon={<LinkOutlined />}
                    type="link"
                  >
                    Explorer
                  </Button>
                </Space>
              </Card>
            )}
          />
        )}
      </Card>

      {/* Add Position Modal */}
      <Modal
        title="Add Position"
        open={showAddPositionModal}
        onCancel={() => {
          setShowAddPositionModal(false);
          setSelectedPair(null);
          setSelectedPoolIndex(null);
          setAmount0('');
          setAmount1('');
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Add Liquidity Position"
            description="Select a trading pair and pool, then specify the token amounts you want to provide."
            type="info"
            showIcon
          />

          {/* 选择交易对 */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Trading Pair</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Token Pair"
              value={selectedPair ? `${selectedPair.token0}-${selectedPair.token1}` : undefined}
              onChange={(value) => {
                const pair = pairs.find(p => `${p.token0}-${p.token1}` === value);
                setSelectedPair(pair || null);
              }}
              size="large"
            >
              {pairs.map((pair, index) => (
                <Select.Option key={index} value={`${pair.token0}-${pair.token1}`}>
                  {getTokenSymbol(pair.token0)} / {getTokenSymbol(pair.token1)}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* 显示可用的费率池 */}
          {selectedPair && availablePools.length > 0 && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Fee Tier</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedPoolIndex}
                onChange={setSelectedPoolIndex}
                size="large"
              >
                {availablePools.map((pool) => (
                  <Select.Option key={pool.index} value={pool.index}>
                    <Space>
                      <Tag color="purple">{FEE_TIER_MAP[pool.index] || `${pool.fee / 10000}%`}</Tag>
                      <Text type="secondary">Liquidity: {parseFloat(formatUnits(pool.liquidity, 18)).toFixed(2)}</Text>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}

          {selectedPair && selectedPoolIndex !== null && (
            <>
              <Divider />

              {/* Token 0 Amount */}
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  {getTokenSymbol(selectedPair.token0)} Amount
                </Text>
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.0"
                  value={amount0 ? parseFloat(amount0) : undefined}
                  onChange={(val) => setAmount0(val?.toString() || '')}
                  disabled={addPositionLoading}
                  size="large"
                  min={0}
                  stringMode
                />
              </div>

              {/* Token 1 Amount */}
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  {getTokenSymbol(selectedPair.token1)} Amount
                </Text>
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.0"
                  value={amount1 ? parseFloat(amount1) : undefined}
                  onChange={(val) => setAmount1(val?.toString() || '')}
                  disabled={addPositionLoading}
                  size="large"
                  min={0}
                  stringMode
                />
              </div>

              <Divider />

              {/* Action Buttons */}
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="default"
                  size="large"
                  block
                  icon={<CheckCircleOutlined />}
                  onClick={approveTokens}
                  disabled={addPositionLoading}
                  loading={addPositionLoading}
                >
                  Approve Tokens
                </Button>
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<PlusOutlined />}
                  onClick={addPosition}
                  disabled={addPositionLoading || !amount0 || !amount1}
                  loading={addPositionLoading}
                >
                  Add Position
                </Button>
              </Space>
            </>
          )}

          {selectedPair && availablePools.length === 0 && (
            <Alert
              message="No Pools Available"
              description="There are no liquidity pools for this trading pair. Please create a pool first."
              type="warning"
              showIcon
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}
