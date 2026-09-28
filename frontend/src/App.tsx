import { useState, useMemo } from 'react';
import { useProducts } from './hooks/useProducts';
import { Header } from './components/Header';
import { SummaryStats } from './components/SummaryStats';
import { AttentionBanner } from './components/AttentionBanner';
import { PendingApprovalQueue } from './components/PendingApprovalQueue';
import { FilterBar } from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import { EmptyState } from './components/EmptyState';
import { LoadingState } from './components/LoadingState';
import { AuditLogDrawer } from './components/AuditLogDrawer';

function App() {
  const {
    products,
    pricingSuggestions,
    reorderSuggestions,
    loading,
    error,
    actionLoading,
    lastUpdated,
    activePollingIds,
    loadData,
    handleSimulateSale,
    handleUpdateStock,
    handleSuggestionAction
  } = useProducts();

  // Filter and search states
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'attention' | 'suggestions'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);

  // Compute pending suggestions and low stock counts
  const pendingCount = useMemo(() => {
    const pCount = Object.values(pricingSuggestions).flat().filter((s) => s.status === 'PENDING').length;
    const rCount = Object.values(reorderSuggestions).flat().filter((s) => s.status === 'PENDING').length;
    return pCount + rCount;
  }, [pricingSuggestions, reorderSuggestions]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockLevel < p.reorderThreshold).length;
  }, [products]);

  // Filter products according to active filters
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // 2. Health / Status filter
      if (selectedFilter === 'attention') {
        const needsAttention = p.stockLevel < p.reorderThreshold || p.status === 'PRICE_REVIEW_PENDING';
        if (!needsAttention) return false;
      } else if (selectedFilter === 'suggestions') {
        const hasPricing = (pricingSuggestions[p.id] || []).some((s) => s.status === 'PENDING');
        const hasReorder = (reorderSuggestions[p.id] || []).some((s) => s.status === 'PENDING');
        if (!hasPricing && !hasReorder) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesName = p.name.toLowerCase().includes(q);
        if (!matchesSku && !matchesName) return false;
      }

      return true;
    });
  }, [products, selectedCategory, selectedFilter, searchQuery, pricingSuggestions, reorderSuggestions]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="dashboard-app">
      <div className="dashboard-container">
        {/* Top Header */}
        <Header
          onRefresh={loadData}
          isRefreshing={loading}
          lastUpdated={lastUpdated}
        />

        {/* Global Error Banner */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <div className="error-text">
              <strong>Error:</strong> {error}
            </div>
            <button className="btn btn-sm btn-outline" onClick={loadData}>
              Retry Connection
            </button>
          </div>
        )}

        {/* Dashboard KPI Summary Cards */}
        <SummaryStats
          products={products}
          pricingSuggestions={pricingSuggestions}
          reorderSuggestions={reorderSuggestions}
        />

        {/* Attention Notification Banner */}
        <AttentionBanner
          pendingCount={pendingCount}
          lowStockCount={lowStockCount}
          onFilterPending={() => {
            setSelectedFilter('suggestions');
            setSelectedCategory('ALL');
          }}
        />

        {/* Centralized Human Approval Queue for Pending Recommendations */}
        <PendingApprovalQueue
          products={products}
          pricingSuggestions={pricingSuggestions}
          reorderSuggestions={reorderSuggestions}
          actionLoading={actionLoading}
          onAcceptSuggestion={(id, type) => handleSuggestionAction(id, type, 'ACCEPTED')}
          onRejectSuggestion={(id, type) => handleSuggestionAction(id, type, 'REJECTED')}
        />

        {/* Catalog Header with Audit Log Launcher */}
        <div className="catalog-header-bar">
          <div>
            <h2 className="section-title">Merchandise Catalog & Signals</h2>
            <p className="section-subtitle">
              Live inventory tracking, automated demand velocity, and on-demand replenishment controls
            </p>
          </div>
          <button
            className="btn btn-outline btn-audit"
            onClick={() => setIsAuditDrawerOpen(true)}
            title="Open audit ledger of all recommendation decisions"
          >
            📋 Audit History
          </button>
        </div>

        {/* Search & Category Filter Controls */}
        <FilterBar
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalFiltered={filteredProducts.length}
        />

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No matching products found"
            message="Try adjusting your category selection, status filter, or search keywords."
            actionText="Reset All Filters"
            onAction={() => {
              setSelectedCategory('ALL');
              setSelectedFilter('all');
              setSearchQuery('');
            }}
          />
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                pricingSuggestions={pricingSuggestions[product.id] || []}
                reorderSuggestions={reorderSuggestions[product.id] || []}
                isActionLoading={actionLoading[product.id] || false}
                isPolling={activePollingIds.has(product.id)}
                onSimulateSale={handleSimulateSale}
                onUpdateStock={handleUpdateStock}
                onAcceptSuggestion={(id, type) => handleSuggestionAction(id, type, 'ACCEPTED')}
                onRejectSuggestion={(id, type) => handleSuggestionAction(id, type, 'REJECTED')}
              />
            ))}
          </div>
        )}

        {/* Recommendation Audit History Drawer */}
        <AuditLogDrawer
          isOpen={isAuditDrawerOpen}
          onClose={() => setIsAuditDrawerOpen(false)}
          products={products}
          pricingSuggestions={pricingSuggestions}
          reorderSuggestions={reorderSuggestions}
        />
      </div>
    </div>
  );
}

export default App;
