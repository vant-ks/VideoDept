import React from 'react';

/**
 * Floating reset button for development environments only
 * Opens the reset-app.html page with full reset options
 */
export const DevResetButton: React.FC = () => {
  const handleClick = () => {
    window.location.href = '/reset-app.html';
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="group fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 shadow-lg hover:scale-110 active:scale-95 hover:shadow-xl transition-all duration-200"
      title="Open Reset Panel (Dev Only)"
      >
        {/* Reset Icon */}
        <svg 
          className="w-7 h-7 text-white m-auto"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        
        {/* Tooltip on hover */}
        <div className="
          absolute bottom-full right-0 mb-2 px-3 py-1.5
          bg-gray-900 text-white text-xs rounded-lg
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200 pointer-events-none
          whitespace-nowrap
        ">
          Open Reset Panel
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>
  );
};
