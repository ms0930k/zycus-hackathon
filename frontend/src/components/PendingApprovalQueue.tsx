import React, { useState } from 'react';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../types';
import { SuggestionCard } from './SuggestionCard';

interface PendingApprovalQueueProps {
  products: Product[];
  pricingSuggestions: Record<number, PricingSuggestion[]>;
  reorderSuggestions: Record<number, ReorderSuggestion[]>;
  actionLoading: Record<number, boolean>;
  onAcceptSuggestion: (id: number, type: 'pricing' | 'reorder') => void;
  onRejectSuggestion: (id: number, type: 'pricing' | 'reorder') => void;
}

export const PendingApprovalQueue: React.FC<PendingApprovalQueueProps> = ({
  products,
  pricingSuggestions,
  reorderSuggestions,
  actionLoading,
  onAcceptSuggestion,
  onRejectSuggestion
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Map product map for fast lookup
  const productMap = new Map<number, Product>(products.map((p) => [p.id, p]));

  // Extract all pending suggestions
  const pendingPricingItems: { product: Product; suggestion: PricingSuggestion }[] = [];
  Object.entries(pricingSuggestions).forEach(([prodId, list]) => {
    const p = productMap.get(Number(prodId));
    if (p) {
      list
        .filter((s) => s.status === 'PENDING')
        .forEach((s) => pendingPricingItems.push({ product: p, suggestion: s }));
    }
  });

  const pendingReorderItems: { product: Product; suggestion: ReorderSuggestion }[] = [];
  Object.entries(reorderSuggestions).forEach(([prodId, list]) => {
    const p = productMap.get(Number(prodId));
    if (p) {
      list
        .filter((s) => s.status === 'PENDING')
        .forEach((s) => pendingReorderItems.push({ product: p, suggestion: s }));
    }
  });

  const totalPending = pendingPricingItems.length + pendingReorderItems.length;

  if (totalPending === 0) {
    return null;
  }

  return (
    <section className="pending-queue-section">
      <div className="queue-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="queue-header-title">
          <span className="queue-badge-count">{totalPending}</span>
          <h2>Human Approval Queue</h2>
          <span className="queue-sub">
            Review and authorize autonomous pricing & replenishment recommendations
          </span>
        </div>
        <button className="queue-toggle-btn">
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="queue-grid">
          {pendingPricingItems.map(({ product, suggestion }) => (
            <div key={`queue-pricing-${suggestion.id}`} className="queue-item-card">
              <div className="queue-item-context">
                <span className="queue-sku">{product.sku}</span>
                <span className="queue-product-name">{product.name}</span>
                <span className="queue-category">{product.category}</span>
              </div>
              <SuggestionCard
                type="pricing"
                suggestion={suggestion}
                onAccept={(id) => onAcceptSuggestion(id, 'pricing')}
                onReject={(id) => onRejectSuggestion(id, 'pricing')}
                isLoading={actionLoading[product.id] || false}
              />
            </div>
          ))}

          {pendingReorderItems.map(({ product, suggestion }) => (
            <div key={`queue-reorder-${suggestion.id}`} className="queue-item-card">
              <div className="queue-item-context">
                <span className="queue-sku">{product.sku}</span>
                <span className="queue-product-name">{product.name}</span>
                <span className="queue-category">{product.category}</span>
              </div>
              <SuggestionCard
                type="reorder"
                suggestion={suggestion}
                onAccept={(id) => onAcceptSuggestion(id, 'reorder')}
                onReject={(id) => onRejectSuggestion(id, 'reorder')}
                isLoading={actionLoading[product.id] || false}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
