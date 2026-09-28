import React from 'react';

export const LoadingState: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner-ring" />
      <h2 className="loading-title">Loading StockPulse Intelligence...</h2>
      <p className="loading-subtitle">Synchronizing product catalog, inventory levels & market velocity</p>
    </div>
  );
};
