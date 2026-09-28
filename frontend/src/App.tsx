import { useEffect, useState, useCallback } from 'react';
import * as api from './api';
import type { Product, PricingSuggestion, ReorderSuggestion } from './types';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingSuggestions, setPricingSuggestions] = useState<Record<number, PricingSuggestion[]>>({});
  const [reorderSuggestions, setReorderSuggestions] = useState<Record<number, ReorderSuggestion[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [stockInputs, setStockInputs] = useState<Record<number, number>>({});

  const loadData = useCallback(async () => {
    try {
      const prods = await api.getProducts();
      setProducts(prods);
      
      const pSugg: Record<number, PricingSuggestion[]> = {};
      const rSugg: Record<number, ReorderSuggestion[]> = {};
      
      await Promise.all(
        prods.map(async (p) => {
          try {
            pSugg[p.id] = await api.getPricingSuggestions(p.id);
            rSugg[p.id] = await api.getReorderSuggestions(p.id);
          } catch (e) {
            console.error(`Failed to load suggestions for product ${p.id}`, e);
            pSugg[p.id] = [];
            rSugg[p.id] = [];
          }
        })
      );
      
      setPricingSuggestions(pSugg);
      setReorderSuggestions(rSugg);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling mechanism
  const startPolling = (productId: number) => {
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      try {
        const [ps, rs] = await Promise.all([
          api.getPricingSuggestions(productId),
          api.getReorderSuggestions(productId)
        ]);
        
        setPricingSuggestions(prev => ({ ...prev, [productId]: ps }));
        setReorderSuggestions(prev => ({ ...prev, [productId]: rs }));
        
        // Stop polling if we found a pending suggestion or reached max attempts
        const hasPending = [...ps, ...rs].some(s => s.status === 'PENDING');
        if (hasPending || count >= 5) {
          clearInterval(interval);
          if (hasPending) {
             // Refresh products as well to get updated status
             api.getProducts().then(setProducts).catch(console.error);
          }
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 2000);
  };

  const handleSimulateSale = async (id: number) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.simulateSale(id, 1);
      startPolling(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleUpdateStock = async (id: number) => {
    const qty = stockInputs[id];
    if (qty === undefined || qty < 0) return alert('Enter valid stock level');
    
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.updateStock(id, qty);
      startPolling(id);
      await loadData();
      setStockInputs(prev => ({ ...prev, [id]: 0 }));
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSuggestionAction = async (id: number, type: 'pricing' | 'reorder', status: 'ACCEPTED' | 'REJECTED') => {
    try {
      if (type === 'pricing') {
        await api.updatePricingSuggestion(id, status);
      } else {
        await api.updateReorderSuggestion(id, status);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update suggestion');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <h2>Loading StockPulse Dashboard...</h2>
      </div>
    );
  }

  const lowStockCount = products.filter(p => p.stockLevel < p.reorderThreshold).length;
  const pendingCount = Object.values(pricingSuggestions).flat().filter(s => s.status === 'PENDING').length +
                       Object.values(reorderSuggestions).flat().filter(s => s.status === 'PENDING').length;

  return (
    <div className="dashboard">
      <header className="header">
        <h1>⚡ StockPulse</h1>
        <div className="summary-stats">
          <span className="stat-badge">📦 {products.length} Products</span>
          <span className="stat-badge" style={{ color: lowStockCount > 0 ? 'var(--warning)' : 'inherit' }}>
            ⚠️ {lowStockCount} Low Stock
          </span>
          <span className="stat-badge" style={{ color: pendingCount > 0 ? 'var(--primary)' : 'inherit' }}>
            💡 {pendingCount} Pending Suggestions
          </span>
          <button className="btn outline" onClick={loadData}>🔄 Refresh Data</button>
        </div>
      </header>

      {error && <div style={{background: 'rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem'}}>{error}</div>}

      <div className="grid">
        {products.map(product => {
          const isLowStock = product.stockLevel < product.reorderThreshold;
          const isOutOfStock = product.stockLevel === 0;
          
          let badgeClass = 'active';
          if (isOutOfStock) badgeClass = 'out-of-stock';
          else if (isLowStock) badgeClass = 'low-stock';
          else if (product.status === 'PRICE_REVIEW_PENDING') badgeClass = 'pending';

          const prodPricingSuggs = pricingSuggestions[product.id] || [];
          const prodReorderSuggs = reorderSuggestions[product.id] || [];
          
          const pendingPricing = prodPricingSuggs.filter(s => s.status === 'PENDING');
          const pendingReorder = prodReorderSuggs.filter(s => s.status === 'PENDING');

          return (
            <div key={product.id} className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">{product.name}</h3>
                  <p className="card-subtitle">{product.sku} • {product.category}</p>
                </div>
                <span className={`badge ${badgeClass}`}>
                  {isOutOfStock ? 'Out of Stock' : (isLowStock ? 'Low Stock' : product.status.replace(/_/g, ' '))}
                </span>
              </div>

              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-label">Price</span>
                  <span className="metric-value">${product.currentPrice.toFixed(2)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Stock / Threshold</span>
                  <span className={`metric-value ${isOutOfStock ? 'danger' : isLowStock ? 'warning' : ''}`}>
                    {product.stockLevel} / {product.reorderThreshold}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Demand Velocity</span>
                  <span className="metric-value">{product.demandVelocity?.toFixed(1) || 0}/day</span>
                </div>
              </div>

              <div className="actions">
                <button 
                  className="btn" 
                  onClick={() => handleSimulateSale(product.id)}
                  disabled={actionLoading[product.id] || isOutOfStock}
                >
                  🛒 Simulate Sale
                </button>
                <div className="input-group" style={{marginLeft: 'auto'}}>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    min="0"
                    value={stockInputs[product.id] ?? ''}
                    onChange={e => setStockInputs(prev => ({...prev, [product.id]: parseInt(e.target.value)}))}
                  />
                  <button 
                    className="btn outline"
                    onClick={() => handleUpdateStock(product.id)}
                    disabled={actionLoading[product.id]}
                  >
                    Set Stock
                  </button>
                </div>
              </div>

              {pendingPricing.map(sugg => (
                <div key={`p-${sugg.id}`} className="suggestion-card">
                  <h4>
                    <span>💡 Pricing Suggestion</span>
                    <span className="metric-value success">${sugg.recommendedPrice.toFixed(2)}</span>
                  </h4>
                  <div className={`trigger-badge ${sugg.triggerReason.toLowerCase()}`}>{sugg.triggerReason}</div>
                  <p className="suggestion-reasoning">{sugg.reasoning}</p>
                  <div className="suggestion-actions">
                    <button className="btn success" onClick={() => handleSuggestionAction(sugg.id, 'pricing', 'ACCEPTED')}>Accept</button>
                    <button className="btn danger" onClick={() => handleSuggestionAction(sugg.id, 'pricing', 'REJECTED')}>Reject</button>
                  </div>
                </div>
              ))}

              {pendingReorder.map(sugg => (
                <div key={`r-${sugg.id}`} className="suggestion-card">
                  <h4>
                    <span>📦 Reorder Suggestion</span>
                    <span className="metric-value warning">+{sugg.recommendedQuantity} units</span>
                  </h4>
                  <div className={`trigger-badge ${sugg.triggerReason.toLowerCase()}`}>{sugg.triggerReason}</div>
                  <p className="suggestion-reasoning">{sugg.reasoning}</p>
                  <div className="suggestion-actions">
                    <button className="btn success" onClick={() => handleSuggestionAction(sugg.id, 'reorder', 'ACCEPTED')}>Accept</button>
                    <button className="btn danger" onClick={() => handleSuggestionAction(sugg.id, 'reorder', 'REJECTED')}>Reject</button>
                  </div>
                </div>
              ))}

            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
