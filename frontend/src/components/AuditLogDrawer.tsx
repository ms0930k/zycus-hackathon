import React from 'react';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../types';
import { TriggerBadge } from './TriggerBadge';
import { ConfidenceBadge } from './ConfidenceBadge';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  pricingSuggestions: Record<number, PricingSuggestion[]>;
  reorderSuggestions: Record<number, ReorderSuggestion[]>;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  isOpen,
  onClose,
  products,
  pricingSuggestions,
  reorderSuggestions
}) => {
  if (!isOpen) return null;

  const productMap = new Map<number, Product>(products.map((p) => [p.id, p]));

  // Combine and sort all suggestions by createdAt descending
  interface HistoryItem {
    id: string;
    type: 'pricing' | 'reorder';
    product: Product;
    status: string;
    triggerReason: string;
    confidence: number;
    reasoning: string;
    createdAt: string;
    summary: string;
  }

  const historyItems: HistoryItem[] = [];

  Object.entries(pricingSuggestions).forEach(([prodId, list]) => {
    const p = productMap.get(Number(prodId));
    if (p) {
      list.forEach((s) => {
        historyItems.push({
          id: `p-${s.id}`,
          type: 'pricing',
          product: p,
          status: s.status,
          triggerReason: s.triggerReason,
          confidence: s.confidence,
          reasoning: s.reasoning,
          createdAt: s.createdAt,
          summary: `$${s.currentPrice.toFixed(2)} ➔ $${s.recommendedPrice.toFixed(2)} (${s.direction})`
        });
      });
    }
  });

  Object.entries(reorderSuggestions).forEach(([prodId, list]) => {
    const p = productMap.get(Number(prodId));
    if (p) {
      list.forEach((s) => {
        historyItems.push({
          id: `r-${s.id}`,
          type: 'reorder',
          product: p,
          status: s.status,
          triggerReason: s.triggerReason,
          confidence: s.confidence,
          reasoning: s.reasoning,
          createdAt: s.createdAt,
          summary: `Stock: ${s.currentStock} ➔ +${s.recommendedQuantity} units (${s.suggestedLeadTimeDays}d lead)`
        });
      });
    }
  });

  // Sort descending
  historyItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">📋 Recommendation Audit History</h2>
            <p className="drawer-sub">
              Historical ledger of AI and deterministic merchandising decisions
            </p>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {historyItems.length === 0 ? (
            <p className="drawer-empty">No historical suggestions recorded yet.</p>
          ) : (
            <div className="audit-list">
              {historyItems.map((item) => (
                <div key={item.id} className={`audit-card audit-status-${item.status.toLowerCase()}`}>
                  <div className="audit-card-top">
                    <div>
                      <span className="audit-type-tag">
                        {item.type === 'pricing' ? '💡 Pricing' : '📦 Reorder'}
                      </span>
                      <span className="audit-sku">{item.product.sku}</span>
                      <strong className="audit-product-name">{item.product.name}</strong>
                    </div>
                    <span className={`status-pill status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="audit-meta-row">
                    <span className="audit-summary">{item.summary}</span>
                    <TriggerBadge reason={item.triggerReason} />
                    <ConfidenceBadge confidence={item.confidence} />
                  </div>

                  <p className="audit-reasoning">"{item.reasoning}"</p>

                  <div className="audit-timestamp">
                    Recorded: {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
