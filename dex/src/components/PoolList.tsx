import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'ethers';
import { usePoolManager } from '../hooks/useContract';
import { TOKEN_LIST } from '../config/contracts';
import { Card, Button, List, Typography, Row, Col, Tag, Empty, Statistic, Space, Divider, message } from 'antd';
import { ReloadOutlined, SwapOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';

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

export default function PoolList() {
  const navigate = useNavigate();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const poolManager = usePoolManager();

  // 根据地址查找代币符号
  const getTokenSymbol = (address: string): string => {
    const token = TOKEN_LIST.find(t => t.address.toLowerCase() === address.toLowerCase());
    return token?.symbol || `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 验证池子数据是否有效
  const isValidPool = (pool: any): boolean => {
    try {
      return !!(
        pool &&
        pool.pool &&
        pool.token0 &&
        pool.token1 &&
        typeof pool.index !== 'undefined' &&
        typeof pool.fee !== 'undefined'
      );
    } catch (error) {
      return false;
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
      setPools(validPools);
      
      if (validPools.length === 0) {
        console.log('ℹ️ [PoolList] No valid pools found');
      }
    } catch (error: any) {
      console.error('❌ [PoolList] Error fetching pools:', error);
      setPools([]); // 出错时设置为空数组
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 [PoolList] useEffect triggered, fetching pools...');
    fetchPools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolManager]);

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
        return `${(pool.fee / 10000).toFixed(2)}%`;
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
      navigate('/liquidity', {
        state: {
          token0: token0Info || { address: pool.token0, symbol: 'Unknown', decimals: 18 },
          token1: token1Info || { address: pool.token1, symbol: 'Unknown', decimals: 18 },
          fee: pool.fee,
          feeIndex: pool.index,
          poolAddress: pool.pool,
        }
      });
      
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
      navigate('/', {
        state: {
          tokenIn: token0Info || { address: pool.token0, symbol: 'Unknown', decimals: 18 },
          tokenOut: token1Info || { address: pool.token1, symbol: 'Unknown', decimals: 18 },
          fee: pool.fee,
          feeIndex: pool.index,
          poolAddress: pool.pool,
        }
      });
      
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
            xl: 3, 
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
                        title={<Text style={{ fontSize: 12 }}>Price</Text>}
                        value={formatPriceDisplay(pool.sqrtPriceX96)}
                        valueStyle={{ fontSize: 16, fontWeight: 600 }}
                      />
                    </Col>
                    <Col span={24}>
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Row justify="space-between">
                          <Text type="secondary" style={{ fontSize: 12 }}>Current Tick:</Text>
                          <Text strong style={{ fontSize: 12 }}>{pool.tick ?? 0}</Text>
                        </Row>
                        <Row justify="space-between">
                          <Text type="secondary" style={{ fontSize: 12 }}>Tick Range:</Text>
                          <Text strong style={{ fontSize: 12 }}>
                            {pool.tickLower ?? 0} → {pool.tickUpper ?? 0}
                          </Text>
                        </Row>
                      </Space>
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
        </Card>
      )}
    </Card>
  );
}

