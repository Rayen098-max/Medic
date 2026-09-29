import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, CheckCircle2, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function ExerciseTimerModal({ exercise, onClose, onMarkDone, isDone }) {
  // Determine starting duration: default to 30s if not specified or parsed
  const parsedDuration = parseInt(exercise?.duration, 10);
  const initialSeconds = !isNaN(parsedDuration) && parsedDuration > 0 ? (parsedDuration < 5 ? parsedDuration * 60 : parsedDuration) : 30;

  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [justCompleted, setJustCompleted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    sounds.setMuted(!soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            setJustCompleted(true);
            sounds.playTimerComplete();
            if (onMarkDone) onMarkDone(exercise.name);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, exercise.name, onMarkDone]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialSeconds);
    setJustCompleted(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = Math.max(0, Math.min(100, ((initialSeconds - timeLeft) / initialSeconds) * 100));

  return (
    <div className="cart-modal-overlay" onClick={onClose} style={{ zIndex: 50 }}>
      <div 
        className="cart-modal" 
        style={{ width: 'min(92vw, 540px)', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="cart-modal-header" style={{ alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#00d2ff', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Guided Routine
            </span>
            <h3 style={{ color: '#2ecc71', margin: '2px 0 0' }}>{exercise.name || 'Exercise Routine'}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ background: 'transparent', border: 'none', color: soundEnabled ? '#00d2ff' : '#64748b', cursor: 'pointer', padding: '6px' }}
              title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button className="cart-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {exercise.image && (
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0, 210, 255, 0.2)', maxHeight: '200px', background: '#000' }}>
              <img src={exercise.image} alt={exercise.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}

          {/* Interactive Countdown Timer */}
          <div style={{ 
            background: 'radial-gradient(circle, rgba(0, 210, 255, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)', 
            border: '1px solid rgba(0, 210, 255, 0.3)', 
            borderRadius: '16px', 
            padding: '24px 16px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            boxShadow: '0 0 25px rgba(0, 210, 255, 0.15)'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
              {isRunning ? 'Hold Position' : timeLeft === 0 ? 'Completed!' : 'Hold Timer'}
            </div>

            {/* Big Digital Display */}
            <div style={{ 
              fontSize: '3.6rem', 
              fontFamily: 'monospace', 
              fontWeight: 900, 
              color: timeLeft === 0 ? '#2ecc71' : isRunning ? '#00d2ff' : '#f8fafc',
              textShadow: timeLeft === 0 ? '0 0 20px rgba(46, 204, 113, 0.6)' : isRunning ? '0 0 20px rgba(0, 210, 255, 0.6)' : 'none',
              letterSpacing: '2px'
            }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>

            {/* Linear Progress Bar */}
            <div style={{ width: '80%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', margin: '14px 0 20px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${progressPercent}%`, 
                background: timeLeft === 0 ? '#2ecc71' : 'linear-gradient(90deg, #00d2ff, #2ecc71)',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Timer Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={resetTimer}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#cbd5e1',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Reset Timer"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={toggleTimer}
                style={{
                  background: isRunning ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #00d2ff 0%, #0099ff 100%)',
                  border: isRunning ? '1px solid #ef4444' : 'none',
                  color: '#fff',
                  borderRadius: '30px',
                  padding: '12px 28px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: isRunning ? '0 0 15px rgba(239, 68, 68, 0.4)' : '0 0 25px rgba(0, 210, 255, 0.5)',
                  transition: 'all 0.2s'
                }}
              >
                {isRunning ? (
                  <><Pause size={18} /> PAUSE</>
                ) : (
                  <><Play size={18} fill="#fff" /> START TIMER</>
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h4 style={{ color: 'var(--text-main)', margin: '0 0 8px', fontSize: '1.05rem' }}>Physio Instructions</h4>
            <p style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '0.92rem', margin: 0, whiteSpace: 'pre-wrap' }}>
              {exercise.instructions || 'Perform as directed by your physiotherapist.'}
            </p>
          </div>

          {/* Custom Plan if available */}
          {exercise.customPlan && (
            <div style={{ background: 'rgba(0, 210, 255, 0.08)', border: '1px dashed rgba(0, 210, 255, 0.3)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: '#00d2ff', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                Physio's Special Guidance
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.5 }}>
                {exercise.customPlan}
              </div>
            </div>
          )}

          {/* Mark Complete Check-off CTA */}
          <button
            onClick={() => onMarkDone && onMarkDone(exercise.name)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '12px',
              border: isDone ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.2)',
              background: isDone ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              color: isDone ? '#22c55e' : '#f8fafc',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isDone ? (
              <><CheckCircle2 size={18} color="#22c55e" /> Completed Today (Tap to Undo)</>
            ) : (
              <><Sparkles size={18} color="#00d2ff" /> Mark Completed For Today</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
