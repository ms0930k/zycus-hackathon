import React, { useMemo } from 'react';
import type { PricingSuggestion, ReorderSuggestion, SaleRecord } from '../../types';

interface DecisionTimelineProps {
  sales: SaleRecord[];
  pricingSuggestions: PricingSuggestion[];
  reorderSuggestions: ReorderSuggestion[];
  currentStock: number;
  reorderThreshold: number;
  currentPrice: number;
}

interface TimelineEvent {
  id: string;
  stage: 'EVENT' | 'SIGNAL' | 'TRIGGER' | 'RECOMMENDATION' | 'DECISION' | 'STATE_CHANGE';
  stageColor: string;
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
}

export const DecisionTimeline: React.FC<DecisionTimelineProps> = ({
  sales,
  pricingSuggestions,
  reorderSuggestions,
  currentPrice
}) => {
  const events = useMemo(() => {
    const list: TimelineEvent[] = [];

    // 1. Add sales events
    sales.forEach((s) => {
      list.push({
        id: `sale-${s.id}`,
        stage: 'EVENT',
        stageColor: 'border-emerald text-emerald',
        title: `Simulated Sale (${s.quantity} unit)`,
        description: `Customer transaction fulfilled. Remaining stock: ${s.resultingStock} units, demand velocity: ${s.resultingDemandVelocity.toFixed(1)}/day.`,
        timestamp: s.timestamp,
        badge: `-${s.quantity} Unit`
      });

      // If this sale caused stock to dip below threshold
      if (s.resultingStock < 15) {
        list.push({
          id: `signal-${s.id}`,
          stage: 'SIGNAL',
          stageColor: 'border-amber text-amber',
          title: 'Stock Depleted Below Threshold',
          description: `Inventory level (${s.resultingStock}) fell beneath automated safety threshold. Agentic event listener notified.`,
          timestamp: s.timestamp
        });
      }
    });

    // 2. Add recommendations and their decision lifecycle
    pricingSuggestions.forEach((p) => {
      // Trigger event
      list.push({
        id: `trigger-p-${p.id}`,
        stage: 'TRIGGER',
        stageColor: 'border-rose text-rose',
        title: `${p.triggerReason} Trigger Activated`,
        description: `Agentic listener identified condition: ${p.triggerReason}. Dispatched context to LiteLLM Commerce Advisor.`,
        timestamp: p.createdAt,
        badge: p.triggerReason
      });

      // Recommendation event
      list.push({
        id: `rec-p-${p.id}`,
        stage: 'RECOMMENDATION',
        stageColor: 'border-purple text-purple',
        title: `Dynamic Pricing Recommendation Generated`,
        description: `AI proposed ${p.direction} price from $${p.currentPrice.toFixed(2)} to $${p.recommendedPrice.toFixed(2)} (${(p.confidence * 100).toFixed(0)}% confidence).`,
        timestamp: p.createdAt,
        badge: `$${p.currentPrice.toFixed(2)} → $${p.recommendedPrice.toFixed(2)}`
      });

      // Decision event if resolved
      if (p.status === 'ACCEPTED') {
        list.push({
          id: `dec-p-${p.id}`,
          stage: 'DECISION',
          stageColor: 'border-emerald text-emerald',
          title: `Pricing Recommendation Approved`,
          description: `Merchandiser approved proposed price. Catalog price updated to $${p.recommendedPrice.toFixed(2)}.`,
          timestamp: p.updatedAt || p.createdAt,
          badge: 'ACCEPTED'
        });

        list.push({
          id: `state-p-${p.id}`,
          stage: 'STATE_CHANGE',
          stageColor: 'border-blue text-blue',
          title: `Product Price Synchronized`,
          description: `Live selling price set to $${p.recommendedPrice.toFixed(2)}. Active status confirmed.`,
          timestamp: p.updatedAt || p.createdAt
        });
      } else if (p.status === 'REJECTED') {
        list.push({
          id: `dec-p-${p.id}`,
          stage: 'DECISION',
          stageColor: 'border-slate text-slate-400',
          title: `Pricing Recommendation Dismissed`,
          description: `Merchandiser rejected proposal. Product remains at $${p.currentPrice.toFixed(2)}.`,
          timestamp: p.updatedAt || p.createdAt,
          badge: 'REJECTED'
        });
      }
    });

    reorderSuggestions.forEach((r) => {
      list.push({
        id: `rec-r-${r.id}`,
        stage: 'RECOMMENDATION',
        stageColor: 'border-blue text-blue',
        title: `Inventory Replenishment Proposed`,
        description: `AI recommended purchase order of +${r.recommendedQuantity} units with ~${r.suggestedLeadTimeDays} days lead time.`,
        timestamp: r.createdAt,
        badge: `+${r.recommendedQuantity} units`
      });

      if (r.status === 'ACCEPTED') {
        list.push({
          id: `dec-r-${r.id}`,
          stage: 'DECISION',
          stageColor: 'border-emerald text-emerald',
          title: `Reorder Order Placed`,
          description: `Merchandiser approved purchase order (+${r.recommendedQuantity} units).`,
          timestamp: r.updatedAt || r.createdAt,
          badge: 'ACCEPTED'
        });
      }
    });

    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [sales, pricingSuggestions, reorderSuggestions, currentPrice]);

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div>
          <h3 className="analytics-title">End-to-End Decision Narrative</h3>
          <p className="analytics-subtitle">
            Chronological pipeline: Cause (Sale) ➔ Signal ➔ Agent Trigger ➔ AI Recommendation ➔ Human Approval ➔ State Change
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="chart-empty-state">
          <div className="empty-icon">⏳</div>
          <h4>No Events in Timeline</h4>
          <p>Simulate a sale or review pending recommendations to see the live decision narrative evolve.</p>
        </div>
      ) : (
        <div className="timeline-pipeline">
          {events.map((evt, idx) => (
            <div key={evt.id} className="timeline-step">
              <div className="timeline-track">
                <div className={`timeline-node ${evt.stageColor}`}></div>
                {idx < events.length - 1 && <div className="timeline-line"></div>}
              </div>

              <div className="timeline-content">
                <div className="timeline-header-line">
                  <span className={`timeline-stage-tag ${evt.stageColor}`}>{evt.stage}</span>
                  <span className="timeline-time">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {evt.badge && <span className="timeline-badge">{evt.badge}</span>}
                </div>
                <h4 className="timeline-title">{evt.title}</h4>
                <p className="timeline-desc">{evt.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
