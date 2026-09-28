import { useState, useRef, useEffect, useCallback } from 'react';
import * as api from '../api';
import type { PricingSuggestion, ReorderSuggestion } from '../types';

interface UseSuggestionPollingProps {
  onSuggestionsUpdated: (
    productId: number,
    pricing: PricingSuggestion[],
    reorder: ReorderSuggestion[],
    hasPending: boolean
  ) => void;
}

export function useSuggestionPolling({ onSuggestionsUpdated }: UseSuggestionPollingProps) {
  const [activePollingIds, setActivePollingIds] = useState<Set<number>>(new Set());
  const activeIntervals = useRef<Map<number, number>>(new Map());

  // Clean up all active intervals when component unmounts
  useEffect(() => {
    return () => {
      activeIntervals.current.forEach((intervalId) => clearInterval(intervalId));
      activeIntervals.current.clear();
    };
  }, []);

  const startPolling = useCallback(
    (productId: number) => {
      // Clear any existing polling for this product
      if (activeIntervals.current.has(productId)) {
        clearInterval(activeIntervals.current.get(productId));
        activeIntervals.current.delete(productId);
      }

      setActivePollingIds((prev) => {
        const next = new Set(prev);
        next.add(productId);
        return next;
      });

      let iterationCount = 0;
      const MAX_ITERATIONS = 5;
      const INTERVAL_MS = 2000;

      const intervalId = window.setInterval(async () => {
        iterationCount++;

        try {
          const [pricing, reorder] = await Promise.all([
            api.getPricingSuggestions(productId),
            api.getReorderSuggestions(productId)
          ]);

          const hasPending = [...pricing, ...reorder].some((s) => s.status === 'PENDING');

          onSuggestionsUpdated(productId, pricing, reorder, hasPending);

          // Stop if pending suggestion found or max iterations reached
          if (hasPending || iterationCount >= MAX_ITERATIONS) {
            clearInterval(intervalId);
            activeIntervals.current.delete(productId);
            setActivePollingIds((prev) => {
              const next = new Set(prev);
              next.delete(productId);
              return next;
            });
          }
        } catch (error) {
          console.error(`[POLLING] Error fetching suggestions for product ${productId}:`, error);
          clearInterval(intervalId);
          activeIntervals.current.delete(productId);
          setActivePollingIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
        }
      }, INTERVAL_MS);

      activeIntervals.current.set(productId, intervalId);
    },
    [onSuggestionsUpdated]
  );

  return {
    activePollingIds,
    startPolling
  };
}
