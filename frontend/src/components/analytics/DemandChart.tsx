import React, { useState, useMemo } from 'react';
import type { SaleRecord } from '../../types';

interface DemandChartProps {
  currentVelocity: number;
  categoryAverage: number;
  category: string;
  sales: SaleRecord[];
  createdAt: string;
}

export const DemandChart: React.FC<DemandChartProps> = ({
  currentVelocity,
  categoryAverage,
  category,
  sales,
  createdAt
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const spikeThreshold = categoryAverage > 0 ? categoryAverage * 3.0 : 0;
  const isSpike = currentVelocity > spikeThreshold && spikeThreshold > 0;

  // Construct trajectory points
  const points = useMemo(() => {
    const pts: { timestamp: string; velocity: number; isSpike: boolean; label: string }[] = [];

    if (sales.length === 0) {
      pts.push({
        timestamp: createdAt,
        velocity: currentVelocity,
        isSpike: currentVelocity > spikeThreshold && spikeThreshold > 0,
        label: 'Current Velocity'
      });
      return pts;
    }

    const firstSale = sales[0];
    const initialEst = Math.max(0, firstSale.resultingDemandVelocity - 1.0);
    pts.push({
      timestamp: createdAt || firstSale.timestamp,
      velocity: initialEst,
      isSpike: initialEst > spikeThreshold && spikeThreshold > 0,
      label: 'Initial Velocity'
    });

    sales.forEach((s) => {
      const v = s.resultingDemandVelocity;
      pts.push({
        timestamp: s.timestamp,
        velocity: v,
        isSpike: v > spikeThreshold && spikeThreshold > 0,
        label: `Sale (+1.0 vel)`
      });
    });

    return pts;
  }, [sales, currentVelocity, spikeThreshold, createdAt]);

  const width = 600;
  const height = 220;
  const padding = { top: 25, right: 40, bottom: 35, left: 45 };

  const maxVel = Math.max(spikeThreshold * 1.3, ...points.map((p) => p.velocity), 5);
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const categoryY = categoryAverage > 0 ? padding.top + plotH - (categoryAverage / maxVel) * plotH : -999;
  const spikeY = spikeThreshold > 0 ? padding.top + plotH - (spikeThreshold / maxVel) * plotH : -999;

  const plottedPoints = useMemo(() => {
    if (points.length === 1) {
      const y = padding.top + plotH - (points[0].velocity / maxVel) * plotH;
      return [{ x: width / 2, y, ...points[0] }];
    }

    return points.map((p, idx) => {
      const x = padding.left + (idx / (points.length - 1)) * plotW;
      const y = padding.top + plotH - (p.velocity / maxVel) * plotH;
      return { x, y, ...p };
    });
  }, [points, maxVel, plotW, plotH]);

  const pathD = useMemo(() => {
    if (plottedPoints.length < 2) return '';
    return plottedPoints.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`), '');
  }, [plottedPoints]);

  const activePoint = hoveredIdx !== null ? plottedPoints[hoveredIdx] : null;

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div>
          <h3 className="analytics-title">Demand Velocity & Category Benchmark</h3>
          <p className="analytics-subtitle">
            Dynamic sales velocity compared with peer average in {category}
          </p>
        </div>
        <div className="legend-pills">
          <span className="legend-item text-purple">
            <span className="legend-dot bg-purple"></span> Velocity
          </span>
          <span className="legend-item text-blue">
            <span className="legend-dot bg-blue"></span> Category Avg ({categoryAverage.toFixed(1)})
          </span>
          <span className="legend-item text-rose">
            <span className="legend-dot bg-rose"></span> Spike Limit ({spikeThreshold.toFixed(1)})
          </span>
        </div>
      </div>

      <div className="analytics-kpi-row">
        <div className="kpi-mini">
          <span className="kpi-mini-label">Current Velocity</span>
          <span className={`kpi-mini-val ${isSpike ? 'text-rose' : 'text-purple'}`}>
            {currentVelocity.toFixed(1)} /day
          </span>
        </div>
        <div className="kpi-mini">
          <span className="kpi-mini-label">{category} Avg</span>
          <span className="kpi-mini-val text-blue">{categoryAverage.toFixed(1)} /day</span>
        </div>
        <div className="kpi-mini">
          <span className="kpi-mini-label">Spike Ratio</span>
          <span className={`kpi-mini-val ${isSpike ? 'text-rose' : 'text-emerald'}`}>
            {categoryAverage > 0 ? `${(currentVelocity / categoryAverage).toFixed(1)}x` : '1.0x'}
          </span>
        </div>
      </div>

      <div className="chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="responsive-svg">
          <defs>
            <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
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
          <text x={padding.left - 8} y={padding.top + 5} fill="#64748b" fontSize="10" textAnchor="end">{maxVel.toFixed(0)}</text>
          <text x={padding.left - 8} y={height - padding.bottom} fill="#64748b" fontSize="10" textAnchor="end">0</text>

          {/* Category Average Reference Line */}
          {categoryY > 0 && (
            <>
              <line
                x1={padding.left}
                y1={categoryY}
                x2={width - padding.right}
                y2={categoryY}
                stroke="#60a5fa"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x={width - padding.right} y={categoryY - 4} fill="#60a5fa" fontSize="9" textAnchor="end">
                Category Avg: {categoryAverage.toFixed(1)}
              </text>
            </>
          )}

          {/* Spike Threshold Reference Line (3x category avg) */}
          {spikeY > 0 && (
            <>
              <line
                x1={padding.left}
                y1={spikeY}
                x2={width - padding.right}
                y2={spikeY}
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <text x={width - padding.right} y={spikeY - 4} fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="end">
                3x Spike Trigger: {spikeThreshold.toFixed(1)}
              </text>
            </>
          )}

          {/* Area Fill */}
          {plottedPoints.length > 1 && (
            <path
              d={`${pathD} L ${plottedPoints[plottedPoints.length - 1].x},${height - padding.bottom} L ${plottedPoints[0].x},${height - padding.bottom} Z`}
              fill="url(#demandGrad)"
            />
          )}

          {/* Velocity Line Path */}
          {pathD && <path d={pathD} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Points */}
          {plottedPoints.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 6 : 4.5}
                fill={pt.isSpike ? '#f43f5e' : '#a855f7'}
                stroke="#090d16"
                strokeWidth="2"
                className="chart-dot"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* DEMAND_SPIKE Annotation */}
              {pt.isSpike && (
                <g transform={`translate(${pt.x - 38}, ${Math.max(pt.y - 28, padding.top)})`}>
                  <rect width="76" height="18" rx="4" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
                  <text x="38" y="12" fill="#ffe4e6" fontSize="8" fontWeight="bold" textAnchor="middle">
                    🔥 DEMAND_SPIKE
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
              <span>Demand Velocity:</span>
              <strong className={activePoint.isSpike ? 'text-rose' : 'text-purple'}>
                {activePoint.velocity.toFixed(1)} /day
              </strong>
            </div>
            <div className="tooltip-row">
              <span>Category Benchmark:</span>
              <strong>{categoryAverage.toFixed(1)} /day</strong>
            </div>
            <div className="tooltip-row">
              <span>Ratio vs Average:</span>
              <strong className={activePoint.isSpike ? 'text-rose' : 'text-emerald'}>
                {categoryAverage > 0 ? `${(activePoint.velocity / categoryAverage).toFixed(1)}x` : '1.0x'}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
