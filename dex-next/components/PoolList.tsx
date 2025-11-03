'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatUnits, Contract } from 'ethers';
import { usePoolManager, useEthersSigner } from '../hooks/useContract';
import { TOKEN_LIST } from '../config/contracts';
import { ERC20_ABI } from '../config/abis';
import { Card, Button, List, Typography, Row, Col, Tag, Empty, Statistic, Space, Divider, message, Progress, Tooltip } from 'antd';
import { ReloadOutlined, SwapOutlined, PlusOutlined, InfoCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { getPriceRangeFromTicks, formatPrice as formatPriceUtil } from '../utils/priceUtils';

const { Text, Title } = Typography;

// 费率选项映射
const FEE_TIER_MAP: Record<number, string> = {
  0: '0.05%',
  1: '0.30%',
  2: '1.00%',
};

interface Pool {
  pool: string;
  token0: string;
  token1: string;
  index: number;
  fee: number;
  feeProtocol: number;
  tickLower: number;
  tickUpper: number;
  tick: number;
  sqrtPriceX96: bigint;
  liquidity: bigint;
}

interface PoolWithBalances extends Pool {
  token0Balance?: bigint;
  token1Balance?: bigint;
  token0BalanceStr?: string;
  token1BalanceStr?: string;
}

interface PoolListProps {
  refreshKey?: number; // 用于触发外部刷新
}

export default function PoolList({ refreshKey }: PoolListProps) {
  const router = useRouter();
  const [pools, setPools] = useState<PoolWithBalances[]>([]);
  const [loading, setLoading] = useState(false);
  const poolManager = usePoolManager();
  const signer = useEthersSigner();

  // 根据地址查找代币符号
  const getTokenSymbol = (address: string): string => {
    const token = TOKEN_LIST.find(t => t.address.toLowerCase() === address?.toLowerCase());
    return token?.symbol || `${address?.slice(0, 6)}...${address?.slice(-4)}`;
  };

  // 验证池子数据是否有效
  const isValidPool = (pool: Pool): boolean => {
    try {
      return !!(
        pool &&
        pool.pool &&
        pool.token0 &&
        pool.token1 &&
        typeof pool.index !== 'undefined' &&
        typeof pool.fee !== 'undefined'
      );
    } catch {
      return false;
    }
  };

  // 获取池子的token余额
  const fetchPoolBalances = async (pool: Pool): Promise<PoolWithBalances> => {
    if (!signer) {
      return { ...pool };
    }

    // 验证池子地址是否有效
    if (!pool.pool || pool.pool === '0x0000000000000000000000000000000000000000') {
      console.warn('Invalid pool address:', pool.pool);
      return { ...pool };
    }

    try {
      const token0Contract = new Contract(pool.token0, ERC20_ABI, signer);
      const token1Contract = new Contract(pool.token1, ERC20_ABI, signer);

      const [balance0, balance1] = await Promise.all([
        token0Contract.balanceOf(pool.pool),
        token1Contract.balanceOf(pool.pool),
      ]);

      return {
        ...pool,
        token0Balance: balance0,
        token1Balance: balance1,
        // 添加字符串版本供显示使用，避免BigInt序列化问题
        token0BalanceStr: balance0.toString(),
        token1BalanceStr: balance1.toString(),
      };
    } catch (error) {
      console.error('Error fetching pool balances for pool:', pool.pool, error);
      // 即使获取余额失败，也返回池子基本信息
      return { ...pool };
    }
  };

  // 获取所有流动池
  const fetchPools = async () => {
    console.log('🔍 [PoolList] fetchPools called, hasPoolManager:', !!poolManager);

    if (!poolManager) {
      console.log('⚠️ [PoolList] PoolManager not ready');
      return;
    }

    setLoading(true);
    try {
      console.log('📡 [PoolList] Calling poolManager.getAllPools()...');
      const allPools = await poolManager.getAllPools();
      console.log('✅ [PoolList] All pools:', allPools);
      
      // 过滤有效的池子
      const validPools = Array.isArray(allPools) 
        ? allPools.filter(isValidPool)
        : [];
      
      console.log('✅ [PoolList] Valid pools:', validPools.length);
      
      // 获取每个池子的token余额
      if (validPools.length > 0 && signer) {
        console.log('💰 [PoolList] Fetching token balances for pools...');
        const poolsWithBalances = await Promise.all(
          validPools.map(pool => fetchPoolBalances(pool))
        );
        setPools(poolsWithBalances);
        console.log('✅ [PoolList] Pools with balances:', poolsWithBalances);
      } else {
        setPools(validPools);
      }
      
      if (validPools.length === 0) {
        console.log('ℹ️ [PoolList] No valid pools found');
      }
    } catch (error) {
      console.error('❌ [PoolList] Error fetching pools:', error);
      setPools([]); // 出错时设置为空数组
    } finally {
      setLoading(false);
    }
  };

  // 初始加载时获取池子数据
  useEffect(() => {
    console.log('🔄 [PoolList] useEffect triggered, fetching pools...');
    fetchPools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolManager, signer]);

  // 监听外部刷新请求
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      console.log('🔄 [PoolList] External refresh triggered, refreshKey:', refreshKey);
      fetchPools();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // 计算价格（从 sqrtPriceX96）
  const calculatePrice = (sqrtPriceX96: bigint): string => {
    try {
      if (!sqrtPriceX96 || sqrtPriceX96 === 0n) return '0';
      
      // price = (sqrtPriceX96 / 2^96)^2
      const Q96 = 2n ** 96n;
      const price = (sqrtPriceX96 * sqrtPriceX96 * 10n ** 18n) / (Q96 * Q96);
      return formatUnits(price, 18);
    } catch (error) {
      console.error('Error calculating price:', error);
      return '0';
    }
  };

  // 安全地格式化流动性
  const formatLiquidity = (liquidity: bigint | undefined | null): string => {
    try {
      if (!liquidity || liquidity === 0n) return '0';
      return parseFloat(formatUnits(liquidity, 18)).toFixed(2);
    } catch (error) {
      console.error('Error formatting liquidity:', error);
      return '0';
    }
  };

  // 安全地格式化价格显示
  const formatPriceDisplay = (sqrtPriceX96: bigint | undefined | null): string => {
    try {
      const price = calculatePrice(sqrtPriceX96 || 0n);
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || !isFinite(numPrice)) return '0.000000';
      return numPrice.toFixed(6);
    } catch (error) {
      console.error('Error formatting price display:', error);
      return '0.000000';
    }
  };

  // 安全地获取费率显示
  const getFeeDisplay = (pool: Pool): string => {
    try {
      if (pool.index !== undefined && FEE_TIER_MAP[pool.index]) {
        return FEE_TIER_MAP[pool.index];
      }
      if (pool.fee !== undefined && pool.fee > 0) {
        return `${(Number(pool.fee) / 10000).toFixed(2)}%`;
      }
      return 'N/A';
    } catch (error) {
      console.error('Error getting fee display:', error);
      return 'N/A';
    }
  };

  // 处理添加流动性
  const handleAddLiquidity = (pool: Pool) => {
    try {
      console.log('🔄 Navigating to Liquidity page for pool:', pool.pool);
      
      // 查找代币信息
      const token0Info = TOKEN_LIST.find(t => t.address.toLowerCase() === pool.token0.toLowerCase());
      const token1Info = TOKEN_LIST.find(t => t.address.toLowerCase() === pool.token1.toLowerCase());
      
      if (!token0Info || !token1Info) {
        message.warning('Token information not found in TOKEN_LIST');
        console.warn('Missing token info:', { token0Info, token1Info });
      }
      
      // 跳转到流动性页面，并传递池子信息
      const params = new URLSearchParams({
        token0: pool.token0,
        token1: pool.token1,
        feeIndex: pool.index.toString(),
      });
      router.push(`/liquidity?${params.toString()}`);
      
      message.info(`Redirecting to add liquidity for ${getTokenSymbol(pool.token0)}/${getTokenSymbol(pool.token1)}`);
    } catch (error) {
      console.error('Error navigating to liquidity page:', error);
      message.error('Failed to navigate to liquidity page');
    }
  };

  // 处理跳转到交易
  const handleSwap = (pool: Pool) => {
    try {
      console.log('🔄 Navigating to Swap page for pool:', pool.pool);
      
      // 查找代币信息
      const token0Info = TOKEN_LIST.find(t => t.address.toLowerCase() === pool.token0.toLowerCase());
      const token1Info = TOKEN_LIST.find(t => t.address.toLowerCase() === pool.token1.toLowerCase());
      
      if (!token0Info || !token1Info) {
        message.warning('Token information not found in TOKEN_LIST');
        console.warn('Missing token info:', { token0Info, token1Info });
      }
      
      // 跳转到交易页面，并传递代币信息
      const params = new URLSearchParams({
        tokenIn: pool.token0,
        tokenOut: pool.token1,
        feeIndex: pool.index.toString(),
      });
      router.push(`/?${params.toString()}`);
      
      message.info(`Redirecting to swap ${getTokenSymbol(pool.token0)}/${getTokenSymbol(pool.token1)}`);
    } catch (error) {
      console.error('Error navigating to swap page:', error);
      message.error('Failed to navigate to swap page');
    }
  };

  return (
    <Card 
      style={{ borderRadius: 16 }}
      className="pool-list-card"
    >
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <Space>
              <InfoCircleOutlined />
              Liquidity Pools
            </Space>
          </Title>
        </Col>
        <Col>
          <Button 
            onClick={fetchPools} 
            disabled={loading}
            icon={<ReloadOutlined spin={loading} />}
            size="small"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="secondary">Loading pools...</Text>
        </div>
      ) : pools.length === 0 ? (
        <Empty 
          description="No liquidity pools found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">
            Create your first pool by adding liquidity above
          </Text>
        </Empty>
      ) : (
        <List
          grid={{ 
            gutter: 16, 
            xs: 1, 
            sm: 1, 
            md: 2, 
            lg: 2, 
            xl: 4, 
            xxl: 3 
          }}
          dataSource={pools}
          renderItem={(pool, index) => {
            // 确保 pool 对象有效
            if (!pool || !pool.pool) {
              return null;
            }

            return (
              <List.Item key={pool.pool || `pool-${index}`}>
                <Card 
                  size="small"
                  hoverable
                  style={{ 
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(124, 58, 237, 0.02) 100%)'
                  }}
                >
                  {/* 池子标题 */}
                  <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                    <Col>
                      <Space direction="vertical" size={0}>
                        <Title level={5} style={{ margin: 0 }}>
                          {getTokenSymbol(pool.token0 || '')} / {getTokenSymbol(pool.token1 || '')}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Pool #{index + 1}
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="purple">
                        {getFeeDisplay(pool)}
                      </Tag>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '12px 0' }} />

                  {/* 统计信息 */}
                  <Row gutter={[8, 8]}>
                    <Col span={12}>
                      <Statistic
                        title={<Text style={{ fontSize: 12 }}>Liquidity</Text>}
                        value={formatLiquidity(pool.liquidity)}
                        valueStyle={{ fontSize: 16, fontWeight: 600 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={<Text style={{ fontSize: 12 }}>Current Price</Text>}
                        value={formatPriceDisplay(pool.sqrtPriceX96)}
                        valueStyle={{ fontSize: 16, fontWeight: 600 }}
                      />
                    </Col>
                    
                    {/* Token Reserves */}
                    {(pool.token0Balance || pool.token1Balance) && (
                      <>
                        <Col span={24}>
                          <Divider style={{ margin: '8px 0' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Token Reserves</Text>
                          </Divider>
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={
                              <Space size={4}>
                                <Text style={{ fontSize: 11 }}>{getTokenSymbol(pool.token0 || '')}</Text>
                                <Tag color="blue" style={{ fontSize: 9, padding: '0 4px', margin: 0 }}>T0</Tag>
                              </Space>
                            }
                            value={pool.token0Balance ? parseFloat(formatUnits(pool.token0Balance, 18)).toFixed(2) : '0'}
                            valueStyle={{ fontSize: 14, fontWeight: 600, color: '#1890ff' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={
                              <Space size={4}>
                                <Text style={{ fontSize: 11 }}>{getTokenSymbol(pool.token1 || '')}</Text>
                                <Tag color="cyan" style={{ fontSize: 9, padding: '0 4px', margin: 0 }}>T1</Tag>
                              </Space>
                            }
                            value={pool.token1Balance ? parseFloat(formatUnits(pool.token1Balance, 18)).toFixed(2) : '0'}
                            valueStyle={{ fontSize: 14, fontWeight: 600, color: '#13c2c2' }}
                          />
                        </Col>
                      </>
                    )}
                    
                    {/* Price Range Display */}
                    <Col span={24}>
                      <Card size="small" style={{ background: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Row justify="space-between" align="middle">
                            <Text type="secondary" style={{ fontSize: 11 }}>Price Range:</Text>
                            <Tooltip title="Pool can only trade within this price range">
                              <InfoCircleOutlined style={{ fontSize: 11, color: '#999' }} />
                            </Tooltip>
                          </Row>
                          <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                            <Space size={4}>
                              <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                                Min
                              </Tag>
                              <Text strong style={{ fontSize: 11 }}>
                                {formatPriceUtil(getPriceRangeFromTicks(pool.tickLower ?? 0, pool.tickUpper ?? 0).minPrice)}
                              </Text>
                            </Space>
                            <ArrowRightOutlined style={{ fontSize: 10, color: '#999' }} />
                            <Space size={4}>
                              <Tag color="green" style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                                Max
                              </Tag>
                              <Text strong style={{ fontSize: 11 }}>
                                {formatPriceUtil(getPriceRangeFromTicks(pool.tickLower ?? 0, pool.tickUpper ?? 0).maxPrice)}
                              </Text>
                            </Space>
                        </Row>
                          
                          {/* Price Position Indicator */}
                          {(() => {
                            const currentPrice = parseFloat(formatPriceDisplay(pool.sqrtPriceX96));
                            const { minPrice, maxPrice } = getPriceRangeFromTicks(pool.tickLower ?? 0, pool.tickUpper ?? 0);
                            const position = ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;
                            const isInRange = currentPrice >= minPrice && currentPrice <= maxPrice;
                            
                            return (
                              <Tooltip title={`Current price is ${isInRange ? 'within' : 'outside'} the active range`}>
                                <Progress 
                                  percent={Math.min(100, Math.max(0, position))}
                                  showInfo={false}
                                  strokeColor={isInRange ? '#52c41a' : '#ff4d4f'}
                                  size="small"
                                  style={{ marginBottom: 0 }}
                                />
                              </Tooltip>
                            );
                          })()}
                          
                        <Row justify="space-between">
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              Tick: {pool.tickLower ?? 0}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              Current: {pool.tick ?? 0}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              Tick: {pool.tickUpper ?? 0}
                          </Text>
                        </Row>
                      </Space>
                      </Card>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '12px 0' }} />

                  {/* 操作按钮 */}
                  <Row gutter={8}>
                    <Col span={12}>
                      <Button 
                        type="primary" 
                        size="small" 
                        block
                        icon={<PlusOutlined />}
                        onClick={() => handleAddLiquidity(pool)}
                      >
                        Add
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Button 
                        size="small" 
                        block
                        icon={<SwapOutlined />}
                        onClick={() => handleSwap(pool)}
                      >
                        Swap
                      </Button>
                    </Col>
                  </Row>

                  {/* 池子地址 */}
                  <div style={{ marginTop: 12 }}>
                    <Text 
                      type="secondary" 
                      style={{ fontSize: 11 }}
                      copyable={{ text: pool.pool }}
                    >
                      Pool: {pool.pool.slice(0, 6)}...{pool.pool.slice(-4)}
                    </Text>
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      )}

      {/* 统计摘要 */}
      {pools.length > 0 && !loading && (
        <Card 
          size="small" 
          style={{ 
            marginTop: 16, 
            background: 'rgba(124, 58, 237, 0.05)',
            borderRadius: 8
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Row gutter={16} justify="center">
              <Col>
                <Statistic
                  title="Total Pools"
                  value={pools.length}
                  prefix={<InfoCircleOutlined />}
                  valueStyle={{ fontSize: 20, color: '#7c3aed' }}
                />
              </Col>
              <Col>
                <Statistic
                  title="Total Liquidity"
                  value={(() => {
                    try {
                      const total = pools.reduce((sum, pool) => {
                        try {
                          if (!pool || !pool.liquidity) return sum;
                          const liquidity = parseFloat(formatUnits(pool.liquidity, 18));
                          return sum + (isNaN(liquidity) ? 0 : liquidity);
                        } catch (error) {
                          console.error('Error calculating pool liquidity:', error);
                           return sum;
                        }
                      }, 0);
                      return total.toFixed(2);
                    } catch (error) {
                      console.error('Error calculating total liquidity:', error);
                      return '0.00';
                    }
                  })()}
                  valueStyle={{ fontSize: 20, color: '#7c3aed' }}
                />
              </Col>
              <Col>
                <Statistic
                  title="Active Pairs"
                  value={(() => {
                    try {
                      const pairs = pools
                        .filter(p => p && p.token0 && p.token1)
                        .map(p => `${p.token0}-${p.token1}`);
                      return new Set(pairs).size;
                    } catch (error) {
                      console.error('Error calculating active pairs:', error);
                      return 0;
                    }
                  })()}
                  valueStyle={{ fontSize: 20, color: '#7c3aed' }}
                />
              </Col>
            </Row>
            
            {/* Token Reserves Summary */}
            {pools.some(p => p.token0Balance || p.token1Balance) && (
              <>
                <Divider style={{ margin: 0 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Total Token Reserves</Text>
                </Divider>
                <Row gutter={16} justify="center">
                  {(() => {
                    // 统计所有token的总储备量
                    const tokenTotals: Record<string, bigint> = {};
                    
                    pools.forEach(pool => {
                      if (pool.token0Balance) {
                        const symbol = getTokenSymbol(pool.token0);
                        tokenTotals[symbol] = (tokenTotals[symbol] || 0n) + pool.token0Balance;
                      }
                      if (pool.token1Balance) {
                        const symbol = getTokenSymbol(pool.token1);
                        tokenTotals[symbol] = (tokenTotals[symbol] || 0n) + pool.token1Balance;
                      }
                    });
                    
                    return Object.entries(tokenTotals).map(([symbol, total]) => (
                      <Col key={symbol}>
                        <Statistic
                          title={symbol}
                          value={parseFloat(formatUnits(total, 18)).toFixed(2)}
                          valueStyle={{ fontSize: 16, color: '#7c3aed' }}
                        />
                      </Col>
                    ));
                  })()}
                </Row>
              </>
            )}
          </Space>
        </Card>
      )}
    </Card>
  );
}

