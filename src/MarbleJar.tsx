import React from 'react';
import { Marble, JarTheme, THEMES, MarbleSize } from '../types';

interface MarbleJarProps {
  marbles: Marble[];
  theme: JarTheme;
}

const SIZE_MAP: Record<MarbleSize, string> = {
  sm: '22px',
  md: '30px',
  lg: '44px',
  xl: '58px'
};

const MarbleJar: React.FC<MarbleJarProps> = ({ marbles, theme }) => {
  const currentTheme = THEMES[theme];

  return (
    <div className="relative w-full max-w-[320px] aspect-[3/4.5] mx-auto mt-8">
      {/* Jar Silhouette */}
      <div className={`absolute inset-0 border-[3.5px] rounded-[45px_45px_85px_85px] jar-glow overflow-hidden z-10 pointer-events-none transition-all duration-700 ${currentTheme.jarClass}`}>
        {/* Glass Reflection */}
        {theme !== 'Ceramic' && (
          <>
            <div className={`absolute top-10 left-8 w-6 h-3/4 rounded-full blur-[3px] opacity-40 ${theme === 'Midnight' ? 'bg-indigo-300/20' : 'bg-white/50'}`} />
            <div className={`absolute bottom-16 right-10 w-4 h-1/5 rounded-full blur-[2px] opacity-20 ${theme === 'Midnight' ? 'bg-indigo-300/10' : 'bg-white/30'}`} />
          </>
        )}
      </div>

      {/* Jar Neck and Rim */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[65%] flex flex-col items-center z-20">
        <div className={`w-full h-4 border-2 rounded-t-lg transition-all duration-700 ${theme === 'Midnight' ? 'bg-indigo-900/80 border-indigo-400/50' : 'bg-white/80 border-white'}`} />
        <div className={`w-[110%] h-3 border-x-2 border-b-2 rounded-b-md transition-all duration-700 ${theme === 'Midnight' ? 'bg-indigo-900/60 border-indigo-400/40' : 'bg-white/60 border-white/80'}`} />
      </div>

      {/* Marbles Container */}
      <div className="absolute inset-x-4 top-4 bottom-8 overflow-hidden rounded-[35px_35px_75px_75px]">
        {marbles.map((marble, index) => {
          const marbleSize = marble.size || 'lg';
          const sizePx = SIZE_MAP[marbleSize];
          const isXL = marbleSize === 'xl';
          const isNewest = index === marbles.length - 1;

          return (
            <div
              key={marble.id}
              className={`absolute rounded-full shadow-lg ${isNewest ? 'marble-enter' : ''} flex items-center justify-center overflow-hidden transition-opacity duration-500 ${isXL ? 'z-20' : 'z-0'}`}
              style={{
                width: sizePx,
                height: sizePx,
                backgroundColor: marble.color,
                left: `${marble.position.x}%`,
                bottom: `${marble.position.y}%`,
                background: `radial-gradient(circle at 35% 35%, ${marble.color} 0%, rgba(0,0,0,0.4) 120%)`,
                boxShadow: isXL ? `
                  0 0 20px ${marble.color}A0,
                  inset -4px -4px 8px rgba(0,0,0,0.6), 
                  inset 4px 4px 8px rgba(255,255,255,0.5),
                  0 6px 14px rgba(0,0,0,0.4)
                ` : `
                  inset -2px -2px 5px rgba(0,0,0,0.5), 
                  inset 2px 2px 5px rgba(255,255,255,0.4),
                  0 3px 8px rgba(0,0,0,0.3)
                `,
                animationDelay: isNewest ? '0s' : `${index * 0.02}s`,
                opacity: marble.isHonoring ? 0.7 : 1,
                filter: marble.isHonoring ? 'saturate(0.5)' : 'none'
              }}
            >
              <div className="shimmer opacity-20" />
              
              {/* Internal Label */}
              {marble.label && (
                <span className="text-[8px] font-black text-white tracking-tighter uppercase select-none pointer-events-none drop-shadow-lg leading-none text-center px-1">
                  {marble.label}
                </span>
              )}

              {/* Specular Highlight */}
              <div className="absolute top-[12%] left-[12%] w-[35%] h-[35%] bg-white/40 rounded-full blur-[0.8px]" />
              
              {/* Milestone Pulse */}
              {isXL && (
                <div className="absolute inset-0 animate-pulse bg-white/20 blur-lg rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarbleJar;