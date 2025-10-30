'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'ethers';
import { usePositionManager } from '../hooks/useContract';
import { Card, Button, Space, message, Typography, Row, Col, List, Tag, Empty, Descriptions } from 'antd';
import { ReloadOutlined, DollarOutlined, DeleteOutlined } from '@ant-design/icons';

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

export default function Positions() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const positionManager = usePositionManager();
  console.log(positions);
  

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
      // 使用 toObject() 方法将 Result 转换为带命名属性的对象
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
      setPositions(userPositions);
      
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
  }, [address, isConnected, positionManager]);

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
            <Button 
              onClick={fetchPositions} 
              disabled={loading}
              icon={<ReloadOutlined />}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
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
                    </Space>
                  </Col>
                </Row>
                
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Token 0">
                    <Text code style={{ fontSize: 12 }}>
                      {position.token0.slice(0, 6)}...{position.token0.slice(-4)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Token 1">
                    <Text code style={{ fontSize: 12 }}>
                      {position.token1.slice(0, 6)}...{position.token1.slice(-4)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Liquidity">
                    {formatUnits(position.liquidity, 18)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tick Range">
                    {position.tickLower} → {position.tickUpper}
                  </Descriptions.Item>
                  <Descriptions.Item label="Fees Earned">
                    {formatUnits(position.tokensOwed0, 18)} / {formatUnits(position.tokensOwed1, 18)}
                  </Descriptions.Item>
                </Descriptions>

                <Space style={{ marginTop: 16, width: '100%' }} direction="horizontal">
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
                </Space>
              </Card>
            )}
          />
        )}
      </Card>
    </div>
  );
}
