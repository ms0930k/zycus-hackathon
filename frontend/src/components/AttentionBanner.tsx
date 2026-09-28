import React from 'react';

interface AttentionBannerProps {
  pendingCount: number;
  lowStockCount: number;
  onFilterPending: () => void;
}

export const AttentionBanner: React.FC<AttentionBannerProps> = ({
  pendingCount,
  lowStockCount,
  onFilterPending
}) => {
  if (pendingCount === 0 && lowStockCount === 0) {
    return null;
  }

  return (
    <div className="attention-banner">
      <div className="attention-content">
        <div className="attention-icon">🚨</div>
        <div className="attention-text">
          <strong>Merchandising Attention Required:</strong>{' '}
          {pendingCount > 0 ? (
            <>
              You have <span className="highlight-pill">{pendingCount}</span> pending AI / Rule recommendation(s) waiting for human approval.
            </>
          ) : (
            <>
              There are <span className="highlight-pill">{lowStockCount}</span> item(s) below reorder threshold.
            </>
          )}
        </div>
      </div>
      {pendingCount > 0 && (
        <button className="btn btn-sm btn-accent" onClick={onFilterPending}>
          Review Pending Actions ➔
        </button>
      )}
    </div>
  );
};
