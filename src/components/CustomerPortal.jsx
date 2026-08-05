import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import BodyModel from './BodyModel';
import contentData from '../data/content.json';
import painPointsData from '../data/painPoints.json';
import productsCatalog from '../data/products.json';
import { getPatientById } from '../utils/db';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
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
            }).filter(p => p.id); // Filter any missing from catalog

            // Sort by priority (lower number = higher priority)
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-bg)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '20px 16px', textAlign: 'center', background: 'linear-gradient(to bottom, rgba(0,210,255,0.1), transparent)', position: 'relative' }}>
        <Link 
          to="/admin" 
          style={{ position: 'absolute', left: '16px', top: '24px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={24} /> <span style={{ display: 'none', '@media (minWidth: 768px)': { display: 'inline' } }}>Back</span>
        </Link>
        <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '2rem', marginBottom: '8px' }}>
          My Recovery Plan
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0 }}>
          Prepared for {patient.name}
        </p>
      </div>

      <div className="portal-grid">
        
        {/* 3D Visual Column */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ color: 'var(--accent)', margin: '0' }}>Focus Area: {zone?.name}</h2>
          <div className="model-container">
            <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 45 }}>
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
                enablePan={false}
                minDistance={3}
                maxDistance={10}
                autoRotate
                autoRotateSpeed={1}
              />
          </Canvas>
          </div>
        </div>

        {/* Content Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Physiotherapist Note</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                overflow: 'hidden',
                border: '2px solid var(--accent)',
                flexShrink: 0
              }}>
                <img 
                  src={patient.physioPhoto || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150&h=150"} 
                  alt={`Dr. ${patient.physioName || 'Physio'}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <p style={{ margin: 0, lineHeight: 1.4, fontSize: '1.1rem', color: 'white', fontWeight: '500' }}>
                Hi, Dr. {patient.physioName || 'Physio'} here 👋
              </p>
            </div>

            <p style={{ margin: '0 0 16px 0', lineHeight: 1.6 }}>
              Hope your back's been treating you a little kinder since we last spoke at the store! 
              {(() => {
                const timeSinceVisit = calculateTimeSince(patient.consultDate);
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

            <p style={{ margin: '0 0 16px 0', lineHeight: 1.6 }}>
              I gave you a prescription card back then with some exercises and things to avoid, don't stress. <strong style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>Below is your personal 3D pain map — just tap on any of the glowing points</strong> and you'll get the full rundown again: what's going on, what to do, and what to steer clear of.
            </p>
          </div>

          {activePointData ? (
            <>
              <div className="glass-panel" style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '24px', borderLeft: '4px solid #22c55e' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', margin: '0 0 16px 0' }}>
                  <CheckCircle2 size={20} /> Recommended Actions ({activePointData.name})
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activePointData.dos.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>

              <div className="glass-panel" style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '24px', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', margin: '0 0 16px 0' }}>
                  <XCircle size={20} /> Actions to Avoid ({activePointData.name})
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activePointData.donts.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </>
          ) : null}

          <div className="glass-panel" style={{ background: 'rgba(0, 210, 255, 0.05)', padding: '24px', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', margin: '0 0 16px 0' }}>
              <ShoppingBag size={20} /> Priority Recommended Products
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {zone.products.map((prod, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', background: 'rgba(13, 17, 23, 0.8)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                  <img src={prod.image} alt={prod.name} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'white' }}>{prod.name}</h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{prod.reason}</p>
                    <a 
                      href={prod.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="clinical-btn"
                      style={{ display: 'inline-flex', padding: '6px 16px', fontSize: '0.9rem', textDecoration: 'none' }}
                    >
                      View on Store
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', marginTop: '16px', background: 'linear-gradient(135deg, rgba(0,210,255,0.1) 0%, rgba(0,0,0,0) 100%)' }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'white', lineHeight: 1.6 }}>
              Hope that all made sense! If you'd ever like to swing by, I do free 10-minute physio consultations in-store, no appointment needed. I'm around {patient.physioAvailability || 'every day'}.
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Would genuinely love to see you again — even just to say hi and check in on that back of yours.
            </p>
            <p style={{ margin: '0 0 24px 0', fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Got questions before then? Just reach out below 👇
            </p>
            <a 
              href={`https://wa.me/${patient.physioPhone || ''}?text=${encodeURIComponent("Hi Dr. " + (patient.physioName || 'Physio') + ", I have a question about my recovery plan.")}`}
              target="_blank"
              rel="noreferrer"
              className="clinical-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '16px 32px', fontSize: '1.1rem' }}
            >
              Contact Now <ArrowRight size={20} />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
