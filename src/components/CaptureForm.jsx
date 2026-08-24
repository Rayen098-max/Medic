import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { addPatient } from '../utils/db';
import { useAuth } from '../context/AuthContext';
import painPointsData from '../data/painPoints.json';

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  consultDate: z.string().min(1, "Consult date is required"),
});

export default function CaptureForm() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    consultDate: 'Few Days ago',
    painPointIds: ['L01'], // Default to generic lower back
    consent: false
  });
  const [exercises, setExercises] = useState([]);
  const [conditionNotes, setConditionNotes] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const addExercise = () => setExercises([...exercises, { image: '', instructions: '' }]);
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
      consultDate: formData.consultDate,
      recommendedExercises: exercises,
      conditionNotes: conditionNotes
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
                    <textarea 
                      value={conditionNotes[id] || ''} 
                      onChange={(e) => setConditionNotes({...conditionNotes, [id]: e.target.value})}
                      rows={3}
                      placeholder="e.g., Avoid heavy lifting. Keep spine neutral."
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', resize: 'vertical' }}
                    />
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
            <button type="button" onClick={addExercise} className="clinical-btn" style={{ fontSize: '0.85rem', padding: '8px 12px', width: 'fit-content' }}>+ Add Exercise</button>
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
