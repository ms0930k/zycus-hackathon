import React from 'react';
import type { PricingSuggestion, ReorderSuggestion } from '../types';
import { TriggerBadge } from './TriggerBadge';
import { ConfidenceBadge } from './ConfidenceBadge';

interface SuggestionCardProps {
  type: 'pricing' | 'reorder';
  suggestion: PricingSuggestion | ReorderSuggestion;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  isLoading?: boolean;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  type,
  suggestion,
  onAccept,
  onReject,
  isLoading = false
}) => {
  const isPricing = type === 'pricing';
  const pricingSugg = isPricing ? (suggestion as PricingSuggestion) : null;
  const reorderSugg = !isPricing ? (suggestion as ReorderSuggestion) : null;

  // Calculate pricing delta
  let priceDelta = 0;
  let pricePercent = 0;
  if (pricingSugg && pricingSugg.currentPrice > 0) {
    priceDelta = pricingSugg.recommendedPrice - pricingSugg.currentPrice;
    pricePercent = (priceDelta / pricingSugg.currentPrice) * 100;
  }

  return (
    <div className={`suggestion-card ${isPricing ? 'suggestion-pricing' : 'suggestion-reorder'}`}>
      <div className="suggestion-header">
        <div className="suggestion-type-row">
          <span className="suggestion-kind">
            {isPricing ? '💡 Dynamic Pricing Advisor' : '📦 Inventory Replenishment'}
          </span>
          <TriggerBadge reason={suggestion.triggerReason} />
        </div>
        <ConfidenceBadge confidence={suggestion.confidence} />
      </div>

      <div className="suggestion-comparison">
        {isPricing && pricingSugg && (
          <div className="comparison-box">
            <div className="comparison-item">
              <span className="comparison-label">Current</span>
              <span className="comparison-current">${pricingSugg.currentPrice.toFixed(2)}</span>
            </div>
            <div className="comparison-arrow">➔</div>
            <div className="comparison-item">
              <span className="comparison-label">Target</span>
              <span className="comparison-target">${pricingSugg.recommendedPrice.toFixed(2)}</span>
            </div>
            <div className="comparison-delta">
              {priceDelta > 0 ? (
                <span className="delta-pill delta-up">+{pricePercent.toFixed(1)}%</span>
              ) : priceDelta < 0 ? (
                <span className="delta-pill delta-down">{pricePercent.toFixed(1)}%</span>
              ) : (
                <span className="delta-pill delta-hold">HOLD</span>
              )}
            </div>
          </div>
        )}

        {!isPricing && reorderSugg && (
          <div className="comparison-box">
            <div className="comparison-item">
              <span className="comparison-label">On Hand</span>
              <span className="comparison-current">{reorderSugg.currentStock} units</span>
            </div>
            <div className="comparison-arrow">➔</div>
            <div className="comparison-item">
              <span className="comparison-label">Recommended Order</span>
              <span className="comparison-target highlight-warning">
                +{reorderSugg.recommendedQuantity} units
              </span>
            </div>
            {reorderSugg.suggestedLeadTimeDays > 0 && (
              <div className="comparison-leadtime">
                <span>⏱ {reorderSugg.suggestedLeadTimeDays}d lead time</span>
              </div>
            )}
          </div>
        )}
      </div>

      {suggestion.reasoning && (
        <div className="suggestion-reasoning-panel">
          <span className="reasoning-heading">Intelligence Justification</span>
          <p className="reasoning-text">"{suggestion.reasoning}"</p>
        </div>
      )}

      <div className="suggestion-actions-row">
        <button
          className="btn btn-sm btn-success"
          onClick={() => onAccept(suggestion.id)}
          disabled={isLoading}
          title="Approve recommendation and apply update"
        >
          {isLoading ? <span className="btn-spinner" /> : '✓ Accept'}
        </button>
        <button
          className="btn btn-sm btn-danger-outline"
          onClick={() => onReject(suggestion.id)}
          disabled={isLoading}
          title="Reject recommendation and archive"
        >
          ✕ Dismiss
        </button>
      </div>
    </div>
  );
};
