import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { StockHealthBadge } from '../components/StockHealthBadge';
import { WhyRecommendationPanel } from '../components/analytics/WhyRecommendationPanel';
import { SalesChart } from '../components/analytics/SalesChart';
import { InventoryChart } from '../components/analytics/InventoryChart';
import { DemandChart } from '../components/analytics/DemandChart';
import { PriceHistoryChart } from '../components/analytics/PriceHistoryChart';
import { RecommendationTimeline } from '../components/analytics/RecommendationTimeline';
import { DecisionTimeline } from '../components/analytics/DecisionTimeline';

type TabView = 'all' | 'sales' | 'inventory' | 'demand' | 'pricing' | 'timeline';

export const ProductDetailsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const idNum = Number(productId);

  const {
    product,
    categoryAverageDemand,
    pricingSuggestions,
    reorderSuggestions,
    salesHistory,
    loading,
    error,
    actionLoading,
    isPolling,
    feedback,
    simulateSale,
    updateStock,
    handleSuggestionAction,
    clearFeedback
  } = useProduct(idNum);

  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [stockInput, setStockInput] = useState<string>('');

  if (loading) {
    return <LoadingState message="Loading product intelligence & analytics..." />;
  }

  if (error || !product) {
    return (
      <div className="product-details-container">
        <EmptyState
          title="Product Not Found"
          message={error || `Could not find product with ID "${productId}".`}
          actionText="← Back to Products"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  const latestPendingPricing = pricingSuggestions.find((s) => s.status === 'PENDING') || pricingSuggestions[0] || null;
  const latestPendingReorder = reorderSuggestions.find((s) => s.status === 'PENDING') || reorderSuggestions[0] || null;

  const handleStockSubmit = () => {
    const val = parseInt(stockInput, 10);
    if (!isNaN(val) && val >= 0) {
      updateStock(val);
      setStockInput('');
    }
  };

  return (
    <div className="product-details-page">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumbs-nav">
        <Link to="/products" className="breadcrumb-link">
          ← Back to Catalog
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">
          {product.name} ({product.sku})
        </span>
      </nav>

      {/* Product Hero Workspace Header */}
      <div className="product-hero-card">
        <div className="hero-top-row">
          <div>
            <div className="sku-category-row">
              <span className="sku-badge font-mono">{product.sku}</span>
              <span className="category-pill">{product.category}</span>
              <span className={`status-pill status-${product.status.toLowerCase()}`}>
                {product.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="hero-title">{product.name}</h1>
          </div>

          {/* Quick Transaction Actions */}
          <div className="hero-actions">
            <button
              className="btn btn-primary"
              onClick={() => simulateSale(1)}
              disabled={actionLoading || product.stockLevel === 0}
              title="Record an immediate customer sale order"
            >
              {actionLoading ? <span className="btn-spinner" /> : '🛒 Simulate Sale (-1)'}
            </button>

            <div className="input-group">
              <input
                type="number"
                placeholder="Set stock"
                min="0"
                value={stockInput}
                onChange={(e) => setStockInput(e.target.value)}
                disabled={actionLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStockSubmit();
                }}
              />
              <button
                className="btn btn-outline"
                onClick={handleStockSubmit}
                disabled={actionLoading || stockInput === ''}
              >
                Update
              </button>
            </div>
          </div>
        </div>

        {/* Polling Radar Banner */}
        {isPolling && (
          <div className="polling-indicator-banner mt-3">
            <span className="pulsing-radar-dot" />
            <span>
              Agentic AI Recommendation Engine Active — Evaluating dynamic pricing & replenishment proposals...
            </span>
          </div>
        )}

        {/* Feedback Alert for Cause / Trigger Explainability */}
        {feedback && (
          <div
            className={`feedback-alert mt-3 ${
              feedback.type === 'TRIGGER_INVENTORY_LOW' || feedback.type === 'TRIGGER_DEMAND_SPIKE'
                ? 'feedback-trigger'
                : feedback.type === 'DUPLICATE_PENDING'
                ? 'feedback-info'
                : feedback.type === 'STOCK_EXHAUSTED'
                ? 'feedback-danger'
                : 'feedback-neutral'
            }`}
          >
            <div className="feedback-body">
              <span className="feedback-icon">
                {feedback.type === 'TRIGGER_INVENTORY_LOW'
                  ? '⚠️'
                  : feedback.type === 'TRIGGER_DEMAND_SPIKE'
                  ? '🔥'
                  : feedback.type === 'DUPLICATE_PENDING'
                  ? 'ℹ️'
                  : feedback.type === 'STOCK_EXHAUSTED'
                  ? '🚫'
                  : '✅'}
              </span>
              <div>
                <strong>{feedback.title}</strong> — {feedback.message}
              </div>
            </div>
            <button className="feedback-close-btn" onClick={clearFeedback} title="Dismiss">
              ✕
            </button>
          </div>
        )}

        {/* Key Metrics Strip */}
        <div className="hero-metrics-strip">
          <div className="hero-metric-cell">
            <span className="hero-metric-label">Selling Price</span>
            <span className="hero-metric-val font-mono text-emerald">${product.currentPrice.toFixed(2)}</span>
            <span className="hero-metric-sub">Active catalog price</span>
          </div>

          <div className="hero-metric-cell">
            <span className="hero-metric-label">Stock Level</span>
            <span
              className={`hero-metric-val font-mono ${
                product.stockLevel < product.reorderThreshold ? 'text-rose' : 'text-emerald'
              }`}
            >
              {product.stockLevel} units
            </span>
            <span className="hero-metric-sub">Threshold: {product.reorderThreshold} units</span>
          </div>

          <div className="hero-metric-cell">
            <span className="hero-metric-label">Demand Velocity</span>
            <span className="hero-metric-val font-mono text-purple">
              {product.demandVelocity.toFixed(1)} /day
            </span>
            <span className="hero-metric-sub">Category avg: {categoryAverageDemand.toFixed(1)} /day</span>
          </div>

          <div className="hero-metric-cell">
            <span className="hero-metric-label">Health & Safety</span>
            <div className="hero-metric-badge-wrap">
              <StockHealthBadge
                stockLevel={product.stockLevel}
                reorderThreshold={product.reorderThreshold}
                status={product.status}
              />
            </div>
            <span className="hero-metric-sub">
              {product.stockLevel - product.reorderThreshold >= 0
                ? `+${product.stockLevel - product.reorderThreshold} buffer units`
                : `${product.stockLevel - product.reorderThreshold} buffer deficit`}
            </span>
          </div>
        </div>
      </div>

      {/* AI Explainability Banner: Why this recommendation? */}
      <WhyRecommendationPanel
        product={product}
        categoryAverage={categoryAverageDemand}
        latestPricing={latestPendingPricing}
        latestReorder={latestPendingReorder}
        onAcceptPricing={(id) => handleSuggestionAction(id, 'pricing', 'ACCEPTED')}
        onRejectPricing={(id) => handleSuggestionAction(id, 'pricing', 'REJECTED')}
        onAcceptReorder={(id) => handleSuggestionAction(id, 'reorder', 'ACCEPTED')}
        onRejectReorder={(id) => handleSuggestionAction(id, 'reorder', 'REJECTED')}
        isLoading={actionLoading}
      />

      {/* Analytical Tab Selector */}
      <div className="analytics-tabs-bar">
        {(
          [
            { id: 'all', label: '📊 All Analytics' },
            { id: 'sales', label: '🛒 Sales Orders' },
            { id: 'inventory', label: '📦 Inventory Depletion' },
            { id: 'demand', label: '⚡ Demand Velocity' },
            { id: 'pricing', label: '💲 Price History' },
            { id: 'timeline', label: '⏱️ Decision Timeline' }
          ] as { id: TabView; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            className={`analytics-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Analytics Grid Workspace */}
      <div className="analytics-grid">
        {(activeTab === 'all' || activeTab === 'sales') && (
          <SalesChart
            sales={salesHistory}
            onSimulateSale={() => simulateSale(1)}
            isLoading={actionLoading}
          />
        )}

        {(activeTab === 'all' || activeTab === 'inventory') && (
          <InventoryChart
            currentStock={product.stockLevel}
            reorderThreshold={product.reorderThreshold}
            sales={salesHistory}
            createdAt={product.createdAt}
          />
        )}

        {(activeTab === 'all' || activeTab === 'demand') && (
          <DemandChart
            currentVelocity={product.demandVelocity}
            categoryAverage={categoryAverageDemand}
            category={product.category}
            sales={salesHistory}
            createdAt={product.createdAt}
          />
        )}

        {(activeTab === 'all' || activeTab === 'pricing') && (
          <PriceHistoryChart
            currentPrice={product.currentPrice}
            createdAt={product.createdAt}
            pricingSuggestions={pricingSuggestions}
          />
        )}

        {(activeTab === 'all' || activeTab === 'timeline') && (
          <DecisionTimeline
            sales={salesHistory}
            pricingSuggestions={pricingSuggestions}
            reorderSuggestions={reorderSuggestions}
            currentStock={product.stockLevel}
            reorderThreshold={product.reorderThreshold}
            currentPrice={product.currentPrice}
          />
        )}

        {/* Complete Recommendation History */}
        <div className="analytics-full-width">
          <RecommendationTimeline
            pricingSuggestions={pricingSuggestions}
            reorderSuggestions={reorderSuggestions}
            onAccept={(id, type) => handleSuggestionAction(id, type, 'ACCEPTED')}
            onReject={(id, type) => handleSuggestionAction(id, type, 'REJECTED')}
            actionLoading={actionLoading}
          />
        </div>
      </div>
    </div>
  );
};
