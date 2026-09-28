import React from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionText,
  onAction
}) => {
  return (
    <div className="empty-state-box">
      <div className="empty-state-icon">📦</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {actionText && onAction && (
        <button className="btn btn-outline" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};
