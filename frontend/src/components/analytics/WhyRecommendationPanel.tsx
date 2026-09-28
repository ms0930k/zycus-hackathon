import React from 'react';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../../types';
import { TriggerBadge } from '../TriggerBadge';
import { ConfidenceBadge } from '../ConfidenceBadge';

interface WhyRecommendationPanelProps {
  product: Product;
  categoryAverage: number;
  latestPricing?: PricingSuggestion | null;
  latestReorder?: ReorderSuggestion | null;
  onAcceptPricing?: (id: number) => void;
  onRejectPricing?: (id: number) => void;
  onAcceptReorder?: (id: number) => void;
  onRejectReorder?: (id: number) => void;
  isLoading?: boolean;
}

export const WhyRecommendationPanel: React.FC<WhyRecommendationPanelProps> = ({
  product,
  categoryAverage,
  latestPricing,
  latestReorder,
  onAcceptPricing,
  onRejectPricing,
  onAcceptReorder,
  onRejectReorder,
  isLoading = false
}) => {
  if (!latestPricing && !latestReorder) {
    return (
      <div className="why-panel empty-why">
        <div className="why-icon">🛡️</div>
        <div>
          <h4>System in Balance — No Pending Action Required</h4>
          <p>
            Stock level ({product.stockLevel}) is above threshold ({product.reorderThreshold}) and demand velocity (
            {product.demandVelocity.toFixed(1)}/day) is within category parameters. No agentic intervention triggered.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="why-panel">
      <div className="why-panel-header">
        <div className="why-title-group">
          <span className="why-badge">AI EXPLAINABILITY ENGINE</span>
          <h3 className="why-headline">Why Was This Strategy Proposed?</h3>
        </div>
        <div className="why-badges">
          {latestPricing && <TriggerBadge reason={latestPricing.triggerReason} />}
          {latestPricing && <ConfidenceBadge confidence={latestPricing.confidence} />}
        </div>
      </div>

      <div className="why-metrics-grid">
        <div className="why-metric-cell">
          <span className="why-cell-label">Observed Stock vs Threshold</span>
          <div className="why-cell-val">
            <span className={product.stockLevel < product.reorderThreshold ? 'text-rose' : 'text-emerald'}>
              {product.stockLevel} units
            </span>
            <span className="why-sub">/ {product.reorderThreshold} safety floor</span>
          </div>
          <span className="why-status-note">
            {product.stockLevel < product.reorderThreshold ? '⚠️ Stock depleted below buffer' : '✓ Normal inventory buffer'}
          </span>
        </div>

        <div className="why-metric-cell">
          <span className="why-cell-label">Demand Velocity vs Peers</span>
          <div className="why-cell-val">
            <span className="text-purple">{product.demandVelocity.toFixed(1)} /day</span>
            <span className="why-sub">vs {categoryAverage.toFixed(1)} avg ({product.category})</span>
          </div>
          <span className="why-status-note">
            {categoryAverage > 0 && product.demandVelocity > categoryAverage * 3.0
              ? '🔥 Surge detected (>3x category average)'
              : '✓ Velocity aligned with category trend'}
          </span>
        </div>

        {latestPricing && (
          <div className="why-metric-cell">
            <span className="why-cell-label">Recommended Pricing Strategy</span>
            <div className="why-cell-val">
              <span className="text-emerald">${latestPricing.recommendedPrice.toFixed(2)}</span>
              <span className="why-sub">from ${latestPricing.currentPrice.toFixed(2)}</span>
            </div>
            <span className="why-status-note">
              {latestPricing.direction === 'INCREASE'
                ? `+${(((latestPricing.recommendedPrice - latestPricing.currentPrice) / latestPricing.currentPrice) * 100).toFixed(1)}% margin enhancement`
                : 'Demand stimulation price'}
            </span>
          </div>
        )}

        {latestReorder && (
          <div className="why-metric-cell">
            <span className="why-cell-label">Replenishment Proposal</span>
            <div className="why-cell-val">
              <span className="text-blue">+{latestReorder.recommendedQuantity} units</span>
              <span className="why-sub">lead time: ~{latestReorder.suggestedLeadTimeDays}d</span>
            </div>
            <span className="why-status-note">Restores inventory to target operating depth</span>
          </div>
        )}
      </div>

      {/* AI Reasoning Text */}
      {(latestPricing?.reasoning || latestReorder?.reasoning) && (
        <div className="why-reasoning-box">
          <div className="why-reasoning-header">
            <span className="why-bot-icon">🤖</span>
            <strong>Agent Reasoning & Market Context:</strong>
          </div>
          <p className="why-reasoning-text">
            {latestPricing?.reasoning || latestReorder?.reasoning}
          </p>
        </div>
      )}

      {/* Action Buttons if Pending */}
      <div className="why-action-footer">
        {latestPricing && latestPricing.status === 'PENDING' && onAcceptPricing && onRejectPricing && (
          <div className="why-btn-group">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onAcceptPricing(latestPricing.id)}
              disabled={isLoading}
            >
              ✓ Approve Price (${latestPricing.recommendedPrice.toFixed(2)})
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onRejectPricing(latestPricing.id)}
              disabled={isLoading}
            >
              Dismiss
            </button>
          </div>
        )}

        {latestReorder && latestReorder.status === 'PENDING' && onAcceptReorder && onRejectReorder && (
          <div className="why-btn-group">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onAcceptReorder(latestReorder.id)}
              disabled={isLoading}
            >
              ✓ Approve Purchase (+{latestReorder.recommendedQuantity} units)
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => onRejectReorder(latestReorder.id)}
              disabled={isLoading}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
