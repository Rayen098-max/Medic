import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { RotateCcw, ChevronRight, Layers, User, Sparkles, Check, X } from 'lucide-react';
import { MattressScene } from './components/MattressScene';
import { MetricsScorecard } from './components/MetricsScorecard';
import { SleepCycleScrubber } from './components/SleepCycleScrubber';
import { LayerCardsModal } from './components/LayerCardsModal';
import { 
  SimulationMode, 
  ZoneClinicalInfo, 
  LayerMetadata, 
  MATTRESS_MODELS, 
  MATTRESS_LAYERS, 
  MattressModelInfo 
} from './types';
import { getPatientById } from '@/utils/db';

export function MattressExperience() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // Consultation state
  const [patientName, setPatientName] = useState<string>('');
  const [physioName, setPhysioName] = useState<string>('');

  // Simulation mode
  const [mode, setMode] = useState<SimulationMode>('comfort');
  const [selectedModel, setSelectedModel] = useState<MattressModelInfo>(MATTRESS_MODELS[0]);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);

  // Mattress layer toggles
  const [hasSmartGrid, setHasSmartGrid] = useState(true);
  const [hasSevenZone, setHasSevenZone] = useState(true);

  // Clinical zone & layer selection
  const [selectedZone, setSelectedZone] = useState<ZoneClinicalInfo | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<'smartgrid' | 'foam' | 'base' | null>(null);

  // 8-Hour sleep cycle
  const [sleepCycleHour, setSleepCycleHour] = useState(4);

  // Load patient metadata if ID is present
  useEffect(() => {
    async function loadPatient() {
      if (!id || id === 'demo') {
        setPatientName('Guest');
        setPhysioName('Senior Physiotherapist');
        return;
      }
      try {
        const patient = await getPatientById(id);
        if (patient) {
          setPatientName(patient.name || 'Valued Customer');
          setPhysioName(patient.physio_name || patient.physio || 'Physio Specialist');
        }
      } catch (err) {
        console.warn('Could not fetch patient info for mattress lab:', err);
      }
    }
    loadPatient();
  }, [id]);

  const selectedLayer = MATTRESS_LAYERS.find(l => l.id === selectedLayerId) || null;

  const handleReset = () => {
    setMode('comfort');
    setHasSmartGrid(true);
    setHasSevenZone(true);
    setSelectedZone(null);
    setSelectedLayerId(null);
    setSleepCycleHour(4);
  };

  return (
    <div className="relative w-screen h-[100dvh] bg-[#03060d] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* 1. TOP HEADER HUD */}
      <header className="px-4 py-3 border-b border-cyan-900/40 bg-slate-950/80 backdrop-blur-md z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-cyan-400 flex items-center justify-center bg-cyan-950/50 shadow-[0_0_12px_rgba(0,210,255,0.4)]">
            <span className="text-cyan-300 font-bold font-mono text-sm">TSC</span>
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-cyan-400 uppercase font-mono font-semibold">
              The Sleep Company
            </div>
            <div className="text-xs sm:text-sm font-bold text-white tracking-wide font-mono flex items-center gap-1.5">
              <span>SmartGRID™ POSTURE LAB</span>
              {patientName && (
                <span className="hidden sm:inline-block text-[10px] text-cyan-300/80 font-normal">
                  • Prepared for {patientName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Model Switcher & Reset Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModelPickerOpen(true)}
            className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs text-slate-300 hover:text-white flex items-center gap-1 transition"
          >
            <span className="font-mono text-cyan-400 text-[11px] truncate max-w-[120px]">
              {selectedModel.name.replace(' Mattress', '')}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400 transition"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. REAL-TIME SCORECARDS DOCK */}
      <div className="px-3 pt-2.5 z-20">
        <MetricsScorecard hasSmartGrid={hasSmartGrid} hasSevenZone={hasSevenZone} />
      </div>

      {/* 3. MAIN 3D INTERACTIVE CHAMBER (Three.js WebGL Canvas) */}
      <main className="flex-1 w-full relative min-h-0">
        {/* Floating Mode Indicator Badge */}
        <div className="absolute top-2 left-3 z-10 flex items-center gap-2 pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-[10px] font-mono tracking-wider">
            {mode === 'comfort' ? 'COMFORT & POSTURE SIMULATOR' : 'EXPLODED 3D LAYERS'}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-slate-400 text-[10px] font-mono">
            {hasSmartGrid ? 'Patented SmartGRID™ Active' : 'Ordinary Memory Foam'}
          </span>
        </div>

        {/* Three.js Canvas */}
        <Canvas
          camera={{ position: [0, 2.2, 5.2], fov: 42 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          className="w-full h-full"
        >
          <MattressScene
            mode={mode}
            hasSmartGrid={hasSmartGrid}
            hasSevenZone={hasSevenZone}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            sleepCycleHour={sleepCycleHour}
          />
        </Canvas>

        {/* Subtle Gesture Guidance Pill */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-10 text-[10px] font-mono text-cyan-400/70 bg-black/60 px-2.5 py-1 rounded-full border border-cyan-900/50 backdrop-blur">
          Drag to rotate bed • Pinch to zoom • Tap glowing beacons
        </div>
      </main>

      {/* 4. CLINICAL DETAILS & SPECIFICATION DRAWERS */}
      <LayerCardsModal
        selectedZone={selectedZone}
        onCloseZone={() => setSelectedZone(null)}
        selectedLayer={selectedLayer}
        onCloseLayer={() => setSelectedLayerId(null)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        isModelPickerOpen={isModelPickerOpen}
        onCloseModelPicker={() => setIsModelPickerOpen(false)}
      />

      {/* 5. CYBER-CLINICAL BOTTOM CONTROLS DOCK */}
      <footer className="p-3 bg-slate-950/90 border-t border-cyan-900/40 z-20 flex flex-col gap-2.5 backdrop-blur-md">
        
        {/* Primary View Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setMode('comfort');
              setSelectedLayerId(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition flex items-center justify-center gap-2 ${
              mode === 'comfort'
                ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.3)] ring-1 ring-cyan-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            COMFORT SIMULATOR
          </button>

          <button
            onClick={() => {
              setMode('split');
              setSelectedZone(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition flex items-center justify-center gap-2 ${
              mode === 'split'
                ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,210,255,0.3)] ring-1 ring-cyan-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            SPLIT 3D LAYERS
          </button>
        </div>

        {/* Dynamic Contextual Layer & Posture Control Bar */}
        {mode === 'comfort' ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest shrink-0 mr-1">
              Posture Comparison:
            </span>

            {/* Quick Toggle: SmartGRID (Neutral Spine) vs Ordinary Foam (Sagging Spine) */}
            <button
              onClick={() => {
                setHasSmartGrid(true);
                setHasSevenZone(true);
              }}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold shrink-0 transition flex items-center gap-1 ${
                hasSmartGrid && hasSevenZone
                  ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-cyan-600'
              }`}
            >
              <Check className="w-3 h-3 text-cyan-400" />
              SmartGRID™ (Neutral Spine)
            </button>

            <button
              onClick={() => {
                setHasSmartGrid(false);
              }}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold shrink-0 transition flex items-center gap-1 ${
                !hasSmartGrid
                  ? 'bg-rose-500/25 border border-rose-400 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-rose-700'
              }`}
            >
              <X className="w-3 h-3 text-rose-400" />
              Remove Grid (Sagging Memory Foam)
            </button>

            <button
              onClick={() => setHasSevenZone(!hasSevenZone)}
              className={`px-2.5 py-1.5 rounded text-xs font-semibold shrink-0 transition ${
                !hasSevenZone
                  ? 'bg-amber-500/25 border border-amber-400 text-amber-300'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-amber-600'
              }`}
            >
              {hasSevenZone ? 'Remove 7-Zone Base' : 'Restore 7-Zone Base'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest shrink-0 mr-1">
              Inspect Layer:
            </span>
            <button
              onClick={() => setSelectedLayerId('smartgrid')}
              className={`px-2.5 py-1.5 rounded shrink-0 transition ${
                selectedLayerId === 'smartgrid'
                  ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-300'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-cyan-500'
              }`}
            >
              1. SmartGRID™ Layer
            </button>
            <button
              onClick={() => setSelectedLayerId('foam')}
              className={`px-2.5 py-1.5 rounded shrink-0 transition ${
                selectedLayerId === 'foam'
                  ? 'bg-teal-500/30 border border-teal-400 text-teal-300'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-teal-500'
              }`}
            >
              2. Ortho Relief Foam
            </button>
            <button
              onClick={() => setSelectedLayerId('base')}
              className={`px-2.5 py-1.5 rounded shrink-0 transition ${
                selectedLayerId === 'base'
                  ? 'bg-blue-500/30 border border-blue-400 text-blue-300'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-blue-500'
              }`}
            >
              3. 7-Zone Spinal Base
            </button>
          </div>
        )}

        {/* 8-Hour Sleep Cycle Scrubber */}
        <SleepCycleScrubber
          currentHour={sleepCycleHour}
          onHourChange={setSleepCycleHour}
          hasSmartGrid={hasSmartGrid}
        />

      </footer>

    </div>
  );
}
