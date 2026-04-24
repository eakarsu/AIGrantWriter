import React from 'react';
import './LoadingSkeleton.css';

const LoadingSkeleton = ({ type = 'table', rows = 5 }) => {
  if (type === 'cards') {
    return (
      <div className="skeleton-cards">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-subtitle" />
            <div className="skeleton-line skeleton-body" />
            <div className="skeleton-line skeleton-body short" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-table">
      <div className="skeleton-header">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-line skeleton-th" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="skeleton-line skeleton-td" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
