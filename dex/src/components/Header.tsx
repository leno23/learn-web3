import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>MetaNodeSwap</h1>
        </div>

        <nav className="nav">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Swap
          </Link>
          <Link 
            to="/liquidity" 
            className={location.pathname === '/liquidity' ? 'active' : ''}
          >
            Liquidity
          </Link>
          <Link 
            to="/positions" 
            className={location.pathname === '/positions' ? 'active' : ''}
          >
            Positions
          </Link>
        </nav>

        <div className="wallet-section">
          <ConnectButton 
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}

