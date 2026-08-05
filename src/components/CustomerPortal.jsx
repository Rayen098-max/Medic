import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import BodyModel from './BodyModel';
import contentData from '../data/content.json';
import painPointsData from '../data/painPoints.json';
import productsCatalog from '../data/products.json';
import { getPatientById } from '../utils/db';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, ArrowLeft, Maximize2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const calculateTimeSince = (dateString) => {
  if (!dateString) return null;
  const consultDate = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - consultDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 14) return 'a week';
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} weeks`;
};

export default function CustomerPortal() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [zone, setZone] = useState(null);
  const [activePointId, setActivePointId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnlarged, setIsEnlarged] = useState(false);

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
  const timeSinceVisit = calculateTimeSince(patient.consultDate);

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
        position: 'absolute', bottom: '8px', left: '8px', right: '8px', 
        background: 'rgba(13,17,23,0.95)', border: '1px solid var(--border-color)', 
        borderRadius: '8px', padding: '12px', zIndex: 20, 
        maxHeight: '50%', overflowY: 'auto', backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, color: 'white', fontSize: '0.9rem' }}>{activePointData.name}</h4>
          <button onClick={() => setActivePointId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: 0 }}><X size={16}/></button>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12}/> Do's</div>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {activePointData.dos.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={12}/> Don'ts</div>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
      <div style={{ padding: '12px 16px', textAlign: 'center', background: 'linear-gradient(to bottom, rgba(0,210,255,0.1), transparent)', flexShrink: 0, position: 'relative' }}>
        <Link 
          to="/admin" 
          style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.4rem' }}>
          My Recovery Plan
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Prepared for {patient.name}
        </p>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px', padding: '8px', minHeight: 0 }}>
        
        {/* Box 1: Physio Note */}
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', fontSize: '0.85rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <img src={patient.physioPhoto || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150&h=150"} alt={`Dr. ${patient.physioName}`} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontWeight: '600', color: 'white' }}>Dr. {patient.physioName || 'Physio'}</span>
          </div>
          <p style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
            Hope your back's been treating you a little kinder since we last spoke at the store! 
            {(() => {
              const productPurchased = patient.productPurchased;
              if (timeSinceVisit && productPurchased) {
                return ` It's been ${timeSinceVisit} since you picked up your ${productPurchased} — hoping it's doing its job.`;
              } else if (timeSinceVisit) {
                return ` It's been ${timeSinceVisit} since your visit — hoping the recommendations are doing their job.`;
              } else if (productPurchased) {
                return ` Since you picked up your ${productPurchased}, I'm hoping it's doing its job.`;
              } else {
                return ` I'm hoping the recommendations are doing their job.`;
              }
            })()}
          </p>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            I gave you a prescription card back then with some exercises and things to avoid. <strong style={{ color: 'var(--accent)' }}>Tap the glowing points on your 3D pain map</strong> to get the full rundown again on what to do, and what to steer clear of.
          </p>
        </div>

        {/* Box 2: 3D Visual */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', background: 'var(--secondary-bg)' }}>
          <button onClick={() => setIsEnlarged(true)} style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '4px', color: 'white', padding: '4px', cursor: 'pointer' }}>
            <Maximize2 size={16} />
          </button>
          <div style={{ position: 'absolute', inset: 0 }} onClick={(e) => { if(e.target === e.currentTarget) setActivePointId(null); }}>
            <Canvas style={{ width: '100%', height: '100%', touchAction: 'none' }} dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 45 }}>
              {renderScene()}
            </Canvas>
            {!isEnlarged && renderHotspotOverlay()}
          </div>
        </div>

        {/* Box 3: Products */}
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--accent)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShoppingBag size={14} /> Priority Products
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {zone.products.slice(0, 3).map((prod, i) => (
              <a key={i} href={prod.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'white', background: 'rgba(255,255,255,0.05)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem', lineHeight: 1.2 }}>
                <div style={{ fontWeight: '600', color: 'var(--accent)' }}>{prod.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{prod.reason}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Box 4: Follow-up */}
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,210,255,0.1) 0%, rgba(0,0,0,0) 100%)', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'white', lineHeight: 1.4 }}>
            Hope that all made sense! If you'd ever like to swing by, I do free 10-minute physio consultations in-store, no appointment needed. I'm around {patient.physioAvailability || 'every day'}.
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Would genuinely love to see you again — even just to say hi and check in on that back of yours.
          </p>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Got questions before then? Just reach out below 👇
          </p>
          <a 
            href={`https://wa.me/${patient.physioPhone || ''}?text=${encodeURIComponent("Hi Dr. " + (patient.physioName || 'Physio') + ", I have a question about my recovery plan.")}`}
            target="_blank"
            rel="noreferrer"
            className="clinical-btn"
            style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', fontSize: '0.9rem' }}
          >
            Contact Now <ArrowRight size={14} />
          </a>
        </div>

      </div>

      {/* Fullscreen Modal */}
      {isEnlarged && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--primary-bg)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 60 }}>
             <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--accent)' }}>3D Pain Map</h2>
             <button onClick={() => { setIsEnlarged(false); setActivePointId(null); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
          </div>
          <div style={{ flex: 1, position: 'relative' }} onClick={(e) => { if(e.target === e.currentTarget) setActivePointId(null); }}>
             <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 45 }}>
               {renderScene()}
             </Canvas>
             {renderHotspotOverlay()}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
