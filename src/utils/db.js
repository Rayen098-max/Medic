import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail gracefully if keys aren't set
export const supabase = supabaseUrl && supabaseUrl !== 'your_supabase_project_url_here' 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const getPatients = async () => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .is('deleted_at', null)
    .order('consultDate', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const addPatient = async (patient) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from('patients')
    .insert([patient])
    .select()
    .single();

  if (error) throw error;
  return data.id;
};

export const getPatientById = async (id) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data;
};

export const updatePatientStatus = async (id, statusData) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from('patients')
    .update(statusData)
    .eq('id', id);

  if (error) throw error;
};

export const deletePatient = async (id) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  // Soft delete
  const { data, error } = await supabase
    .from('patients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error) throw error;
  
  if (!data || data.length === 0) {
    throw new Error("Action blocked by database. Please go to your Supabase dashboard and add a DELETE policy for the 'patients' table allowing the anon role to delete rows.");
  }
};

// Analytics / Session Tracking Functions

export const trackSessionStart = async (patientId) => {
  if (!supabase || !patientId) return null;
  try {
    const { data, error } = await supabase
      .from('patient_sessions')
      .insert([{ patient_id: patientId, duration_seconds: 0 }])
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error("Tracking error:", error);
    return null;
  }
};

export const updateSessionDuration = async (sessionId, durationSeconds) => {
  if (!supabase || !sessionId) return;
  try {
    await supabase
      .from('patient_sessions')
      .update({ duration_seconds: durationSeconds })
      .eq('id', sessionId);
  } catch (error) {
    console.error("Tracking update error:", error);
  }
};

export const getUsageReport = async () => {
  if (!supabase) throw new Error("Supabase is not configured.");
  // We fetch patients with their linked physio profile and their sessions
  const { data, error } = await supabase
    .from('patients')
    .select(`
      id,
      name,
      phone,
      physio_id,
      profiles!physio_id (full_name),
      patient_sessions (id, duration_seconds, created_at)
    `)
    .is('deleted_at', null);

  if (error) throw error;

  // Process data to aggregate sessions
  const report = data.filter(p => p.patient_sessions && p.patient_sessions.length > 0).map(patient => {
    const sessions = patient.patient_sessions;
    const totalOpens = sessions.length;
    const totalTime = sessions.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
    const lastOpened = sessions.reduce((latest, curr) => {
      const currTime = new Date(curr.created_at).getTime();
      return currTime > latest ? currTime : latest;
    }, 0);

    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      physioName: patient.profiles?.full_name || 'Unknown',
      totalOpens,
      totalTime,
      lastOpened: new Date(lastOpened).toISOString()
    };
  });

  return report.sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime());
};

export const getExercises = async () => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const addExercise = async (exercise) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from('exercises')
    .insert([exercise])
    .select()
    .single();

  if (error) throw error;
  return data.id;
};

export const updateExercise = async (id, updates) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from('exercises')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
};
