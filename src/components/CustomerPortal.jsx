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
          processData(data);
        } else {
           useDummyData();
        }
      } catch (err) {
        console.warn("DB Error, falling back to dummy data", err);
        useDummyData();
      } finally {
        setLoading(false);
      }
    }
    
    function useDummyData() {
        setPatient({ name: 'Test', physioName: 'Smith' });
        const matchedPoints = [painPointsData[0]];
        const combinedName = matchedPoints[0].name;
        const combinedDesc = matchedPoints[0].description;
        setZone({
            name: combinedName,
            description: combinedDesc,
            dos: matchedPoints[0].dos,
            donts: matchedPoints[0].donts,
            products: [],
            activeZones: [matchedPoints[0].id]
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
    loadData();
  }, [id]);

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
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.95rem', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={16}/> RECOMMENDED ACTION</div>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '24px', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5 }}>
            {activePointData.dos.map((item, i) => <li key={i} style={{marginBottom: '4px'}}>{item}</li>)}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><XCircle size={16}/> AVOID</div>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '24px', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.5 }}>
            {activePointData.donts.map((item, i) => <li key={i} style={{marginBottom: '4px'}}>{item}</li>)}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
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
        <div className="futuristic-logo-container overlay-logo" style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 10 }}>
          <div className="logo-icon">
             <div className="square-1"></div>
             <div className="square-2"></div>
          </div>
          <div className="logo-text">
             THE SLEEP<br/>COMPANY
          </div>
          <div className="circuit-lines"></div>
        </div>

        <Canvas style={{ position: 'absolute', inset: 0, touchAction: 'none' }} dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 45 }}>
          {renderScene()}
        </Canvas>
        {renderHotspotOverlay()}
      </div>
    </div>
  );
}
