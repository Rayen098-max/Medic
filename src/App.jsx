import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthenticatedLayout } from './components/layout/authenticated-layout';
import { Dashboard } from './features/dashboard';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import BodyModel from './components/BodyModel';
import DetailPanel from './components/DetailPanel';
import AdminPanel from './components/AdminPanel';
import AddDataPanel from './components/AddDataPanel';
import CaptureForm from './components/CaptureForm';
import CustomerPortal from './components/CustomerPortal';
import EditBodyPanel from './components/EditBodyPanel';
import Login from './components/Login';
import SetupPassword from './components/SetupPassword';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LogOut } from 'lucide-react';
import contentData from './data/content.json';
import painPointsData from './data/painPoints.json';

function MapView() {
  const [activeZone, setActiveZone] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { profile, signOut } = useAuth();

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectedZoneData = activeZone ? painPointsData.find(z => z.id === activeZone) : null;

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative' }}>
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
          Interactive 3D body preview
        </p>
      </div>

      {/* Sign Out Button */}
      <div style={{ position: 'absolute', top: 30, right: 30, zIndex: 10 }}>
        <button 
          onClick={signOut} 
          className="clinical-btn" 
          style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* 3D Canvas */}
      <Canvas style={{ background: 'transparent' }} dpr={[1, 1.5]} camera={{ position: [0, 0, isMobile ? 14 : 9], fov: 45 }} performance={{ min: 0.5 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        
        <BodyModel 
          zones={[]}
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
      
      {/* Navigation Buttons based on Role */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 10, display: 'flex', gap: '16px' }}>
        {(profile?.role === 'admin' || profile?.role === 'physio') && (
          <Link to="/capture" className="clinical-btn" style={{ textDecoration: 'none' }}>
            New Consult
          </Link>
        )}
        <Link to="/admin" className="clinical-btn" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
          {profile?.role === 'physio' ? 'My Follow-ups' : 'Follow-up Admin'}
        </Link>
        {profile?.role === 'admin' && (
          <Link to="/edit-body" className="clinical-btn" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
            Edit Body
          </Link>
        )}
      </div>

      {/* Attribution */}
      <div style={{ position: 'absolute', bottom: 10, right: 20, zIndex: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        3D Model by Mandrake (CC Attribution)
      </div>
    </div>
  );
}

import { Tasks } from './features/tasks';
import { UsageReport } from './features/usage-report';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public or Fullscreen Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/sign-in" element={<Navigate to="/login" replace />} />
          <Route path="/setup-password" element={<SetupPassword />} />
          <Route path="/r/:id" element={<CustomerPortal />} />
          <Route path="/map" element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'physio']}>
              <MapView />
            </ProtectedRoute>
          } />

          {/* Authenticated Dashboard Routes with Sidebar */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'manager', 'physio']}><AuthenticatedLayout /></ProtectedRoute>}>
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']} redirectTo="/tasks">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/capture" element={<CaptureForm />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/add-data" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']} redirectTo="/tasks">
                <AddDataPanel />
              </ProtectedRoute>
            } />
            <Route path="/edit-body" element={<EditBodyPanel />} />
            <Route path="/usage-report" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <UsageReport />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
      <Analytics />
    </AuthProvider>
  );
}
