import React from 'react';

export const BackgroundDecorations: React.FC = () => {
  return (
    <>
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Floating dollar signs and candlesticks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 text-amber-500 text-9xl font-bold rotate-12 select-none">
          $
        </div>
        <div className="absolute top-40 right-20 text-amber-500 text-7xl font-bold -rotate-12 select-none">
          $
        </div>
        <div className="absolute bottom-32 left-1/4 text-amber-500 text-6xl font-bold rotate-45 select-none">
          $
        </div>
        <div className="absolute bottom-20 right-1/3 text-amber-500 text-8xl font-bold -rotate-6 select-none">
          $
        </div>

        {/* Candlesticks Top Right */}
        <svg
          className="absolute top-1/4 right-10"
          width="200"
          height="300"
          viewBox="0 0 200 300"
        >
          <line x1="40" y1="50" x2="40" y2="250" stroke="#D4AF37" strokeWidth="2" opacity="0.3" />
          <rect x="30" y="100" width="20" height="80" fill="none" stroke="#D4AF37" strokeWidth="2" />
          <line x1="80" y1="30" x2="80" y2="270" stroke="#D4AF37" strokeWidth="2" opacity="0.3" />
          <rect x="70" y="60" width="20" height="150" fill="none" stroke="#D4AF37" strokeWidth="2" />
          <line x1="120" y1="80" x2="120" y2="230" stroke="#D4AF37" strokeWidth="2" opacity="0.3" />
          <rect x="110" y="120" width="20" height="60" fill="none" stroke="#D4AF37" strokeWidth="2" />
          <line x1="160" y1="40" x2="160" y2="260" stroke="#D4AF37" strokeWidth="2" opacity="0.3" />
          <rect x="150" y="90" width="20" height="120" fill="none" stroke="#D4AF37" strokeWidth="2" />
        </svg>

        {/* Candlesticks Bottom Left */}
        <svg
          className="absolute bottom-10 left-20"
          width="150"
          height="200"
          viewBox="0 0 150 200"
        >
          <line x1="30" y1="40" x2="30" y2="180" stroke="#D4AF37" strokeWidth="2" opacity="0.3" />
          <rect x="20" y="70" width="20" height="70" fill="none" stroke="#D4AF37" strokeWidth="2" />
          <line x1="70" y1="20" x2="70" y2="160" stroke="#D4AF37" strokeWidth="2" opacity="0.3" />
          <rect x="60" y="50" width="20" height="80" fill="none" stroke="#D4AF37" strokeWidth="2" />
          <line x1="110" y1="60" x2="110" y2="190" stroke="#D4AF37" strokeWidth="2" opacity="0.3" />
          <rect x="100" y="100" width="20" height="50" fill="none" stroke="#D4AF37" strokeWidth="2" />
        </svg>

        {/* Trendline wave */}
        <svg
          className="absolute top-1/2 left-1/4 -translate-y-1/2"
          width="300"
          height="150"
          viewBox="0 0 300 150"
        >
          <path
            d="M 20 100 L 60 80 L 100 90 L 140 50 L 180 60 L 220 30 L 260 40"
            stroke="#D4AF37"
            strokeWidth="3"
            fill="none"
            opacity="0.2"
          />
        </svg>
      </div>
    </>
  );
};
