import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatients, deletePatient, supabase, updatePatientStatus } from '../utils/db';
import { Search, Download, Trash2, LogOut, ShieldAlert, Eye, MessageCircle, Check, Clock, X, FastForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Papa from 'papaparse';

export default function AdminPanel() {
  const [patients, setPatients] = useState([]);
  const [physios, setPhysios] = useState([]);
  const [queueList, setQueueList] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [physioFilter, setPhysioFilter] = useState('');
  const { profile, signOut, session } = useAuth();

  const calculateTimeSince = (dateString) => {
    if (!dateString) return '';
    if (dateString === 'Few Days ago' || dateString === 'a week ago') {
      return dateString.toLowerCase();
    }
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
    return `${Math.floor(diffDays / 30)} months`;
  };

  const getFollowUpStatus = (consultDate) => {
    if (consultDate === 'Few Days ago' || consultDate === 'a week ago') {
      return { status: 'pending', color: '#8b949e', text: 'N/A' };
    }
    const today = new Date();
    const consult = new Date(consultDate);
    const diffTime = Math.abs(today - consult);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 3 && diffDays <= 5) return { status: 'due', color: '#eab308', text: 'Due Today' };
    if (diffDays > 5) return { status: 'overdue', color: '#ef4444', text: 'Overdue' };
    return { status: 'pending', color: '#8b949e', text: `Due in ${Math.max(0, 3 - diffDays)} days` };
  };

  const generateWhatsAppLink = (customer) => {
    if (!customer.phone) return '#';
    let phone = customer.phone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }
    const cacheBuster = new Date().getTime();
    const link = `${window.location.origin}/r/${customer.id}?v=${cacheBuster}`;
    
    const timeSinceVisit = calculateTimeSince(customer.consultDate);
    
    let context = "";
    if (timeSinceVisit) {
      if (customer.consultDate === 'Few Days ago' || customer.consultDate === 'a week ago') {
        context = `It's been ${timeSinceVisit} since your visit. `;
      } else {
        context = `It's been ${timeSinceVisit} since your visit. `;
      }
    }
    
    const physioName = physios.find(p => p.id === customer.physio_id)?.full_name || profile?.full_name || 'Physio';
    const cleanPhysioName = physioName.replace(/^Dr\.?\s+/i, '');
    
    const fullMessage = `Hi ${customer.name},\n\n${context}Hope your body is treating you better!\n\nHere is your *Personalized 3D Recovery Plan* (including exercises and things to avoid):\n👉 ${link}\n\nLet me know if you have any questions.\n\nBest,\nDr. ${cleanPhysioName}`;

    const message = encodeURIComponent(fullMessage);
    return `https://wa.me/${phone}?text=${message}`;
  };

  const handleMarkSent = async (id) => {
    try {
      const now = new Date().toISOString();
      setPatients(prev => prev.map(p => p.id === id ? { ...p, followup_sent_at: now } : p));
      await updatePatientStatus(id, { followup_sent_at: now });
    } catch (error) {
      console.error("Failed to mark as sent:", error);
      alert("Failed to update status in database.");
    }
  };

  const startBulkSend = () => {
    const duePatients = filteredPatients.filter(p => {
      const status = getFollowUpStatus(p.consultDate);
      return status.status === 'due' && !p.followup_sent_at;
    });
    
    if (duePatients.length === 0) {
      alert("No patients are 'Due Today' and unsent in the current view.");
      return;
    }
    
    setQueueList(duePatients);
    setQueueIndex(0);
    setIsQueueOpen(true);
  };

  const handleQueueSend = async () => {
    const patient = queueList[queueIndex];
    window.open(generateWhatsAppLink(patient), '_blank');
    await handleMarkSent(patient.id);
    
    if (queueIndex < queueList.length - 1) {
      setQueueIndex(prev => prev + 1);
    } else {
      setIsQueueOpen(false);
      setQueueList([]);
    }
  };

  const handleQueueSkip = () => {
    if (queueIndex < queueList.length - 1) {
      setQueueIndex(prev => prev + 1);
    } else {
      setIsQueueOpen(false);
      setQueueList([]);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient record?')) {
      try {
        await deletePatient(id);
        setPatients(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        alert('Failed to delete patient: ' + err.message);
      }
    }
  };

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
    
    // Client-side fallback for RLS: ensure physios only see their own patients
    const isPhysio = profile?.role === 'physio';
    const matchesOwnPhysio = isPhysio ? p.physio_id === profile?.id : true;
    
    const matchesPhysioFilter = physioFilter ? p.physio_id === physioFilter : true;
    
    return matchesSearch && matchesOwnPhysio && matchesPhysioFilter;
  });

  // Calculate total patients for the current user's view
  const displayTotalPatients = filteredPatients.length;

  const consultsThisMonth = filteredPatients.filter(p => {
    if (!p.consultDate) return false;
    if (p.consultDate === 'Few Days ago' || p.consultDate === 'a week ago') return true;
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
            <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '2.5rem' }}>
              {profile?.role === 'physio' ? 'My Follow-ups' : 'Admin Dashboard'}
            </h1>
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
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{displayTotalPatients}</p>
          </div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>Consults This Month</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{consultsThisMonth}</p>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>Active Physios</h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{physios.length || 1}</p>
            </div>
          )}
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

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={startBulkSend} className="clinical-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: '#22c55e' }}>
              <FastForward size={16} /> Send All Due Today
            </button>
            <button onClick={handleExport} className="clinical-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={16} /> Export CSV
            </button>
          </div>
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
                <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Status</th>
                {(profile?.role === 'admin' || profile?.role === 'manager') && (
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Physio ID</th>
                )}
                <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(patient => {
                const status = getFollowUpStatus(patient.consultDate);
                const isSent = !!patient.followup_sent_at;
                
                return (
                <tr key={patient.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 'bold' }}>{patient.name}</div>
                  </td>
                  <td style={{ padding: '16px' }}>{patient.phone}</td>
                  <td style={{ padding: '16px' }}>{patient.consultDate}</td>
                  <td style={{ padding: '16px', textTransform: 'capitalize' }}>{patient.painArea?.replace('_', ' ')}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      color: isSent ? '#22c55e' : status.color, 
                      background: isSent ? 'rgba(34, 197, 94, 0.1)' : `${status.color}20`, 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {isSent ? 'Follow-up Sent' : status.text}
                    </span>
                  </td>
                  {(profile?.role === 'admin' || profile?.role === 'manager') && (
                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {physios.find(p => p.id === patient.physio_id)?.full_name || patient.physio_id}
                    </td>
                  )}
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <Link 
                        to={`/r/${patient.id}`} 
                        target="_blank"
                        className="clinical-btn"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(0, 210, 255, 0.1)', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                      >
                        <Eye size={18} /> Preview
                      </Link>

                      {isSent ? (
                        <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                          <Check size={18} /> Sent
                        </div>
                      ) : (
                        <a 
                          href={generateWhatsAppLink(patient)} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={() => handleMarkSent(patient.id)}
                          className="clinical-btn"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: '#22c55e' }}
                        >
                          <MessageCircle size={18} /> Send WhatsApp
                        </a>
                      )}

                      <button 
                        onClick={() => handleDelete(patient.id)}
                        className="clinical-btn"
                        title="Delete Record"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: '#ef4444', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
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

        {/* Bulk Send Queue Modal */}
        {isQueueOpen && queueList.length > 0 && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 8, 20, 0.75)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '30px', position: 'relative', border: '1px solid rgba(0, 212, 255, 0.35)', boxShadow: '0 0 40px rgba(0, 212, 255, 0.15)' }}>
              <button 
                onClick={() => setIsQueueOpen(false)} 
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
              
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ color: '#00d2ff', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Sending Bulk Follow-ups</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Patient {queueIndex + 1} of {queueList.length}</p>
              </div>
              
              <div style={{ background: 'rgba(13, 17, 23, 0.8)', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: 'white' }}>To: {queueList[queueIndex].name}</h3>
                <div style={{ color: '#e2e8f0', fontSize: '0.95rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', lineHeight: 1.5, maxHeight: '250px', overflowY: 'auto' }}>
                  {decodeURIComponent(generateWhatsAppLink(queueList[queueIndex]).split('?text=')[1])}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={handleQueueSkip} className="clinical-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                  Skip
                </button>
                <button onClick={handleQueueSend} className="clinical-btn" style={{ flex: 2, background: 'linear-gradient(180deg, #2ecc71, #27ae60)', color: 'white', borderColor: '#27ae60', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <MessageCircle size={18} /> Send WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
