import React from 'react';
import { Smartphone } from 'lucide-react';

interface RotatePromptProps {
  visible: boolean;
}

/**
 * Compact landscape phones get a deliberate rotate prompt instead of a
 * half-broken canvas. The reference video is landscape, but the customer flow
 * is designed for one-handed portrait use.
 */
export function RotatePrompt({ visible }: RotatePromptProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-[#03060d] px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-400/50 bg-cyan-950/30 shadow-[0_0_30px_rgba(0,210,255,0.2)]">
        <Smartphone className="h-10 w-10 rotate-90 text-cyan-300" />
      </div>
      <div>
        <h2 className="font-mono text-sm font-bold tracking-[0.14em] text-white">
          ROTATE TO PORTRAIT
        </h2>
        <p className="mt-2 max-w-[260px] text-[11px] leading-relaxed text-slate-400">
          The Posture Lab is designed for a one-handed phone view. Turn your device upright to continue.
        </p>
      </div>
      <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-500/60">
        SmartGRID™ Posture Lab
      </div>
    </div>
  );
}
