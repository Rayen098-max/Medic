import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import BodyModel from './BodyModel';
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
  Flame, 
  Clock, 
  Play, 
  Sparkles, 
  Layers, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  Activity
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function CustomerPortal() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [zone, setZone] = useState(null);
  const [activePointId, setActivePointId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Popups & Panels state
  const [showPhasesModal, setShowPhasesModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showExercisesModal, setShowExercisesModal] = useState(false);
  const [activeExercise, setActiveExercise] = useState(null);
  const [activeWeekTab, setActiveWeekTab] = useState('1'); // '1' | '2' | '3' | 'consult'

  // Upgrades state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedExercises, setCompletedExercises] = useState({});
  const [streakDays, setStreakDays] = useState(1);

  // Cinematic Intro Animation state
  // stages: 'assembling' (0-1.6s) -> 'targeting' (1.6-3.0s) -> 'locked' (3.0-3.6s) -> 'ready' (3.6s+)
  const [introStage, setIntroStage] = useState('assembling');
  const [introProgress, setIntroProgress] = useState(0);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (!patient?.id || loading) return;
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

  // Load patient data & streak
  useEffect(() => {
    async function loadData() {
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
      } finally {
        setLoading(false);
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
        isBack: false
      });
    }

    function processData(data) {
      setPatient(data);
      if (data.daily_streak) setStreakDays(data.daily_streak);
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
          const z = p.zone?.toLowerCase() || '';
          return z.includes('back') || z.includes('neck') || z.includes('shoulder');
        });

        setZone({
          name: combinedName,
          description: combinedDesc,
          dos: combinedDos,
          donts: combinedDonts,
          activeZones: activeZoneIds,
          recommendedExercises: data.recommendedExercises || [],
          conditionNotes: data.conditionNotes || {},
          isBack: isBackPain
        });
      } else {
        const matchedZone = contentData.zones.find(z => z.id === data.painArea);
        setZone({ ...matchedZone, activeZones: matchedZone ? [matchedZone.id] : [] });
      }
    }

    loadData();
  }, [id]);

  // Load and sync Daily Streak & Exercise completion from localStorage
  useEffect(() => {
    if (!patient?.id) return;
    const today = new Date().toISOString().slice(0, 10);
    const savedDone = localStorage.getItem(`medic_done_${patient.id}_${today}`);
    if (savedDone) {
      try { setCompletedExercises(JSON.parse(savedDone)); } catch(e) {}
    }

    const savedStreak = localStorage.getItem(`medic_streak_${patient.id}`);
    if (savedStreak) {
      setStreakDays(parseInt(savedStreak, 10) || 1);
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
    localStorage.setItem(`medic_done_${patient.id}_${today}`, JSON.stringify(updated));

    // Update streak if completing first exercise today
    const anyDone = Object.values(updated).some(Boolean);
    const currentStreak = anyDone ? (streakDays || 1) : streakDays;
    if (anyDone) {
      setStreakDays(currentStreak);
      localStorage.setItem(`medic_streak_${patient.id}`, currentStreak.toString());
    }

    // Persist to Supabase if table columns exist
    updatePatientProgress(patient.id, currentStreak, updated);
  };

  // Cinematic Intro Animation Orchestration
  useEffect(() => {
    if (loading || !zone) return;

    // Check if user already saw intro in this tab session
    const seen = sessionStorage.getItem(`medic_intro_seen_${id}`);
    if (seen) {
      setIntroStage('ready');
      return;
    }

    // Phase 1: Assembling 3D Body (0.0s - 1.6s)
    setIntroStage('assembling');
    sounds.playAssemblyWhoosh();

    const t1 = setTimeout(() => {
      // Phase 2: Shooting Laser Projectile Dots (1.6s - 3.0s)
      setIntroStage('targeting');
      sounds.playLaserShot();
    }, 1600);

    const t2 = setTimeout(() => {
      // Phase 3: Pain Points Lock & Beacon Chime (3.0s - 3.6s)
      setIntroStage('locked');
      sounds.playTargetLock();
    }, 3000);

    const t3 = setTimeout(() => {
      // Phase 4: Settle into Ready & Reveal Interactive UI HUD (3.6s+)
      setIntroStage('ready');
      sessionStorage.setItem(`medic_intro_seen_${id}`, 'true');
    }, 3700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading, zone, id]);

  const skipIntro = () => {
    setIntroStage('ready');
    sessionStorage.setItem(`medic_intro_seen_${id}`, 'true');
  };

  const replayIntro = () => {
    sessionStorage.removeItem(`medic_intro_seen_${id}`);
    setIntroStage('assembling');
    sounds.playAssemblyWhoosh();
    setTimeout(() => {
      setIntroStage('targeting');
      sounds.playLaserShot();
    }, 1600);
    setTimeout(() => {
      setIntroStage('locked');
      sounds.playTargetLock();
    }, 3000);
    setTimeout(() => {
      setIntroStage('ready');
    }, 3700);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#030814', color: '#00d2ff', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(0, 210, 255, 0.2)', borderTopColor: '#00d2ff', animation: 'spin 1s linear infinite' }} />
        <div style={{ letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.9rem', fontWeight: 700 }}>
          Initializing Recovery Portal...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
        <BodyModel 
          zones={[...painPointsData, ...(patient?.customConditions || [])]}
          activeZones={zone.activeZones}
          onZoneClick={(clickedId) => {
            closeAllPopups();
            setActivePointId(clickedId);
          }} 
          introStage={introStage}
          activePointId={activePointId}
        />
        <ContactShadows resolution={256} frames={1} position={[0, -3.5, 0]} opacity={0.5} scale={20} blur={2} far={4.5} />
        <Environment preset="city" />
      </React.Suspense>
      <OrbitControls 
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        autoRotate={introStage === 'ready' && !activePointId && !isAnyPopupOpen}
        autoRotateSpeed={0.8}
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
          position: 'absolute', 
          bottom: '24px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: 'calc(100% - 32px)', 
          maxWidth: '520px',
          background: 'rgba(9, 14, 28, 0.95)', 
          border: '1px solid #00d2ff', 
          borderRadius: '16px', 
          padding: '20px 24px', 
          zIndex: 45, 
          maxHeight: 'min(70vh, 480px)', 
          overflowY: 'auto', 
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 35px rgba(0, 210, 255, 0.25)',
          animation: 'slideUpFade 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
      backgroundImage: 'url(/grid_background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
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
            position: 'absolute', 
            inset: 0, 
            zIndex: 30, 
            background: 'rgba(0, 0, 0, 0.4)', 
            backdropFilter: 'blur(3px)',
            transition: 'opacity 0.25s ease'
          }} 
        />
      )}

      {/* 3D Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        
        {/* Futuristic Holographic Logo */}
        <div 
          className="futuristic-logo-container overlay-logo" 
          style={{ 
            position: 'absolute', 
            top: 'max(14px, env(safe-area-inset-top))', 
            left: 'max(14px, env(safe-area-inset-left))', 
            zIndex: 25,
            opacity: introStage === 'ready' ? 1 : 0.8,
            transition: 'opacity 0.8s ease'
          }}
        >
          <svg className="logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 150" role="img" aria-label="The Sleep Company">
            <defs>
              <filter id="neonHologramGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="coreBlur" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="outerGlow" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="aura" />
                <feMerge>
                  <feMergeNode in="aura" />
                  <feMergeNode in="outerGlow" />
                  <feMergeNode in="coreBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <style>{`
                .neon-wireframe {
                  stroke: #5cf2ff;
                  fill: none;
                  stroke-width: 2.5;
                  filter: url(#neonHologramGlow);
                }
                .neon-text-wireframe {
                  font-family: 'Arial Rounded MT Bold', 'Montserrat', sans-serif;
                  font-weight: 900;
                  letter-spacing: 4px;
                  fill: none;
                  stroke: #66f7ff;
                  stroke-width: 1.8;
                  stroke-linejoin: round;
                  filter: url(#neonHologramGlow);
                }
                .inner-glow-fill {
                  fill: #3bf0ff;
                  fill-opacity: 0.15;
                  filter: url(#neonHologramGlow);
                }
              `}</style>
            </defs>

            <g transform="translate(20, 20)">
              <g>
                <rect className="neon-wireframe" x="10" y="10" width="75" height="75" rx="2" />
                <rect className="neon-wireframe" x="18" y="18" width="59" height="59" strokeWidth="1.5" />
              </g>
              <g>
                <rect className="neon-wireframe" x="40" y="40" width="75" height="75" rx="2" />
                <rect className="neon-wireframe" x="48" y="48" width="59" height="59" strokeWidth="1.5" />
              </g>
              <rect className="inner-glow-fill" x="40" y="40" width="45" height="45" />
              <text x="140" y="52" className="neon-text-wireframe" fontSize="34">THE SLEEP</text>
              <text x="140" y="98" className="neon-text-wireframe" fontSize="34">COMPANY</text>
            </g>
          </svg>
        </div>

        {/* Top Center: Daily Streak & Routine Progress Tracker HUD */}

        {/* Cinematic Intro Banner & Controls during Intro */}
        {introStage !== 'ready' && (
          <div style={{ position: 'absolute', top: 'max(20px, env(safe-area-inset-top))', right: 'max(20px, env(safe-area-inset-right))', zIndex: 35, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                color: '#00d2ff',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={skipIntro}
              style={{
                background: 'rgba(0, 210, 255, 0.15)',
                border: '1px solid #00d2ff',
                color: '#00d2ff',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '1px',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
            >
              SKIP INTRO ⏭
            </button>
          </div>
        )}

        {/* Intro Scan HUD Overlay Status */}
        {introStage !== 'ready' && (
          <div style={{ 
            position: 'absolute', 
            bottom: '40px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 25, 
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{ 
              color: '#00d2ff', 
              fontSize: '0.85rem', 
              letterSpacing: '3px', 
              textTransform: 'uppercase', 
              fontWeight: 800,
              textShadow: '0 0 15px rgba(0, 210, 255, 0.8)'
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
          camera={{ position: [0, 0, zone.isBack ? -(isMobile ? 14 : 9) : (isMobile ? 14 : 9)], fov: 45 }}
        >
          {renderScene()}
        </Canvas>

        {/* Pain Point Hotspot Details Panel */}
        {renderHotspotOverlay()}

        {/* Top Right: Medical Disclaimer Button & Properly Contrained Modal */}
        {introStage === 'ready' && (
          <div style={{ 
            position: 'absolute', 
            top: 'max(20px, env(safe-area-inset-top))', 
            right: 'max(20px, env(safe-area-inset-right))', 
            zIndex: 35, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end', 
            gap: '12px' 
          }}>
            <button
              className="exercise-fab"
              onClick={() => {
                const nextState = !showDisclaimerModal;
                closeAllPopups();
                setShowDisclaimerModal(nextState);
              }}
              aria-label="View Medical Disclaimer"
              title="Medical Disclaimer"
              style={{ width: 'clamp(44px, 11vw, 54px)', height: 'clamp(44px, 11vw, 54px)', animationDelay: '0.2s' }}
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
            
            {showDisclaimerModal && (
              <div 
                className="keep-menu-container" 
                style={{ transformOrigin: 'top right', zIndex: 40 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="keep-menu-card" 
                  style={{ 
                    width: 'min(92vw, 420px)', 
                    maxHeight: 'min(75vh, 520px)', 
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
          <div style={{ 
            position: 'absolute', 
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', 
            right: 'calc(env(safe-area-inset-right, 0px) + 18px)', 
            zIndex: 35, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end', 
            gap: '12px' 
          }}>
            
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

                          {/* Quick Timer CTA button */}
                          <button
                            onClick={() => {
                              setActiveExercise(ex);
                              setShowPhasesModal(false);
                            }}
                            style={{
                              marginTop: '8px',
                              background: 'transparent',
                              border: 'none',
                              color: '#2ecc71',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: 0
                            }}
                          >
                            <Play size={12} fill="#2ecc71" /> Open Hold Timer & Guide →
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
                  style={{ zIndex: 40 }}
                >
                  <div 
                    className="keep-menu-card" 
                    style={{ 
                      width: 'min(92vw, 360px)', 
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
              style={{ position: 'relative', bottom: 'auto', right: 'auto' }}
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
          <div style={{ 
            position: 'absolute', 
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', 
            left: 'calc(env(safe-area-inset-left, 0px) + 18px)', 
            zIndex: 35, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start', 
            gap: '12px' 
          }}>
            
            {/* Daily Streak & Routine Progress Tracker Badge placed above exercises */}
            <div 
              style={{ 
                display: 'flex',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ff9900', fontWeight: 800, fontSize: '0.82rem' }}>
                <Flame size={15} fill="#ff9900" />
                <span>{streakDays} DAY STREAK</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2ecc71', fontWeight: 700, fontSize: '0.78rem' }}>
                <CheckCircle2 size={13} />
                <span>{completedCount}/{exercises.length} TODAY</span>
              </div>
            </div>

            {/* Exercise List Popup */}
            {showExercisesModal && exercises.length > 0 && (
              <div 
                className="keep-menu-container" 
                style={{ alignItems: 'flex-start', transformOrigin: 'bottom left', zIndex: 40 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="keep-menu-card" 
                  style={{ 
                    width: 'min(90vw, 320px)', 
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
                              {ex.instructions || 'Tap to view instructions & timer'}
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
                style={{ position: 'relative', bottom: 'auto', left: 'auto' }}
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

        {/* Detailed Guided Exercise Timer & Instructions Modal */}
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
            width: calc(100vw - 32px) !important;
          }
        }
      `}</style>
    </div>
  );
}
