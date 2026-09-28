import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProducts } from './hooks/useProducts';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { LoadingState } from './components/LoadingState';

export default function App() {
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

  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header
          onRefresh={loadData}
          isRefreshing={loading}
          lastUpdated={lastUpdated}
        />

        <main className="main-content">
          {error && (
            <div className="error-banner">
              <span>⚠️ {error}</span>
              <button className="btn btn-outline btn-sm" onClick={loadData}>
                Retry Connection
              </button>
            </div>
          )}

          {loading && products.length === 0 ? (
            <LoadingState message="Connecting to StockPulse Commerce Engine..." />
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    products={products}
                    pricingSuggestions={pricingSuggestions}
                    reorderSuggestions={reorderSuggestions}
                    actionLoading={actionLoading}
                    activePollingIds={activePollingIds}
                    onSimulateSale={handleSimulateSale}
                    onUpdateStock={handleUpdateStock}
                    onAcceptSuggestion={(id, type) => handleSuggestionAction(id, type, 'ACCEPTED')}
                    onRejectSuggestion={(id, type) => handleSuggestionAction(id, type, 'REJECTED')}
                    onOpenAudit={() => setIsAuditDrawerOpen(true)}
                  />
                }
              />

              <Route
                path="/products"
                element={
                  <ProductsPage
                    products={products}
                    pricingSuggestions={pricingSuggestions}
                    reorderSuggestions={reorderSuggestions}
                    actionLoading={actionLoading}
                    activePollingIds={activePollingIds}
                    onSimulateSale={handleSimulateSale}
                    onUpdateStock={handleUpdateStock}
                    onAcceptSuggestion={(id, type) => handleSuggestionAction(id, type, 'ACCEPTED')}
                    onRejectSuggestion={(id, type) => handleSuggestionAction(id, type, 'REJECTED')}
                  />
                }
              />

              <Route path="/products/:productId" element={<ProductDetailsPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>

        {/* Global Audit History Drawer */}
        <AuditLogDrawer
          isOpen={isAuditDrawerOpen}
          onClose={() => setIsAuditDrawerOpen(false)}
          products={products}
          pricingSuggestions={pricingSuggestions}
          reorderSuggestions={reorderSuggestions}
        />
      </div>
    </BrowserRouter>
  );
}
