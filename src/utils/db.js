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

export const upsertPatient = async (patient, existingId = null) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (existingId) {
    const { data, error } = await supabase
      .from('patients')
      .update(patient)
      .eq('id', existingId)
      .select()
      .single();
    if (error) throw error;
    return data.id;
  }
  return await addPatient(patient);
};

export const getTrackerTasks = async (physioProfile) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  
  const allRows = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('tracker_tasks')
      .select('*')
      .eq('is_deleted', false)
      .order('consult_date', { ascending: false })
      .range(from, from + pageSize - 1);

    // If physio, filter for their tasks
    if (physioProfile && physioProfile.role === 'physio') {
      const nameMatch = physioProfile.full_name?.replace(/^Dr\.?\s+/i, '').trim().split(' ')[0] || '';
      if (physioProfile.id) {
        query = query.or(`physio_id.eq.${physioProfile.id},physio_name.ilike.%${nameMatch}%`);
      } else if (nameMatch) {
        query = query.ilike('physio_name', `%${nameMatch}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Could not query tracker_tasks from Supabase:", error.message);
      break;
    }

    if (Array.isArray(data) && data.length > 0) {
      allRows.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }

    // Safety ceiling
    if (allRows.length >= 20000) {
      break;
    }
  }

  return allRows;
};

export const linkTaskToPatient = async (taskId, patientId) => {
  if (!supabase || !taskId) return;
  try {
    await supabase
      .from('tracker_tasks')
      .update({ patient_id: patientId, updated_at: new Date().toISOString() })
      .eq('id', taskId);
  } catch (err) {
    console.warn("Error linking task to patient in Supabase:", err);
  }
};

export const softDeleteTrackerTask = async (taskId) => {
  if (!supabase || !taskId) return;
  try {
    await supabase
      .from('tracker_tasks')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', taskId);
  } catch (err) {
    console.warn("Error deleting task in Supabase:", err);
  }
};

export const markTaskWhatsAppSent = async (taskId) => {
  if (!supabase || !taskId) return;
  try {
    await supabase
      .from('tracker_tasks')
      .update({ whatsapp_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', taskId);
  } catch (err) {
    console.warn("Error updating task whatsapp status:", err);
  }
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

export const updatePatientProgress = async (id, streak, completedExercises) => {
  if (!supabase || !id) return;
  try {
    await supabase
      .from('patients')
      .update({
        daily_streak: streak,
        completed_exercises: completedExercises
      })
      .eq('id', id);
  } catch (err) {
    console.warn("Could not sync progress to Supabase:", err);
  }
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

export const recordFollowup = async (patientId, physioId, fallbackName = null) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  try {
    const payload = { physio_id: physioId };
    if (patientId) {
      payload.patient_id = patientId;
    }
    if (fallbackName) {
      payload.patient_name_fallback = fallbackName;
    }
    const { error } = await supabase
      .from('followups')
      .insert([payload]);
    if (error) throw error;
  } catch (err) {
    console.error("Error recording followup:", err);
  }
};

export const getFollowupsReport = async () => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from('followups')
    .select(`
      id,
      created_at,
      patient_name_fallback,
      profiles!physio_id (full_name),
      patients!patient_id (name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(f => ({
    id: f.id,
    dateSent: f.created_at,
    physioName: f.profiles?.full_name || 'Unknown',
    patientName: f.patients?.name || f.patient_name_fallback || 'Unknown (Unlinked)'
  }));
};

export const getLeaderboardReport = async (targetDateStr = null) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  // If targetDateStr is not provided, calculate Yesterday in local date
  let targetDate;
  if (targetDateStr) {
    const [year, month, day] = targetDateStr.split('-').map(Number);
    targetDate = new Date(year, month - 1, day);
  } else {
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
  }

  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  const startISO = startOfDay.toISOString();
  const endISO = endOfDay.toISOString();

  // 1. Fetch all registered physios from profiles
  const { data: physios, error: physiosError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'physio');

  if (physiosError) throw physiosError;

  // 2. Fetch sessions created within this date range
  const { data: sessions, error: sessionsError } = await supabase
    .from('patient_sessions')
    .select(`
      id,
      duration_seconds,
      created_at,
      patient_id,
      patients!patient_id (
        id,
        name,
        physio_id,
        profiles!physio_id (id, full_name)
      )
    `)
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  if (sessionsError) throw sessionsError;

  // 3. Map & Aggregate stats per physio
  const physioMap = new Map();
  (physios || []).forEach(p => {
    physioMap.set(p.id, {
      id: p.id,
      name: p.full_name || 'Unnamed Physio',
      designation: 'Physiotherapist',
      qualifiedClicks: 0,
      totalSessions: 0,
      totalTime: 0,
      patientsCount: new Set(),
      rawQualifiedClicks: 0,
    });
  });

  // Aggregate sessions
  (sessions || []).forEach(s => {
    const patient = s.patients;
    if (!patient) return;
    const physioId = patient.physio_id || 'unknown';
    const physioName = patient.profiles?.full_name || 'Dr. Unknown';

    if (!physioMap.has(physioId)) {
      physioMap.set(physioId, {
        id: physioId,
        name: physioName,
        designation: 'Physiotherapist',
        qualifiedClicks: 0,
        totalSessions: 0,
        totalTime: 0,
        patientsCount: new Set(),
        rawQualifiedClicks: 0,
      });
    }

    const entry = physioMap.get(physioId);
    const duration = s.duration_seconds || 0;
    // Formula: min(t_i / 30, 1)
    const sessionQualified = Math.min(duration / 30, 1);

    entry.rawQualifiedClicks += sessionQualified;
    entry.totalSessions += 1;
    entry.totalTime += duration;
    if (patient.id) {
      entry.patientsCount.add(patient.id);
    }
  });

  const leaderboard = Array.from(physioMap.values()).map(p => {
    const roundedClicks = Math.round(p.rawQualifiedClicks * 10) / 10;
    return {
      id: p.id,
      name: p.name,
      designation: p.designation,
      rawScore: p.rawQualifiedClicks,
      qualifiedClicks: roundedClicks,
      totalSessions: p.totalSessions,
      totalTime: p.totalTime,
      uniquePatients: p.patientsCount.size,
    };
  });

  // Sort descending: by rawScore, then totalTime, then alphabetical by name
  leaderboard.sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    if (b.totalTime !== a.totalTime) return b.totalTime - a.totalTime;
    return a.name.localeCompare(b.name);
  });

  const rankedLeaderboard = leaderboard.map((item, index) => ({
    ...item,
    rank: index + 1
  }));

  const pad = (n) => String(n).padStart(2, '0');
  const formattedDate = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

  return {
    targetDate: formattedDate,
    displayDate: startOfDay.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    isYesterday: (function() {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return y.toDateString() === startOfDay.toDateString();
    })(),
    leaderboard: rankedLeaderboard,
    totalTeamSessions: sessions?.length || 0,
    totalTeamQualifiedClicks: Math.round(
      rankedLeaderboard.reduce((acc, curr) => acc + curr.rawScore, 0) * 10
    ) / 10,
  };
};

