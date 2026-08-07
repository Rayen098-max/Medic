import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Check, Clock, Eye, Trash2 } from 'lucide-react';
import { getPatients, deletePatient } from '../utils/db';

// Helper to get date N days ago
const getDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const calculateTimeSince = (dateString) => {
  if (!dateString) return null;
  const consultDate = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - consultDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 14) return 'a week';
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} weeks`;
};

// Mock Data mimicking a Google Sheet
const mockSheetData = [
  { id: 1, name: "Alice Johnson", phone: "1234567890", painArea: "lower_back", sleepPosition: "Side", product: "SmartGrid Ortho Pro Mattress", consultDate: getDaysAgo(4) },
  { id: 2, name: "Bob Smith", phone: "0987654321", painArea: "neck", sleepPosition: "Stomach", product: "Cervical Contour Pillow", consultDate: getDaysAgo(3) },
  { id: 3, name: "Charlie Davis", phone: "5551234567", painArea: "shoulders", sleepPosition: "Back", product: "Adjustable Sleep System", consultDate: getDaysAgo(1) }, // Not due yet
];

export default function AdminPanel() {
  const [patients, setPatients] = useState([]);
  const [sentStatus, setSentStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        const data = await getPatients();
        setPatients(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  const getFollowUpStatus = (consultDate) => {
    const today = new Date();
    const consult = new Date(consultDate);
    const diffTime = Math.abs(today - consult);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 3 && diffDays <= 5) return { status: 'due', color: '#eab308', text: 'Due Today' };
    if (diffDays > 5) return { status: 'overdue', color: '#ef4444', text: 'Overdue' };
    return { status: 'pending', color: '#8b949e', text: `Due in ${3 - diffDays} days` };
  };

  const generateWhatsAppLink = (customer) => {
    const phone = customer.phone.replace(/\D/g, '');
    const cacheBuster = new Date().getTime();
    const link = `${window.location.origin}/r/${customer.id}?v=${cacheBuster}`;
    
    const timeSinceVisit = calculateTimeSince(customer.consultDate);
    const productPurchased = customer.productPurchased || customer.product;
    
    let context = "";
    if (timeSinceVisit && productPurchased) {
      context = `It's been ${timeSinceVisit} since you picked up your ${productPurchased}. `;
    } else if (timeSinceVisit) {
      context = `It's been ${timeSinceVisit} since your visit. `;
    }
    
    const fullMessage = `Hi ${customer.name},\n\n${context}Hope your body is treating you better!\n\nHere is your *Personalized 3D Recovery Plan* (including exercises and things to avoid):\n👉 ${link}\n\nLet me know if you have any questions.\n\nBest,\nDr. ${customer.physioName || 'Physio'}`;

    const message = encodeURIComponent(fullMessage);
    return `https://wa.me/${phone}?text=${message}`;
  };

  const handleMarkSent = (id) => {
    setSentStatus(prev => ({ ...prev, [id]: true }));
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

  return (
    <div style={{ padding: '40px', minHeight: '100vh', background: 'var(--primary-bg)', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            <ArrowLeft size={24} />
          </Link>
          <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '2rem' }}>Follow-up System Admin</h1>
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '20px' }}>Database Error: Ensure you have added the Supabase API keys to .env!</div>}

        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={20} color="var(--accent)"/> Consult Log (Mock Google Sheet Data)
          </h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Patient</th>
                  <th style={{ padding: '12px' }}>Consult Date</th>
                  <th style={{ padding: '12px' }}>Focus Area</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Loading patients from cloud database...</td></tr>}
                {!loading && patients.map(customer => {
                  const status = getFollowUpStatus(customer.consultDate);
                  const isSent = sentStatus[customer.id];
                  
                  return (
                    <tr key={customer.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ fontWeight: 'bold' }}>{customer.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{customer.phone}</div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>{customer.consultDate}</td>
                      <td style={{ padding: '16px 12px', textTransform: 'capitalize' }}>{customer.painArea.replace('_', ' ')}</td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{ 
                          color: status.color, 
                          background: `${status.color}20`, 
                          padding: '4px 12px', 
                          borderRadius: '12px', 
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          {isSent ? 'Follow-up Sent' : status.text}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <Link 
                            to={`/r/${customer.id}`} 
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
                              href={generateWhatsAppLink(customer)} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={() => handleMarkSent(customer.id)}
                              className="clinical-btn"
                              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: '#22c55e' }}
                            >
                              <MessageCircle size={18} /> Send WhatsApp
                            </a>
                          )}

                          <button 
                            onClick={() => handleDelete(customer.id)}
                            className="clinical-btn"
                            title="Delete Record"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: '#ef4444', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
}
