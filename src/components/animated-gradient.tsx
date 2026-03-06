'use client';

import React from 'react';

export const AnimatedGradient: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-500/8 to-transparent animate-pulse opacity-20" />
      <div className="absolute -left-1/2 -top-1/2 h-full w-full rounded-full bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-transparent blur-3xl opacity-15" />
      <div className="absolute -right-1/2 -bottom-1/2 h-full w-full rounded-full bg-gradient-to-l from-blue-500/10 via-cyan-500/10 to-transparent blur-3xl animate-pulse opacity-15" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};