const SUPABASE_URL = "https://bkifvxbtisntaewelsng.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWZ2eGJ0aXNudGFld2Vsc25nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTgzNDQ3NywiZXhwIjoyMTAxNDEwNDc3fQ.lPV0SuP5IkuZ_9StjqZ-gJR4hekQtd_-V3p6mTDVejY";

async function linkTasks() {
  console.log("=== AUTO-LINKING EXISTING PATIENTS & FOLLOW-UPS TO TASKS ===");

  // 1. Fetch all patients
  const pRes = await fetch(`${SUPABASE_URL}/rest/v1/patients?select=id,name,phone,created_at&limit=5000`, {
    headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY }
  });
  const patients = await pRes.json();
  console.log(`Fetched ${patients.length} patients.`);

  // 2. Fetch all followups
  const fRes = await fetch(`${SUPABASE_URL}/rest/v1/followups?select=id,patient_id,patient_name_fallback,created_at&limit=5000`, {
    headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY }
  });
  const followups = await fRes.json();
  console.log(`Fetched ${followups.length} followups.`);

  // Map of phone -> patient_id
  const phoneToPatient = new Map();
  const nameToPatient = new Map();
  for (const p of patients) {
    if (p.phone) {
      const cleanPhone = String(p.phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone.length === 10) {
        phoneToPatient.set(cleanPhone, p.id);
      }
    }
    if (p.name) {
      nameToPatient.set(p.name.trim().toLowerCase(), p.id);
    }
  }

  // Set of patient_ids that have follow-ups
  const followupPatientIds = new Set();
  const followupNames = new Set();
  for (const f of followups) {
    if (f.patient_id) followupPatientIds.add(f.patient_id);
    if (f.patient_name_fallback) followupNames.add(f.patient_name_fallback.trim().toLowerCase());
  }

  // 3. Fetch all tracker_tasks with pagination
  let allTasks = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const tRes = await fetch(`${SUPABASE_URL}/rest/v1/tracker_tasks?select=id,customer_name,customer_phone,patient_id,whatsapp_sent_at`, {
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
  console.log(`Fetched ${allTasks.length} total tracker tasks across all pages.`);

  let updatedCount = 0;
  for (const t of allTasks) {
    const cleanPhone = String(t.customer_phone || '').replace(/\D/g, '').slice(-10);
    const cleanName = String(t.customer_name || '').trim().toLowerCase();

    const matchedPatientId = (cleanPhone && phoneToPatient.get(cleanPhone)) || nameToPatient.get(cleanName);
    const hasFollowup = (matchedPatientId && followupPatientIds.has(matchedPatientId)) || followupNames.has(cleanName);

    if (matchedPatientId || hasFollowup) {
      const updates = {};
      if (matchedPatientId && t.patient_id !== matchedPatientId) {
        updates.patient_id = matchedPatientId;
      }
      if (hasFollowup && !t.whatsapp_sent_at) {
        updates.whatsapp_sent_at = new Date().toISOString();
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

  console.log(`Successfully linked ${updatedCount} tasks to existing patients and follow-ups!`);
}

linkTasks().catch(console.error);
