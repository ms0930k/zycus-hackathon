import React from 'react';

interface TriggerBadgeProps {
  reason: string;
}

export const TriggerBadge: React.FC<TriggerBadgeProps> = ({ reason }) => {
  const getBadgeConfig = (r: string) => {
    switch (r?.toUpperCase()) {
      case 'INVENTORY_LOW':
        return {
          label: '⚠️ Low Stock Signal',
          className: 'trigger-badge inventory-low'
        };
      case 'DEMAND_SPIKE':
        return {
          label: '🔥 Demand Surge',
          className: 'trigger-badge demand-spike'
        };
      case 'MANUAL':
        return {
          label: '⚡ Manual Review',
          className: 'trigger-badge manual'
        };
      default:
        return {
          label: `📌 ${r || 'Signal'}`,
          className: 'trigger-badge default'
        };
    }
  };

  const config = getBadgeConfig(reason);

  return (
    <span className={config.className} title={`Trigger context: ${reason}`}>
      {config.label}
    </span>
  );
};
