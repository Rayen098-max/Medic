import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { addPatient, getExercises } from '../utils/db';
import { useAuth } from '../context/AuthContext';
import painPointsData from '../data/painPoints.json';

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  consultDate: z.string().min(1, "Consult date is required"),
});

function formatConsultDateToISO(rawDate) {
  if (!rawDate) return new Date().toISOString();
  
  if (rawDate === 'Few Days ago') {
    return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (rawDate === 'a week ago') {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Try parsing directly
  const d = new Date(rawDate);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  // Parse DD/MM or DD/MM/YYYY
  const parts = String(rawDate).split(/[\/\\]/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parts.length >= 3 ? parseInt(parts[2], 10) : new Date().getFullYear();
    const parsed = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

export default function CaptureForm({ initialData = null, onSuccess = null, isEmbedded = false }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    consultDate: initialData?.consultDate || 'Few Days ago',
    painPointIds: [], // Default to no pain point selected
    consent: false
  });
  const [exercises, setExercises] = useState([]);
  const [conditionNotes, setConditionNotes] = useState({});
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);

  React.useEffect(() => {
    const fetchExercises = async () => {
      try {
        const data = await getExercises();
        setAvailableExercises(data || []);
      } catch (err) {
        console.error('Error fetching exercises:', err);
      }
    };
    fetchExercises();
  }, []);

  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newExercises = [...exercises];
        newExercises[index].image = reader.result;
        setExercises(newExercises);
      };
      reader.readAsDataURL(file);
    }
  };

  const addExercise = () => setExercises([...exercises, { name: '', image: '', instructions: '' }]);
  const removeExercise = (index) => setExercises(exercises.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      formSchema.parse({
        name: formData.name,
        phone: formData.phone,
        consultDate: formData.consultDate
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        alert("Validation error: " + error.errors.map(e => e.message).join(', '));
        return;
      }
    }

    if (!formData.consent) {
      alert("Please confirm customer consent to proceed.");
      return;
    }

    setIsSubmitting(true);

    // Setup Base Fallback
    let matchedPointIds = formData.painPointIds;
    let finalTranscription = "Manual condition selection.";

    await new Promise(r => setTimeout(r, 600));

    const primaryPoint = painPointsData.find(p => p.id === matchedPointIds[0]);

    const newPatient = {
      name: formData.name,
      phone: formData.phone,
      painArea: primaryPoint ? primaryPoint.zone : 'lower_back',
      painPointId: matchedPointIds.join(','),
      transcription: finalTranscription,
      sleepPosition: 'Unknown',
      physio_id: profile?.id,
      consultDate: formatConsultDateToISO(formData.consultDate),
      recommendedExercises: exercises,
      conditionNotes: { ...conditionNotes, whatsappMessage }
    };

    try {
      const id = await addPatient(newPatient);
      setIsSubmitting(false);
      alert(`Card processed successfully! Portal generated at /r/${id}`);
      
      if (onSuccess) {
        onSuccess(id);
      } else {
        navigate('/admin');
      }
    } catch (error) {
      setIsSubmitting(false);
      alert("Error saving patient to database: " + error.message);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className={isEmbedded ? "" : "glass-panel"} style={{ padding: isEmbedded ? '0px' : '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
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
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Consult Date</label>
        <select
          required
          value={formData.consultDate}
          onChange={e => setFormData({...formData, consultDate: e.target.value})}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', colorScheme: 'dark' }}
        >
          {formData.consultDate && !['Few Days ago', 'a week ago'].includes(formData.consultDate) && (
            <option value={formData.consultDate}>{formData.consultDate}</option>
          )}
          <option value="Few Days ago">Few Days ago</option>
          <option value="a week ago">a week ago</option>
        </select>
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
                        // Check if another point in this zoneName is already selected
                        const existingInZone = formData.painPointIds.find(id => points.find(pt => pt.id === id));
                        
                        let newIds = [...formData.painPointIds];
                        if (existingInZone) {
                          alert(`You can only select one condition for the ${zoneName}. Replacing previous selection.`);
                          newIds = newIds.filter(id => id !== existingInZone);
                        }
                        setFormData({...formData, painPointIds: [...newIds, p.id]});
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

      {formData.painPointIds.length > 0 && (
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Condition Notes</label>
          {formData.painPointIds.map(id => {
            const point = painPointsData.find(p => p.id === id);
            if (!point) return null;
            return (
              <div key={id} style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--accent)', fontWeight: 'bold' }}>Notes for: {point.name}</label>
                
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#ccc', display: 'block', marginBottom: '4px' }}>Paragraph 1: Personalized Message & Greetings (Editable)</span>
                  <textarea 
                    value={conditionNotes[id] || ''} 
                    onChange={(e) => setConditionNotes({...conditionNotes, [id]: e.target.value})}
                    rows={3}
                    placeholder="e.g., Hi John, it was great seeing you today! Let's get that back pain sorted."
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', resize: 'vertical' }}
                  />
                </div>
                
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#ccc', display: 'block', marginBottom: '4px' }}>Paragraph 2: Predefined Condition Info (Auto-appended)</span>
                  <div style={{ width: '100%', padding: '12px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    The system will automatically append predefined information for this condition here, including up to 5 common issues and a reference to check the exercises section.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Recommended Exercises (Optional)</label>
        {exercises.map((ex, i) => (
          <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '12px', position: 'relative' }}>
            <button type="button" onClick={() => removeExercise(i)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>Exercise Name</label>
              <input 
                type="text"
                value={ex.name || ''}
                onChange={(e) => {
                  const newEx = [...exercises];
                  newEx[i].name = e.target.value;
                  setExercises(newEx);
                }}
                placeholder="e.g., Neck Side Bends"
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>Exercise Image</label>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(i, e)} style={{ color: 'white', fontSize: '0.85rem', width: '100%' }} />
              {ex.image && <img src={ex.image} alt="Preview" style={{ marginTop: '8px', width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />}
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>Instructions</label>
              <textarea 
                value={ex.instructions} 
                onChange={(e) => {
                  const newEx = [...exercises];
                  newEx[i].instructions = e.target.value;
                  setExercises(newEx);
                }}
                rows={3}
                placeholder="e.g., Hold for 30 seconds, repeat 3 times."
                style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', resize: 'vertical' }}
              />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            onChange={(e) => {
              if (!e.target.value) return;
              const selectedEx = availableExercises.find(a => a.id === e.target.value);
              if (selectedEx) {
                setExercises([...exercises, { 
                  name: selectedEx.name, 
                  image: selectedEx.image_url || '', 
                  instructions: selectedEx.instructions || '' 
                }]);
                e.target.value = ''; // reset after selection
              }
            }}
            style={{ flex: '1', minWidth: '250px', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', colorScheme: 'dark' }}
          >
            <option value="">Select from predefined exercises...</option>
            {availableExercises.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-muted)' }}>OR</span>
          <button type="button" onClick={addExercise} className="clinical-btn" style={{ fontSize: '0.85rem', padding: '8px 12px', whiteSpace: 'nowrap' }}>+ Add Custom Exercise</button>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Personalized WhatsApp Message</label>
        <textarea 
          value={whatsappMessage} 
          onChange={(e) => setWhatsappMessage(e.target.value)}
          rows={4}
          placeholder="e.g., Hi John, it was great seeing you today! Hope your body is treating you better. Let me know if you have any questions."
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', resize: 'vertical' }}
        />
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
  );

  if (isEmbedded) {
    return formContent;
  }

  return (
    <div style={{ padding: '40px', minHeight: '100vh', background: 'var(--primary-bg)', color: 'var(--text-main)' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            <ArrowLeft size={24} />
          </Link>
          <h1 style={{ color: 'var(--accent)', margin: 0, fontSize: '2rem' }}>New Consult Capture</h1>
        </div>
        {formContent}
      </div>
    </div>
  );
}
