import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useEthersProvider } from './useContract';
import { formatUnits } from 'ethers';

export function useEthBalance() {
  const { address, isConnected } = useAccount();
  const provider = useEthersProvider();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    if (!isConnected || !address || !provider) {
      setBalance('0');
      return;
    }

    setLoading(true);
    try {
      const bal = await provider.getBalance(address);
      setBalance(formatUnits(bal, 18));
    } catch (error) {
      console.error('Error fetching ETH balance:', error);
      setBalance('0');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [address, isConnected, provider]);

  return { balance, loading, refetch: fetchBalance };
}

