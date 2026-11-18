import React from 'react';
import { Check, X } from 'lucide-react';
import { MATTRESS_MODELS, MattressModelInfo } from '../types';

interface ModelPickerModalProps {
  selectedModel: MattressModelInfo;
  onSelectModel: (model: MattressModelInfo) => void;
  onClose: () => void;
}

export function ModelPickerModal({
  selectedModel,
  onSelectModel,
  onClose
}: ModelPickerModalProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3">
      <button
        type="button"
        aria-label="Close model picker"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Select a SmartGRID mattress"
        className="relative z-[91] flex max-h-[86dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-cyan-400/60 bg-[#050d18] shadow-[0_0_50px_rgba(0,210,255,0.2)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-cyan-900/50 px-4 py-3">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-400">
              Select model
            </div>
            <h2 className="mt-0.5 font-mono text-sm font-bold tracking-[0.08em] text-white">
              SMARTGRID™ MATTRESS RANGE
            </h2>
            <p className="mt-1 text-[10px] leading-snug text-slate-400">
              Six models. Same patented grid philosophy.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close model picker"
            className="shrink-0 rounded-full border border-slate-700/70 bg-slate-900 p-1.5 text-slate-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3">
          <div className="flex flex-col gap-2">
            {MATTRESS_MODELS.map((model) => {
              const isSelected = model.id === selectedModel.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => onSelectModel(model)}
                  className={`group w-full rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/55 shadow-[0_0_18px_rgba(0,210,255,0.2)]'
                      : 'border-slate-800 bg-slate-950/80 hover:border-cyan-700/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[12px] font-bold leading-tight text-white">
                      {model.name.replace(' Mattress', '').toUpperCase()}
                    </span>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[8px] ${
                        isSelected
                          ? 'border-cyan-400/70 bg-cyan-400/15 text-cyan-200'
                          : 'border-slate-700 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {model.firmnessScore}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-slate-400">{model.tagline}</p>
                  <p className="mt-1 font-mono text-[9px] leading-snug text-cyan-400/80">
                    Best for: {model.recommendedFor}
                  </p>
                  {isSelected && (
                    <span className="mt-1.5 inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-300">
                      <Check className="h-3 w-3" /> Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <footer className="border-t border-slate-800 px-4 py-2.5">
          <p className="font-mono text-[8px] leading-relaxed tracking-wide text-slate-500">
            Switching models resets the layer simulation.
          </p>
        </footer>
      </section>
    </div>
  );
}
