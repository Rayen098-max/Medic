import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import BodyModel from './BodyModel';
import contentData from '../data/content.json';
import painPointsData from '../data/painPoints.json';
import { getPatientById } from '../utils/db';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

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
            const combinedProducts = [...new Set(matchedPoints.flatMap(p => p.products))];
            const activeZoneIds = matchedPoints.map(p => p.id);

            setZone({
              name: combinedName,
              description: combinedDesc,
              dos: combinedDos,
              donts: combinedDonts,
              products: combinedProducts,
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
      <div style={{ padding: '32px 24px', textAlign: 'center', background: 'linear-gradient(to bottom, rgba(0,210,255,0.1), transparent)', position: 'relative' }}>
        <Link 
          to="/admin" 
          style={{ position: 'absolute', left: '24px', top: '32px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
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
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Clinical Assessment</h3>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{zone.description}</p>
            {patient.transcription && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '2px solid var(--border-color)', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>Physio's Notes:</strong> {patient.transcription}
              </div>
            )}
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
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
              Click on a glowing red point on the 3D model to view specific recommended actions and things to avoid for that area.
            </div>
          )}

          <div className="glass-panel" style={{ background: 'rgba(0, 210, 255, 0.05)', padding: '24px', border: '1px solid rgba(0, 210, 255, 0.3)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', margin: '0 0 16px 0' }}>
              <ShoppingBag size={20} /> Product Recommendations
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {zone.products.map((prod, i) => (
                <span key={i} style={{ background: 'rgba(13, 17, 23, 0.8)', padding: '8px 16px', borderRadius: '16px', fontSize: '0.9rem', border: '1px solid var(--border-color)' }}>
                  {prod}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', marginTop: '16px', background: 'linear-gradient(135deg, rgba(0,210,255,0.1) 0%, rgba(0,0,0,0) 100%)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.5rem', color: 'white' }}>How are you feeling?</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)' }}>Book a free 10-minute follow-up session with our in-store physiotherapist to check on your progress.</p>
            <a 
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent("I need a follow up")}`}
              target="_blank"
              rel="noreferrer"
              className="clinical-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '16px 32px', fontSize: '1.1rem' }}
            >
              Book Follow-up <ArrowRight size={20} />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
