import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface SleepCycleScrubberProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  hasSmartGrid: boolean;
}

const HOUR_DETAILS: Record<number, { time: string; stage: string; smartGrid: string; foamIssue: string }> = {
  1: {
    time: '11:00 PM',
    stage: 'Sleep Onset & Surface Settling',
    smartGrid: 'Patented grid adapts in 0.5s without resisting natural sleeping shifts.',
    foamIssue: 'Memory foam takes minutes to respond to body heat before contouring.'
  },
  2: {
    time: '12:00 AM',
    stage: 'Light Non-REM Transition',
    smartGrid: 'Spinal muscles begin decompressing as core body temperature drops.',
    foamIssue: 'Dense foam starts trapping radiated body heat beneath the torso.'
  },
  3: {
    time: '01:00 AM',
    stage: 'Deep Delta Slow-Wave Sleep',
    smartGrid: 'Zero pressure on shoulders & pelvis promotes uninterrupted deep recovery.',
    foamIssue: 'Localized pressure points start restricting capillary blood flow.'
  },
  4: {
    time: '02:00 AM',
    stage: 'REM & Cellular Spinal Repair',
    smartGrid: '2500+ air channels maintain thermal equilibrium, keeping sleep steady.',
    foamIssue: 'Heat accumulation triggers restlessness and early micro-awakenings.'
  },
  5: {
    time: '03:00 AM',
    stage: 'Deep Restoration & Tissue Recovery',
    smartGrid: '7-Zone base supports the lumbar gap so back muscles fully relax.',
    foamIssue: 'Pelvic cratering pulls the lumbar spine out of its neutral curve.'
  },
  6: {
    time: '04:00 AM',
    stage: 'Late REM Cycle',
    smartGrid: 'Easy roll-over with zero sinkhole effect preserves sleep continuity.',
    foamIssue: 'Customer has to physically climb out of the memory foam sag impression.'
  },
  7: {
    time: '05:30 AM',
    stage: 'Pre-Dawn Posture Stabilization',
    smartGrid: 'Spine remains horizontal with no nerve compression or numbness.',
    foamIssue: 'Prolonged sag causes trapezius tension and dull lower back aching.'
  },
  8: {
    time: '07:00 AM',
    stage: 'Restored Awakening',
    smartGrid: 'Wake up feeling light, flexible, refreshed, and completely pain-free.',
    foamIssue: 'Wake up with morning stiffness, heavy limbs, and a sore lower back.'
  }
};

export function SleepCycleScrubber({
  currentHour,
  onHourChange,
  hasSmartGrid
}: SleepCycleScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        onHourChange((currentHour % 8) + 1);
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentHour, onHourChange]);

  const detail = HOUR_DETAILS[currentHour] || HOUR_DETAILS[4];

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 backdrop-blur shadow-lg">
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold text-white tracking-wide text-xs">
            8-HOUR SLEEP CYCLE SIMULATION
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold flex items-center gap-1 transition ${
              isPlaying
                ? 'bg-amber-500/20 border border-amber-400 text-amber-300'
                : 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> Play 8-Hr Night
              </>
            )}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              onHourChange(1);
            }}
            className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
            title="Reset to 11 PM"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Scrubber Range Slider */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-cyan-300 font-bold">{detail.time}</span>
          <span className="text-slate-400">Hour {currentHour} of 8 — <span className="text-white font-medium">{detail.stage}</span></span>
        </div>
        <input
          type="range"
          min="1"
          max="8"
          step="1"
          value={currentHour}
          onChange={(e) => {
            setIsPlaying(false);
            onHourChange(parseInt(e.target.value, 10));
          }}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-0.5">
          <span>11 PM (Onset)</span>
          <span>1 AM</span>
          <span>3 AM (Deep REM)</span>
          <span>5 AM</span>
          <span>7 AM (Wake)</span>
        </div>
      </div>

      {/* Dynamic Hour Stage Comparison Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
        <div className={`p-2 rounded border transition-all ${
          hasSmartGrid ? 'bg-cyan-950/40 border-cyan-800/60' : 'bg-slate-900 border-slate-800 opacity-60'
        }`}>
          <span className="font-bold text-cyan-300 block mb-0.5 font-mono">SmartGRID™ at {detail.time}:</span>
          <p className="text-slate-300 leading-snug">{detail.smartGrid}</p>
        </div>
        <div className={`p-2 rounded border transition-all ${
          !hasSmartGrid ? 'bg-rose-950/40 border-rose-800/60 ring-1 ring-rose-500/40' : 'bg-slate-900 border-slate-800 opacity-60'
        }`}>
          <span className="font-bold text-rose-400 block mb-0.5 font-mono">Ordinary Foam at {detail.time}:</span>
          <p className="text-slate-300 leading-snug">{detail.foamIssue}</p>
        </div>
      </div>
    </div>
  );
}
