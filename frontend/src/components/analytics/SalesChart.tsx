import React, { useState, useMemo } from 'react';
import type { SaleRecord } from '../../types';

interface SalesChartProps {
  sales: SaleRecord[];
  onSimulateSale?: () => void;
  isLoading?: boolean;
}

type RangeOption = '24H' | '7D' | '30D' | 'ALL';

export const SalesChart: React.FC<SalesChartProps> = ({ sales, onSimulateSale, isLoading }) => {
  const [selectedRange, setSelectedRange] = useState<RangeOption>('ALL');
  const [hoveredPoint, setHoveredPoint] = useState<SaleRecord | null>(null);

  // Filter sales based on range
  const filteredSales = useMemo(() => {
    if (selectedRange === 'ALL') return sales;
    const now = Date.now();
    const rangeMs =
      selectedRange === '24H'
        ? 24 * 60 * 60 * 1000
        : selectedRange === '7D'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    return sales.filter((s) => now - new Date(s.timestamp).getTime() <= rangeMs);
  }, [sales, selectedRange]);

  const totalQuantity = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.quantity, 0);
  }, [filteredSales]);

  // Chart coordinates calculation
  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const plotPoints = useMemo(() => {
    if (filteredSales.length === 0) return [];
    if (filteredSales.length === 1) {
      return [{ x: width / 2, y: height / 2, data: filteredSales[0] }];
    }

    const minTime = new Date(filteredSales[0].timestamp).getTime();
    const maxTime = new Date(filteredSales[filteredSales.length - 1].timestamp).getTime();
    const timeSpan = Math.max(maxTime - minTime, 1);

    const maxQty = Math.max(...filteredSales.map((s) => s.quantity), 3);
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    return filteredSales.map((s, idx) => {
      const t = new Date(s.timestamp).getTime();
      const x = padding.left + ((t - minTime) / timeSpan) * plotW;
      const y = padding.top + plotH - (s.quantity / maxQty) * plotH;
      return { x: isNaN(x) ? padding.left + (idx / (filteredSales.length - 1)) * plotW : x, y, data: s };
    });
  }, [filteredSales]);

  const pathD = useMemo(() => {
    if (plotPoints.length < 2) return '';
    return plotPoints.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), '');
  }, [plotPoints]);

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div>
          <h3 className="analytics-title">Sales & Transaction Activity</h3>
          <p className="analytics-subtitle">Real-time simulated sale orders and fulfillment volume</p>
        </div>
        <div className="chart-controls">
          <div className="range-pills">
            {(['24H', '7D', '30D', 'ALL'] as RangeOption[]).map((r) => (
              <button
                key={r}
                className={`range-pill ${selectedRange === r ? 'active' : ''}`}
                onClick={() => setSelectedRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="analytics-kpi-row">
        <div className="kpi-mini">
          <span className="kpi-mini-label">Total Units Sold</span>
          <span className="kpi-mini-val text-emerald">{totalQuantity}</span>
        </div>
        <div className="kpi-mini">
          <span className="kpi-mini-label">Transactions</span>
          <span className="kpi-mini-val">{filteredSales.length}</span>
        </div>
        <div className="kpi-mini">
          <span className="kpi-mini-label">Velocity Impact</span>
          <span className="kpi-mini-val">+{filteredSales.length * 1.0} vel</span>
        </div>
      </div>

      {filteredSales.length === 0 ? (
        <div className="chart-empty-state">
          <div className="empty-icon">📈</div>
          <h4>No Sales Logged Yet</h4>
          <p>This product has no recorded sale transactions in the selected range.</p>
          {onSimulateSale && (
            <button className="btn btn-primary btn-sm mt-3" onClick={onSimulateSale} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Simulate Sale Now (-1 Unit)'}
            </button>
          )}
        </div>
      ) : (
        <div className="chart-wrapper">
          <svg viewBox={`0 0 ${width} ${height}`} className="responsive-svg">
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1={padding.left} y1={height / 2} x2={width - padding.right} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#334155"
            />

            {/* Axes labels */}
            <text x={padding.left - 8} y={padding.top + 5} fill="#64748b" fontSize="10" textAnchor="end">Max</text>
            <text x={padding.left - 8} y={height - padding.bottom} fill="#64748b" fontSize="10" textAnchor="end">0</text>
            <text x={padding.left} y={height - 10} fill="#64748b" fontSize="10">Earliest</text>
            <text x={width - padding.right} y={height - 10} fill="#64748b" fontSize="10" textAnchor="end">Latest</text>

            {/* Area Fill */}
            {plotPoints.length > 1 && (
              <path
                d={`${pathD} L ${plotPoints[plotPoints.length - 1].x},${height - padding.bottom} L ${plotPoints[0].x},${height - padding.bottom} Z`}
                fill="url(#salesGrad)"
              />
            )}

            {/* Line Path */}
            {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />}

            {/* Points */}
            {plotPoints.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={hoveredPoint?.id === pt.data.id ? 6 : 4}
                fill="#10b981"
                stroke="#090d16"
                strokeWidth="2"
                className="chart-dot"
                onMouseEnter={() => setHoveredPoint(pt.data)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>

          {/* Tooltip */}
          {hoveredPoint && (
            <div className="chart-tooltip">
              <div className="tooltip-title">{new Date(hoveredPoint.timestamp).toLocaleTimeString()}</div>
              <div className="tooltip-row">
                <span>Quantity Sold:</span>
                <strong>{hoveredPoint.quantity} unit(s)</strong>
              </div>
              <div className="tooltip-row">
                <span>Stock After:</span>
                <strong>{hoveredPoint.resultingStock} units</strong>
              </div>
              <div className="tooltip-row">
                <span>Demand Velocity:</span>
                <strong>{hoveredPoint.resultingDemandVelocity.toFixed(1)}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
