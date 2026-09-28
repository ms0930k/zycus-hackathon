import React from 'react';

interface StockHealthBadgeProps {
  stockLevel: number;
  reorderThreshold: number;
  status: string;
}

export const StockHealthBadge: React.FC<StockHealthBadgeProps> = ({
  stockLevel,
  reorderThreshold,
  status
}) => {
  if (stockLevel === 0 || status === 'OUT_OF_STOCK') {
    return <span className="badge badge-out-of-stock">🚫 Out of Stock</span>;
  }

  if (stockLevel <= Math.ceil(reorderThreshold * 0.5)) {
    return <span className="badge badge-critical">🚨 Critical Low</span>;
  }

  if (stockLevel < reorderThreshold) {
    return <span className="badge badge-low-stock">⚠️ Low Stock</span>;
  }

  if (status === 'PRICE_REVIEW_PENDING') {
    return <span className="badge badge-pending">🔍 Review Pending</span>;
  }

  return <span className="badge badge-healthy">✓ Healthy</span>;
};
