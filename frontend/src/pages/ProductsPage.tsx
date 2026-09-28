import React, { useState, useMemo } from 'react';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../types';
import { FilterBar } from '../components/FilterBar';
import { ProductCard } from '../components/ProductCard';
import { EmptyState } from '../components/EmptyState';

interface ProductsPageProps {
  products: Product[];
  pricingSuggestions: Record<number, PricingSuggestion[]>;
  reorderSuggestions: Record<number, ReorderSuggestion[]>;
  actionLoading: Record<number, boolean>;
  activePollingIds: Set<number>;
  onSimulateSale: (productId: number) => void;
  onUpdateStock: (productId: number, newStock: number) => void;
  onAcceptSuggestion: (id: number, type: 'pricing' | 'reorder') => void;
  onRejectSuggestion: (id: number, type: 'pricing' | 'reorder') => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  pricingSuggestions,
  reorderSuggestions,
  actionLoading,
  activePollingIds,
  onSimulateSale,
  onUpdateStock,
  onAcceptSuggestion,
  onRejectSuggestion
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'low-stock' | 'suggestions'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedFilter === 'low-stock' && p.stockLevel >= p.reorderThreshold) {
        return false;
      }
      if (selectedFilter === 'suggestions') {
        const hasPricing = (pricingSuggestions[p.id] || []).some((s) => s.status === 'PENDING');
        const hasReorder = (reorderSuggestions[p.id] || []).some((s) => s.status === 'PENDING');
        if (!hasPricing && !hasReorder) return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }

      return true;
    });
  }, [products, selectedCategory, selectedFilter, searchQuery, pricingSuggestions, reorderSuggestions]);

  return (
    <div className="products-page">
      <div className="catalog-header-bar">
        <div>
          <h2 className="section-title">Merchandising Catalog</h2>
          <p className="section-subtitle">
            Browse inventory levels, demand velocity, and trigger on-demand dynamic pricing or stock simulations
          </p>
        </div>
        <div className="catalog-count-pill">
          Showing <strong>{filteredProducts.length}</strong> of {products.length} Products
        </div>
      </div>

      <FilterBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedFilter={selectedFilter}
        onSelectFilter={setSelectedFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalFiltered={filteredProducts.length}
      />

      {filteredProducts.length === 0 ? (
        <EmptyState
          title="No Matching Products Found"
          message="Adjust your search keywords or reset category filters to view more items."
          actionText="Reset All Filters"
          onAction={() => {
            setSelectedCategory('ALL');
            setSelectedFilter('all');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="products-grid">
          {filteredProducts.map((p) => (
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
  );
};
