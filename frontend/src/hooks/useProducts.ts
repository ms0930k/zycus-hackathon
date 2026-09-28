import { useState, useCallback, useEffect } from 'react';
import * as api from '../api';
import type { Product, PricingSuggestion, ReorderSuggestion } from '../types';
import { useSuggestionPolling } from './useSuggestionPolling';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingSuggestions, setPricingSuggestions] = useState<Record<number, PricingSuggestion[]>>({});
  const [reorderSuggestions, setReorderSuggestions] = useState<Record<number, ReorderSuggestion[]>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  // Callback when suggestion polling discovers updates
  const handleSuggestionsUpdated = useCallback(
    (
      productId: number,
      pricing: PricingSuggestion[],
      reorder: ReorderSuggestion[],
      hasPending: boolean
    ) => {
      setPricingSuggestions((prev) => ({ ...prev, [productId]: pricing }));
      setReorderSuggestions((prev) => ({ ...prev, [productId]: reorder }));

      if (hasPending) {
        // Refresh catalog to synchronize product status (e.g. PRICE_REVIEW_PENDING)
        api.getProducts().then(setProducts).catch(console.error);
      }
    },
    []
  );

  const { activePollingIds, startPolling } = useSuggestionPolling({
    onSuggestionsUpdated: handleSuggestionsUpdated
  });

  // Load all products and their existing suggestions
  const loadData = useCallback(async () => {
    try {
      const prods = await api.getProducts();
      setProducts(prods);

      const pSugg: Record<number, PricingSuggestion[]> = {};
      const rSugg: Record<number, ReorderSuggestion[]> = {};

      await Promise.all(
        prods.map(async (p) => {
          try {
            const [ps, rs] = await Promise.all([
              api.getPricingSuggestions(p.id),
              api.getReorderSuggestions(p.id)
            ]);
            pSugg[p.id] = ps;
            rSugg[p.id] = rs;
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
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Simulate an order sale
  const handleSimulateSale = useCallback(
    async (productId: number) => {
      setActionLoading((prev) => ({ ...prev, [productId]: true }));
      try {
        await api.simulateSale(productId, 1);
        startPolling(productId);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Sale simulation failed');
      } finally {
        setActionLoading((prev) => ({ ...prev, [productId]: false }));
      }
    },
    [loadData, startPolling]
  );

  // Update product stock level
  const handleUpdateStock = useCallback(
    async (productId: number, stockLevel: number) => {
      setActionLoading((prev) => ({ ...prev, [productId]: true }));
      try {
        await api.updateStock(productId, stockLevel);
        startPolling(productId);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Stock update failed');
      } finally {
        setActionLoading((prev) => ({ ...prev, [productId]: false }));
      }
    },
    [loadData, startPolling]
  );

  // Accept or reject a suggestion
  const handleSuggestionAction = useCallback(
    async (id: number, type: 'pricing' | 'reorder', status: 'ACCEPTED' | 'REJECTED') => {
      try {
        if (type === 'pricing') {
          await api.updatePricingSuggestion(id, status);
        } else {
          await api.updateReorderSuggestion(id, status);
        }
        await loadData();
      } catch (err: any) {
        alert(err.message || `Failed to update ${type} suggestion`);
      }
    },
    [loadData]
  );

  return {
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
  };
}
