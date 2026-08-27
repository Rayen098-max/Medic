import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/db';
import { useAuth } from '../context/AuthContext';
import { Loader2, KeyRound } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function SetupPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Update the password and flag the user as having changed it
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: { password_changed: true }
      });

      if (updateError) throw updateError;
      
      // Success, redirect to dashboard
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update password.");
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-bg)' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: '2rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-alpha)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KeyRound size={24} color="var(--accent)" />
          </div>
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 600 }}>
          Set Your Password
        </h2>
        
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Please create a personal password to secure your account before continuing.
        </p>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
              New Password
            </label>
            <Input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-black"
              style={{ color: 'black' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full text-black"
              style={{ color: 'black' }}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4"
          >
            {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            Save & Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
