import React from 'react';
import { getMetricState } from '../types';

interface MetricsScorecardProps {
  hasSmartGrid: boolean;
  hasSevenZone: boolean;
}

export function MetricsScorecard({ hasSmartGrid, hasSevenZone }: MetricsScorecardProps) {
  const { scores } = getMetricState(hasSmartGrid, hasSevenZone);

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-1.5 max-[379px]:grid-cols-2">
        {scores.map((metric) => {
          const isFlagged = metric.flagged;
          const isWeak = metric.score < 7;
          const percent = (metric.score / 10) * 100;

          const cardTone = isFlagged
            ? 'border-rose-500/70 bg-rose-950/75 shadow-[0_0_16px_rgba(244,63,94,0.22)]'
            : isWeak
              ? 'border-amber-500/45 bg-slate-950/75 shadow-[0_0_10px_rgba(245,158,11,0.12)]'
              : 'border-cyan-500/35 bg-slate-950/75 shadow-[0_0_12px_rgba(0,210,255,0.12)]';

          const textTone = isFlagged
            ? 'text-rose-300'
            : isWeak
              ? 'text-amber-200'
              : 'text-cyan-300';

          const barTone = isFlagged
            ? 'bg-rose-400'
            : isWeak
              ? 'bg-amber-400'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-200';

          return (
            <div
              key={metric.key}
              data-metric={metric.key}
              data-score={metric.score}
              title="Illustrative product-comparison score out of 10. Not a clinical assessment."
              aria-label={`${metric.label}: ${metric.score} out of 10. Illustrative product comparison.`}
              className={`min-w-0 rounded-md border px-1.5 py-1.5 backdrop-blur-md transition-colors duration-500 ${cardTone}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className={`min-w-0 text-[7px] font-mono font-semibold uppercase leading-[1.15] tracking-[0.06em] ${textTone}`}>
                  {metric.label}
                </span>
                <span className={`shrink-0 font-mono text-[11px] font-bold leading-none ${textTone}`}>
                  {metric.score}<span className="text-[7px] font-medium opacity-60">/10</span>
                </span>
              </div>
              <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-slate-800/90">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barTone}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-center font-mono text-[7px] leading-none tracking-[0.08em] text-cyan-100/45">
        ILLUSTRATIVE PRODUCT COMPARISON · NOT A CLINICAL ASSESSMENT
      </p>
    </div>
  );
}
