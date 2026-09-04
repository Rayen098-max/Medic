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
  const [message, setMessage] = useState(null);
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
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
    setMessage(null);

    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/setup-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage("Password reset email sent! Check your inbox.");
        setMode('login');
      }
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
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
        <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '2rem', textAlign: 'center' }}>
          {mode === 'login' ? 'Medic Login' : 'Reset Password'}
        </h1>
        
        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid #ef4444' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '8px', border: '1px solid #22c55e' }}>
            {message}
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
          {mode === 'login' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)' }}>Password</label>
                <button 
                  type="button"
                  onClick={() => { setError(null); setMessage(null); setMode('forgot'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="clinical-btn"
            style={{ marginTop: '8px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'login' ? 'Sign In' : 'Send Reset Link')}
          </button>
          
          {mode === 'forgot' && (
            <button 
              type="button"
              onClick={() => { setError(null); setMessage(null); setMode('login'); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', marginTop: '8px' }}
            >
              Back to Login
            </button>
          )}

        </form>
      </div>
    </div>
  );
}
