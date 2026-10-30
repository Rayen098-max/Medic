import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPatients, deletePatient, supabase, updatePatientStatus, recordFollowup } from '../utils/db';
import { Search, Download, Trash2, LogOut, ShieldAlert, Eye, MessageCircle, Check, Clock, X, FastForward, Users, Calendar, Activity } from 'lucide-react';
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
      if (profile?.id) {
        await recordFollowup(id, profile.id);
      }
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
    return <div className="p-10 text-muted-foreground flex items-center justify-center min-h-[50vh]">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 md:p-10 min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              {profile?.role === 'physio' ? 'My Follow-ups' : 'Admin Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Logged in as: <span className="font-medium text-foreground">{profile?.full_name}</span> ({profile?.role})</p>
          </div>
          <div className="flex gap-3">
            {profile?.role === 'admin' && (
              <Link to="/edit-body" className="clinical-btn no-underline">
                Edit Body Model
              </Link>
            )}
            <button onClick={signOut} className="clinical-btn border-destructive text-destructive hover:bg-destructive/10">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="glass-panel p-6 rounded-xl border border-border/80 bg-card shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Total Patients</h3>
            <p className="text-3xl font-extrabold text-primary">{displayTotalPatients}</p>
          </div>
          <div className="glass-panel p-6 rounded-xl border border-border/80 bg-card shadow-xs">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Consults This Month</h3>
            <p className="text-3xl font-extrabold text-primary">{consultsThisMonth}</p>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <div className="glass-panel p-6 rounded-xl border border-border/80 bg-card shadow-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Active Physios</h3>
              <p className="text-3xl font-extrabold text-primary">{physios.length || 1}</p>
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3.5 top-3 text-muted-foreground pointer-events-none" size={18} />
            <input 
              type="text" 
              placeholder="Search patients by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground"
            />
          </div>
          
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <select 
              value={physioFilter} 
              onChange={(e) => setPhysioFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm font-medium shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
            >
              <option value="" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>All Physios</option>
              {physios.map(p => (
                <option key={p.id} value={p.id} style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>{p.full_name}</option>
              ))}
            </select>
          )}

          <div className="flex gap-3">
            <button onClick={startBulkSend} className="clinical-btn border-green-600 text-green-600 hover:bg-green-500/10">
              <FastForward size={16} /> Send All Due Today
            </button>
            <button onClick={handleExport} className="clinical-btn">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-panel overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Patient Name</th>
                <th className="p-4 font-semibold">Phone</th>
                <th className="p-4 font-semibold">Consult Date</th>
                <th className="p-4 font-semibold">Condition</th>
                <th className="p-4 font-semibold">Status</th>
                {(profile?.role === 'admin' || profile?.role === 'manager') && (
                  <th className="p-4 font-semibold">Physio</th>
                )}
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPatients.map(patient => {
                const status = getFollowUpStatus(patient.consultDate);
                const isSent = !!patient.followup_sent_at;
                
                return (
                <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-foreground">{patient.name}</div>
                  </td>
                  <td className="p-4 text-muted-foreground">{patient.phone}</td>
                  <td className="p-4 text-muted-foreground">{patient.consultDate}</td>
                  <td className="p-4 capitalize text-foreground">{patient.painArea?.replace('_', ' ')}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isSent ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' :
                      status.status === 'due' ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' :
                      status.status === 'overdue' ? 'text-rose-500 bg-rose-500/10 border border-rose-500/20' :
                      'text-muted-foreground bg-muted/50 border border-border'
                    }`}>
                      {isSent ? 'Follow-up Sent' : status.text}
                    </span>
                  </td>
                  {(profile?.role === 'admin' || profile?.role === 'manager') && (
                    <td className="p-4 text-muted-foreground text-xs">
                      {physios.find(p => p.id === patient.physio_id)?.full_name || patient.physio_id}
                    </td>
                  )}
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <Link 
                        to={`/r/${patient.id}`} 
                        target="_blank"
                        className="clinical-btn text-xs py-1.5 px-3 no-underline"
                      >
                        <Eye size={15} /> Preview
                      </Link>

                      {isSent ? (
                        <div className="text-emerald-500 flex items-center gap-1.5 text-xs font-medium px-2 py-1">
                          <Check size={16} /> Sent
                        </div>
                      ) : (
                        <a 
                          href={generateWhatsAppLink(patient)} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={() => handleMarkSent(patient.id)}
                          className="clinical-btn border-green-600 text-green-600 hover:bg-green-500/10 text-xs py-1.5 px-3 no-underline"
                        >
                          <MessageCircle size={15} /> Send WhatsApp
                        </a>
                      )}

                      <button 
                        onClick={() => handleDelete(patient.id)}
                        className="clinical-btn border-destructive text-destructive hover:bg-destructive/10 text-xs p-2"
                        title="Delete Record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={profile?.role === 'admin' || profile?.role === 'manager' ? 7 : 6} className="p-8 text-center text-muted-foreground">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Admin Controls section for managing Physios */}
        {profile?.role === 'admin' && (
          <div className="space-y-4 pt-6">
            <h2 className="text-xl font-bold tracking-tight text-primary">Manage Physio Accounts</h2>
            <div className="glass-panel overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {physios.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-foreground">{p.full_name}</td>
                      <td className="p-4 text-muted-foreground capitalize">{p.role}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleResetPassword(p.id)}
                          className="clinical-btn border-amber-500 text-amber-500 hover:bg-amber-500/10 text-xs py-1.5 px-3"
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
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-primary/30 shadow-2xl relative bg-card text-foreground">
              <button 
                onClick={() => setIsQueueOpen(false)} 
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold uppercase tracking-wider text-primary">Sending Bulk Follow-ups</h2>
                <p className="text-sm text-muted-foreground mt-1">Patient {queueIndex + 1} of {queueList.length}</p>
              </div>
              
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 mb-6">
                <h3 className="font-semibold text-foreground text-base mb-2">To: {queueList[queueIndex].name}</h3>
                <div className="text-foreground text-sm font-mono bg-background/80 p-3.5 rounded-lg border border-border/60 leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-wrap">
                  {decodeURIComponent(generateWhatsAppLink(queueList[queueIndex]).split('?text=')[1])}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button onClick={handleQueueSkip} className="clinical-btn flex-1">
                  Skip
                </button>
                <button onClick={handleQueueSend} className="clinical-btn flex-2 border-green-600 bg-green-600 text-white hover:bg-green-700 font-bold">
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
