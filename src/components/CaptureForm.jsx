import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, ArrowLeft, Loader2 } from 'lucide-react';
import { addPatient } from '../utils/db';
import { transcribeCardWithOpenAI } from '../utils/ai';
import painPointsData from '../data/painPoints.json';

export default function CaptureForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    painPointIds: ['L01'], // Default to generic lower back
    consent: false,
    photo: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consent) {
      alert("Please confirm customer consent to proceed.");
      return;
    }

    setIsSubmitting(true);

    // Setup Base Fallback
    let matchedPointIds = formData.painPointIds;
    let finalTranscription = "No photo provided. Used manual fallback selection.";

    if (formData.photo) {
      try {
        finalTranscription = await transcribeCardWithOpenAI(formData.photo);
        
        const lowerTrans = finalTranscription.toLowerCase();
        
        let foundMatches = painPointsData.filter(p => lowerTrans.includes(p.name.toLowerCase()));
        
        if (foundMatches.length > 0) {
          matchedPointIds = foundMatches.slice(0, 5).map(m => m.id);
        }
      } catch (err) {
        alert("AI Transcription Failed (using fallback instead): " + err.message);
      }
    } else {
      await new Promise(r => setTimeout(r, 600));
    }

    const primaryPoint = painPointsData.find(p => p.id === matchedPointIds[0]);

    const newPatient = {
      name: formData.name,
      phone: formData.phone,
      painArea: primaryPoint ? primaryPoint.zone : 'lower_back',
      painPointId: matchedPointIds.join(','),
      transcription: finalTranscription,
      sleepPosition: 'Unknown',
      product: primaryPoint ? primaryPoint.products[0] : 'Recommended Product'
    };

    try {
      const id = await addPatient(newPatient);
      setIsSubmitting(false);
      alert(`Card processed successfully! Portal generated at /r/${id}`);
      navigate('/admin');
    } catch (error) {
      setIsSubmitting(false);
      alert("Error saving patient to database: " + error.message);
    }
  };

  return (
    <div style={{ padding: '40px', minHeight: '100vh', background: 'var(--primary-bg)', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            <ArrowLeft size={24} />
          </Link>
          <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '2rem' }}>New Consult Capture</h1>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Care Card Photo</label>
            <div style={{ 
              position: 'relative',
              border: '2px dashed var(--border-color)', 
              borderRadius: '8px', 
              padding: '40px', 
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <Camera size={32} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <div>Tap to take photo or upload</div>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                style={{ display: 'block', width: '100%', opacity: 0, position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, cursor: 'pointer' }}
                onChange={(e) => setFormData({...formData, photo: e.target.files[0]})}
              />
              {formData.photo && <div style={{ position: 'relative', zIndex: 10, marginTop: '12px', color: '#22c55e' }}>{formData.photo.name} attached</div>}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Customer Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Phone Number (WhatsApp)</label>
            <input 
              required
              type="tel" 
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Manual Condition Selection (Select up to 5)</label>
            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(painPointsData.reduce((acc, point) => {
                if (!acc[point.zone]) acc[point.zone] = [];
                acc[point.zone].push(point);
                return acc;
              }, {})).map(([zoneName, points]) => (
                <div key={zoneName}>
                  <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>{zoneName}</div>
                  {points.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '8px' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.painPointIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (formData.painPointIds.length >= 5) {
                              alert("Maximum 5 conditions allowed.");
                              return;
                            }
                            setFormData({...formData, painPointIds: [...formData.painPointIds, p.id]});
                          } else {
                            setFormData({...formData, painPointIds: formData.painPointIds.filter(id => id !== p.id)});
                          }
                        }}
                        style={{ width: '20px', height: '20px', accentColor: '#00d2ff' }}
                      />
                      <span style={{ fontSize: '0.95rem' }}>{p.id} - {p.name}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0, 210, 255, 0.05)', padding: '16px', borderRadius: '8px' }}>
            <input 
              type="checkbox" 
              id="consent" 
              checked={formData.consent}
              onChange={e => setFormData({...formData, consent: e.target.checked})}
              style={{ width: '20px', height: '20px' }}
            />
            <label htmlFor="consent" style={{ fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              Customer agrees to receive their personalized report via link
            </label>
          </div>

          <button 
            type="submit" 
            disabled={!formData.consent || isSubmitting}
            className="clinical-btn"
            style={{ 
              marginTop: '16px', 
              padding: '16px', 
              width: '100%', 
              fontSize: '1.1rem', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px',
              opacity: formData.consent ? 1 : 0.5
            }}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Process & Generate Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
