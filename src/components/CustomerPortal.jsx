import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import BodyModel from './BodyModel';
import GridRoom from './GridRoom';
import ExerciseTimerModal from './ExerciseTimerModal';
import contentData from '../data/content.json';
import painPointsData from '../data/painPoints.json';
import productsCatalog from '../data/products.json';
import predefinedMessagesData from '../data/predefinedMessages.json';
import { getPatientById, trackSessionStart, updateSessionDuration, updatePatientProgress } from '../utils/db';
import { 
  CheckCircle2, 
  XCircle, 
  X, 
  AlertTriangle, 
  MessageCircle, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  Activity,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';

const defaultDummyPatient = { 
  id: 'demo', 
  name: 'Valued Customer', 
  physioName: 'Kritika', 
  phone: '919876543210' 
};

const getDefaultZone = () => {
  const matched = painPointsData[0] || {};
  return {
    name: matched.name || 'Spinal Mobility',
    description: matched.description || '',
    dos: matched.dos || [],
    donts: matched.donts || [],
    products: [],
    activeZones: [matched.id || 'neck'],
    recommendedExercises: [
      { name: 'Neck Retraction', duration: '', sets: '', week: '1', instructions: 'Sit tall, gently glide your chin straight back like making a double chin. Hold 5 sec.', customPlan: 'Perform in the morning before starting work at your desk.' },
      { name: 'Thoracic Extension', duration: '10', sets: '3', week: '1', instructions: 'Gently arch backwards over a rolled towel placed at upper back.' }
    ],
    isBack: true
  };
};

export default function CustomerPortal() {
  const { id } = useParams();
  const [patient, setPatient] = useState(defaultDummyPatient);
  const [zone, setZone] = useState(getDefaultZone);
  const [activePointId, setActivePointId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Popups & Panels state
  const [showPhasesModal, setShowPhasesModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showExercisesModal, setShowExercisesModal] = useState(false);
  const [activeExercise, setActiveExercise] = useState(null);
  const [activeWeekTab, setActiveWeekTab] = useState('1'); // '1' | '2' | '3' | 'consult'

  // Upgrades state
  const [completedExercises, setCompletedExercises] = useState({});
  const ambienceAudioRef = useRef(null);

  // Cinematic Intro Animation state
  // stages: 'assembling' (0-1.6s) -> 'targeting' (1.6-3.0s) -> 'locked' (3.0-3.6s) -> 'ready' (3.6s+)
  const [introStage, setIntroStage] = useState('assembling');
  const fadeOutAmbienceAudio = useCallback(() => {
    if (!ambienceAudioRef.current) return;
    const audio = ambienceAudioRef.current;
    let vol = 1.0;
    const fadeTimer = setInterval(() => {
      vol = Math.max(0, vol - 0.05);
      audio.volume = Number(vol.toFixed(2));
      if (vol <= 0) {
        clearInterval(fadeTimer);
        audio.pause();
      }
    }, 100);
  }, []);

  const [introProgress, setIntroProgress] = useState(0);

  const playAmbienceAudio = useCallback(() => {
    try {
      if (!ambienceAudioRef.current) {
        const domAudio = typeof document !== 'undefined' ? document.getElementById('medic-ambience-audio') : null;
        ambienceAudioRef.current = domAudio || new Audio('/audio/mixkit-futuristic-sci-fi-computer-ambience-2507.wav');
        ambienceAudioRef.current.loop = false;
      }
      const audio = ambienceAudioRef.current;
      audio.volume = 1.0;
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          console.warn('Autoplay restricted by browser, will trigger on user interaction:', err);
          const onUserGesture = () => {
            if (ambienceAudioRef.current) {
              ambienceAudioRef.current.volume = 1.0;
              ambienceAudioRef.current.play().catch(() => {});
            }
            ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach((evt) => {
              window.removeEventListener(evt, onUserGesture, true);
            });
          };
          ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach((evt) => {
            window.addEventListener(evt, onUserGesture, { once: true, capture: true });
          });
        });
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fullscreen view and rotation gesture guidance state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasInteractedRotation, setHasInteractedRotation] = useState(false);
  const userManuallyExitedFullscreen = useRef(false);

  // Sync fullscreen state with document events
  useEffect(() => {
    const handleFsChange = () => {
      const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        userManuallyExitedFullscreen.current = true;
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Request fullscreen on first user touch/click gesture
  useEffect(() => {
    const requestFsOnFirstGesture = () => {
      if (userManuallyExitedFullscreen.current) return;
      try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          const docEl = document.documentElement;
          const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
          if (req) {
            const p = req.call(docEl);
            if (p && p.catch) p.catch(() => {});
          }
        }
      } catch (_) {}
      // Minimise address bar on mobile viewports
      try {
        if (window.scrollY === 0) {
          window.scrollTo(0, 1);
        }
      } catch (_) {}
    };

    window.addEventListener('click', requestFsOnFirstGesture, { once: true });
    window.addEventListener('touchend', requestFsOnFirstGesture, { once: true });
    return () => {
      window.removeEventListener('click', requestFsOnFirstGesture);
      window.removeEventListener('touchend', requestFsOnFirstGesture);
    };
  }, []);

  const toggleFullscreen = useCallback((e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        userManuallyExitedFullscreen.current = false;
        const docEl = document.documentElement;
        const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
        if (req) {
          const p = req.call(docEl);
          if (p && p.catch) p.catch(() => {});
        }
      } else {
        userManuallyExitedFullscreen.current = true;
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) {
          const p = exit.call(document);
          if (p && p.catch) p.catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Fullscreen toggle error:', e);
    }
  }, []);

  // Prevent accidental multi-touch pinch zooming on mobile browser viewport
  useEffect(() => {
    const preventPinchZoom = (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchstart', preventPinchZoom, { passive: false });
    return () => document.removeEventListener('touchstart', preventPinchZoom);
  }, []);

  // Auto-fade rotate hint after 5 seconds in ready stage
  useEffect(() => {
    if (introStage === 'ready') {
      const timer = setTimeout(() => setHasInteractedRotation(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [introStage]);

  // Universal close for any open popup when clicking backdrop / outside
  const closeAllPopups = () => {
    setShowDisclaimerModal(false);
    setShowPhasesModal(false);
    setShowExercisesModal(false);
    setActivePointId(null);
  };

  const isAnyPopupOpen = showDisclaimerModal || showPhasesModal || showExercisesModal || activePointId;

  // Usage Tracking Effect
  useEffect(() => {
    if (!patient?.id || patient.id === 'demo' || loading) return;
    let sessionId = null;
    let intervalId = null;
    let startTime = null;

    const startTracking = async () => {
      sessionId = await trackSessionStart(patient.id);
      if (sessionId) {
        startTime = Date.now();
        intervalId = setInterval(() => {
          if (startTime) {
            const actualSecondsSpent = Math.floor((Date.now() - startTime) / 1000);
            updateSessionDuration(sessionId, actualSecondsSpent);
          }
        }, 5000);
      }
    };

    startTracking();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (sessionId && startTime) {
        const finalSeconds = Math.floor((Date.now() - startTime) / 1000);
        updateSessionDuration(sessionId, finalSeconds);
      }
    };
  }, [patient?.id, loading]);

  // Load patient data
  useEffect(() => {
    async function loadData() {
      if (!id || id === 'demo') {
        loadDummyData();
        return;
      }
      try {
        const data = await getPatientById(id);
        if (data) {
          processData(data);
        } else {
          loadDummyData();
        }
      } catch (err) {
        console.warn("DB Error, falling back to dummy data", err);
        loadDummyData();
      }
    }
    
    function loadDummyData() {
      setPatient({ id: 'demo', name: 'Valued Customer', physioName: 'Kritika', phone: '919876543210' });
      const matchedPoints = [painPointsData[0]];
      const combinedName = matchedPoints[0].name;
      const combinedDesc = matchedPoints[0].description || '';
      
      setZone({
        name: combinedName,
        description: combinedDesc,
        dos: matchedPoints[0].dos || [],
        donts: matchedPoints[0].donts || [],
        products: [],
        activeZones: [matchedPoints[0].id],
        recommendedExercises: [
          { name: 'Neck Retraction', duration: '', sets: '', week: '1', instructions: 'Sit tall, gently glide your chin straight back like making a double chin. Hold 5 sec.', customPlan: 'Perform in the morning before starting work at your desk.' },
          { name: 'Thoracic Extension', duration: '10', sets: '3', week: '1', instructions: 'Gently arch backwards over a rolled towel placed at upper back.' }
        ],
        isBack: true
      });
    }

    function processData(data) {
      setPatient(data);
      if (data.completed_exercises && typeof data.completed_exercises === 'object') {
        setCompletedExercises(data.completed_exercises);
      }
      
      const pointIds = data.painPointId ? data.painPointId.split(',') : [];
      const matchedPoints = pointIds.map(pid => painPointsData.find(p => p.id === pid)).filter(Boolean);
      if (data.customConditions && Array.isArray(data.customConditions)) {
        matchedPoints.push(...data.customConditions);
      }
      
      if (matchedPoints.length > 0) {
        const primaryName = matchedPoints[0].name;
        const combinedName = matchedPoints.length > 1 ? `${primaryName} + ${matchedPoints.length - 1} other${matchedPoints.length > 2 ? 's' : ''}` : primaryName;
        const combinedDesc = matchedPoints.map(p => p.description || '').filter(Boolean).join('\n\n');
        const combinedDos = [...new Set(matchedPoints.flatMap(p => p.dos || []))];
        const combinedDonts = [...new Set(matchedPoints.flatMap(p => p.donts || []))];
        
        const activeZoneIds = matchedPoints.map(p => p.id);
        const isBackPain = matchedPoints.some(p => {
          const z = (p.zone || p.name || '').toLowerCase();
          return z.includes('back') || z.includes('neck') || z.includes('shoulder') || z.includes('cervical') || z.includes('lumbar') || z.includes('thoracic') || z.includes('scapul') || z.includes('glute') || z.includes('hamstring') || z.includes('calf') || z.includes('achilles') || p.isBack;
        });

        setZone({
          name: combinedName,
          description: combinedDesc,
          dos: combinedDos,
          donts: combinedDonts,
          activeZones: activeZoneIds,
          recommendedExercises: (data.recommendedExercises && data.recommendedExercises.length > 0) ? data.recommendedExercises : (getDefaultZone().recommendedExercises || []),
          conditionNotes: data.conditionNotes || {},
          isBack: isBackPain
        });
      } else {
        const matchedZone = contentData.zones.find(z => z.id === data.painArea);
        if (matchedZone) {
          setZone({
            ...matchedZone,
            activeZones: [matchedZone.id],
            recommendedExercises: (data.recommendedExercises && data.recommendedExercises.length > 0) ? data.recommendedExercises : (getDefaultZone().recommendedExercises || []),
            conditionNotes: data.conditionNotes || {},
            isBack: ['neck', 'shoulders', 'upper_back', 'lower_back', 'back'].includes(matchedZone.id)
          });
        } else {
          loadDummyData();
        }
      }
    }

    loadData();
  }, [id]);

  // Load and sync Exercise completion from localStorage
  useEffect(() => {
    if (!patient?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const savedDone = localStorage.getItem(`medic_done_${patient.id}_${today}`);
    if (savedDone) {
      try { setCompletedExercises(JSON.parse(savedDone)); } catch(e) {}
    }
  }, [patient?.id]);

  const toggleExerciseDone = (exerciseName) => {
    if (!patient?.id || !exerciseName) return;
    const today = new Date().toISOString().slice(0, 10);
    const updated = {
      ...completedExercises,
      [exerciseName]: !completedExercises[exerciseName]
    };
    setCompletedExercises(updated);
    try { navigator.vibrate?.(10); } catch (_) {}
    localStorage.setItem(`medic_done_${patient.id}_${today}`, JSON.stringify(updated));

    // Persist to Supabase if table columns exist
    updatePatientProgress(patient.id, updated);
  };

  // Cinematic Intro Animation Orchestration (expanded 8.2s sequence for clear visualization)
  useEffect(() => {
    // Play intro animation and sci-fi audio at full volume whenever the link is opened
    setIntroStage('assembling');
    playAmbienceAudio();

    const t1 = setTimeout(() => {
      setIntroStage('targeting');
    }, 4500);

    const t2 = setTimeout(() => {
      setIntroStage('locked');
    }, 7000);

    const t3 = setTimeout(() => {
      setIntroStage('ready');
      fadeOutAmbienceAudio();
    }, 8200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (ambienceAudioRef.current) {
        ambienceAudioRef.current.pause();
      }
    };
  }, [id, playAmbienceAudio, fadeOutAmbienceAudio]);

  const replayIntro = () => {
    setIntroStage('assembling');
    playAmbienceAudio();
    setTimeout(() => {
      setIntroStage('targeting');
    }, 4500);
    setTimeout(() => {
      setIntroStage('locked');
    }, 7000);
    setTimeout(() => {
      setIntroStage('ready');
      fadeOutAmbienceAudio();
    }, 8200);
  };

  // Close modals on Escape key
  useEffect(() => {
    const onKey = (e) => { 
      if (e.key === 'Escape') {
        closeAllPopups();
        setActiveExercise(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Personalized browser tab title
  useEffect(() => {
    if (!patient) return;
    const person = patient.name ? `${patient.name}'s` : 'Your';
    document.title = `${person} Personalized Recovery Plan | The Sleep Company`;
  }, [patient]);

  if (!patient || !zone) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#030814', color: '#e2e8f0' }}>
        Record not found or link has expired.
      </div>
    );
  }

  const activePointData = activePointId ? [...painPointsData, ...(patient?.customConditions || [])].find(p => p.id === activePointId) : null;
  const exercises = zone.recommendedExercises || [];
  const completedCount = Object.values(completedExercises).filter(Boolean).length;

  const renderScene = () => (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 10, 10]} intensity={2} />
      <directionalLight position={[-10, 10, -10]} intensity={2} />
      <directionalLight position={[0, -10, 0]} intensity={1} />
      <React.Suspense fallback={null}>
        <GridRoom introStage={introStage} />
        <BodyModel 
          zones={[...painPointsData, ...(patient?.customConditions || [])]}
          activeZones={zone.activeZones}
          onZoneClick={(clickedId) => {
            closeAllPopups();
            setActivePointId(clickedId);
          }} 
          introStage={introStage}
          activePointId={activePointId}
          isBack={zone.isBack}
          onUserRotate={() => setHasInteractedRotation(true)}
        />
        <ContactShadows resolution={256} frames={1} position={[0, -3.5, 0]} opacity={0.5} scale={20} blur={2} far={4.5} />
        <Environment preset="city" />
      </React.Suspense>
      <OrbitControls 
        target={[0, 0, 0]}
        enablePan={false}
        enableRotate={false}
        enableZoom={false}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        autoRotate={false}
      />
    </>
  );

  // Render Hotspot / Pain Point Detail Overlay
  const renderHotspotOverlay = () => {
    if (!activePointData) return null;
    const customNote = zone?.conditionNotes?.[activePointData.id];

    return (
      <div 
        style={{ 
          position: 'fixed', 
          bottom: 'max(18px, env(safe-area-inset-bottom))', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: 'min(calc(100vw - 28px), 480px)', 
          maxWidth: '520px',
          background: 'rgba(9, 14, 28, 0.95)', 
          border: '1px solid #00d2ff', 
          borderRadius: '16px', 
          padding: '20px 24px', 
          zIndex: 45, 
          maxHeight: 'min(70vh, 480px)', 
          overflowY: 'auto', 
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 0 35px rgba(0, 210, 255, 0.25)',
          animation: 'slideUpFade 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile && (
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.25)', margin: '-6px auto 14px' }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(0, 210, 255, 0.2)', paddingBottom: '10px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#00d2ff', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 800 }}>
              Physio Diagnosed Pain Point
            </span>
            <h4 style={{ margin: '2px 0 0', color: '#f8fafc', fontSize: '1.25rem', fontWeight: 800 }}>
              {activePointData.name}
            </h4>
          </div>
          <button 
            onClick={() => setActivePointId(null)} 
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: '#94a3b8', 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>
        
        {customNote || (predefinedMessagesData && predefinedMessagesData[activePointData.id]) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {customNote && (
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16}/> 
                  {patient?.physioName ? `${patient.physioName.toLowerCase().startsWith('dr') ? '' : 'DR. '}${patient.physioName.toUpperCase()}'S CLINICAL NOTES` : 'PHYSIO NOTES'}
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#f1f5f9', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {customNote}
                </p>
              </div>
            )}
            {predefinedMessagesData && predefinedMessagesData[activePointData.id] && (
              <div style={{ borderTop: customNote ? '1px solid rgba(0, 210, 255, 0.15)' : 'none', paddingTop: customNote ? '12px' : '0' }}>
                <div style={{ fontSize: '0.85rem', color: '#00d2ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  CONDITION OVERVIEW
                </div>
                <div style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: predefinedMessagesData[activePointData.id].message.replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={16}/> THINGS TO AVOID
            </div>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {(activePointData.donts || []).map((item, i) => <li key={i} style={{ marginBottom: '4px' }}>{item}</li>)}
              {(!activePointData.donts || activePointData.donts.length === 0) && (
                <li style={{ fontStyle: 'italic', color: '#94a3b8' }}>No specific avoidances recorded.</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100dvh',
      backgroundColor: '#030814',
      background: 'radial-gradient(ellipse at 50% 50%, #06152d 0%, #030814 85%)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none'
    }}>

      {/* Universal Backdrop / Click Outside to Close Any Modal */}
      {isAnyPopupOpen && (
        <div 
          onClick={closeAllPopups} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 40, 
            background: 'rgba(0, 0, 0, 0.55)', 
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            transition: 'opacity 0.25s ease'
          }} 
        />
      )}

      {/* 3D Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        
        {/* The Sleep Company Brand Header Logo */}
        <div 
          className="futuristic-logo-container overlay-logo" 
          style={{ 
            position: 'absolute', 
            top: 'max(14px, env(safe-area-inset-top))', 
            left: 'max(14px, env(safe-area-inset-left))', 
            zIndex: 25,
            maxWidth: 'calc(100vw - 80px)',
            opacity: introStage === 'ready' ? 1 : 0,
            pointerEvents: introStage === 'ready' ? 'auto' : 'none',
            transition: 'opacity 0.8s ease'
          }}
        >
          <svg className="logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 150" role="img" aria-label="The Sleep Company">
            <defs>
              <style>{`
                .tsc-mark-outer {
                  stroke: #00d2ff;
                  fill: none;
                  stroke-width: 2.5;
                  filter: drop-shadow(0 2px 6px rgba(0, 210, 255, 0.35));
                }
                .tsc-mark-inner {
                  stroke: #5cf2ff;
                  fill: none;
                  stroke-width: 1.5;
                }
                .tsc-intersection {
                  fill: rgba(0, 210, 255, 0.12);
                }
                .tsc-text {
                  font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
                  font-weight: 800;
                  letter-spacing: 3px;
                  fill: #ffffff;
                  filter: drop-shadow(0 2px 8px rgba(0, 210, 255, 0.4));
                }
              `}</style>
            </defs>

            <g transform="translate(20, 20)">
              <g>
                <rect className="tsc-mark-outer" x="10" y="10" width="75" height="75" rx="3" />
                <rect className="tsc-mark-inner" x="18" y="18" width="59" height="59" strokeWidth="1.5" />
              </g>
              <g>
                <rect className="tsc-mark-outer" x="40" y="40" width="75" height="75" rx="3" />
                <rect className="tsc-mark-inner" x="48" y="48" width="59" height="59" strokeWidth="1.5" />
              </g>
              <rect className="tsc-intersection" x="40" y="40" width="45" height="45" rx="2" />
              <text 
                x="140" 
                y="52" 
                className="tsc-text" 
                fontSize="34"
                style={{ fill: '#ffffff', fontWeight: 800, letterSpacing: '3px' }}
              >
                THE SLEEP
              </text>
              <text 
                x="140" 
                y="98" 
                className="tsc-text" 
                fontSize="34"
                style={{ fill: '#ffffff', fontWeight: 800, letterSpacing: '3px' }}
              >
                COMPANY
              </text>
            </g>
          </svg>
        </div>

        {/* Top Center: Routine Progress Tracker HUD */}

        {/* Intro Scan HUD Overlay Status */}
        {introStage !== 'ready' && (
          <div style={{ 
            position: 'absolute', 
            bottom: 'max(36px, env(safe-area-inset-bottom))', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 25, 
            width: 'min(92vw, 460px)',
            textAlign: 'center',
            pointerEvents: 'none',
            padding: '0 10px'
          }}>
            <div style={{ 
              color: '#00d2ff', 
              fontSize: 'clamp(0.72rem, 2.5vw, 0.85rem)', 
              letterSpacing: 'clamp(1px, 0.4vw, 2.5px)', 
              textTransform: 'uppercase', 
              fontWeight: 800,
              textShadow: '0 0 15px rgba(0, 210, 255, 0.8)',
              wordBreak: 'break-word',
              lineHeight: 1.4
            }}>
              {introStage === 'assembling' && 'SYNTHESIZING 3D ANATOMICAL MODEL...'}
              {introStage === 'targeting' && 'SCANNING & ACQUIRING DIAGNOSED PAIN POINTS...'}
              {introStage === 'locked' && 'PAIN BEACONS SYNCHRONIZED • RECOVERY PLAN LOADED'}
            </div>
          </div>
        )}

        {/* 3D Canvas */}
        <Canvas 
          style={{ position: 'absolute', inset: 0, touchAction: 'none' }} 
          dpr={[1, 1.5]} 
          camera={{ position: [0, 0, isMobile ? 14 : 9], fov: 45 }}
        >
          {renderScene()}
        </Canvas>

        {/* Pain Point Hotspot Details Panel */}
        {renderHotspotOverlay()}

        {/* Mobile / Desktop Drag to Rotate Body Gesture Guidance */}
        {introStage === 'ready' && !activePointId && !showPhasesModal && !showExercisesModal && !showDisclaimerModal && !hasInteractedRotation && (
          <div 
            className="rotate-hint-pill"
            style={{ 
              position: 'absolute', 
              bottom: isMobile ? 'max(88px, calc(env(safe-area-inset-bottom) + 72px))' : '36px', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              zIndex: 25, 
              pointerEvents: 'none',
              background: 'rgba(15, 23, 42, 0.8)', 
              border: '1px solid rgba(0, 210, 255, 0.3)', 
              borderRadius: '20px', 
              padding: '6px 14px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: '#cbd5e1', 
              fontSize: 'clamp(0.7rem, 2vw, 0.78rem)', 
              fontWeight: 700, 
              letterSpacing: '1px', 
              textTransform: 'uppercase',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 0 20px rgba(0, 210, 255, 0.2)',
              animation: 'slideUpFade 0.3s ease-out'
            }}
          >
            <span className="animate-pulse" style={{ color: '#00d2ff', fontSize: '1.05rem', lineHeight: 1 }}>‹</span>
            <span>Drag to rotate body</span>
            <span className="animate-pulse" style={{ color: '#00d2ff', fontSize: '1.05rem', lineHeight: 1 }}>›</span>
          </div>
        )}

        {/* Top Right: Medical Disclaimer Button & Responsive Modal */}
        {introStage === 'ready' && (
          <div style={
            showDisclaimerModal && isMobile
              ? { position: 'fixed', top: 'max(68px, calc(env(safe-area-inset-top) + 54px))', left: '50%', transform: 'translateX(-50%)', zIndex: 45, width: 'min(calc(100vw - 28px), 420px)' }
              : { position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', right: 'max(14px, env(safe-area-inset-right))', zIndex: 35, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }
          }>
            <button
              className="exercise-fab"
              onClick={() => {
                const nextState = !showDisclaimerModal;
                closeAllPopups();
                setShowDisclaimerModal(nextState);
              }}
              aria-label="View Medical Disclaimer"
              title="Medical Disclaimer"
              style={{ 
                width: 'clamp(42px, 10vw, 50px)', 
                height: 'clamp(42px, 10vw, 50px)', 
                animationDelay: '0.2s',
                display: (isMobile && showDisclaimerModal) ? 'none' : 'flex'
              }}
            >
              <img 
                src="/warning-logo-new.png" 
                alt="Disclaimer Logo" 
                style={{
                  width: '65%',
                  height: '65%',
                  objectFit: 'contain',
                  transform: showDisclaimerModal ? 'scale(0.9)' : 'none', 
                  transition: 'transform 0.3s ease'
                }} 
              />
            </button>

            {/* Discrete Fullscreen Toggle Button */}
            <button
              className="fullscreen-toggle-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              style={{ 
                width: 'clamp(36px, 8.5vw, 42px)', 
                height: 'clamp(36px, 8.5vw, 42px)', 
                borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(0, 210, 255, 0.35)',
                color: '#00d2ff',
                display: (isMobile && showDisclaimerModal) ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 0 15px rgba(0, 210, 255, 0.2)',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            
            {showDisclaimerModal && (
              <div 
                className="keep-menu-container" 
                style={{ transformOrigin: 'top right', zIndex: 45, width: '100%' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="keep-menu-card" 
                  style={{ 
                    width: isMobile ? '100%' : 'min(90vw, 420px)', 
                    maxHeight: 'min(72vh, 480px)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '0', 
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 210, 255, 0.25)',
                    border: '1px solid #00d2ff'
                  }}
                >
                  {/* Sticky Header */}
                  <div style={{ 
                    padding: '16px 20px', 
                    borderBottom: '1px solid rgba(0, 210, 255, 0.2)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.95)'
                  }}>
                    <h4 style={{ color: '#00d2ff', margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                      <AlertTriangle size={18} color="#00d2ff" /> Medical Disclaimer
                    </h4>
                    <button 
                      onClick={() => setShowDisclaimerModal(false)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#94a3b8', 
                        cursor: 'pointer', 
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  {/* Scrollable Content Body with Guaranteed Fit */}
                  <div style={{ 
                    padding: '18px 20px', 
                    overflowY: 'auto', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '14px', 
                    fontSize: '0.88rem', 
                    color: '#cbd5e1', 
                    lineHeight: '1.5' 
                  }}>
                    <div style={{ background: 'rgba(0, 210, 255, 0.05)', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #00d2ff' }}>
                      <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>Preliminary Visual Assessment</strong>
                      During your in-store visit, our physiotherapist observed your posture and discussed your concerns. This was a short consultation, not a complete clinical diagnosis.
                    </div>

                    <div style={{ background: 'rgba(0, 210, 255, 0.05)', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #00d2ff' }}>
                      <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>General Guidance</strong>
                      These exercises are intended to help with common, everyday discomfort based on visual observations — not tailored to any underlying medical condition.
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', padding: '10px 12px', borderLeft: '3px solid #ef4444' }}>
                      <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>Stop if Symptoms Worsen</strong>
                      If your discomfort increases or you notice anything unusual while following this routine, stop right away and reach out to our team.
                    </div>
                  </div>
                  
                  {/* Sticky Footer CTA */}
                  <div style={{ 
                    padding: '14px 20px', 
                    borderTop: '1px solid rgba(0, 212, 255, 0.2)', 
                    background: 'rgba(10, 16, 30, 0.95)',
                    textAlign: 'center'
                  }}>
                    <button 
                      onClick={() => window.open(`https://wa.me/${patient?.phone || '919876543210'}?text=${encodeURIComponent(`Hi Dr. ${patient?.physioName || 'Physio'}, I have a question regarding my recovery routine from The Sleep Company.`)}`, '_blank')}
                      style={{ 
                        width: '100%', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: '8px',
                        background: '#25D366',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '24px',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        boxShadow: '0 0 15px rgba(37, 211, 102, 0.35)'
                      }}
                    >
                      <MessageCircle size={18} /> Contact Physio on WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Right: Tabbed Futuristic WEEK Section & Button */}
        {introStage === 'ready' && !activePointId && (
          <div style={
            showExercisesModal
              ? { display: 'none' }
              : showPhasesModal && isMobile
                ? { position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 45, width: 'min(calc(100vw - 28px), 420px)' }
                : { position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', right: 'calc(env(safe-area-inset-right, 0px) + 18px)', zIndex: 35, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }
          }>
            
            {showPhasesModal && (() => {
              const week1Ex = exercises.filter(ex => ex.week === '1' || !ex.week);
              const week2Ex = exercises.filter(ex => ex.week === '2');
              const week3Ex = exercises.filter(ex => ex.week === '3');
              
              const formatWeekList = (list) => {
                if (!list || list.length === 0) {
                  return (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
                      No specific exercises assigned for this week.
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {list.map((ex, i) => {
                      const hasDuration = ex.duration && parseInt(ex.duration, 10) > 0;
                      const hasSets = ex.sets && parseInt(ex.sets, 10) > 0;
                      const hasStructuredPlan = hasDuration || hasSets;
                      const isDone = !!completedExercises[ex.name];

                      return (
                        <div 
                          key={i} 
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.04)', 
                            border: '1px solid rgba(0, 210, 255, 0.2)', 
                            borderRadius: '10px', 
                            padding: '12px 14px' 
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>{ex.name}</span>
                            <button
                              onClick={() => toggleExerciseDone(ex.name)}
                              style={{ 
                                background: isDone ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)', 
                                border: isDone ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.2)',
                                color: isDone ? '#22c55e' : '#cbd5e1',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <CheckCircle2 size={12} /> {isDone ? 'DONE' : 'MARK'}
                            </button>
                          </div>

                          {/* Plan Details: Only show duration & sets if filled! */}
                          {hasStructuredPlan && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0', fontSize: '0.82rem', color: '#00d2ff' }}>
                              {hasDuration && <span>⏱️ {ex.duration} min</span>}
                              {hasDuration && hasSets && <span>•</span>}
                              {hasSets && <span>🔁 {ex.sets} sets daily</span>}
                            </div>
                          )}

                          {/* Custom Plan Note (Physio's special instructions) */}
                          {ex.customPlan && (
                            <div style={{ fontSize: '0.84rem', color: '#e2e8f0', marginTop: '6px', background: 'rgba(0, 210, 255, 0.06)', padding: '6px 10px', borderRadius: '6px', borderLeft: '2px solid #00d2ff' }}>
                              <strong style={{ color: '#00d2ff', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block' }}>Physio Plan:</strong>
                              {ex.customPlan}
                            </div>
                          )}

                          {/* Standard Instructions */}
                          {ex.instructions && !ex.customPlan && !hasStructuredPlan && (
                            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.4 }}>
                              {ex.instructions}
                            </div>
                          )}

                          {/* Exercise Guide CTA button */}
                          <button
                            onClick={() => {
                              setActiveExercise(ex);
                              setShowPhasesModal(false);
                            }}
                            style={{
                              marginTop: '8px',
                              background: 'transparent',
                              border: 'none',
                              color: '#00d2ff',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: 0
                            }}
                          >
                            <ChevronRight size={14} color="#00d2ff" /> View Exercise Guide →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              };

              return (
                <div 
                  className="keep-menu-container"
                  onClick={(e) => e.stopPropagation()}
                  style={{ zIndex: 45, width: '100%' }}
                >
                  <div 
                    className="keep-menu-card" 
                    style={{ 
                      width: isMobile ? '100%' : 'min(90vw, 380px)', 
                      maxHeight: 'min(70vh, 500px)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      padding: 0,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 210, 255, 0.25)',
                      border: '1px solid #00d2ff'
                    }}
                  >
                    {/* Card Title & Close */}
                    <div style={{ 
                      padding: '14px 16px', 
                      borderBottom: '1px solid rgba(0, 210, 255, 0.2)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      background: 'rgba(15, 23, 42, 0.95)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={18} color="#00d2ff" />
                        <span style={{ color: '#00d2ff', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          Recovery Routine
                        </span>
                      </div>
                      <button 
                        onClick={() => setShowPhasesModal(false)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Tab Navigation: [Week 1] [Week 2] [Week 3] [Store Consult] */}
                    <div style={{ display: 'flex', borderBottom: '1px solid rgba(0, 210, 255, 0.15)', background: 'rgba(10, 16, 30, 0.9)' }}>
                      {[
                        { key: '1', label: 'Week 1' },
                        { key: '2', label: 'Week 2' },
                        { key: '3', label: 'Week 3' },
                        { key: 'consult', label: 'Store Visit' }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveWeekTab(tab.key)}
                          style={{
                            flex: 1,
                            padding: '10px 4px',
                            background: activeWeekTab === tab.key ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
                            border: 'none',
                            borderBottom: activeWeekTab === tab.key ? '2px solid #00d2ff' : '2px solid transparent',
                            color: activeWeekTab === tab.key ? '#00d2ff' : '#94a3b8',
                            fontWeight: activeWeekTab === tab.key ? 800 : 600,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Scrollable Tab Content: Guaranteed Never Overflow */}
                    <div style={{ padding: '16px', overflowY: 'auto', flex: 1, background: 'rgba(15, 23, 42, 0.95)' }}>
                      {activeWeekTab === '1' && formatWeekList(week1Ex)}
                      {activeWeekTab === '2' && (
                        week2Ex.length > 0 ? formatWeekList(week2Ex) : (
                          <div style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5, textAlign: 'center', padding: '20px 10px' }}>
                            <Activity size={28} color="#00d2ff" style={{ margin: '0 auto 10px' }} />
                            <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>Week 2 Progression</strong>
                            Continue Week 1 exercises with increased repetitions, or visit store for posture re-evaluation.
                          </div>
                        )
                      )}
                      {activeWeekTab === '3' && (
                        week3Ex.length > 0 ? formatWeekList(week3Ex) : (
                          <div style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.5, textAlign: 'center', padding: '20px 10px' }}>
                            <Activity size={28} color="#00d2ff" style={{ margin: '0 auto 10px' }} />
                            <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>Week 3 Maintenance</strong>
                            Perform maintenance stretches 3 times weekly to sustain spinal alignment.
                          </div>
                        )
                      )}
                      {activeWeekTab === 'consult' && (
                        <div style={{ 
                          background: 'rgba(229, 64, 158, 0.08)', 
                          border: '1px solid rgba(229, 64, 158, 0.4)', 
                          borderRadius: '12px', 
                          padding: '16px', 
                          textAlign: 'center' 
                        }}>
                          <ShieldCheck size={32} color="#e5409e" style={{ margin: '0 auto 8px' }} />
                          <h5 style={{ color: '#e5409e', margin: '0 0 6px', fontSize: '1rem' }}>In-Store Follow-Up</h5>
                          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 14px' }}>
                            For further clinical consultations, posture recalibration, and ergonomic doubts, visit your physiotherapist at The Sleep Company store.
                          </p>
                          <button
                            onClick={() => window.open(`https://wa.me/${patient?.phone || '919876543210'}?text=${encodeURIComponent(`Hi Dr. ${patient?.physioName || 'Physio'}, I would like to book a follow-up visit at the store.`)}`, '_blank')}
                            style={{
                              background: 'linear-gradient(135deg, #e5409e 0%, #a82070 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '20px',
                              padding: '8px 16px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            Book In-Store Revisit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              className="phase-fab"
              onClick={() => {
                const nextState = !showPhasesModal;
                closeAllPopups();
                setShowPhasesModal(nextState);
              }}
              aria-label="View Recovery Phases"
              title="Recovery Routine"
              style={{ position: 'relative', bottom: 'auto', right: 'auto', display: (isMobile && showPhasesModal) ? 'none' : 'flex' }}
            >
              <img 
                src="/arrow-logo-new.png" 
                alt="Phases Logo" 
                style={{ 
                  transform: showPhasesModal ? 'scale(1,-1)' : 'none', 
                  transition: 'transform 0.3s ease',
                  width: '65%',
                  height: '65%',
                  objectFit: 'contain'
                }} 
              />
            </button>
          </div>
        )}

        {/* Bottom Left: Floating Exercises Menu & SmartGrid Mode Toggle */}
        {introStage === 'ready' && !activePointId && (
          <div style={
            showPhasesModal
              ? { display: 'none' }
              : showExercisesModal && isMobile
                ? { position: 'fixed', bottom: 'max(16px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 45, width: 'min(calc(100vw - 28px), 360px)' }
                : { position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', left: 'calc(env(safe-area-inset-left, 0px) + 18px)', zIndex: 35, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }
          }>
            
            {/* Routine Progress Tracker Badge placed above exercises */}
            <div 
              style={{ 
                display: (isMobile && showExercisesModal) ? 'none' : 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                borderRadius: '20px',
                padding: '6px 14px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 15px rgba(0, 210, 255, 0.2)',
                animation: 'slideUpFade 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2ecc71', fontWeight: 700, fontSize: '0.78rem' }}>
                <CheckCircle2 size={13} />
                <span>{completedCount}/{exercises.length} TODAY</span>
              </div>
            </div>

            {/* Exercise List Popup */}
            {showExercisesModal && exercises.length > 0 && (
              <div 
                className="keep-menu-container" 
                style={{ alignItems: 'flex-start', transformOrigin: 'bottom left', zIndex: 45, width: '100%' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="keep-menu-card" 
                  style={{ 
                    width: isMobile ? '100%' : 'min(90vw, 340px)', 
                    maxHeight: 'min(65vh, 440px)', 
                    overflowY: 'auto',
                    borderRadius: '16px',
                    border: '1px solid #2ecc71',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(46, 204, 113, 0.25)',
                    padding: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid rgba(46, 204, 113, 0.2)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2ecc71', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Assigned Exercises
                    </span>
                    <button 
                      onClick={() => setShowExercisesModal(false)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {exercises.map((ex, i) => {
                      const isDone = !!completedExercises[ex.name];
                      return (
                        <div 
                          key={i} 
                          onClick={() => {
                            setActiveExercise(ex);
                            setShowExercisesModal(false);
                          }}
                          style={{ 
                            cursor: 'pointer', 
                            borderLeft: `4px solid ${isDone ? '#22c55e' : '#2ecc71'}`,
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>
                              {ex.name || `Exercise ${i + 1}`}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                              {ex.instructions || 'Tap to view exercise guide'}
                            </div>
                          </div>
                          {isDone ? (
                            <CheckCircle2 size={16} color="#22c55e" />
                          ) : (
                            <ChevronRight size={16} color="#64748b" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {exercises.length > 0 && (
              <button
                className="exercise-fab"
                onClick={() => {
                  const nextState = !showExercisesModal;
                  closeAllPopups();
                  setShowExercisesModal(nextState);
                }}
                aria-label="View recommended exercises"
                title="Recommended Exercises"
                style={{ position: 'relative', bottom: 'auto', left: 'auto', display: (isMobile && showExercisesModal) ? 'none' : 'flex' }}
              >
                <img 
                  src="/exercise-logo-new.png" 
                  alt="Exercises Logo" 
                  style={{
                    width: '90%',
                    height: '90%',
                    objectFit: 'contain',
                    transform: showExercisesModal ? 'scale(0.9)' : 'none', 
                    transition: 'transform 0.3s ease'
                  }} 
                />
              </button>
            )}
          </div>
        )}

        {/* Detailed Guided Exercise & Instructions Modal */}
        {activeExercise && (
          <ExerciseTimerModal 
            exercise={activeExercise}
            onClose={() => setActiveExercise(null)}
            onMarkDone={(name) => toggleExerciseDone(name)}
            isDone={!!completedExercises[activeExercise.name]}
          />
        )}
      </div>

      <style>{`
        /* ---- Phase & Exercise FABs ---- */
        .phase-fab, .exercise-fab {
          width: clamp(52px, 13vw, 64px);
          height: clamp(52px, 13vw, 64px);
          border-radius: 50%;
          border: 1px solid rgba(150, 240, 255, 0.35);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(150, 240, 255, 0.95);
          backdrop-filter: blur(8px);
          box-shadow: 0 0 25px rgba(150, 240, 255, 0.4);
          z-index: 15;
          animation: cartHeartbeat 1.6s ease-in-out infinite;
          transition: transform 0.2s ease;
          overflow: hidden;
        }
        .exercise-fab { animation-delay: 0.8s; }
        .phase-fab:hover, .exercise-fab:hover { transform: scale(1.08); }
        .phase-fab:active, .exercise-fab:active { transform: scale(0.95); }
        .phase-fab::after, .exercise-fab::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid rgba(150, 240, 255, 0.6);
          animation: cartRipple 1.6s ease-out infinite;
          pointer-events: none;
        }
        .exercise-fab::after { animation-delay: 0.8s; }
        
        @keyframes cartHeartbeat {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(150, 240, 255, 0.5), 0 6px 18px rgba(0,0,0,.45); }
          12% { transform: scale(1.12); box-shadow: 0 0 35px rgba(150, 240, 255, 0.75), 0 6px 18px rgba(0,0,0,.45); }
          22% { transform: scale(1); }
          32% { transform: scale(1.08); box-shadow: 0 0 25px rgba(150, 240, 255, 0.65), 0 6px 18px rgba(0,0,0,.45); }
          44% { transform: scale(1); }
        }
        @keyframes cartRipple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        
        .keep-menu-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
          animation: slideUpFade 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(16px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDownFade {
          0% { opacity: 0; transform: translate(-50%, -16px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }

        .keep-menu-card {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 212, 255, 0.35);
          border-radius: 14px;
          color: white;
          box-shadow: 0 10px 30px rgba(0,0,0,0.7);
        }

        /* Modal Overlay & Card */
        .cart-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3, 8, 20, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: cartFadeIn 0.25s ease-out;
        }
        .cart-modal {
          background: linear-gradient(180deg, rgba(13, 18, 30, 0.98), rgba(9, 13, 24, 0.98));
          border: 1px solid rgba(0, 212, 255, 0.35);
          border-radius: 20px;
          box-shadow: 0 0 40px rgba(0, 212, 255, 0.25), 0 24px 60px rgba(0, 0, 0, 0.7);
          animation: cartModalIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cart-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }
        .cart-modal-close {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .cart-modal-close:hover { 
          background: rgba(239, 68, 68, 0.2); 
          border-color: #ef4444; 
          color: #ef4444; 
        }

        @keyframes cartFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cartModalIn {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 640px) {
          .keep-menu-card {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
