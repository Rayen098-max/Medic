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

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 bg-background text-foreground min-h-screen">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Add Data - Exercises</h1>
      
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs">
        <h2 className="text-xl font-semibold text-foreground mb-6">Upload New Exercise</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Exercise Name *</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground" 
              placeholder="e.g., Hamstring Stretch"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Exercise Image (Optional)</label>
            <div className="flex items-center gap-4">
              <label className="clinical-btn cursor-pointer py-2 px-4 text-xs font-semibold">
                <ImageIcon size={16} />
                Choose Image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
              {formData.image_url && (
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  className="w-20 h-20 object-cover rounded-lg border border-border shadow-xs" 
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Instructions (Optional)</label>
            <textarea 
              value={formData.instructions}
              onChange={e => setFormData({...formData, instructions: e.target.value})}
              rows={4}
              className="w-full p-3.5 rounded-lg border border-input bg-card text-foreground text-sm shadow-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y placeholder:text-muted-foreground" 
              placeholder="e.g., Hold the stretch for 30 seconds..."
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="clinical-btn py-2.5 px-6 font-semibold"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add Exercise
          </button>
        </form>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-border/80 bg-card shadow-xs space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Available Exercises</h2>
        
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-6">
            <Loader2 size={18} className="animate-spin" /> Loading exercises...
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-muted-foreground py-6">No exercises uploaded yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {exercises.map(ex => (
              <div key={ex.id} className="bg-card rounded-xl border border-border/80 p-5 shadow-xs flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  {ex.image_url ? (
                    <img src={ex.image_url} alt={ex.name} className="w-full h-40 object-cover rounded-lg mb-3 border border-border" />
                  ) : (
                    <div className="w-full h-40 bg-muted/40 rounded-lg mb-3 border border-border/60 flex items-center justify-center text-muted-foreground">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <h3 className="font-bold text-base text-primary mb-1.5">{ex.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                    {ex.instructions || 'No instructions provided.'}
                  </p>
                </div>
                <div className="pt-3 border-t border-border/60">
                  <label className="clinical-btn cursor-pointer w-full text-xs py-2 justify-center">
                    <ImageIcon size={15} />
                    {ex.image_url ? 'Replace Image' : 'Attach Image'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleUpdateImage(ex.id, e)} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
