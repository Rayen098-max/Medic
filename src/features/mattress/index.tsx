import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import {
  Check,
  ChevronDown,
  Layers,
  Minus,
  RotateCcw,
  User,
  X
} from 'lucide-react';
import { MattressScene } from './components/MattressScene';
import { MetricsScorecard } from './components/MetricsScorecard';
import { ZoneDetailSheet } from './components/ZoneDetailSheet';
import { ModelPickerModal } from './components/ModelPickerModal';
import { RotatePrompt } from './components/RotatePrompt';
import {
  getMetricState,
  LayerId,
  MATTRESS_LAYERS,
  MATTRESS_MODELS,
  MattressModelInfo,
  SEVEN_ZONES_DATA,
  SimulationMode,
  ZoneClinicalInfo
} from './types';
import { getMattressShareGreeting } from './shareToken';

function SceneLoadingBadge() {
  const { active, progress } = useProgress();
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-700/50 bg-[#04101d]/85 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-cyan-300/80 backdrop-blur">
      Loading anatomy · {Math.round(progress)}%
    </div>
  );
}

export function MattressExperience() {
  const { token } = useParams<{ token?: string }>();

  const [greetingName, setGreetingName] = useState<string | null>(null);
  const [mode, setMode] = useState<SimulationMode>('comfort');
  const [selectedModel, setSelectedModel] = useState<MattressModelInfo>(MATTRESS_MODELS[0]);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);

  const [hasSmartGrid, setHasSmartGrid] = useState(true);
  const [hasSevenZone, setHasSevenZone] = useState(true);

  const [selectedZone, setSelectedZone] = useState<ZoneClinicalInfo | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<LayerId | null>(null);
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);

  // Token-scoped greeting. No token, expired token or a legacy /m/:id link all
  // fall back to "Prepared for you" — never a patient id or full name.
  useEffect(() => {
    let alive = true;

    if (!token) {
      setGreetingName(null);
      return () => {
        alive = false;
      };
    }

    getMattressShareGreeting(token).then((name) => {
      if (alive) setGreetingName(name);
    });

    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    const query = window.matchMedia('(orientation: landscape) and (max-height: 540px)');
    const update = () => setIsCompactLandscape(query.matches);
    update();

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }

    // Safari < 14
    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  const metricState = getMetricState(hasSmartGrid, hasSevenZone);

  const resetSimulation = () => {
    setMode('comfort');
    setHasSmartGrid(true);
    setHasSevenZone(true);
    setSelectedZone(null);
    setSelectedLayerId(null);
    setCameraResetKey((key) => key + 1);
  };

  const handleSelectModel = (model: MattressModelInfo) => {
    setSelectedModel(model);
    setIsModelPickerOpen(false);
    resetSimulation();
  };

  const handleModeChange = (nextMode: SimulationMode) => {
    setMode(nextMode);
    setSelectedZone(null);
    setSelectedLayerId(null);
    setCameraResetKey((key) => key + 1);
  };

  const handleSelectLayer = (layerId: LayerId) => {
    setSelectedLayerId((current) => (current === layerId ? null : layerId));
  };

  const greeting = greetingName ? `Prepared for ${greetingName}` : 'Prepared for you';

  return (
    <div className="relative flex h-[100dvh] w-full select-none flex-col overflow-hidden bg-[#03060d] font-sans text-slate-100">
      {/* HEADER */}
      <header
        className="relative z-30 flex shrink-0 items-center justify-between gap-2 border-b border-cyan-900/40 bg-[#030912]/92 px-3 py-2 backdrop-blur-xl"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-400/80 bg-cyan-950/50 shadow-[0_0_14px_rgba(0,210,255,0.35)]">
            <span className="font-mono text-[11px] font-bold tracking-tight text-cyan-300">TSC</span>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[7.5px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              The Sleep Company
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] font-bold tracking-[0.08em] text-white min-[400px]:text-[12px]">
              SmartGRID™ <span className="text-cyan-300">POSTURE LAB</span>
            </div>
            <div
              data-testid="greeting"
              className="mt-0.5 truncate font-mono text-[8px] leading-none tracking-[0.1em] text-slate-400"
            >
              {greeting}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedZone(null);
              setSelectedLayerId(null);
              setIsModelPickerOpen(true);
            }}
            className="flex h-8 max-w-[118px] items-center gap-1 rounded-md border border-slate-700/80 bg-slate-950/80 px-2 text-slate-300 transition hover:border-cyan-500/70 hover:text-white"
            aria-label="Change mattress model"
          >
            <span className="truncate font-mono text-[9px] font-semibold tracking-wide">
              {selectedModel.name.replace(' Mattress', '')}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 text-cyan-400" />
          </button>

          <button
            type="button"
            onClick={resetSimulation}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80 bg-slate-950/80 text-slate-300 transition hover:border-cyan-500/70 hover:text-white"
            aria-label="Reset simulation"
            title="Reset simulation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* 3D STAGE */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <Canvas
          camera={{ position: [-4.6, 3.8, 8.4], fov: 44, near: 0.1, far: 60 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 1.8]}
          className="h-full w-full touch-none"
        >
          <MattressScene
            mode={mode}
            hasSmartGrid={hasSmartGrid}
            hasSevenZone={hasSevenZone}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            selectedLayerId={selectedLayerId}
            onSelectLayer={handleSelectLayer}
            onCloseLayer={() => setSelectedLayerId(null)}
            cameraResetKey={cameraResetKey}
          />
        </Canvas>

        <SceneLoadingBadge />

        {/* Metrics live inside the simulation view, on the canvas top edge. */}
        {mode === 'comfort' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2 pt-2">
            <MetricsScorecard hasSmartGrid={hasSmartGrid} hasSevenZone={hasSevenZone} />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="rounded border border-cyan-700/50 bg-[#04101d]/80 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-cyan-300/80 backdrop-blur">
                Comfort simulator
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] backdrop-blur ${
                  metricState.tone === 'critical'
                    ? 'border-rose-500/50 bg-rose-950/70 text-rose-300'
                    : metricState.tone === 'warning'
                      ? 'border-amber-500/40 bg-amber-950/60 text-amber-300'
                      : 'border-cyan-700/50 bg-cyan-950/60 text-cyan-300'
                }`}
              >
                {metricState.status}
              </span>
            </div>
          </div>
        )}

        {/* Split-layers readout */}
        {mode === 'split' && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pt-2">
            <span className="rounded border border-cyan-700/50 bg-[#04101d]/80 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-cyan-300/80 backdrop-blur">
              Split layers
            </span>
            <span className="rounded border border-slate-700/60 bg-slate-950/80 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-slate-400 backdrop-blur">
              Inspect the stack
            </span>
          </div>
        )}

        {/* One-handed zone strip. Full names, horizontal scroll, never overlapping. */}
        {mode === 'comfort' && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#03060d] via-[#03060d]/85 to-transparent px-2 pb-1.5 pt-5">
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5">
              <span className="shrink-0 pr-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-slate-500">
                Zones
              </span>
              {SEVEN_ZONES_DATA.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedZone(zone)}
                    aria-pressed={isSelected}
                    className={`shrink-0 rounded-full border px-2 py-1 font-mono text-[8.5px] transition ${
                      isSelected
                        ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                        : 'border-slate-700/70 bg-slate-950/80 text-slate-300 hover:border-cyan-600/60'
                    }`}
                  >
                    Z{zone.zoneNumber} {zone.shortName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Gesture hint, desktop only */}
        <div className="pointer-events-none absolute bottom-2 right-2 hidden rounded-full border border-cyan-900/50 bg-black/55 px-2 py-1 font-mono text-[8px] tracking-wide text-cyan-400/55 backdrop-blur min-[700px]:block">
          Drag to rotate · Pinch to zoom
        </div>
      </main>

      {/* BOTTOM DOCK: exactly two primary modes + one contextual row */}
      <footer
        className="relative z-30 shrink-0 border-t border-cyan-900/50 bg-[#030912]/95 px-2.5 pt-2 backdrop-blur-xl"
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('comfort')}
            aria-pressed={mode === 'comfort'}
            className={`flex h-11 items-center justify-center gap-2 rounded-lg border font-mono text-[10px] font-bold tracking-[0.1em] transition ${
              mode === 'comfort'
                ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200 shadow-[0_0_18px_rgba(0,210,255,0.22)]'
                : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-cyan-800/70 hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            COMFORT SIMULATOR
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('split')}
            aria-pressed={mode === 'split'}
            className={`flex h-11 items-center justify-center gap-2 rounded-lg border font-mono text-[10px] font-bold tracking-[0.1em] transition ${
              mode === 'split'
                ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200 shadow-[0_0_18px_rgba(0,210,255,0.22)]'
                : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-cyan-800/70 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            SPLIT LAYERS
          </button>
        </div>

        <div className="no-scrollbar mt-2 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5">
          {mode === 'comfort' ? (
            <>
              <span className="shrink-0 pr-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-slate-500">
                Posture
              </span>

              <button
                type="button"
                onClick={() => {
                  setHasSmartGrid(true);
                  setHasSevenZone(true);
                }}
                aria-pressed={hasSmartGrid && hasSevenZone}
                className={`shrink-0 rounded border px-2 py-1.5 font-mono text-[9px] font-semibold transition ${
                  hasSmartGrid && hasSevenZone
                    ? 'border-cyan-400 bg-cyan-400/15 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-cyan-700/70'
                }`}
              >
                <Check className="mr-1 inline h-2.5 w-2.5" />
                SmartGRID™ (Neutral Spine)
              </button>

              <button
                type="button"
                onClick={() => setHasSmartGrid((current) => !current)}
                aria-pressed={!hasSmartGrid}
                className={`shrink-0 rounded border px-2 py-1.5 font-mono text-[9px] font-semibold transition ${
                  !hasSmartGrid
                    ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-rose-800/70'
                }`}
              >
                <X className="mr-1 inline h-2.5 w-2.5" />
                Remove Grid (Sagging Memory Foam)
              </button>

              <button
                type="button"
                onClick={() => setHasSevenZone((current) => !current)}
                aria-pressed={!hasSevenZone}
                className={`shrink-0 rounded border px-2 py-1.5 font-mono text-[9px] font-semibold transition ${
                  !hasSevenZone
                    ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-amber-800/70'
                }`}
              >
                <Minus className="mr-1 inline h-2.5 w-2.5" />
                {hasSevenZone ? 'Remove 7-Zone Base' : 'Restore 7-Zone Base'}
              </button>
            </>
          ) : (
            <>
              <span className="shrink-0 pr-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-slate-500">
                Inspect
              </span>

              {MATTRESS_LAYERS.map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => handleSelectLayer(layer.id)}
                    aria-pressed={isSelected}
                    className={`shrink-0 rounded border px-2 py-1.5 font-mono text-[9px] font-semibold tracking-[0.04em] transition ${
                      isSelected
                        ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                        : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-cyan-700/70'
                    }`}
                  >
                    {layer.title}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </footer>

      {selectedZone && (
        <ZoneDetailSheet zone={selectedZone} onClose={() => setSelectedZone(null)} />
      )}

      {isModelPickerOpen && (
        <ModelPickerModal
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          onClose={() => setIsModelPickerOpen(false)}
        />
      )}

      <RotatePrompt visible={isCompactLandscape} />
    </div>
  );
}
