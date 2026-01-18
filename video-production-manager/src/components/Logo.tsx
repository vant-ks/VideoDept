import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, showText = true }) => {
  return (
    <div className="flex items-center gap-3">
      <div 
        className="relative flex items-center justify-center rounded-full bg-av-accent"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 5v14l11-7L8 5z"
            fill="white"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-av-text tracking-tight">Video Dept</span>
        </div>
      )}
    </div>
  );
};
