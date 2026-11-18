import React from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { ZoneClinicalInfo } from '../types';

interface ZoneDetailSheetProps {
  zone: ZoneClinicalInfo;
  onClose: () => void;
}

export function ZoneDetailSheet({ zone, onClose }: ZoneDetailSheetProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close zone details"
        onClick={onClose}
        className="fixed inset-0 z-[70] cursor-default bg-black/45 backdrop-blur-[2px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Zone ${zone.zoneNumber}: ${zone.name}`}
        className="fixed inset-x-0 bottom-0 z-[71] max-h-[72dvh] overflow-y-auto rounded-t-2xl border-t border-cyan-400/60 bg-[#050d18]/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-600/70" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-cyan-400/70 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] text-cyan-300">
                ZONE {zone.zoneNumber} OF 7
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400">
                {zone.medicalRegion}
              </span>
            </div>
            <h2 className="mt-1.5 text-base font-bold leading-tight tracking-wide text-white">
              {zone.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close zone details"
            className="shrink-0 rounded-full border border-slate-700/70 bg-slate-900/80 p-1.5 text-slate-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/35 p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wide text-cyan-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
              WITH SMARTGRID™
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-200">
              {zone.smartGridBenefit}
            </p>
          </div>

          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wide text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              ORDINARY MEMORY FOAM
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
              {zone.ordinaryFoamDrawback}
            </p>
          </div>
        </div>

        <p className="mt-3 border-t border-white/10 pt-2 font-mono text-[8px] leading-relaxed tracking-wide text-slate-500">
          General product education. This is not a diagnosis, treatment recommendation or clinical assessment.
        </p>
      </section>
    </>
  );
}
