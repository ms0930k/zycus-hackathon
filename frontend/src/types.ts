export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  currentPrice: number;
  stockLevel: number;
  reorderThreshold: number;
  demandVelocity: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingSuggestion {
  id: number;
  productId: number;
  currentPrice: number;
  recommendedPrice: number;
  direction: 'INCREASE' | 'DECREASE' | 'HOLD';
  confidence: number;
  reasoning: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  triggerReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReorderSuggestion {
  id: number;
  productId: number;
  currentStock: number;
  recommendedQuantity: number;
  suggestedLeadTimeDays: number;
  confidence: number;
  reasoning: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  triggerReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleRecord {
  id: string;
  productId: number;
  quantity: number;
  price: number;
  timestamp: string;
  resultingStock: number;
  resultingDemandVelocity: number;
}

export interface SimulationFeedback {
  productId: number;
  type: 'TRIGGER_INVENTORY_LOW' | 'TRIGGER_DEMAND_SPIKE' | 'DUPLICATE_PENDING' | 'NO_TRIGGER' | 'STOCK_EXHAUSTED';
  title: string;
  message: string;
  timestamp: string;
}

