import React from 'react';

interface MetricsScorecardProps {
  hasSmartGrid: boolean;
  hasSevenZone: boolean;
}

export function MetricsScorecard({ hasSmartGrid, hasSevenZone }: MetricsScorecardProps) {
  // Determine scores based on configuration
  let adaptive = 7;
  let back = 9;
  let firm = 8;
  let relief = 9;

  if (!hasSmartGrid) {
    adaptive = 5;
    back = 5;
    firm = 4;
    relief = 5;
  } else if (!hasSevenZone) {
    adaptive = 8;
    back = 7;
    firm = 6;
    relief = 8;
  }

  const isDegraded = !hasSmartGrid || !hasSevenZone;

  const metrics = [
    { label: 'ADAPTIVE SUPPORT', score: adaptive, max: 10 },
    { label: 'BACK SUPPORT', score: back, max: 10 },
    { label: 'FIRM SUPPORT', score: firm, max: 10 },
    { label: 'PRESSURE RELIEF', score: relief, max: 10 },
  ];

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
      {metrics.map((m, idx) => {
        const percent = (m.score / m.max) * 100;
        const isGood = m.score >= 7;

        return (
          <div
            key={idx}
            className={`p-2.5 rounded-lg border backdrop-blur-md transition-all duration-500 shadow-md ${
              isGood 
                ? 'bg-slate-900/80 border-cyan-800/60 shadow-[0_0_12px_rgba(0,210,255,0.15)]' 
                : 'bg-rose-950/70 border-rose-700/60 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono tracking-wider">
              <span className={isGood ? 'text-cyan-400 font-semibold' : 'text-rose-300 font-semibold'}>
                {m.label}
              </span>
              <span className={`text-xs font-bold font-mono ${isGood ? 'text-cyan-200' : 'text-rose-400'}`}>
                {m.score}/10
              </span>
            </div>
            
            {/* Animated Score Progress Bar */}
            <div className="w-full bg-slate-800/90 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isGood ? 'bg-gradient-to-r from-cyan-500 to-cyan-300' : 'bg-rose-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

