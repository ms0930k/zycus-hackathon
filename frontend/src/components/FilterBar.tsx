import React from 'react';

interface FilterBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedFilter: 'all' | 'attention' | 'suggestions';
  onSelectFilter: (filter: 'all' | 'attention' | 'suggestions') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalFiltered: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedFilter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
  totalFiltered
}) => {
  const categories = ['ALL', 'ELECTRONICS', 'APPAREL', 'HOME'];

  return (
    <div className="filter-bar">
      <div className="filter-group-left">
        {/* Category Pill Tabs */}
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`tab-btn ${selectedCategory === cat ? 'tab-btn-active' : ''}`}
              onClick={() => onSelectCategory(cat)}
            >
              {cat === 'ALL' ? 'All Categories' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="status-filters">
          <button
            className={`filter-pill ${selectedFilter === 'all' ? 'filter-pill-active' : ''}`}
            onClick={() => onSelectFilter('all')}
          >
            All Items
          </button>
          <button
            className={`filter-pill ${selectedFilter === 'attention' ? 'filter-pill-active' : ''}`}
            onClick={() => onSelectFilter('attention')}
          >
            ⚠️ Needs Attention
          </button>
          <button
            className={`filter-pill ${selectedFilter === 'suggestions' ? 'filter-pill-active' : ''}`}
            onClick={() => onSelectFilter('suggestions')}
          >
            💡 Pending Actions
          </button>
        </div>
      </div>

      <div className="filter-group-right">
        {/* Search input */}
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search SKU or name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => onSearchChange('')}>
              ✕
            </button>
          )}
        </div>
        <span className="results-counter">
          Showing <strong>{totalFiltered}</strong> items
        </span>
      </div>
    </div>
  );
};
