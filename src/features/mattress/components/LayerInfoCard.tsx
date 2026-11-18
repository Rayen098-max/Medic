import React from 'react';
import { X, Layers } from 'lucide-react';
import { LayerMetadata } from '../types';

interface LayerInfoCardProps {
  layer: LayerMetadata;
  onClose: () => void;
}

/**
 * Floating HUD card anchored to the inspected layer inside the 3D scene.
 * This replaces the old bottom-sheet layer drawer.
 */
export function LayerInfoCard({ layer, onClose }: LayerInfoCardProps) {
  return (
    <div
      className="w-[min(78vw,320px)] overflow-hidden rounded-xl border border-cyan-400/60 bg-[#04101d]/95 text-left shadow-[0_0_30px_rgba(0,210,255,0.28)] backdrop-blur-xl"
      style={{ borderColor: `${layer.color}99`, boxShadow: `0 0 30px ${layer.color}33` }}
    >
      <div className="h-px w-full" style={{ backgroundColor: layer.color }} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
              style={{
                borderColor: `${layer.color}88`,
                backgroundColor: `${layer.color}1a`,
                color: layer.color
              }}
            >
              <Layers className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-mono text-[12px] font-bold tracking-[0.14em] text-white">
                {layer.title}
              </h3>
              <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-cyan-300/70">
                {layer.heightMm} layer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close layer information"
            className="shrink-0 rounded-full border border-slate-700/70 bg-slate-900/80 p-1 text-slate-400 transition hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <p className="mt-2.5 text-[11px] font-semibold leading-snug text-cyan-100">
          {layer.subtitle}
        </p>
        <p className="mt-1 text-[10px] leading-snug text-slate-300">
          {layer.description}
        </p>
        <p className="mt-2 border-t border-white/10 pt-2 font-mono text-[8px] leading-snug tracking-wide text-slate-400">
          {layer.detail}
        </p>
      </div>
    </div>
  );
}
