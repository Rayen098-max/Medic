import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import BodyModel from './BodyModel';
import contentData from '../data/content.json';
import painPointsData from '../data/painPoints.json';
import productsCatalog from '../data/products.json';
import { getPatientById } from '../utils/db';
import { CheckCircle2, XCircle, ShoppingBag, X } from 'lucide-react';

export default function CustomerPortal() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [zone, setZone] = useState(null);
  const [activePointId, setActivePointId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [showExercisesModal, setShowExercisesModal] = useState(false);
  const [activeExercise, setActiveExercise] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        setPatient({ name: 'Test', physioName: 'Smith' });
        const matchedPoints = [painPointsData[0]];
        const combinedName = matchedPoints[0].name;
        const combinedDesc = matchedPoints[0].description;
        const uniqueProductsMap = new Map();
        matchedPoints.forEach(p => {
          p.products.forEach(prod => {
            if (!uniqueProductsMap.has(prod.id)) {
              uniqueProductsMap.set(prod.id, prod);
            }
          });
        });
        let fullProducts = Array.from(uniqueProductsMap.values()).map(p => {
          const catProd = productsCatalog.find(c => c.id === p.id);
          return { ...catProd, reason: p.reason };
        }).filter(p => p.id);
        const isBackPain = matchedPoints.some(p => {
           const z = p.zone?.toLowerCase() || '';
           return z.includes('back') || z.includes('neck') || z.includes('shoulder');
        });

        setZone({
            name: combinedName,
            description: combinedDesc,
            dos: matchedPoints[0].dos,
            donts: matchedPoints[0].donts,
            products: fullProducts,
            activeZones: [matchedPoints[0].id],
            recommendedExercises: [],
            isBack: isBackPain
        });
    }

    function processData(data) {
          setPatient(data);
          
          const pointIds = data.painPointId ? data.painPointId.split(',') : [];
          const matchedPoints = pointIds.map(id => painPointsData.find(p => p.id === id)).filter(Boolean);
          
          if (matchedPoints.length > 0) {
            const primaryName = matchedPoints[0].name;
            const combinedName = matchedPoints.length > 1 ? `${primaryName} + ${matchedPoints.length - 1} other${matchedPoints.length > 2 ? 's' : ''}` : primaryName;
            const combinedDesc = matchedPoints.map(p => p.description).join('\n\n');
            const combinedDos = [...new Set(matchedPoints.flatMap(p => p.dos))];
            const combinedDonts = [...new Set(matchedPoints.flatMap(p => p.donts))];
            
            const uniqueProductsMap = new Map();
            matchedPoints.forEach(p => {
              p.products.forEach(prod => {
                if (!uniqueProductsMap.has(prod.id)) {
                  uniqueProductsMap.set(prod.id, prod);
                }
              });
            });
            
            let fullProducts = Array.from(uniqueProductsMap.values()).map(p => {
              const catProd = productsCatalog.find(c => c.id === p.id);
              return { ...catProd, reason: p.reason };
            }).filter(p => p.id);

            fullProducts.sort((a, b) => a.priority - b.priority);

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
              products: fullProducts,
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

  // Close the solutions popup with the Escape key
  useEffect(() => {
    const onKey = (e) => { 
      if (e.key === 'Escape') {
        setShowProductsModal(false); 
        setShowExercisesModal(false);
        setActiveExercise(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Personalized browser tab title, mirroring the server-side og:title
  useEffect(() => {
    if (!patient) return;
    const person = patient.name ? `${patient.name}'s` : 'Your';
    let day = '';
    if (patient.consultDate) {
      const t = new Date(`${patient.consultDate}T00:00:00`).getTime();
      if (!Number.isNaN(t)) {
        const diff = Math.floor((Date.now() - t) / 86400000) + 1;
        if (diff > 0) day = String(diff);
      }
    }
    document.title = day ? `${person} Recovery Plan — Day ${day}` : `${person} Personalized Recovery Plan`;
  }, [patient]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--primary-bg)', color: 'var(--accent)' }}>Loading portal data...</div>;
  }

  if (!patient || !zone) {
    return <div style={{ padding: '40px', color: 'white' }}>Loading or record not found...</div>;
  }

  const activePointData = activePointId ? painPointsData.find(p => p.id === activePointId) : null;

  const renderScene = () => (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 10, 10]} intensity={2} />
      <directionalLight position={[-10, 10, -10]} intensity={2} />
      <directionalLight position={[0, -10, 0]} intensity={1} />
      <React.Suspense fallback={
        <Html center>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(0, 210, 255, 0.2)', borderTopColor: '#00d2ff', animation: 'spin 1s linear infinite' }} />
            <div style={{ color: '#00d2ff', fontSize: '1rem', whiteSpace: 'nowrap', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Loading Model...
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Html>
      }>
        <BodyModel 
          zones={painPointsData}
          activeZones={zone.activeZones}
          onZoneClick={(clickedId) => setActivePointId(clickedId)} 
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
        autoRotate={!activePointId}
        autoRotateSpeed={1}
      />
    </>
  );

  const renderHotspotOverlay = () => {
    if (!activePointData) return null;
    const customNote = zone?.conditionNotes?.[activePointData.id];

    return (
      <div style={{ 
        position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', 
        width: 'calc(100% - 48px)', maxWidth: '500px',
        background: 'rgba(5, 12, 25, 0.85)', border: '1px solid #00d2ff', 
        borderRadius: '12px', padding: '24px', zIndex: 20, 
        maxHeight: '60%', overflowY: 'auto', backdropFilter: 'blur(12px)',
        boxShadow: '0 0 20px rgba(0, 210, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, color: '#00d2ff', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{activePointData.name}</h4>
          <button onClick={() => setActivePointId(null)} style={{ background: 'transparent', border: 'none', color: '#00d2ff', padding: 0, cursor: 'pointer' }}><X size={20}/></button>
        </div>
        
        {customNote ? (
          <div>
            <div style={{ fontSize: '0.95rem', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16}/> 
              {patient?.physioName ? `${patient.physioName.toLowerCase().startsWith('dr') ? '' : 'DR. '}${patient.physioName.toUpperCase()}'S NOTES` : 'PHYSIO NOTES'}
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {customNote}
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '0.95rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><XCircle size={16}/> AVOID</div>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '24px', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5 }}>
              {activePointData.donts.map((item, i) => <li key={i} style={{marginBottom: '4px'}}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100dvh',
      backgroundImage: 'url(/grid_background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1, position: 'relative' }} onClick={(e) => { if(e.target === e.currentTarget) setActivePointId(null); }}>
        {/* Static Overlay Logo */}
        <div className="futuristic-logo-container overlay-logo" style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', left: 'max(14px, env(safe-area-inset-left))', zIndex: 10 }}>
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
          <div className="circuit-lines">
            <span className="circuit-line-left"></span>
            <span className="circuit-line-right"></span>
            <span className="circuit-floor-glow"></span>
          </div>
        </div>

        <Canvas style={{ position: 'absolute', inset: 0, touchAction: 'none' }} dpr={[1, 1.5]} camera={{ position: [0, 0, zone.isBack ? -(isMobile ? 14 : 9) : (isMobile ? 14 : 9)], fov: 45 }}>
          {renderScene()}
        </Canvas>
        {renderHotspotOverlay()}

        {/* Floating cart button — pulsing heartbeat glow */}
        {!activePointId && zone.products.length > 0 && (
          <button
            className="cart-fab"
            onClick={() => setShowProductsModal(true)}
            aria-label="View recommended solutions"
            title="Recommended Solutions"
          >
            <ShoppingBag size={28} strokeWidth={2} />
            <span className="cart-fab-badge">{zone.products.length}</span>
          </button>
        )}

        {/* Recommended solutions popup */}
        {showProductsModal && (
          <div className="cart-modal-overlay" onClick={() => setShowProductsModal(false)}>
            <div className="cart-modal" role="dialog" aria-modal="true" aria-label="Recommended solutions" onClick={(e) => e.stopPropagation()}>
              <div className="cart-modal-header">
                <div>
                  <h3>Recommended Solutions</h3>
                  <p>Curated by The Sleep Company for your recovery</p>
                </div>
                <button className="cart-modal-close" onClick={() => setShowProductsModal(false)} aria-label="Close recommendations">
                  <X size={22} />
                </button>
              </div>
              <div className="cart-modal-body">
                {zone.products.map((p, i) => {
                  const catProd = productsCatalog.find(c => c.id === p.id);
                  if (!catProd) return null;
                  return (
                    <div className="cart-product-card" key={i}>
                      <img src={catProd.image} alt={catProd.name} />
                      <div className="cart-product-info">
                        <span className="cart-product-category">{catProd.category}</span>
                        <h4>{catProd.name}</h4>
                        <p>{p.reason}</p>
                        <a href={catProd.url} target="_blank" rel="noreferrer" className="cart-product-link">
                          View on Store
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="cart-modal-footer">Powered by The Sleep Company</div>
            </div>
          </div>
        )}

        {/* Floating exercises button */}
        {!activePointId && zone.recommendedExercises && zone.recommendedExercises.length > 0 && (
          <button
            className="exercise-fab"
            onClick={() => setShowExercisesModal(true)}
            aria-label="View recommended exercises"
            title="Recommended Exercises"
          >
            <img src="/exercise-logo.png" alt="Exercises Logo" />
            <span className="cart-fab-badge" style={{ color: '#2ecc71' }}>{zone.recommendedExercises.length}</span>
          </button>
        )}

        {/* Recommended exercises popup */}
        {showExercisesModal && (
          <div className="cart-modal-overlay" onClick={() => setShowExercisesModal(false)}>
            <div className="cart-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="cart-modal-header">
                <div>
                  <h3 style={{ color: '#2ecc71' }}>Recommended Exercises</h3>
                  <p>Curated by your Physiotherapist</p>
                </div>
                <button className="cart-modal-close" onClick={() => setShowExercisesModal(false)}>
                  <X size={22} />
                </button>
              </div>
              <div className="cart-modal-body">
                {zone.recommendedExercises.map((ex, i) => (
                  <div className="cart-product-card" key={i} onClick={() => setActiveExercise(ex)} style={{ cursor: 'pointer', flexDirection: 'column' }}>
                    {ex.image && <img src={ex.image} alt="Exercise" style={{ width: '100%', height: '140px', objectFit: 'cover' }} />}
                    <div className="cart-product-info" style={{ marginTop: '12px', width: '100%' }}>
                      <span className="cart-product-category" style={{ color: '#2ecc71', background: 'rgba(46, 204, 113, 0.12)', borderColor: 'rgba(46, 204, 113, 0.3)' }}>EXERCISE {i + 1}</span>
                      <p style={{ whiteSpace: 'pre-wrap', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.instructions}</p>
                      <div style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '8px' }}>Tap to view details →</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Exercise View */}
        {activeExercise && (
          <div className="cart-modal-overlay" style={{ zIndex: 40 }} onClick={() => setActiveExercise(null)}>
            <div className="cart-modal" style={{ height: 'auto', maxHeight: '90vh', width: 'min(90vw, 600px)' }} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="cart-modal-header">
                <h3 style={{ color: '#2ecc71' }}>Exercise Detail</h3>
                <button className="cart-modal-close" onClick={() => setActiveExercise(null)}>
                  <X size={22} />
                </button>
              </div>
              <div className="cart-modal-body" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                {activeExercise.image && (
                  <img src={activeExercise.image} alt="Exercise Detail" style={{ width: '100%', maxHeight: '45vh', objectFit: 'contain', background: '#000' }} />
                )}
                <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                  <h4 style={{ color: 'white', marginTop: 0, marginBottom: '16px', fontSize: '1.2rem' }}>Instructions</h4>
                  <p style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '1rem', margin: 0 }}>{activeExercise.instructions}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ---- Cart FAB ---- */
        .cart-fab {
          position: absolute;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
          right: calc(env(safe-area-inset-right, 0px) + 18px);
          width: clamp(54px, 14vw, 66px);
          height: clamp(54px, 14vw, 66px);
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: linear-gradient(180deg, #ff6b81 0%, #e5409e 35%, #9b5cf6 70%, #00d4ff 100%);
          box-shadow: 0 0 20px rgba(255, 107, 129, 0.55), 0 0 40px rgba(0, 212, 255, 0.35), 0 6px 18px rgba(0, 0, 0, 0.45);
          z-index: 15;
          animation: cartHeartbeat 1.6s ease-in-out infinite;
          transition: transform 0.2s ease;
        }
        .cart-fab:hover { transform: scale(1.08); }
        .cart-fab:active { transform: scale(0.95); }
        .cart-fab::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid rgba(0, 212, 255, 0.6);
          animation: cartRipple 1.6s ease-out infinite;
          pointer-events: none;
        }
        @keyframes cartHeartbeat {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255,107,129,.5), 0 0 40px rgba(0,212,255,.3), 0 6px 18px rgba(0,0,0,.45); }
          12% { transform: scale(1.12); box-shadow: 0 0 30px rgba(255,107,129,.75), 0 0 60px rgba(0,212,255,.5), 0 6px 18px rgba(0,0,0,.45); }
          22% { transform: scale(1); }
          32% { transform: scale(1.08); box-shadow: 0 0 26px rgba(255,107,129,.65), 0 0 50px rgba(0,212,255,.4), 0 6px 18px rgba(0,0,0,.45); }
          44% { transform: scale(1); }
        }
        @keyframes cartRipple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        .exercise-fab {
          position: absolute;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
          left: calc(env(safe-area-inset-left, 0px) + 18px);
          width: clamp(54px, 14vw, 66px);
          height: clamp(54px, 14vw, 66px);
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          box-shadow: 0 0 20px rgba(46, 204, 113, 0.55), 0 0 40px rgba(46, 204, 113, 0.35), 0 6px 18px rgba(0, 0, 0, 0.45);
          z-index: 15;
          animation: cartHeartbeat 1.6s ease-in-out infinite;
          animation-delay: 0.8s;
          transition: transform 0.2s ease;
          overflow: hidden;
        }
        .exercise-fab img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .exercise-fab:hover { transform: scale(1.08); }
        .exercise-fab:active { transform: scale(0.95); }
        .exercise-fab::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid rgba(46, 204, 113, 0.6);
          animation: cartRipple 1.6s ease-out infinite;
          animation-delay: 0.8s;
          pointer-events: none;
        }
        .cart-fab-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          min-width: 22px;
          height: 22px;
          padding: 0 5px;
          border-radius: 11px;
          background: #fff;
          color: #e5409e;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
        }

        /* ---- Solutions modal ---- */
        .cart-modal-overlay {
          position: absolute;
          inset: 0;
          background: rgba(3, 8, 20, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: cartFadeIn 0.25s ease-out;
        }
        .cart-modal {
          width: min(440px, calc(100vw - 32px));
          max-height: min(78vh, 640px);
          background: linear-gradient(180deg, rgba(13, 18, 30, 0.98), rgba(9, 13, 24, 0.98));
          border: 1px solid rgba(0, 212, 255, 0.35);
          border-radius: 20px;
          box-shadow: 0 0 40px rgba(0, 212, 255, 0.25), 0 24px 60px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: cartModalIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cart-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          padding: 20px 20px 14px;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }
        .cart-modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #00d2ff;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .cart-modal-header p { margin: 4px 0 0; font-size: 0.8rem; color: var(--text-muted); }
        .cart-modal-close {
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border-color);
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
        .cart-modal-close:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #ef4444; }
        .cart-modal-body {
          padding: 16px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cart-product-card {
          display: flex;
          gap: 12px;
          background: rgba(13, 17, 23, 0.8);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px;
          align-items: flex-start;
        }
        .cart-product-card img {
          width: 76px;
          height: 76px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .cart-product-info { flex: 1; min-width: 0; }
        .cart-product-category {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #00d2ff;
          background: rgba(0, 210, 255, 0.12);
          border: 1px solid rgba(0, 210, 255, 0.3);
          border-radius: 999px;
          padding: 2px 8px;
          margin-bottom: 6px;
        }
        .cart-product-info h4 { margin: 0 0 4px; font-size: 0.92rem; color: #fff; line-height: 1.3; }
        .cart-product-info p { margin: 0 0 8px; font-size: 0.78rem; color: var(--text-muted); line-height: 1.45; }
        .cart-product-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #00d2ff;
          text-decoration: none;
          border: 1px solid #00d2ff;
          border-radius: 999px;
          padding: 5px 14px;
          transition: all 0.2s;
        }
        .cart-product-link:hover { background: rgba(0, 210, 255, 0.15); box-shadow: 0 0 12px rgba(0, 210, 255, 0.35); }
        .cart-modal-footer {
          padding: 10px 20px;
          border-top: 1px solid rgba(0, 212, 255, 0.15);
          text-align: center;
          font-size: 0.72rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        @keyframes cartFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cartModalIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ---- Mobile: bottom-sheet popup, safe-area aware ---- */
        @media (max-width: 640px) {
          .cart-modal {
            width: calc(100vw - 24px);
            max-height: 80vh;
            border-radius: 20px 20px 14px 14px;
            animation: cartSheetIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          }
          .cart-fab {
            bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
            right: calc(env(safe-area-inset-right, 0px) + 14px);
          }
          .exercise-fab {
            bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
            left: calc(env(safe-area-inset-left, 0px) + 14px);
          }
          @keyframes cartSheetIn {
            from { opacity: 0.4; transform: translateY(100%); }
            to { opacity: 1; transform: translateY(0); }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cart-fab, .cart-fab::after { animation: none; }
          .cart-modal, .cart-modal-overlay { animation-duration: 0.01s; }
        }
      `}</style>
    </div>
  );
}
