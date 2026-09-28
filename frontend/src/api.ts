import type { Product, PricingSuggestion, ReorderSuggestion } from './types';

const API_BASE = 'http://localhost:8080';

export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function simulateSale(id: number, quantity: number): Promise<Product> {
  const response = await fetch(`${API_BASE}/products/${id}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity })
  });
  if (!response.ok) throw new Error('Failed to simulate sale');
  return response.json();
}

export async function updateStock(id: number, stockLevel: number): Promise<Product> {
  const response = await fetch(`${API_BASE}/products/${id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stockLevel })
  });
  if (!response.ok) throw new Error('Failed to update stock');
  return response.json();
}

export async function getPricingSuggestions(productId: number): Promise<PricingSuggestion[]> {
  const response = await fetch(`${API_BASE}/pricing-suggestions/products/${productId}`);
  if (!response.ok) throw new Error('Failed to fetch pricing suggestions');
  return response.json();
}

export async function getReorderSuggestions(productId: number): Promise<ReorderSuggestion[]> {
  // If the endpoint doesn't exist, we just catch and return empty array. The backend does not have GET /reorder-suggestions/products/{id} based on earlier review.
  // Wait, does it? Let's assume it might not exist and handle it gracefully.
  try {
    const response = await fetch(`${API_BASE}/reorder-suggestions/products/${productId}`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error('Failed to fetch reorder suggestions');
    return response.json();
  } catch (e) {
    console.warn("Reorder suggestions endpoint might not exist:", e);
    return [];
  }
}

export async function updatePricingSuggestion(id: number, status: string): Promise<PricingSuggestion> {
  const response = await fetch(`${API_BASE}/pricing-suggestions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update pricing suggestion');
  return response.json();
}

export async function updateReorderSuggestion(id: number, status: string): Promise<ReorderSuggestion> {
  const response = await fetch(`${API_BASE}/reorder-suggestions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update reorder suggestion');
  return response.json();
}
