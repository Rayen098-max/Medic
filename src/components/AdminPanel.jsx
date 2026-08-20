import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatients, supabase } from '../utils/db';
import { Search, Download, Trash2, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Papa from 'papaparse';

export default function AdminPanel() {
  const [patients, setPatients] = useState([]);
  const [physios, setPhysios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [physioFilter, setPhysioFilter] = useState('');
  const { profile, signOut, session } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPatients();
      setPatients(data || []);

      if (profile?.role === 'admin' || profile?.role === 'manager') {
        const { data: physioData } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'physio');
        setPhysios(physioData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleExport = () => {
    const csv = Papa.unparse(filteredPatients.map(p => ({
      ID: p.id,
      Name: p.name,
      Phone: p.phone,
      Condition: p.painArea,
      Date: p.consultDate,
      Product: p.productPurchased || 'None',
      PhysioID: p.physio_id
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `medic_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetPassword = async (physioId) => {
    if (profile?.role !== 'admin') return;
    const newPassword = prompt("Enter new password for this physio:");
    if (!newPassword) return;

    try {
      const { data, error } = await supabase.functions.invoke('reset-physio-password', {
        body: { userId: physioId, newPassword, requesterId: profile.id }
      });
      if (error) throw error;
      alert("Password reset successfully.");
    } catch (err) {
      console.error(err);
      alert("Error resetting password.");
    }
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.phone?.includes(searchTerm);
    const matchesPhysio = physioFilter ? p.physio_id === physioFilter : true;
    return matchesSearch && matchesPhysio;
  });

  const consultsThisMonth = patients.filter(p => {
    if (!p.consultDate) return false;
    const date = new Date(p.consultDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return <div style={{ color: 'white', padding: '40px' }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ padding: '40px', minHeight: '100vh', background: 'var(--primary-bg)', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '2.5rem' }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>Logged in as: {profile?.full_name} ({profile?.role})</p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {profile?.role === 'admin' && (
              <Link to="/edit-body" className="clinical-btn" style={{ textDecoration: 'none' }}>
                Edit Body Model
              </Link>
            )}
            <button onClick={signOut} className="clinical-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>Total Patients</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{patients.length}</p>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>Consults This Month</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{consultsThisMonth}</p>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>Active Physios</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{physios.length || 1}</p>
          </div>
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} size={20} />
            <input 
              type="text" 
              placeholder="Search patients by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>
          
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <select 
              value={physioFilter} 
              onChange={(e) => setPhysioFilter(e.target.value)}
              style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
            >
              <option value="">All Physios</option>
              {physios.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          )}

          <button onClick={handleExport} className="clinical-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Data Table */}
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Patient Name</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Phone</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Consult Date</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Condition</th>
                {(profile?.role === 'admin' || profile?.role === 'manager') && (
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Physio ID</th>
                )}
                <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(patient => (
                <tr key={patient.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px' }}>{patient.name}</td>
                  <td style={{ padding: '16px' }}>{patient.phone}</td>
                  <td style={{ padding: '16px' }}>{patient.consultDate}</td>
                  <td style={{ padding: '16px' }}>{patient.painArea}</td>
                  {(profile?.role === 'admin' || profile?.role === 'manager') && (
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {physios.find(p => p.id === patient.physio_id)?.full_name || patient.physio_id}
                    </td>
                  )}
                  <td style={{ padding: '16px' }}>
                    <Link to={`/r/${patient.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', marginRight: '16px' }}>
                      View Portal
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Admin Controls section for managing Physios */}
        {profile?.role === 'admin' && (
          <div style={{ marginTop: '40px' }}>
            <h2 style={{ color: 'var(--accent)', marginBottom: '20px' }}>Manage Physio Accounts</h2>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Name</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Role</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {physios.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px' }}>{p.full_name}</td>
                      <td style={{ padding: '16px' }}>{p.role}</td>
                      <td style={{ padding: '16px' }}>
                        <button 
                          onClick={() => handleResetPassword(p.id)}
                          className="clinical-btn" 
                          style={{ padding: '6px 12px', fontSize: '0.85rem', background: 'rgba(234, 179, 8, 0.1)', borderColor: '#eab308', color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <ShieldAlert size={14} /> Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
