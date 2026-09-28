import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../../types';
import { analyticsStore } from '../../utils/analyticsStore';

interface ActivityTimelineProps {
  products: Product[];
  pricingSuggestions: Record<number, PricingSuggestion[]>;
  reorderSuggestions: Record<number, ReorderSuggestion[]>;
}

interface ActivityEvent {
  id: string;
  productId: number;
  productName: string;
  productSku: string;
  type: 'SALE' | 'PRICE_ACCEPTED' | 'PRICE_REJECTED' | 'REORDER_ACCEPTED' | 'RECOMMENDATION_NEW';
  badgeColor: string;
  title: string;
  description: string;
  timestamp: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  products,
  pricingSuggestions,
  reorderSuggestions
}) => {
  const productMap = useMemo(() => new Map<number, Product>(products.map((p) => [p.id, p])), [products]);

  const activities = useMemo(() => {
    const list: ActivityEvent[] = [];

    // 1. Live sales
    const allSales = analyticsStore.getSales();
    allSales.forEach((s) => {
      const p = productMap.get(s.productId);
      list.push({
        id: `sale-${s.id}`,
        productId: s.productId,
        productName: p ? p.name : `Product #${s.productId}`,
        productSku: p ? p.sku : 'PRD',
        type: 'SALE',
        badgeColor: 'badge-emerald',
        title: `Sale Fulfilled (-${s.quantity} unit)`,
        description: `Inventory level reduced to ${s.resultingStock} units (demand: ${s.resultingDemandVelocity.toFixed(1)}/day).`,
        timestamp: s.timestamp
      });
    });

    // 2. Pricing Suggestions
    Object.entries(pricingSuggestions).forEach(([prodIdStr, suggs]) => {
      const prodId = Number(prodIdStr);
      const p = productMap.get(prodId);
      suggs.forEach((s) => {
        if (s.status === 'ACCEPTED') {
          list.push({
            id: `pricing-acc-${s.id}`,
            productId: prodId,
            productName: p ? p.name : `Product #${prodId}`,
            productSku: p ? p.sku : 'PRD',
            type: 'PRICE_ACCEPTED',
            badgeColor: 'badge-emerald',
            title: `Price Adjustment Applied`,
            description: `Dynamic price updated from $${s.currentPrice.toFixed(2)} to $${s.recommendedPrice.toFixed(2)} (${s.triggerReason}).`,
            timestamp: s.updatedAt || s.createdAt
          });
        } else if (s.status === 'REJECTED') {
          list.push({
            id: `pricing-rej-${s.id}`,
            productId: prodId,
            productName: p ? p.name : `Product #${prodId}`,
            productSku: p ? p.sku : 'PRD',
            type: 'PRICE_REJECTED',
            badgeColor: 'badge-slate',
            title: `Pricing Suggestion Dismissed`,
            description: `Merchandiser dismissed proposed price of $${s.recommendedPrice.toFixed(2)}.`,
            timestamp: s.updatedAt || s.createdAt
          });
        } else {
          list.push({
            id: `pricing-new-${s.id}`,
            productId: prodId,
            productName: p ? p.name : `Product #${prodId}`,
            productSku: p ? p.sku : 'PRD',
            type: 'RECOMMENDATION_NEW',
            badgeColor: 'badge-purple',
            title: `Pricing Strategy Proposed (${s.triggerReason})`,
            description: `Agent proposed ${s.direction} to $${s.recommendedPrice.toFixed(2)} (${(s.confidence * 100).toFixed(0)}% conf).`,
            timestamp: s.createdAt
          });
        }
      });
    });

    // 3. Reorder Suggestions
    Object.entries(reorderSuggestions).forEach(([prodIdStr, suggs]) => {
      const prodId = Number(prodIdStr);
      const p = productMap.get(prodId);
      suggs.forEach((s) => {
        if (s.status === 'ACCEPTED') {
          list.push({
            id: `reorder-acc-${s.id}`,
            productId: prodId,
            productName: p ? p.name : `Product #${prodId}`,
            productSku: p ? p.sku : 'PRD',
            type: 'REORDER_ACCEPTED',
            badgeColor: 'badge-blue',
            title: `Purchase Order Approved`,
            description: `Approved replenishment of +${s.recommendedQuantity} units (~${s.suggestedLeadTimeDays}d lead time).`,
            timestamp: s.updatedAt || s.createdAt
          });
        } else if (s.status === 'PENDING') {
          list.push({
            id: `reorder-new-${s.id}`,
            productId: prodId,
            productName: p ? p.name : `Product #${prodId}`,
            productSku: p ? p.sku : 'PRD',
            type: 'RECOMMENDATION_NEW',
            badgeColor: 'badge-blue',
            title: `Replenishment Proposed (${s.triggerReason})`,
            description: `Agent advised +${s.recommendedQuantity} units purchase order.`,
            timestamp: s.createdAt
          });
        }
      });
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [products, pricingSuggestions, reorderSuggestions, productMap]);

  return (
    <div className="activity-card">
      <div className="activity-card-header">
        <div>
          <h3 className="section-title">Recent Inventory & Agentic Activity</h3>
          <p className="section-subtitle">Real-time audit log of commerce events and merchandiser approvals</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="chart-empty-state">
          <div className="empty-icon">📋</div>
          <h4>No Activity Recorded Yet</h4>
          <p>Simulate a sale on a product or trigger an evaluation to populate the activity stream.</p>
        </div>
      ) : (
        <div className="activity-stream">
          {activities.slice(0, 8).map((act) => (
            <div key={act.id} className="activity-item">
              <div className="activity-time-col">
                <span className="activity-time">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="activity-date">
                  {new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="activity-bullet-col">
                <div className={`activity-bullet ${act.badgeColor}`} />
                <div className="activity-vertical-connector" />
              </div>

              <div className="activity-body-col">
                <div className="activity-body-header">
                  <span className="activity-title-text">{act.title}</span>
                  <Link to={`/products/${act.productId}`} className="activity-product-link">
                    {act.productSku} · {act.productName} ↗
                  </Link>
                </div>
                <p className="activity-desc-text">{act.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
