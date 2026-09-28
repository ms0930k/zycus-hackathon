import React, { useState, useMemo } from 'react';
import type { PricingSuggestion } from '../../types';

interface PriceHistoryChartProps {
  currentPrice: number;
  createdAt: string;
  pricingSuggestions: PricingSuggestion[];
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  currentPrice,
  createdAt,
  pricingSuggestions
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Derive price sequence from accepted suggestions
  const acceptedSuggestions = useMemo(() => {
    return pricingSuggestions
      .filter((s) => s.status === 'ACCEPTED')
      .sort((a, b) => new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime());
  }, [pricingSuggestions]);

  const pricePoints = useMemo(() => {
    const pts: {
      timestamp: string;
      price: number;
      oldPrice?: number;
      label: string;
      trigger?: string;
      isAcceptedChange?: boolean;
    }[] = [];

    if (acceptedSuggestions.length === 0) {
      pts.push({
        timestamp: createdAt,
        price: currentPrice,
        label: 'Initial Catalog Price'
      });
      pts.push({
        timestamp: new Date().toISOString(),
        price: currentPrice,
        label: 'Current Active Price'
      });
      return pts;
    }

    // Earliest recorded baseline before first accepted suggestion
    const firstAcc = acceptedSuggestions[0];
    pts.push({
      timestamp: createdAt || firstAcc.createdAt,
      price: firstAcc.currentPrice,
      label: 'Initial Baseline Price'
    });

    acceptedSuggestions.forEach((s) => {
      pts.push({
        timestamp: s.updatedAt || s.createdAt,
        price: s.recommendedPrice,
        oldPrice: s.currentPrice,
        label: `Price Accepted ($${s.currentPrice.toFixed(2)} → $${s.recommendedPrice.toFixed(2)})`,
        trigger: s.triggerReason,
        isAcceptedChange: true
      });
    });

    return pts;
  }, [acceptedSuggestions, currentPrice, createdAt]);

  const width = 600;
  const height = 220;
  const padding = { top: 30, right: 50, bottom: 35, left: 55 };

  const minPrice = Math.max(0, Math.min(...pricePoints.map((p) => p.price)) * 0.85);
  const maxPrice = Math.max(...pricePoints.map((p) => p.price), currentPrice) * 1.15;
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const plottedPoints = useMemo(() => {
    if (pricePoints.length === 1) {
      const y = padding.top + plotH - ((pricePoints[0].price - minPrice) / (maxPrice - minPrice)) * plotH;
      return [{ x: width / 2, y, ...pricePoints[0] }];
    }

    return pricePoints.map((p, idx) => {
      const x = padding.left + (idx / (pricePoints.length - 1)) * plotW;
      const y = padding.top + plotH - ((p.price - minPrice) / (maxPrice - minPrice)) * plotH;
      return { x, y, ...p };
    });
  }, [pricePoints, minPrice, maxPrice, plotW, plotH]);

  const pathD = useMemo(() => {
    if (plottedPoints.length < 2) return '';
    return plottedPoints.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), '');
  }, [plottedPoints]);

  const activePoint = hoveredIdx !== null ? plottedPoints[hoveredIdx] : null;

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div>
          <h3 className="analytics-title">Price Adjustments & Acceptance Ledger</h3>
          <p className="analytics-subtitle">Chronological record of approved dynamic pricing recommendations</p>
        </div>
        <div className="legend-pills">
          <span className="legend-item text-emerald">
            <span className="legend-dot bg-emerald"></span> Price ($)
          </span>
          <span className="legend-item text-blue">
            <span className="legend-dot bg-blue"></span> Human Approved
          </span>
        </div>
      </div>

      <div className="analytics-kpi-row">
        <div className="kpi-mini">
          <span className="kpi-mini-label">Active Selling Price</span>
          <span className="kpi-mini-val text-emerald">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="kpi-mini">
          <span className="kpi-mini-label">Accepted Adjustments</span>
          <span className="kpi-mini-val">{acceptedSuggestions.length}</span>
        </div>
        <div className="kpi-mini">
          <span className="kpi-mini-label">Pending Reviews</span>
          <span className="kpi-mini-val text-amber">
            {pricingSuggestions.filter((s) => s.status === 'PENDING').length}
          </span>
        </div>
      </div>

      <div className="chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="responsive-svg">
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#1e293b" strokeDasharray="3 3" />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#334155"
          />

          {/* Y Axis Labels */}
          <text x={padding.left - 8} y={padding.top + 5} fill="#64748b" fontSize="10" textAnchor="end">
            ${maxPrice.toFixed(2)}
          </text>
          <text x={padding.left - 8} y={height - padding.bottom} fill="#64748b" fontSize="10" textAnchor="end">
            ${minPrice.toFixed(2)}
          </text>

          {/* Area Fill */}
          {plottedPoints.length > 1 && (
            <path
              d={`${pathD} L ${plottedPoints[plottedPoints.length - 1].x},${height - padding.bottom} L ${plottedPoints[0].x},${height - padding.bottom} Z`}
              fill="url(#priceGrad)"
            />
          )}

          {/* Line */}
          {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Points */}
          {plottedPoints.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 6.5 : pt.isAcceptedChange ? 5.5 : 4}
                fill={pt.isAcceptedChange ? '#38bdf8' : '#10b981'}
                stroke="#090d16"
                strokeWidth="2"
                className="chart-dot"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* Price Callout */}
              <text x={pt.x} y={pt.y - 10} fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">
                ${pt.price.toFixed(2)}
              </text>

              {/* Event Badge */}
              {pt.isAcceptedChange && (
                <g transform={`translate(${pt.x - 36}, ${Math.max(pt.y - 32, padding.top - 8)})`}>
                  <rect width="72" height="16" rx="3" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" />
                  <text x="36" y="11" fill="#bae6fd" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                    ✓ ACCEPTED
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {activePoint && (
          <div className="chart-tooltip">
            <div className="tooltip-title">{activePoint.label}</div>
            <div className="tooltip-row">
              <span>Price:</span>
              <strong className="text-emerald">${activePoint.price.toFixed(2)}</strong>
            </div>
            {activePoint.oldPrice !== undefined && (
              <div className="tooltip-row">
                <span>Delta:</span>
                <strong className={activePoint.price >= activePoint.oldPrice ? 'text-emerald' : 'text-rose'}>
                  {activePoint.price >= activePoint.oldPrice ? '+' : ''}
                  ${(activePoint.price - activePoint.oldPrice).toFixed(2)} (
                  {(((activePoint.price - activePoint.oldPrice) / activePoint.oldPrice) * 100).toFixed(1)}%)
                </strong>
              </div>
            )}
            {activePoint.trigger && (
              <div className="tooltip-row">
                <span>Trigger Reason:</span>
                <span className="badge-inline">{activePoint.trigger}</span>
              </div>
            )}
            <div className="tooltip-row">
              <span>Timestamp:</span>
              <span>{new Date(activePoint.timestamp).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
