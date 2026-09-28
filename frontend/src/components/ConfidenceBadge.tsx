import React from 'react';

interface ConfidenceBadgeProps {
  confidence: number;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence }) => {
  const percentage = Math.round((confidence || 0) * 100);

  const getConfidenceLevel = (val: number) => {
    if (val >= 85) return 'confidence-high';
    if (val >= 75) return 'confidence-medium';
    return 'confidence-normal';
  };

  return (
    <span className={`confidence-badge ${getConfidenceLevel(percentage)}`} title="AI / Rule Engine Confidence Score">
      <span className="confidence-dot" />
      {percentage}% Confidence
    </span>
  );
};
