import React, { useState, useMemo } from 'react';
import type { SaleRecord } from '../../types';

interface InventoryChartProps {
  currentStock: number;
  reorderThreshold: number;
  sales: SaleRecord[];
  createdAt: string;
}

export const InventoryChart: React.FC<InventoryChartProps> = ({
  currentStock,
  reorderThreshold,
  sales,
  createdAt
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Construct realistic historical stock sequence
  const stockPoints = useMemo(() => {
    const points: { timestamp: string; stock: number; isLow: boolean; label: string }[] = [];

    if (sales.length === 0) {
      // Show baseline and current
      points.push({
        timestamp: createdAt,
        stock: currentStock,
        isLow: currentStock < reorderThreshold,
        label: 'Current Status'
      });
      return points;
    }

    // Baseline point estimated before first sale
    const firstSale = sales[0];
    const initialEst = firstSale.resultingStock + firstSale.quantity;
    points.push({
      timestamp: createdAt || firstSale.timestamp,
      stock: initialEst,
      isLow: initialEst < reorderThreshold,
      label: 'Initial Stock'
    });

    sales.forEach((s) => {
      points.push({
        timestamp: s.timestamp,
        stock: s.resultingStock,
        isLow: s.resultingStock < reorderThreshold,
        label: `Sale (-${s.quantity})`
      });
    });

    return points;
  }, [sales, currentStock, reorderThreshold, createdAt]);

  const width = 600;
  const height = 220;
  const padding = { top: 25, right: 40, bottom: 35, left: 45 };

  const maxStock = Math.max(reorderThreshold * 2, ...stockPoints.map((p) => p.stock), 10);
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const thresholdY = padding.top + plotH - (reorderThreshold / maxStock) * plotH;

  const plottedPoints = useMemo(() => {
    if (stockPoints.length === 1) {
      const y = padding.top + plotH - (stockPoints[0].stock / maxStock) * plotH;
      return [{ x: width / 2, y, ...stockPoints[0] }];
    }

    return stockPoints.map((p, idx) => {
      const x = padding.left + (idx / (stockPoints.length - 1)) * plotW;
      const y = padding.top + plotH - (p.stock / maxStock) * plotH;
      return { x, y, ...p };
    });
  }, [stockPoints, maxStock, plotW, plotH]);

  const pathD = useMemo(() => {
    if (plottedPoints.length < 2) return '';
    return plottedPoints.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), '');
  }, [plottedPoints]);

  const activePoint = hoveredIdx !== null ? plottedPoints[hoveredIdx] : null;

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div>
          <h3 className="analytics-title">Inventory Health & Depletion Curve</h3>
          <p className="analytics-subtitle">Stock level trajectory relative to automated reorder threshold</p>
        </div>
        <div className="legend-pills">
          <span className="legend-item text-emerald">
            <span className="legend-dot bg-emerald"></span> Stock Level
          </span>
          <span className="legend-item text-amber">
            <span className="legend-dot bg-amber"></span> Threshold ({reorderThreshold}u)
          </span>
        </div>
      </div>

      <div className="analytics-kpi-row">
        <div className="kpi-mini">
          <span className="kpi-mini-label">Current Stock</span>
          <span className={`kpi-mini-val ${currentStock < reorderThreshold ? 'text-rose' : 'text-emerald'}`}>
            {currentStock} units
          </span>
        </div>
        <div className="kpi-mini">
          <span className="kpi-mini-label">Reorder Threshold</span>
          <span className="kpi-mini-val text-amber">{reorderThreshold} units</span>
        </div>
        <div className="kpi-mini">
          <span className="kpi-mini-label">Runway Buffer</span>
          <span className={`kpi-mini-val ${currentStock - reorderThreshold <= 0 ? 'text-rose' : 'text-emerald'}`}>
            {currentStock - reorderThreshold > 0 ? `+${currentStock - reorderThreshold} units` : `${currentStock - reorderThreshold} units`}
          </span>
        </div>
      </div>

      <div className="chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="responsive-svg">
          <defs>
            <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
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
          <text x={padding.left - 8} y={padding.top + 5} fill="#64748b" fontSize="10" textAnchor="end">{maxStock}</text>
          <text x={padding.left - 8} y={height - padding.bottom} fill="#64748b" fontSize="10" textAnchor="end">0</text>

          {/* Reorder Threshold Reference Line */}
          <line
            x1={padding.left}
            y1={thresholdY}
            x2={width - padding.right}
            y2={thresholdY}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <text x={width - padding.right} y={thresholdY - 5} fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="end">
            Threshold: {reorderThreshold}
          </text>

          {/* Area Fill */}
          {plottedPoints.length > 1 && (
            <path
              d={`${pathD} L ${plottedPoints[plottedPoints.length - 1].x},${height - padding.bottom} L ${plottedPoints[0].x},${height - padding.bottom} Z`}
              fill="url(#invGrad)"
            />
          )}

          {/* Stock Line Path */}
          {pathD && <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Event Points & Annotations */}
          {plottedPoints.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 6 : 4.5}
                fill={pt.isLow ? '#f43f5e' : '#38bdf8'}
                stroke="#090d16"
                strokeWidth="2"
                className="chart-dot"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* INVENTORY_LOW Badge annotation when crossed */}
              {pt.isLow && (
                <g transform={`translate(${pt.x - 42}, ${Math.max(pt.y - 28, padding.top)})`}>
                  <rect width="84" height="18" rx="4" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
                  <text x="42" y="12" fill="#ffe4e6" fontSize="8" fontWeight="bold" textAnchor="middle">
                    INVENTORY_LOW
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
              <span>Stock Level:</span>
              <strong className={activePoint.isLow ? 'text-rose' : 'text-emerald'}>
                {activePoint.stock} units
              </strong>
            </div>
            <div className="tooltip-row">
              <span>Threshold:</span>
              <strong>{reorderThreshold} units</strong>
            </div>
            <div className="tooltip-row">
              <span>Buffer Margin:</span>
              <strong className={activePoint.stock < reorderThreshold ? 'text-rose' : 'text-emerald'}>
                {activePoint.stock - reorderThreshold} units
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
