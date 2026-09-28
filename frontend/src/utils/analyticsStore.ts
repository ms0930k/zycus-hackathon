import type { SaleRecord } from '../types';

const STORAGE_KEY = 'stockpulse_sales_history_v1';

export const analyticsStore = {
  getSales(productId?: number): SaleRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const all: SaleRecord[] = JSON.parse(raw);
      if (productId !== undefined) {
        return all.filter((s) => s.productId === productId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
      return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch {
      return [];
    }
  },

  recordSale(
    productId: number,
    quantity: number,
    price: number,
    resultingStock: number,
    resultingDemandVelocity: number
  ): SaleRecord {
    const sale: SaleRecord = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId,
      quantity,
      price,
      timestamp: new Date().toISOString(),
      resultingStock,
      resultingDemandVelocity
    };

    try {
      const existing = analyticsStore.getSales();
      const updated = [...existing, sale];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist sale to localStorage', e);
    }

    return sale;
  },

  clearSales(productId?: number) {
    try {
      if (productId === undefined) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        const existing = analyticsStore.getSales();
        const filtered = existing.filter((s) => s.productId !== productId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Failed to clear sales', e);
    }
  }
};
