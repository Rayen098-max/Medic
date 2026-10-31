import React from 'react';
import { X, CheckCircle2, Sparkles, Activity, Calendar, Clock, RotateCw } from 'lucide-react';

export default function ExerciseTimerModal({ exercise, onClose, onMarkDone, isDone }) {
  if (!exercise) return null;

  const hasDuration = exercise.duration && String(exercise.duration).trim() !== '' && parseInt(exercise.duration, 10) > 0;
  const hasSets = exercise.sets && String(exercise.sets).trim() !== '' && parseInt(exercise.sets, 10) > 0;
  const hasWeek = exercise.week && String(exercise.week).trim() !== '';

  return (
    <div className="cart-modal-overlay" onClick={onClose} style={{ zIndex: 50 }}>
      <div 
        className="cart-modal" 
        style={{ 
          width: 'min(94vw, 520px)', 
          maxHeight: '90vh', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          background: 'linear-gradient(180deg, rgba(13, 20, 36, 0.98), rgba(9, 14, 26, 0.98))',
          border: '1px solid rgba(0, 210, 255, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 0 40px rgba(0, 210, 255, 0.2), 0 24px 60px rgba(0, 0, 0, 0.8)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="cart-modal-header" 
          style={{ 
            alignItems: 'center',
            padding: '18px 20px',
            borderBottom: '1px solid rgba(0, 210, 255, 0.2)',
            background: 'rgba(15, 23, 42, 0.95)'
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00d2ff', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Exercise Guide & Instructions
            </span>
            <h3 style={{ color: '#f8fafc', margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
              {exercise.name || 'Prescribed Exercise'}
            </h3>
          </div>
          <button 
            className="cart-modal-close" 
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94a3b8',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Prescription Badges / Chips */}
          {(hasWeek || hasDuration || hasSets) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {hasWeek && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(0, 210, 255, 0.1)', 
                  border: '1px solid rgba(0, 210, 255, 0.3)', 
                  padding: '5px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.78rem', 
                  color: '#00d2ff', 
                  fontWeight: 700 
                }}>
                  <Calendar size={13} /> Week {exercise.week}
                </div>
              )}
              {hasDuration && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(46, 204, 113, 0.1)', 
                  border: '1px solid rgba(46, 204, 113, 0.3)', 
                  padding: '5px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.78rem', 
                  color: '#2ecc71', 
                  fontWeight: 700 
                }}>
                  <Clock size={13} /> {exercise.duration} mins
                </div>
              )}
              {hasSets && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(255, 153, 0, 0.1)', 
                  border: '1px solid rgba(255, 153, 0, 0.3)', 
                  padding: '5px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.78rem', 
                  color: '#ff9900', 
                  fontWeight: 700 
                }}>
                  <RotateCw size={13} /> {exercise.sets} sets daily
                </div>
              )}
            </div>
          )}

          {/* Exercise Image / Diagram */}
          {exercise.image && (
            <div style={{ 
              width: '100%',
              flexShrink: 0,
              maxHeight: 'min(50vh, 360px)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#040714',
              padding: '6px',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
            }}>
              <img 
                src={exercise.image} 
                alt={exercise.name || 'Exercise'} 
                style={{ 
                  maxWidth: '100%',
                  maxHeight: 'calc(min(50vh, 360px) - 14px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: '10px'
                }} 
              />
            </div>
          )}

          {/* Instructions Box */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '10px', 
              color: '#00d2ff', 
              fontWeight: 800, 
              fontSize: '0.85rem',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              <Activity size={16} /> How to Perform
            </div>
            <p style={{ 
              color: '#f1f5f9', 
              lineHeight: 1.65, 
              fontSize: '0.94rem', 
              margin: 0, 
              whiteSpace: 'pre-wrap' 
            }}>
              {exercise.instructions || 'Perform as directed by your physiotherapist.'}
            </p>
          </div>

          {/* Custom Plan (Physio's Special Guidance) */}
          {exercise.customPlan && (
            <div style={{ 
              background: 'rgba(0, 210, 255, 0.08)', 
              border: '1px solid rgba(0, 210, 255, 0.3)', 
              borderLeft: '4px solid #00d2ff', 
              borderRadius: '10px', 
              padding: '14px 16px' 
            }}>
              <div style={{ 
                fontSize: '0.78rem', 
                color: '#00d2ff', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '1px',
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={14} /> Physio's Special Guidance
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {exercise.customPlan}
              </div>
            </div>
          )}

          {/* Mark Complete Check-off CTA */}
          <button
            onClick={() => onMarkDone && onMarkDone(exercise.name)}
            style={{
              marginTop: '4px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px 18px',
              borderRadius: '12px',
              border: isDone ? '1px solid #22c55e' : '1px solid rgba(0, 210, 255, 0.35)',
              background: isDone 
                ? 'rgba(34, 197, 94, 0.18)' 
                : 'linear-gradient(135deg, rgba(0, 210, 255, 0.2) 0%, rgba(0, 150, 255, 0.1) 100%)',
              color: isDone ? '#22c55e' : '#f8fafc',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isDone ? '0 0 20px rgba(34, 197, 94, 0.25)' : '0 0 20px rgba(0, 210, 255, 0.15)'
            }}
          >
            {isDone ? (
              <><CheckCircle2 size={18} color="#22c55e" /> Completed Today (Tap to Undo)</>
            ) : (
              <><CheckCircle2 size={18} color="#00d2ff" /> Mark Exercise Completed For Today</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
