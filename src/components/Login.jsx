import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from '../utils/db';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, profile } = useAuth();

  // Where to go after login (e.g., if they were redirected here)
  const from = location.state?.from?.pathname;

  if (user && profile) {
    if (from) return <Navigate to={from} replace />;
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // We do NOT manually navigate here. 
    // signInWithPassword triggers onAuthStateChange in AuthContext.
    // AuthContext will fetch the profile and update its state.
    // Once AuthContext provides 'user' and 'profile', the declarative
    // <Navigate> at the top of this component will automatically redirect the user!
    
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-bg)', color: 'var(--text-main)' }}>
      <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '2rem', textAlign: 'center' }}>Medic Login</h1>
        
        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid #ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="clinical-btn"
            style={{ marginTop: '8px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
          </button>
          
          {/* Quick Login Helpers */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Test Accounts</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={() => { setEmail('admin@medic.com'); setPassword('password'); }} 
                className="clinical-btn" 
                style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                Admin
              </button>
              <button 
                type="button" 
                onClick={() => { setEmail('manager@medic.com'); setPassword('password'); }} 
                className="clinical-btn" 
                style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                Manager
              </button>
              <button 
                type="button" 
                onClick={() => { setEmail('physio@medic.com'); setPassword('password'); }} 
                className="clinical-btn" 
                style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                Physio
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
