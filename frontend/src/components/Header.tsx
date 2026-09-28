import React from 'react';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated?: Date;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  lastUpdated
}) => {
  return (
    <header className="header">
      <div className="brand-group">
        <div className="brand-logo-badge">⚡</div>
        <div>
          <h1 className="brand-title">StockPulse</h1>
          <p className="brand-subtitle">
            Autonomous Inventory Signals • Dynamic Pricing • Human Merchandising Control
          </p>
        </div>
      </div>

      <div className="header-actions">
        {lastUpdated && (
          <span className="last-sync-tag" title="Last synchronized with backend">
            <span className="live-dot" />
            Live Sync: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
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
      </div>
    </header>
  );
};
