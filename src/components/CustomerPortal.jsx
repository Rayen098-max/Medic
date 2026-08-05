import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import BodyModel from './BodyModel';
import contentData from '../data/content.json';
import painPointsData from '../data/painPoints.json';
import productsCatalog from '../data/products.json';
import { getPatientById } from '../utils/db';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, ArrowLeft, X } from 'lucide-react';

export default function CustomerPortal() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [zone, setZone] = useState(null);
  const [activePointId, setActivePointId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProductsModal, setShowProductsModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPatientById(id);
        if (data) {
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

            setZone({
              name: combinedName,
              description: combinedDesc,
              dos: combinedDos,
              donts: combinedDonts,
              products: fullProducts,
              activeZones: activeZoneIds
            });
          } else {
            const matchedZone = contentData.zones.find(z => z.id === data.painArea);
            setZone({ ...matchedZone, activeZones: matchedZone ? [matchedZone.id] : [] });
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--primary-bg)', color: 'var(--accent)' }}>Loading portal data...</div>;
  }

  if (error) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--primary-bg)', color: 'var(--accent)' }}>Error loading database. Make sure you set your Supabase API keys!</div>;
  }

  if (!patient || !zone) {
    return <div style={{ padding: '40px', color: 'white' }}>Loading or record not found...</div>;
  }

  const activePointData = activePointId ? painPointsData.find(p => p.id === activePointId) : null;

  const renderScene = () => (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
      <React.Suspense fallback={null}>
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
        autoRotate={!activePointId}
        autoRotateSpeed={1}
      />
    </>
  );

  const renderHotspotOverlay = () => {
    if (!activePointData) return null;
    return (
      <div style={{ 
        position: 'absolute', bottom: '16px', left: '16px', right: '16px', 
        background: 'rgba(13,17,23,0.95)', border: '1px solid var(--border-color)', 
        borderRadius: '8px', padding: '16px', zIndex: 20, 
        maxHeight: '50%', overflowY: 'auto', backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{activePointData.name}</h4>
          <button onClick={() => setActivePointId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0 }}><X size={18}/></button>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Do's</div>
          <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activePointData.dos.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14}/> Don'ts</div>
          <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activePointData.donts.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100dvh', background: '#050505', display: 'flex', justifyContent: 'center' }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '430px', 
        height: '100dvh', 
        background: 'var(--primary-bg)', 
        color: 'var(--text-main)', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.8)',
        position: 'relative',
        overflow: 'hidden'
      }}>
      
        {/* Header */}
        <div style={{ padding: '16px', textAlign: 'center', background: 'linear-gradient(to bottom, rgba(0,210,255,0.1), transparent)', flexShrink: 0, position: 'relative' }}>
          <Link 
            to="/admin" 
            style={{ position: 'absolute', left: '16px', top: '24px', color: 'var(--text-muted)' }}
          >
            <ArrowLeft size={24} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px', paddingLeft: '24px' }}>
             <img src={patient.physioPhoto || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150&h=150"} alt={`Dr. ${patient.physioName}`} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
             <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.3rem', textAlign: 'left', lineHeight: 1.2 }}>
               Dr. {patient.physioName || 'Physio'}'s<br/>Recovery Plan
             </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
            Prepared personally for {patient.name}
          </p>
        </div>

        {/* Main Body Section */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', borderTop: '1px solid var(--border-color)' }}>
          
          {/* Left Side: SOLUTIONS Button */}
          <div 
            onClick={() => setShowProductsModal(true)}
            style={{ 
              width: '48px', 
              background: 'linear-gradient(to bottom, rgba(34,197,94,0.15), transparent)', 
              color: '#22c55e', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              borderRight: '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
            }}
            className="hover-brighten"
          >
            <div style={{ 
              transform: 'rotate(-90deg)', 
              fontWeight: 'bold', 
              letterSpacing: '6px',
              fontSize: '1.2rem',
              whiteSpace: 'nowrap'
            }}>
              SOLUTION
            </div>
          </div>

          {/* Center: 3D Body */}
          <div style={{ flex: 1, position: 'relative', background: 'var(--secondary-bg)' }} onClick={(e) => { if(e.target === e.currentTarget) setActivePointId(null); }}>
            <Canvas style={{ position: 'absolute', inset: 0, touchAction: 'none' }} dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 45 }}>
              {renderScene()}
            </Canvas>
            {renderHotspotOverlay()}
          </div>

          {/* Right Side: SOLUTIONS Button */}
          <div 
            onClick={() => setShowProductsModal(true)}
            style={{ 
              width: '48px', 
              background: 'linear-gradient(to bottom, rgba(34,197,94,0.15), transparent)', 
              color: '#22c55e', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              borderLeft: '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
            }}
            className="hover-brighten"
          >
            <div style={{ 
              transform: 'rotate(90deg)', 
              fontWeight: 'bold', 
              letterSpacing: '6px',
              fontSize: '1.2rem',
              whiteSpace: 'nowrap'
            }}>
              SOLUTION
            </div>
          </div>
        </div>

        {/* Bottom Follow-up Section */}
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,210,255,0.1) 0%, rgba(0,0,0,0) 100%)', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'white', lineHeight: 1.4 }}>
            <strong style={{color: 'var(--accent)'}}>Tap the glowing points</strong> on your 3D pain map above to get the full rundown on what to do, and what to avoid.
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            I do free 10-minute physio consultations in-store if you ever want to swing by. I'm around {patient.physioAvailability || 'every day'}.
          </p>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Got questions before then? Just reach out below 👇
          </p>
          <a 
            href={`https://wa.me/${patient.physioPhone || ''}?text=${encodeURIComponent("Hi Dr. " + (patient.physioName || 'Physio') + ", I have a question about my recovery plan.")}`}
            target="_blank"
            rel="noreferrer"
            className="clinical-btn"
            style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '12px', fontSize: '1rem', fontWeight: 'bold' }}
          >
            Contact Now <ArrowRight size={18} />
          </a>
        </div>

        {/* Solutions Modal (Products) */}
        {showProductsModal && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(10px)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
               <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <ShoppingBag size={24}/> Priority Solutions
               </h2>
               <button onClick={() => setShowProductsModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
                 <X size={28} />
               </button>
            </div>
            
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
               <p style={{ color: 'white', marginBottom: '20px', fontSize: '1.05rem', lineHeight: 1.5 }}>
                 These are the specific products recommended by Dr. {patient.physioName || 'Physio'} to support your recovery:
               </p>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 {zone.products.map((prod, i) => (
                   <a key={i} href={prod.url} target="_blank" rel="noreferrer" style={{ 
                       textDecoration: 'none', 
                       color: 'white', 
                       background: 'rgba(255,255,255,0.05)', 
                       padding: '20px', 
                       borderRadius: '12px', 
                       border: '1px solid rgba(34,197,94,0.3)',
                       display: 'flex',
                       flexDirection: 'column',
                       gap: '8px',
                       transition: 'all 0.2s ease'
                   }}
                   onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                   onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                   >
                     <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                       {prod.name}
                       <ArrowRight size={16} color="white" opacity={0.5} />
                     </div>
                     <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>{prod.reason}</div>
                   </a>
                 ))}
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
