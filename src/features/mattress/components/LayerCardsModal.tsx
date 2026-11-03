import React from 'react';
import { X, CheckCircle2, AlertTriangle, Layers, Info } from 'lucide-react';
import { ZoneClinicalInfo, LayerMetadata, MattressModelInfo, MATTRESS_MODELS } from '../types';

interface LayerCardsModalProps {
  selectedZone: ZoneClinicalInfo | null;
  onCloseZone: () => void;
  selectedLayer: LayerMetadata | null;
  onCloseLayer: () => void;
  selectedModel: MattressModelInfo;
  onSelectModel: (model: MattressModelInfo) => void;
  isModelPickerOpen: boolean;
  onCloseModelPicker: () => void;
}

export function LayerCardsModal({
  selectedZone,
  onCloseZone,
  selectedLayer,
  onCloseLayer,
  selectedModel,
  onSelectModel,
  isModelPickerOpen,
  onCloseModelPicker,
}: LayerCardsModalProps) {
  // 1. Zone Clinical Detail Drawer
  if (selectedZone) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-50 max-w-lg mx-auto bg-slate-900/95 border border-cyan-500/80 rounded-2xl p-4 backdrop-blur-xl shadow-2xl transition-all duration-300">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400">
              ZONE {selectedZone.zoneNumber} OF 7
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {selectedZone.name}
            </h3>
          </div>
          <button
            onClick={onCloseZone}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[11px] text-cyan-400/90 font-mono mb-3">
          Medical Region: {selectedZone.medicalRegion}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              With SmartGRID™:
            </div>
            <p className="text-slate-200 text-xs leading-relaxed">
              {selectedZone.smartGridBenefit}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Ordinary Memory Foam:
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {selectedZone.ordinaryFoamDrawback}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Layer Specification Drawer (Split Layers Mode)
  if (selectedLayer) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-50 max-w-lg mx-auto bg-slate-900/95 border border-cyan-500/80 rounded-2xl p-4 backdrop-blur-xl shadow-2xl transition-all duration-300">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-300">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {selectedLayer.title}
              </h3>
              <p className="text-[11px] text-cyan-400 font-mono">
                {selectedLayer.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onCloseLayer}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
            <p>{selectedLayer.bullet1}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
            <p>{selectedLayer.bullet2}</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Mattress Model Selection Modal
  if (isModelPickerOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-cyan-500/70 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Select Model</div>
              <h3 className="text-base font-bold text-white font-mono">SmartGRID™ MATTRESS RANGE</h3>
            </div>
            <button
              onClick={onCloseModelPicker}
              className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {MATTRESS_MODELS.map((model) => {
              const isSelected = model.id === selectedModel.id;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model);
                    onCloseModelPicker();
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.3)] ring-1 ring-cyan-400'
                      : 'bg-slate-950 border-slate-800 hover:border-cyan-800/60'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-white font-mono">{model.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                      {model.firmnessScore}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{model.tagline}</p>
                  <p className="text-[11px] text-cyan-400/80 font-mono mt-0.5">
                    Best for: {model.recommendedFor}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
