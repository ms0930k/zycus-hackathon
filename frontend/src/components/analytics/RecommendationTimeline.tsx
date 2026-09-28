import React, { useState, useMemo } from 'react';
import type { PricingSuggestion, ReorderSuggestion } from '../../types';
import { TriggerBadge } from '../TriggerBadge';
import { ConfidenceBadge } from '../ConfidenceBadge';

interface RecommendationTimelineProps {
  pricingSuggestions: PricingSuggestion[];
  reorderSuggestions: ReorderSuggestion[];
  onAccept: (id: number, type: 'pricing' | 'reorder') => void;
  onReject: (id: number, type: 'pricing' | 'reorder') => void;
  actionLoading?: boolean;
}

type StatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
type TypeFilter = 'ALL' | 'PRICING' | 'REORDER';

interface UnifiedItem {
  id: number;
  type: 'pricing' | 'reorder';
  triggerReason: string;
  confidence: number;
  reasoning: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  currentValue: string;
  recommendedValue: string;
  diffSummary: string;
}

export const RecommendationTimeline: React.FC<RecommendationTimelineProps> = ({
  pricingSuggestions,
  reorderSuggestions,
  onAccept,
  onReject,
  actionLoading = false
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const unifiedList = useMemo(() => {
    const list: UnifiedItem[] = [];

    pricingSuggestions.forEach((s) => {
      const delta = s.recommendedPrice - s.currentPrice;
      const pct = s.currentPrice > 0 ? (delta / s.currentPrice) * 100 : 0;
      list.push({
        id: s.id,
        type: 'pricing',
        triggerReason: s.triggerReason,
        confidence: s.confidence,
        reasoning: s.reasoning,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        currentValue: `$${s.currentPrice.toFixed(2)}`,
        recommendedValue: `$${s.recommendedPrice.toFixed(2)}`,
        diffSummary: `${delta >= 0 ? '+' : ''}$${delta.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`
      });
    });

    reorderSuggestions.forEach((s) => {
      list.push({
        id: s.id,
        type: 'reorder',
        triggerReason: s.triggerReason,
        confidence: s.confidence,
        reasoning: s.reasoning,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        currentValue: `${s.currentStock} units in stock`,
        recommendedValue: `Order +${s.recommendedQuantity} units`,
        diffSummary: `Lead time: ~${s.suggestedLeadTimeDays} days`
      });
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pricingSuggestions, reorderSuggestions]);

  const filteredItems = useMemo(() => {
    return unifiedList.filter((item) => {
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchType =
        typeFilter === 'ALL' ||
        (typeFilter === 'PRICING' && item.type === 'pricing') ||
        (typeFilter === 'REORDER' && item.type === 'reorder');
      return matchStatus && matchType;
    });
  }, [unifiedList, statusFilter, typeFilter]);

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div>
          <h3 className="analytics-title">Agentic Recommendation History</h3>
          <p className="analytics-subtitle">
            Complete audit trail of AI pricing and replenishment proposals and merchandiser decisions
          </p>
        </div>

        {/* Filter Pills */}
        <div className="filter-group-wrap">
          <div className="range-pills">
            {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as StatusFilter[]).map((st) => (
              <button
                key={st}
                className={`range-pill ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="range-pills">
            {(['ALL', 'PRICING', 'REORDER'] as TypeFilter[]).map((tf) => (
              <button
                key={tf}
                className={`range-pill ${typeFilter === tf ? 'active' : ''}`}
                onClick={() => setTypeFilter(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="chart-empty-state">
          <div className="empty-icon">📂</div>
          <h4>No Recommendations Found</h4>
          <p>No historical recommendations match the selected status or type criteria.</p>
        </div>
      ) : (
        <div className="recommendation-list">
          {filteredItems.map((item) => {
            const isPricing = item.type === 'pricing';
            const isPending = item.status === 'PENDING';

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`rec-history-item ${isPending ? 'rec-border-pending' : ''}`}
              >
                <div className="rec-history-header">
                  <div className="rec-title-row">
                    <span className="rec-type-badge">
                      {isPricing ? '💡 Dynamic Pricing' : '📦 Reorder Replenishment'}
                    </span>
                    <TriggerBadge reason={item.triggerReason} />
                    <ConfidenceBadge confidence={item.confidence} />
                  </div>

                  <div className="rec-status-wrap">
                    <span className={`status-pill status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                    <span className="rec-date">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className="rec-comparison-box">
                  <div className="rec-val-block">
                    <span className="rec-val-lbl">Current Reference</span>
                    <span className="rec-val-num">{item.currentValue}</span>
                  </div>
                  <div className="rec-arrow">➔</div>
                  <div className="rec-val-block">
                    <span className="rec-val-lbl">Proposed Strategy</span>
                    <span className={`rec-val-num ${isPricing ? 'text-emerald' : 'text-blue'}`}>
                      {item.recommendedValue}
                    </span>
                  </div>
                  <div className="rec-diff-badge">{item.diffSummary}</div>
                </div>

                <div className="rec-reasoning-quote">
                  <span className="rec-quote-icon">“</span>
                  <p>{item.reasoning}</p>
                </div>

                {isPending && (
                  <div className="rec-action-row">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onAccept(item.id, item.type)}
                      disabled={actionLoading}
                    >
                      ✓ {isPricing ? 'Approve & Apply Price' : 'Approve Purchase Order'}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => onReject(item.id, item.type)}
                      disabled={actionLoading}
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
