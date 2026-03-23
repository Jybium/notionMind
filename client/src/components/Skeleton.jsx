import React from 'react';
import './Skeleton.css';

/**
 * Reusable Skeleton Loader component
 * @param {string} width - CSS width (e.g. '100%', '200px')
 * @param {string} height - CSS height (e.g. '16px', '2rem')
 * @param {string} borderRadius - Optional border radius (e.g. '4px', '50%')
 * @param {string} className - Optional extra classes
 */
const Skeleton = ({ width, height, borderRadius, className = '' }) => {
  const style = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: borderRadius || '8px'
  };

  return (
    <div 
      className={`skeleton-shimmer ${className}`} 
      style={style}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
