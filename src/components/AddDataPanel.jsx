import React, { useState, useEffect } from 'react';
import { getExercises, addExercise, updateExercise } from '../utils/db';
import { useAuth } from '../context/AuthContext';
import { Plus, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function AddDataPanel() {
  const { profile } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    instructions: ''
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const data = await getExercises();
      setExercises(data || []);
    } catch (err) {
      console.error('Error fetching exercises:', err);
    }
    setLoading(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Please provide an exercise name.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addExercise(formData);
      alert('Exercise added successfully!');
      setFormData({ name: '', image_url: '', instructions: '' });
      fetchExercises();
    } catch (err) {
      alert('Failed to add exercise: ' + err.message);
    }
    setIsSubmitting(false);
  };

  const handleUpdateImage = async (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 800px
          if (width > 800) {
            height = Math.round((height * 800) / width);
            width = 800;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          
          try {
            // Optimistic update
            setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, image_url: dataUrl } : ex));
            
            await updateExercise(id, { image_url: dataUrl });
            alert('Image attached successfully!');
          } catch (err) {
            alert('Failed to attach image: ' + err.message);
            fetchExercises(); // Revert on failure
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    return <div style={{ padding: '20px', color: 'white' }}>Access Denied. Admins only.</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-main)' }}>
      <h1 style={{ color: 'var(--accent)', marginBottom: '24px', fontSize: '2rem' }}>Add Data - Exercises</h1>
      
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', color: 'white' }}>Upload New Exercise</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Exercise Name *</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }} 
              placeholder="e.g., Hamstring Stretch"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Exercise Image (Optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                style={{ color: 'white' }} 
              />
              {formData.image_url && (
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
                />
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Instructions (Optional)</label>
            <textarea 
              value={formData.instructions}
              onChange={e => setFormData({...formData, instructions: e.target.value})}
              rows={4}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', resize: 'vertical' }} 
              placeholder="e.g., Hold the stretch for 30 seconds..."
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="clinical-btn" 
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Add Exercise
          </button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', color: 'white' }}>Available Exercises</h2>
        
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <Loader2 size={18} className="animate-spin" /> Loading exercises...
          </div>
        ) : exercises.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No exercises uploaded yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {exercises.map(ex => (
              <div key={ex.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {ex.image_url ? (
                  <img src={ex.image_url} alt={ex.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '12px' }} />
                ) : (
                  <div style={{ width: '100%', height: '150px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <ImageIcon size={32} />
                  </div>
                )}
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent)', fontSize: '1.1rem' }}>{ex.name}</h3>
                <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {ex.instructions || 'No instructions provided.'}
                </p>
                <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ccc' }}>
                    {ex.image_url ? 'Replace Image' : 'Attach Image'}
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleUpdateImage(ex.id, e)} 
                    style={{ color: 'white', fontSize: '0.85rem', width: '100%' }} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
