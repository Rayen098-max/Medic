import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function linkAllTasks() {
  console.log("=== SYNCHRONIZING PATIENTS TO TRACKER_TASKS IN SUPABASE ===");

  // 1. Fetch all patients
  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/patients?select=id,name,phone,created_at,physio_id&limit=5000`, {
    headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY }
  });
  const patients = await pRes.json();
  console.log(`Fetched ${patients.length} patients from Supabase.`);

  // 2. Fetch all patient_sessions
  const sRes = await fetch(`${SUPABASE_URL}/rest/v1/patient_sessions?select=id,patient_id,created_at&limit=5000`, {
    headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY }
  });
  const sessions = await sRes.json();
  const sessionPatientIds = new Set(sessions.map(s => s.patient_id));
  console.log(`Fetched ${sessions.length} sessions (${sessionPatientIds.size} unique active patients).`);

  // Map phone -> patient
  const phoneToPatient = new Map();
  const nameToPatient = new Map();
  for (const p of patients) {
    if (p.phone) {
      const cleanPhone = String(p.phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone.length >= 7) {
        phoneToPatient.set(cleanPhone, p);
      }
    }
    if (p.name) {
      nameToPatient.set(String(p.name).trim().toLowerCase(), p);
    }
  }

  // 3. Fetch all tracker_tasks with pagination
  let allTasks = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const tRes = await fetch(`${SUPABASE_URL}/rest/v1/tracker_tasks?select=id,customer_name,customer_phone,patient_id,whatsapp_sent_at,consult_date,session_done`, {
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
        "Range-Unit": "items",
        "Range": `${from}-${from + pageSize - 1}`
      }
    });
    const chunk = await tRes.json();
    if (Array.isArray(chunk) && chunk.length > 0) {
      allTasks.push(...chunk);
      if (chunk.length < pageSize) hasMore = false;
      else from += pageSize;
    } else {
      hasMore = false;
    }
  }
  console.log(`Fetched ${allTasks.length} tracker_tasks.`);

  let updatedCount = 0;
  for (const t of allTasks) {
    const cleanPhone = String(t.customer_phone || '').replace(/\D/g, '').slice(-10);
    const cleanName = String(t.customer_name || '').trim().toLowerCase();

    const matchedPatient = (cleanPhone && phoneToPatient.get(cleanPhone)) || nameToPatient.get(cleanName);

    if (matchedPatient) {
      const updates = {};
      if (t.patient_id !== matchedPatient.id) {
        updates.patient_id = matchedPatient.id;
      }
      if (!t.whatsapp_sent_at) {
        updates.whatsapp_sent_at = matchedPatient.created_at || new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/tracker_tasks?id=eq.${encodeURIComponent(t.id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
          },
          body: JSON.stringify(updates)
        });
        updatedCount++;
      }
    }
  }

  console.log(`Successfully synced ${updatedCount} tasks to existing patients and follow-ups!`);
}

linkAllTasks().catch(console.error);
