import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageContainerProps {
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ breadcrumbs, children }) => {
  return (
    <div className="page-container">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="breadcrumb-segment">
              {idx > 0 && <span className="breadcrumb-separator">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="breadcrumb-link">
                  {crumb.label}
                </Link>
              ) : (
                <span className="breadcrumb-current">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <main className="page-content">{children}</main>
    </div>
  );
};
