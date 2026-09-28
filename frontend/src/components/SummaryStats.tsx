import React from 'react';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../types';

interface SummaryStatsProps {
  products: Product[];
  pricingSuggestions: Record<number, PricingSuggestion[]>;
  reorderSuggestions: Record<number, ReorderSuggestion[]>;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  products,
  pricingSuggestions,
  reorderSuggestions
}) => {
  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => p.stockLevel === 0).length;
  const lowStockCount = products.filter((p) => p.stockLevel < p.reorderThreshold && p.stockLevel > 0).length;

  const pendingPricingCount = Object.values(pricingSuggestions)
    .flat()
    .filter((s) => s.status === 'PENDING').length;

  const pendingReorderCount = Object.values(reorderSuggestions)
    .flat()
    .filter((s) => s.status === 'PENDING').length;

  const totalPendingSuggestions = pendingPricingCount + pendingReorderCount;

  const highDemandCount = products.filter((p) => (p.demandVelocity || 0) >= 10.0).length;

  return (
    <div className="summary-stats-grid">
      <div className="stat-card">
        <div className="stat-icon-wrapper icon-primary">📦</div>
        <div className="stat-details">
          <span className="stat-label">Catalog Products</span>
          <span className="stat-number">{totalProducts}</span>
          <span className="stat-trend">Active SKUs tracked</span>
        </div>
      </div>

      <div className={`stat-card ${lowStockCount > 0 || outOfStockCount > 0 ? 'stat-alert-warning' : ''}`}>
        <div className="stat-icon-wrapper icon-warning">⚠️</div>
        <div className="stat-details">
          <span className="stat-label">Inventory Attention</span>
          <span className="stat-number text-warning">
            {lowStockCount + outOfStockCount}
          </span>
          <span className="stat-trend">
            {outOfStockCount > 0 ? `${outOfStockCount} stockout, ` : ''}
            {lowStockCount} below threshold
          </span>
        </div>
      </div>

      <div className={`stat-card ${totalPendingSuggestions > 0 ? 'stat-alert-accent' : ''}`}>
        <div className="stat-icon-wrapper icon-accent">💡</div>
        <div className="stat-details">
          <span className="stat-label">Pending Approval</span>
          <span className="stat-number text-accent">
            {totalPendingSuggestions}
          </span>
          <span className="stat-trend">
            {pendingPricingCount} pricing • {pendingReorderCount} replenishment
          </span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon-wrapper icon-rose">🔥</div>
        <div className="stat-details">
          <span className="stat-label">Demand Surges</span>
          <span className="stat-number text-rose">{highDemandCount}</span>
          <span className="stat-trend">&gt;10 orders/day velocity</span>
        </div>
      </div>
    </div>
  );
};
