import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, PricingSuggestion, ReorderSuggestion, SaleRecord, SimulationFeedback } from '../types';
import * as api from '../api';
import { analyticsStore } from '../utils/analyticsStore';

export function useProduct(productId: number) {
  const [product, setProduct] = useState<Product | null>(null);
  const [categoryAverageDemand, setCategoryAverageDemand] = useState<number>(0);
  const [pricingSuggestions, setPricingSuggestions] = useState<PricingSuggestion[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<SimulationFeedback | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);

  const loadProductData = useCallback(async () => {
    try {
      const allProducts = await api.getProducts();
      const current = allProducts.find((p) => p.id === productId) || null;
      if (!current) {
        setError(`Product with ID ${productId} not found`);
        setLoading(false);
        return null;
      }
      setProduct(current);

      // Compute category average demand
      const sameCategory = allProducts.filter((p) => p.category === current.category);
      if (sameCategory.length > 0) {
        const sum = sameCategory.reduce((acc, p) => acc + (p.demandVelocity || 0), 0);
        setCategoryAverageDemand(sum / sameCategory.length);
      }

      // Load suggestions
      const [pricing, reorder] = await Promise.all([
        api.getPricingSuggestions(productId).catch(() => []),
        api.getReorderSuggestions(productId).catch(() => [])
      ]);

      setPricingSuggestions(pricing);
      setReorderSuggestions(reorder);
      setSalesHistory(analyticsStore.getSales(productId));
      setError(null);
      return { product: current, pricing, reorder };
    } catch (err: any) {
      setError(err.message || 'Failed to load product data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProductData();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadProductData]);

  // Clean polling implementation
  const startSuggestionPolling = useCallback(
    (initialPricingCount: number, initialReorderCount: number) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollCountRef.current = 0;
      setIsPolling(true);

      pollingRef.current = setInterval(async () => {
        pollCountRef.current += 1;
        try {
          const [pricing, reorder, allProducts] = await Promise.all([
            api.getPricingSuggestions(productId).catch(() => []),
            api.getReorderSuggestions(productId).catch(() => []),
            api.getProducts().catch(() => [])
          ]);

          setPricingSuggestions(pricing);
          setReorderSuggestions(reorder);

          const updatedProd = allProducts.find((p) => p.id === productId);
          if (updatedProd) setProduct(updatedProd);

          const hasNewPending =
            pricing.some((s) => s.status === 'PENDING') ||
            reorder.some((s) => s.status === 'PENDING') ||
            pricing.length > initialPricingCount ||
            reorder.length > initialReorderCount;

          if (hasNewPending || pollCountRef.current >= 6) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsPolling(false);
          }
        } catch {
          if (pollCountRef.current >= 6) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsPolling(false);
          }
        }
      }, 2000);
    },
    [productId]
  );

  // Simulate Sale with deterministic cause/trigger feedback
  const simulateSale = useCallback(
    async (quantity = 1) => {
      if (!product) return;
      setActionLoading(true);
      try {
        const initialPricingCount = pricingSuggestions.length;
        const initialReorderCount = reorderSuggestions.length;

        // Execute sale
        const updated = await api.simulateSale(product.id, quantity);
        setProduct(updated);

        // Record authentic sale
        const newSale = analyticsStore.recordSale(
          product.id,
          quantity,
          product.currentPrice,
          updated.stockLevel,
          updated.demandVelocity
        );
        setSalesHistory((prev) => [...prev, newSale]);

        // Evaluate trigger condition
        const spikeThreshold = categoryAverageDemand > 0 ? categoryAverageDemand * 3.0 : 9999;
        const isBelowThreshold = updated.stockLevel < updated.reorderThreshold;
        const isSpike = updated.demandVelocity > spikeThreshold;

        // Check if pending recommendations already exist for these triggers
        const hasPendingLowStock =
          pricingSuggestions.some((s) => s.status === 'PENDING' && s.triggerReason === 'INVENTORY_LOW') ||
          reorderSuggestions.some((s) => s.status === 'PENDING' && s.triggerReason === 'INVENTORY_LOW');

        const hasPendingSpike =
          pricingSuggestions.some((s) => s.status === 'PENDING' && s.triggerReason === 'DEMAND_SPIKE') ||
          reorderSuggestions.some((s) => s.status === 'PENDING' && s.triggerReason === 'DEMAND_SPIKE');

        if (isBelowThreshold) {
          if (hasPendingLowStock) {
            setFeedback({
              productId: product.id,
              type: 'DUPLICATE_PENDING',
              title: 'Recommendation Already Pending',
              message: `Inventory is low (${updated.stockLevel}/${updated.reorderThreshold}), but an INVENTORY_LOW recommendation is already pending approval. Duplicate suppressed.`,
              timestamp: new Date().toLocaleTimeString()
            });
          } else {
            setFeedback({
              productId: product.id,
              type: 'TRIGGER_INVENTORY_LOW',
              title: 'INVENTORY_LOW Trigger Fired',
              message: `Stock dropped to ${updated.stockLevel} units (below threshold ${updated.reorderThreshold}). Agentic AI is evaluating pricing and replenishment...`,
              timestamp: new Date().toLocaleTimeString()
            });
            startSuggestionPolling(initialPricingCount, initialReorderCount);
          }
        } else if (isSpike) {
          if (hasPendingSpike) {
            setFeedback({
              productId: product.id,
              type: 'DUPLICATE_PENDING',
              title: 'Recommendation Already Pending',
              message: `Demand velocity surged to ${updated.demandVelocity.toFixed(1)} (>3x avg ${spikeThreshold.toFixed(1)}), but a DEMAND_SPIKE recommendation is already pending. Duplicate suppressed.`,
              timestamp: new Date().toLocaleTimeString()
            });
          } else {
            setFeedback({
              productId: product.id,
              type: 'TRIGGER_DEMAND_SPIKE',
              title: 'DEMAND_SPIKE Trigger Fired',
              message: `Demand velocity surged to ${updated.demandVelocity.toFixed(1)} (exceeds spike threshold ${spikeThreshold.toFixed(1)}). Agentic AI is evaluating price optimization...`,
              timestamp: new Date().toLocaleTimeString()
            });
            startSuggestionPolling(initialPricingCount, initialReorderCount);
          }
        } else {
          setFeedback({
            productId: product.id,
            type: 'NO_TRIGGER',
            title: 'Sale Processed — Normal Inventory',
            message: `Sale recorded (${quantity} unit). Stock is ${updated.stockLevel} (above threshold ${updated.reorderThreshold}) and velocity is ${updated.demandVelocity.toFixed(1)} (under spike threshold ${spikeThreshold.toFixed(1)}). No trigger condition met.`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } catch (err: any) {
        setFeedback({
          productId: product.id,
          type: 'STOCK_EXHAUSTED',
          title: 'Transaction Rejected',
          message: err.message || 'Insufficient stock to fulfill sale.',
          timestamp: new Date().toLocaleTimeString()
        });
      } finally {
        setActionLoading(false);
      }
    },
    [product, categoryAverageDemand, pricingSuggestions, reorderSuggestions, startSuggestionPolling]
  );

  // Update stock level
  const updateStock = useCallback(
    async (newStock: number) => {
      if (!product) return;
      setActionLoading(true);
      try {
        const initialPricingCount = pricingSuggestions.length;
        const initialReorderCount = reorderSuggestions.length;

        const updated = await api.updateStock(product.id, newStock);
        setProduct(updated);

        if (updated.stockLevel < updated.reorderThreshold) {
          setFeedback({
            productId: product.id,
            type: 'TRIGGER_INVENTORY_LOW',
            title: 'INVENTORY_LOW Trigger Fired',
            message: `Stock updated to ${updated.stockLevel} (below threshold ${updated.reorderThreshold}). Agentic AI evaluating replenishment and pricing...`,
            timestamp: new Date().toLocaleTimeString()
          });
          startSuggestionPolling(initialPricingCount, initialReorderCount);
        } else {
          setFeedback({
            productId: product.id,
            type: 'NO_TRIGGER',
            title: 'Stock Updated',
            message: `Stock level set to ${newStock} units. Inventory remains healthy.`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } catch (err: any) {
        alert(err.message || 'Failed to update stock');
      } finally {
        setActionLoading(false);
      }
    },
    [product, pricingSuggestions.length, reorderSuggestions.length, startSuggestionPolling]
  );

  // Accept or reject suggestions
  const handleSuggestionAction = useCallback(
    async (id: number, type: 'pricing' | 'reorder', status: 'ACCEPTED' | 'REJECTED') => {
      try {
        if (type === 'pricing') {
          await api.updatePricingSuggestion(id, status);
        } else {
          await api.updateReorderSuggestion(id, status);
        }
        await loadProductData();
      } catch (err: any) {
        alert(err.message || `Failed to update ${type} suggestion`);
      }
    },
    [loadProductData]
  );

  return {
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
    clearFeedback: () => setFeedback(null),
    refreshData: loadProductData
  };
}
