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
