import React from 'react';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing = false,
  lastUpdated
}) => {
  return (
    <header className="header">
      <div className="header-left">
        <NavLink to="/" className="brand-group-link">
          <div className="brand-logo-badge">⚡</div>
          <div>
            <h1 className="brand-title">StockPulse</h1>
            <p className="brand-subtitle">
              AI Merchandising Console & Inventory Intelligence
            </p>
          </div>
        </NavLink>

        <nav className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            📦 Products Catalog
          </NavLink>
        </nav>
      </div>

      <div className="header-actions">
        {lastUpdated && (
          <span className="last-sync-tag" title="Last synchronized with backend">
            <span className="live-dot" />
            Live Sync: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        {onRefresh && (
          <button
            className="btn btn-outline btn-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Synchronize catalog and recommendations"
          >
            {isRefreshing ? (
              <>
                <span className="btn-spinner" /> Syncing...
              </>
            ) : (
              <>🔄 Refresh</>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
