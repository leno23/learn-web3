import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'ethers';
import { useTokenContract } from './useContract';

export function useTokenBalance(tokenAddress: string) {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const tokenContract = useTokenContract(tokenAddress);

  const fetchBalance = useCallback(async () => {
    if (!isConnected || !address || !tokenContract) {
      setBalance('0');
      return;
    }

    try {
      setLoading(true);
      const bal = await tokenContract.balanceOf(address);
      const formattedBalance = formatUnits(bal, 18);
      setBalance(formattedBalance);
      console.log(`💰 Token balance for ${tokenAddress.slice(0, 10)}...:`, formattedBalance);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setBalance('0');
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, tokenContract, tokenAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    refetch: fetchBalance,
  };
}

