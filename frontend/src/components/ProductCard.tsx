import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../types';
import { StockHealthBadge } from './StockHealthBadge';
import { SuggestionCard } from './SuggestionCard';

interface ProductCardProps {
  product: Product;
  pricingSuggestions: PricingSuggestion[];
  reorderSuggestions: ReorderSuggestion[];
  isActionLoading: boolean;
  isPolling: boolean;
  onSimulateSale: (productId: number) => void;
  onUpdateStock: (productId: number, newStock: number) => void;
  onAcceptSuggestion: (id: number, type: 'pricing' | 'reorder') => void;
  onRejectSuggestion: (id: number, type: 'pricing' | 'reorder') => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  pricingSuggestions,
  reorderSuggestions,
  isActionLoading,
  isPolling,
  onSimulateSale,
  onUpdateStock,
  onAcceptSuggestion,
  onRejectSuggestion
}) => {
  const [stockInput, setStockInput] = useState<string>('');

  const isLowStock = product.stockLevel < product.reorderThreshold;
  const isOutOfStock = product.stockLevel === 0;

  // Filter only pending suggestions for this card
  const pendingPricing = pricingSuggestions.filter((s) => s.status === 'PENDING');
  const pendingReorder = reorderSuggestions.filter((s) => s.status === 'PENDING');
  const hasPendingSuggestions = pendingPricing.length > 0 || pendingReorder.length > 0;

  // Compute stock bar width percentage (normalized against twice the threshold or minimum 20)
  const maxRef = Math.max(product.reorderThreshold * 2.5, product.stockLevel, 20);
  const stockPercentage = Math.min(100, Math.round((product.stockLevel / maxRef) * 100));

  const handleStockSubmit = () => {
    const parsed = parseInt(stockInput, 10);
    if (isNaN(parsed) || parsed < 0) {
      alert('Please enter a valid non-negative stock quantity.');
      return;
    }
    onUpdateStock(product.id, parsed);
    setStockInput('');
  };

  const getDemandIcon = (velocity: number) => {
    if (velocity >= 10) return '🔥';
    if (velocity >= 4) return '📈';
    if (velocity > 0) return '📊';
    return '💤';
  };

  return (
    <div
      className={`card product-card ${isOutOfStock ? 'card-out-of-stock' : isLowStock ? 'card-low-stock' : ''} ${
        hasPendingSuggestions ? 'card-has-suggestions' : ''
      }`}
    >
      <div className="card-header">
        <div className="product-title-group">
          <div className="product-meta-row">
            <span className="sku-badge">{product.sku}</span>
            <span className="category-pill">{product.category}</span>
          </div>
          <Link to={`/products/${product.id}`} className="card-title-link">
            <h3 className="card-title">{product.name}</h3>
          </Link>
        </div>
        <div className="card-top-right">
          <StockHealthBadge
            stockLevel={product.stockLevel}
            reorderThreshold={product.reorderThreshold}
            status={product.status}
          />
          <Link to={`/products/${product.id}`} className="btn-view-details" title="Open product analytics workspace">
            Analytics ↗
          </Link>
        </div>
      </div>

      {/* Stock visual progress bar */}
      <div className="stock-meter">
        <div className="stock-meter-label">
          <span>Inventory Buffer</span>
          <span>
            {product.stockLevel} / {product.reorderThreshold} target
          </span>
        </div>
        <div className="meter-track">
          <div
            className={`meter-fill ${
              isOutOfStock
                ? 'fill-danger'
                : isLowStock
                ? 'fill-warning'
                : 'fill-success'
            }`}
            style={{ width: `${Math.max(5, stockPercentage)}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric">
          <span className="metric-label">Current Price</span>
          <span className="metric-value font-mono">${product.currentPrice.toFixed(2)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Stock / Threshold</span>
          <span
            className={`metric-value font-mono ${
              isOutOfStock ? 'text-danger' : isLowStock ? 'text-warning' : 'text-success'
            }`}
          >
            {product.stockLevel} <span className="metric-sub">/ {product.reorderThreshold}</span>
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Demand Velocity</span>
          <span className="metric-value font-mono">
            {getDemandIcon(product.demandVelocity || 0)}{' '}
            {(product.demandVelocity || 0).toFixed(1)}
            <span className="metric-sub">/day</span>
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Status</span>
          <span className="metric-value metric-status-text">
            {product.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Real-time AI Polling Indicator */}
      {isPolling && (
        <div className="polling-indicator-banner">
          <span className="pulsing-radar-dot" />
          <span>Agent evaluating inventory & demand signals...</span>
        </div>
      )}

      {/* Product Primary Actions */}
      <div className="actions product-actions">
        <button
          className="btn btn-primary"
          onClick={() => onSimulateSale(product.id)}
          disabled={isActionLoading || isOutOfStock}
          title={isOutOfStock ? 'Cannot sell out-of-stock item' : 'Simulate an incoming order sale'}
        >
          {isActionLoading ? <span className="btn-spinner" /> : '🛒 Simulate Sale'}
        </button>

        <div className="input-group">
          <input
            type="number"
            placeholder="New qty"
            min="0"
            value={stockInput}
            onChange={(e) => setStockInput(e.target.value)}
            disabled={isActionLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleStockSubmit();
            }}
          />
          <button
            className="btn btn-outline"
            onClick={handleStockSubmit}
            disabled={isActionLoading || stockInput === ''}
            title="Set stock level directly"
          >
            Set Stock
          </button>
        </div>
      </div>

      {/* Suggestion Cards Area */}
      {hasPendingSuggestions && (
        <div className="pending-suggestions-container">
          {pendingPricing.map((sugg) => (
            <SuggestionCard
              key={`pricing-${sugg.id}`}
              type="pricing"
              suggestion={sugg}
              onAccept={(id) => onAcceptSuggestion(id, 'pricing')}
              onReject={(id) => onRejectSuggestion(id, 'pricing')}
              isLoading={isActionLoading}
            />
          ))}

          {pendingReorder.map((sugg) => (
            <SuggestionCard
              key={`reorder-${sugg.id}`}
              type="reorder"
              suggestion={sugg}
              onAccept={(id) => onAcceptSuggestion(id, 'reorder')}
              onReject={(id) => onRejectSuggestion(id, 'reorder')}
              isLoading={isActionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
};
