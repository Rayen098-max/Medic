import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import { z } from 'zod';
import { addPatient, upsertPatient, linkTaskToPatient, getExercises } from '../utils/db';
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
  const [customConditions, setCustomConditions] = useState([]);
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

  const addExercise = () => setExercises([...exercises, { name: '', image: '', instructions: '', duration: '', sets: '', week: '1', customPlan: '' }]);
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

    const primaryPoint = painPointsData.find(p => p.id === matchedPointIds[0]) || (customConditions.length > 0 ? customConditions[0] : null);

    const customConditionsPayload = customConditions.map((c, i) => ({
        id: `CUSTOM_${Date.now()}_${i}`,
        name: c.name,
        zone: c.zone,
        description: c.message,
        dos: [],
        donts: []
    }));

    const combinedNotes = { ...conditionNotes };
    customConditionsPayload.forEach((c, i) => {
        combinedNotes[c.id] = customConditions[i].notes;
    });

    const newPatient = {
      name: formData.name,
      phone: formData.phone,
      painArea: primaryPoint ? primaryPoint.zone : 'lower_back',
      painPointId: matchedPointIds.join(','),
      customConditions: customConditionsPayload,
      transcription: finalTranscription,
      sleepPosition: 'Unknown',
      physio_id: profile?.id,
      consultDate: formatConsultDateToISO(formData.consultDate),
      recommendedExercises: exercises,
      conditionNotes: { ...combinedNotes, whatsappMessage },
      tracker_id: initialData?.tracker_id || null
    };

    try {
      const patientIdToUpdate = initialData?.id || null;
      const id = await upsertPatient(newPatient, patientIdToUpdate);
      
      // If linked to a task in tracker_tasks, update the task in Supabase
      if (initialData?.tracker_id) {
        await linkTaskToPatient(initialData.tracker_id, id);
      }

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
    <form onSubmit={handleSubmit} className={isEmbedded ? "space-y-6" : "glass-panel p-6 sm:p-8 space-y-6"}>
      
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Customer Name</label>
        <input 
          required
          type="text" 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          placeholder="e.g. John Doe"
          className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Phone Number (WhatsApp)</label>
        <input 
          required
          type="tel" 
          value={formData.phone}
          onChange={e => setFormData({...formData, phone: e.target.value})}
          placeholder="e.g. 9876543210"
          className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground" 
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Consult Date</label>
        <select
          required
          value={formData.consultDate}
          onChange={e => setFormData({...formData, consultDate: e.target.value})}
          className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
        >
          {formData.consultDate && !['Few Days ago', 'a week ago'].includes(formData.consultDate) && (
            <option value={formData.consultDate} style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>{formData.consultDate}</option>
          )}
          <option value="Few Days ago" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Few Days ago</option>
          <option value="a week ago" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>a week ago</option>
        </select>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-semibold text-foreground">Manual Condition Selection (Select up to 5)</label>
          <button 
            type="button" 
            onClick={() => setCustomConditions([...customConditions, { zone: '', name: '', message: '', notes: '' }])} 
            className="clinical-btn text-xs py-1.5 px-3"
          >
            + Add Custom Condition
          </button>
        </div>

        {customConditions.length > 0 && (
          <div className="space-y-3 mb-4">
            {customConditions.map((cond, i) => (
              <div key={i} className="p-4 rounded-xl bg-card/60 dark:bg-card/40 border border-border/80 shadow-xs relative">
                <button 
                  type="button" 
                  onClick={() => setCustomConditions(customConditions.filter((_, idx) => idx !== i))} 
                  className="absolute top-3 right-3 text-destructive hover:text-destructive/80 transition-colors p-1"
                  title="Remove condition"
                >
                  <X size={16} />
                </button>
                
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Body Part (For glowing effect)</label>
                  <select 
                    value={cond.zone || ''}
                    onChange={(e) => {
                      const newConds = [...customConditions];
                      newConds[i].zone = e.target.value;
                      setCustomConditions(newConds);
                    }}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Select body part...</option>
                    {Object.keys(painPointsData.reduce((acc, point) => { if(point.zone) acc[point.zone] = true; return acc; }, {})).map(z => (
                      <option key={z} value={z} style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>{z}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Condition Name</label>
                  <input 
                    type="text"
                    value={cond.name || ''}
                    onChange={(e) => {
                      const newConds = [...customConditions];
                      newConds[i].name = e.target.value;
                      setCustomConditions(newConds);
                    }}
                    required
                    placeholder="e.g., Unspecified Neck Pain"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="mb-3">
                  <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Personalized Message (Required)</span>
                  <textarea 
                    value={cond.notes || ''} 
                    onChange={(e) => {
                      const newConds = [...customConditions];
                      newConds[i].notes = e.target.value;
                      setCustomConditions(newConds);
                    }}
                    rows={2}
                    required
                    placeholder="e.g., Hi John, it was great seeing you today! Let's get that back pain sorted."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y placeholder:text-muted-foreground"
                  />
                </div>
                
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Condition Info (Optional)</span>
                  <textarea 
                    value={cond.message || ''} 
                    onChange={(e) => {
                      const newConds = [...customConditions];
                      newConds[i].message = e.target.value;
                      setCustomConditions(newConds);
                    }}
                    rows={2}
                    placeholder="e.g., Information about this specific condition..."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[250px] overflow-y-auto rounded-xl border border-border/70 bg-card/40 p-3.5 space-y-4">
          {Object.entries(painPointsData.reduce((acc, point) => {
            if (!acc[point.zone]) acc[point.zone] = [];
            acc[point.zone].push(point);
            return acc;
          }, {})).map(([zoneName, points]) => (
            <div key={zoneName}>
              <div className="text-xs font-bold text-primary uppercase tracking-wider pb-1 mb-2 border-b border-border/40">{zoneName}</div>
              <div className="space-y-1.5">
                {points.map(p => (
                  <label key={p.id} className="flex items-center gap-3 cursor-pointer text-sm text-foreground hover:text-primary transition-colors py-0.5">
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
                      className="size-4.5 rounded border-input text-primary accent-primary cursor-pointer"
                    />
                    <span className="font-medium">{p.id} - {p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {formData.painPointIds.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">Condition Notes</label>
          {formData.painPointIds.map(id => {
            const point = painPointsData.find(p => p.id === id);
            if (!point) return null;
            return (
              <div key={id} className="p-4 rounded-xl bg-card/60 dark:bg-card/40 border border-border/80 shadow-xs space-y-3">
                <label className="block text-xs font-bold text-primary uppercase tracking-wider">Notes for: {point.name}</label>
                
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Paragraph 1: Personalized Message & Greetings (Editable)</span>
                  <textarea 
                    value={conditionNotes[id] || ''} 
                    onChange={(e) => setConditionNotes({...conditionNotes, [id]: e.target.value})}
                    rows={3}
                    placeholder="e.g., Hi John, it was great seeing you today! Let's get that back pain sorted."
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y placeholder:text-muted-foreground"
                  />
                </div>
                
                <div>
                  <span className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Paragraph 2: Predefined Condition Info (Auto-appended)</span>
                  <div className="w-full p-3 rounded-lg bg-muted/40 border border-dashed border-border text-muted-foreground text-xs italic leading-relaxed">
                    The system will automatically append predefined information for this condition here, including up to 5 common issues and a reference to check the exercises section.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-foreground mb-3">Recommended Exercises (Optional)</label>
        {exercises.map((ex, i) => (
          <div key={i} className="p-4 rounded-xl bg-card/60 dark:bg-card/40 border border-border/80 shadow-xs mb-3 relative space-y-3">
            <button 
              type="button" 
              onClick={() => removeExercise(i)} 
              className="absolute top-3 right-3 text-destructive hover:text-destructive/80 transition-colors p-1"
              title="Remove exercise"
            >
              <X size={16} />
            </button>
            
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Exercise Name</label>
              <input 
                type="text"
                value={ex.name || ''}
                onChange={(e) => {
                  const newEx = [...exercises];
                  newEx[i].name = e.target.value;
                  setExercises(newEx);
                }}
                placeholder="e.g., Neck Side Bends"
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Exercise Image</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(i, e)} 
                className="text-foreground text-sm w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" 
              />
              {ex.image && <img src={ex.image} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-lg border border-border" />}
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Instructions</label>
              <textarea 
                value={ex.instructions} 
                onChange={(e) => {
                  const newEx = [...exercises];
                  newEx[i].instructions = e.target.value;
                  setExercises(newEx);
                }}
                rows={3}
                placeholder="e.g., Hold for 30 seconds, repeat 3 times."
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y placeholder:text-muted-foreground"
              />
            </div>

            <div className="pt-3 border-t border-border/60">
              <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Plan for the exercise</label>
              <div className="flex gap-3 flex-wrap mb-3">
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (min)</label>
                  <select 
                    value={ex.duration || ''}
                    onChange={(e) => {
                      const newEx = [...exercises];
                      newEx[i].duration = e.target.value;
                      setExercises(newEx);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Select</option>
                    {Array.from({length: 60}, (_, idx) => idx + 1).map(num => (
                      <option key={num} value={num} style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>{num} min</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sets</label>
                  <select 
                    value={ex.sets || ''}
                    onChange={(e) => {
                      const newEx = [...exercises];
                      newEx[i].sets = e.target.value;
                      setExercises(newEx);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Select</option>
                    {Array.from({length: 60}, (_, idx) => idx + 1).map(num => (
                      <option key={num} value={num} style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Week</label>
                  <select 
                    value={ex.week || '1'}
                    onChange={(e) => {
                      const newEx = [...exercises];
                      newEx[i].week = e.target.value;
                      setExercises(newEx);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="1" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Week 1</option>
                    <option value="2" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Week 2</option>
                    <option value="3" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Week 3</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Custom Plan (Optional)</label>
                <textarea 
                  value={ex.customPlan || ''} 
                  onChange={(e) => {
                    const newEx = [...exercises];
                    newEx[i].customPlan = e.target.value;
                    setExercises(newEx);
                  }}
                  rows={2}
                  placeholder="e.g., Do these primarily in the morning before breakfast."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-3 items-center flex-wrap pt-2">
          <select
            onChange={(e) => {
              if (!e.target.value) return;
              const selectedEx = availableExercises.find(a => a.id === e.target.value);
              if (selectedEx) {
                setExercises([...exercises, { 
                  name: selectedEx.name, 
                  image: selectedEx.image_url || '', 
                  instructions: selectedEx.instructions || '',
                  duration: '',
                  sets: '',
                  week: '1',
                  customPlan: ''
                }]);
                e.target.value = ''; // reset after selection
              }
            }}
            className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm font-medium shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
          >
            <option value="" style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>Select from predefined exercises...</option>
            {availableExercises.map(a => (
              <option key={a.id} value={a.id} style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}>{a.name}</option>
            ))}
          </select>
          <span className="text-xs font-semibold text-muted-foreground px-1">OR</span>
          <button 
            type="button" 
            onClick={addExercise} 
            className="clinical-btn text-xs py-2 px-3 whitespace-nowrap"
          >
            + Add Custom Exercise
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Personalized WhatsApp Message</label>
        <textarea 
          value={whatsappMessage} 
          onChange={(e) => setWhatsappMessage(e.target.value)}
          rows={4}
          placeholder="e.g., Hi John, it was great seeing you today! Hope your body is treating you better. Let me know if you have any questions."
          className="w-full p-3.5 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y leading-relaxed placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
        <input 
          type="checkbox" 
          id="consent" 
          checked={formData.consent}
          onChange={e => setFormData({...formData, consent: e.target.checked})}
          className="size-5 rounded border-input text-primary accent-primary cursor-pointer"
        />
        <label htmlFor="consent" className="text-sm font-medium text-foreground cursor-pointer select-none">
          Customer agrees to receive their personalized report via link
        </label>
      </div>

      <button 
        type="submit" 
        disabled={!formData.consent || isSubmitting}
        className="w-full mt-4 py-3.5 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Process & Generate Portal'}
      </button>
    </form>
  );

  if (isEmbedded) {
    return formContent;
  }

  return (
    <div className="p-6 md:p-10 min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-primary">New Consult Capture</h1>
        </div>
        {formContent}
      </div>
    </div>
  );
}
