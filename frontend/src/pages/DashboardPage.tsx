import React from 'react';
import { Link } from 'react-router-dom';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../types';
import { SummaryStats } from '../components/SummaryStats';
import { AttentionBanner } from '../components/AttentionBanner';
import { PendingApprovalQueue } from '../components/PendingApprovalQueue';
import { ActivityTimeline } from '../components/dashboard/ActivityTimeline';
import { ProductCard } from '../components/ProductCard';

interface DashboardPageProps {
  products: Product[];
  pricingSuggestions: Record<number, PricingSuggestion[]>;
  reorderSuggestions: Record<number, ReorderSuggestion[]>;
  actionLoading: Record<number, boolean>;
  activePollingIds: Set<number>;
  onSimulateSale: (productId: number) => void;
  onUpdateStock: (productId: number, newStock: number) => void;
  onAcceptSuggestion: (id: number, type: 'pricing' | 'reorder') => void;
  onRejectSuggestion: (id: number, type: 'pricing' | 'reorder') => void;
  onOpenAudit: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  pricingSuggestions,
  reorderSuggestions,
  actionLoading,
  activePollingIds,
  onSimulateSale,
  onUpdateStock,
  onAcceptSuggestion,
  onRejectSuggestion,
  onOpenAudit
}) => {
  // Count metrics
  let pendingCount = 0;
  Object.values(pricingSuggestions).forEach((list) => {
    pendingCount += list.filter((s) => s.status === 'PENDING').length;
  });
  Object.values(reorderSuggestions).forEach((list) => {
    pendingCount += list.filter((s) => s.status === 'PENDING').length;
  });

  const lowStockProducts = products.filter((p) => p.stockLevel < p.reorderThreshold);

  // Priority products: those with low stock or pending suggestions
  const priorityProducts = products.filter((p) => {
    const hasLowStock = p.stockLevel < p.reorderThreshold;
    const hasPendingPricing = (pricingSuggestions[p.id] || []).some((s) => s.status === 'PENDING');
    const hasPendingReorder = (reorderSuggestions[p.id] || []).some((s) => s.status === 'PENDING');
    return hasLowStock || hasPendingPricing || hasPendingReorder;
  });

  return (
    <div className="dashboard-page">
      {/* High-priority Attention Banner */}
      <AttentionBanner
        pendingCount={pendingCount}
        lowStockCount={lowStockProducts.length}
        onReviewClick={() => {
          const el = document.getElementById('pending-approval-queue');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* KPI Overview */}
      <SummaryStats
        products={products}
        pricingSuggestions={pricingSuggestions}
        reorderSuggestions={reorderSuggestions}
      />

      {/* Centralized Approval Queue */}
      <div id="pending-approval-queue">
        <PendingApprovalQueue
          products={products}
          pricingSuggestions={pricingSuggestions}
          reorderSuggestions={reorderSuggestions}
          actionLoading={actionLoading}
          onAcceptSuggestion={onAcceptSuggestion}
          onRejectSuggestion={onRejectSuggestion}
        />
      </div>

      {/* Main Grid: Priority Products & Real Activity Timeline */}
      <div className="dashboard-split-grid">
        <div className="dashboard-main-col">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Critical Inventory & Active Signals</h2>
              <p className="section-subtitle">
                Products currently operating beneath safety thresholds or undergoing price evaluation
              </p>
            </div>
            <div className="section-header-actions">
              <Link to="/products" className="btn btn-outline btn-sm">
                View All {products.length} Products ➔
              </Link>
              <button className="btn btn-outline btn-sm" onClick={onOpenAudit}>
                📋 Audit Log
              </button>
            </div>
          </div>

          {priorityProducts.length === 0 ? (
            <div className="chart-empty-state">
              <div className="empty-icon">🎉</div>
              <h4>All Inventory Operating Normal</h4>
              <p>No products are currently under reorder thresholds or awaiting price approvals.</p>
              <Link to="/products" className="btn btn-primary btn-sm mt-3">
                Explore Full Catalog
              </Link>
            </div>
          ) : (
            <div className="products-grid">
              {priorityProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  pricingSuggestions={pricingSuggestions[p.id] || []}
                  reorderSuggestions={reorderSuggestions[p.id] || []}
                  isActionLoading={actionLoading[p.id] || false}
                  isPolling={activePollingIds.has(p.id)}
                  onSimulateSale={onSimulateSale}
                  onUpdateStock={onUpdateStock}
                  onAcceptSuggestion={onAcceptSuggestion}
                  onRejectSuggestion={onRejectSuggestion}
                />
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-side-col">
          <ActivityTimeline
            products={products}
            pricingSuggestions={pricingSuggestions}
            reorderSuggestions={reorderSuggestions}
          />
        </div>
      </div>
    </div>
  );
};
