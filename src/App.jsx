import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import BodyModel from './components/BodyModel';
import DetailPanel from './components/DetailPanel';
import AdminPanel from './components/AdminPanel';
import CaptureForm from './components/CaptureForm';
import CustomerPortal from './components/CustomerPortal';
import contentData from './data/content.json';
import painPointsData from './data/painPoints.json';

function MapView() {
  const [activeZone, setActiveZone] = useState(null);

  const selectedZoneData = activeZone ? painPointsData.find(z => z.id === activeZone) : null;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 10, pointerEvents: 'none' }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '3.5rem', 
          fontWeight: '900', 
          letterSpacing: '4px', 
          textTransform: 'uppercase',
          background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0px 10px 30px rgba(0, 210, 255, 0.3)',
          fontFamily: '"Ranade", sans-serif',
          display: 'flex',
          alignItems: 'center'
        }}>
          MEDIC
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 4px', fontSize: '1rem', fontWeight: '500', letterSpacing: '1px' }}>
          Hover over the body to explore pain points
        </p>
      </div>

      {/* 3D Canvas */}
      <Canvas style={{ background: 'transparent' }} dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 45 }} performance={{ min: 0.5 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        
        <BodyModel 
          zones={painPointsData}
          activeZones={activeZone ? [activeZone] : []}
          onZoneClick={setActiveZone}
        />

        <ContactShadows resolution={256} frames={1} position={[0, -3.5, 0]} opacity={0.5} scale={20} blur={2} far={4.5} />
        <OrbitControls 
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={12}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
        <Environment preset="city" />
      </Canvas>

      {/* Detail Panel overlay */}
      {selectedZoneData && (
        <DetailPanel zone={selectedZoneData} onClose={() => setActiveZone(null)} />
      )}
      
      {/* Admin Link for Demo */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 10, display: 'flex', gap: '16px' }}>
        <Link to="/capture" className="clinical-btn" style={{ textDecoration: 'none' }}>
          New Consult
        </Link>
        <Link to="/admin" className="clinical-btn" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
          Follow-up Admin
        </Link>
      </div>

      {/* Attribution */}
      <div style={{ position: 'absolute', bottom: 10, right: 20, zIndex: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        3D Model by Mandrake (CC Attribution)
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/capture" element={<CaptureForm />} />
        <Route path="/r/:id" element={<CustomerPortal />} />
      </Routes>
    </BrowserRouter>
  );
}
