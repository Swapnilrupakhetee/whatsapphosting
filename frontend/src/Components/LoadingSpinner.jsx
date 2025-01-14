import React from 'react';
import '../Styles/Loading.css';

const LoadingSpinner = ({ size = 'md', color = 'default', text }) => {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
  const colorClass = color === 'white' ? 'spinner-white' : '';
  const textColorClass = color === 'white' ? 'loading-text-white' : '';

  return (
    <div className="loader">
      <div className={`spinner ${sizeClass} ${colorClass}`} />
      {text && <span className={`loading-text ${textColorClass}`}>{text}</span>}
    </div>
  );
};

export default LoadingSpinner;