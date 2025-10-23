import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useTokenContract } from './useContract';
import { formatUnits } from 'ethers';

export function useTokenBalance(tokenAddress: string | null) {
  const { address, isConnected } = useAccount();
  const tokenContract = useTokenContract(tokenAddress);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(0);
  const isFetchingRef = useRef(false);
  const renderCountRef = useRef(0);
  
  // 使用 useRef 保存最新的 tokenContract，避免依赖问题
  const tokenContractRef = useRef(tokenContract);
  tokenContractRef.current = tokenContract;
  
  // 跟踪渲染次数和依赖变化
  renderCountRef.current += 1;
  
  useEffect(() => {
    console.log(`📊 [useTokenBalance] Render #${renderCountRef.current}`, {
      tokenAddress: tokenAddress?.slice(0, 10),
      address: address?.slice(0, 10),
      isConnected,
      hasContract: !!tokenContract,
    });
  });

  // ✅ 使用 useCallback 创建稳定的 fetchBalance 函数
  // 只依赖基本类型，不依赖对象引用
  const fetchBalance = useCallback(async () => {
    if (!isConnected || !address || !tokenAddress) {
      setBalance('0');
      return;
    }

    // 防止重复请求
    if (isFetchingRef.current) {
      console.log('⚠️ Already fetching balance, skipping...');
      return;
    }

    // 从 ref 中获取最新的 contract，避免作为依赖
    const contract = tokenContractRef.current;
    if (!contract) {
      console.log('⏳ Waiting for token contract to be ready...');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      const bal = await contract.balanceOf(address);
      const formattedBalance = formatUnits(bal, 18);
      setBalance(formattedBalance);
      setLastFetched(Date.now());
      console.log(`✅ Balance fetched for ${tokenAddress.slice(0, 10)}...: ${formattedBalance}`);
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      setBalance('0');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isConnected, address, tokenAddress]); // ✅ 只依赖基本类型，不依赖对象

  // 当关键依赖变化时获取余额
  useEffect(() => {
    if (isConnected && address && tokenAddress && tokenContract) {
      console.log('🔄 [useTokenBalance] Effect triggered - Fetching balance...');
      fetchBalance();
    }
  }, [address, isConnected, tokenAddress, fetchBalance]); // ✅ 可以安全地依赖 fetchBalance 了

  return { balance, loading, refetch: fetchBalance, lastFetched };
}

