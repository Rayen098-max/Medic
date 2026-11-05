import Papa from 'papaparse';

const SUPABASE_URL = "https://bkifvxbtisntaewelsng.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWZ2eGJ0aXNudGFld2Vsc25nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTgzNDQ3NywiZXhwIjoyMTAxNDEwNDc3fQ.lPV0SuP5IkuZ_9StjqZ-gJR4hekQtd_-V3p6mTDVejY";

const TAB_PHYSIO_MAPPING = {
  "Daily Tracker - Gursheen": {
    physio_name: "Gursheen",
    physio_id: "3910311c-199a-404d-9019-e522dafbf933",
    full_name: "Dr. Gursheen Kaur"
  },
  "Daily Tracker - Dipti": {
    physio_name: "Dipti",
    physio_id: "f6b905a4-0c6f-40fb-8556-3c8ce718d59d",
    full_name: "Dr. Dipti Mestry"
  },
  "Daily Tracker - Aishwarya": {
    physio_name: "Aishwarya",
    physio_id: "272e746c-eff9-4900-a846-d0f668ef628f",
    full_name: "Dr. Aishwarya Panchal"
  },
  "Daily Tracker - Rutuja": {
    physio_name: "Rutuja",
    physio_id: "73088240-d78a-4010-9dbb-b1ae57754fd4",
    full_name: "Dr. Rutuja Tulaskar"
  },
  "Daily Tracker - Pooja": {
    physio_name: "Pooja",
    physio_id: "416c3316-2885-4268-b4b0-544b2b3dc69c",
    full_name: "Dr. Pooja Seema"
  },
  "Daily Tracker - Kritika": {
    physio_name: "Kritika",
    physio_id: "c64339d0-eb42-4fd7-9f2b-c4752e4634f8",
    full_name: "Dr. Kritika Gawand"
  },
  "Daily Tracker - Hritika": {
    physio_name: "Hritika",
    physio_id: "df3cf918-2e16-4be4-af83-57d17501b646",
    full_name: "Dr. Hritika Chavan"
  }
};

const IGNORED_NON_DATES = [
  'start', 'mid', 'end', 'cc', 'no cc', '..', '...', 'physio', 
  'dates', 'date', 'lbp', 'na', 'n/a', '', 'yes', 'no'
];

export function parseStandardDate(raw, physioName = '') {
  if (!raw) return { isoDate: '', displayDate: 'No Date', monthKey: '', monthName: '', timestamp: 0 };
  let str = String(raw).trim().replace(/\\/g, '/');
  
  // Format 1: DD/MM or MM/DD or DD/MM/YYYY
  const slashParts = str.split(/[\/\-\.]/);
  if (slashParts.length >= 2) {
    const p1 = parseInt(slashParts[0], 10);
    const p2 = parseInt(slashParts[1], 10);
    const p3 = slashParts.length >= 3 ? parseInt(slashParts[2], 10) : 2026;
    const year = p3 < 100 ? 2000 + p3 : p3;

    // Dr. Kritika writes Month / Day / Year (MM/DD/YYYY)
    // All other physios (Gursheen, Dipti, Rutuja, Pooja, Hritika, Aishwarya) write Day / Month (DD/MM)
    const isKritika = String(physioName).toLowerCase().includes('kritika');
    const month = isKritika ? p1 : p2;
    const day = isKritika ? p2 : p1;

    // Reject unparseable or out-of-range dates
    if (year >= 2024 && year <= 2027 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dt = new Date(year, month - 1, day);
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthName = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const displayDate = dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return { isoDate, displayDate, monthKey, monthName, timestamp: dt.getTime() };
    }
  }

  // Format 2: JS Date string e.g. "Sat Oct 10 2026..." or ISO string
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    if (year >= 2024 && year <= 2027 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthName = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const displayDate = dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return { isoDate, displayDate, monthKey, monthName, timestamp: dt.getTime() };
    }
  }

  return { isoDate: '', displayDate: str, monthKey: 'Other', monthName: 'Other', timestamp: 0 };
}

async function fetchTabCsv(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&_cb=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${tabName}`);
  return await res.text();
}

async function sendBatchToSupabase(records, retries = 5) {
  const endpoint = `${SUPABASE_URL}/rest/v1/tracker_tasks?on_conflict=id`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(records)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to save batch (${res.status}): ${txt}`);
      }
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  console.log("=== STARTING FULL CLEAN SYNC WITH STANDARDIZED DATES ===");
  
  // 1. Fetch and preserve existing follow-up status (patient_id and whatsapp_sent_at)
  console.log("Preserving existing patient links and WhatsApp sent statuses from Supabase...");
  const preservedFollowups = new Map();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tracker_tasks?or=(whatsapp_sent_at.not.is.null,patient_id.not.is.null)&select=id,customer_phone,customer_name,consult_date,patient_id,whatsapp_sent_at`, {
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
      }
    });
    if (res.ok) {
      const rows = await res.json();
      for (const r of rows) {
        if (r.id) preservedFollowups.set(r.id, r);
        const altKey = `${r.customer_phone || r.customer_name?.toLowerCase()}_${r.consult_date}`;
        preservedFollowups.set(altKey, r);
      }
      console.log(`Preserved ${rows.length} existing tasks with active followups.`);
    }
  } catch (err) {
    console.warn("Could not query existing follow-ups to preserve:", err.message);
  }

  // 2. Delete corrupted records with consult_date = 'Physio' or invalid dates
  console.log("Deleting corrupted records with consult_date='Physio'...");
  await fetch(`${SUPABASE_URL}/rest/v1/tracker_tasks?consult_date=eq.Physio`, {
    method: "DELETE",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
    }
  });

  const taskMap = new Map();

  for (const [tabName, config] of Object.entries(TAB_PHYSIO_MAPPING)) {
    console.log(`\nFetching ${tabName} for ${config.full_name}...`);
    try {
      const csv = await fetchTabCsv(tabName);
      const result = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim()
      });

      // Find column keys dynamically
      const firstRow = result.data[0] || {};
      const allKeys = Object.keys(firstRow);
      const dynamicDateKey = allKeys.find(k => /^dates?/i.test(k)) || 'Date';
      const dynamicNameKey = allKeys.find(k => /customer\s*name|^name$/i.test(k)) || 'Customer Name';
      const dynamicPhoneKey = allKeys.find(k => /customer\s*number|phone|number/i.test(k)) || 'Customer Number';
      const dynamicDoneKey = allKeys.find(k => /session\s*done/i.test(k)) || 'Physio session Done';
      const dynamicWhatsappKey = allKeys.find(k => /whatsapp/i.test(k));

      // If header itself has a date (e.g. "Date 25/1")
      let lastDate = "";
      const headerDateMatch = dynamicDateKey.match(/(\d+[\/\-]\d+)/);
      if (headerDateMatch) {
        lastDate = headerDateMatch[1];
      }

      // Pre-scan: if rows start without a date, find the first valid date in the sheet
      if (!lastDate) {
        for (const row of result.data) {
          const val = row[dynamicDateKey] || row['Date'] || row['Dates'];
          if (val) {
            const clean = String(val).trim().replace(/\\/g, '/');
            if (!IGNORED_NON_DATES.includes(clean.toLowerCase()) && /\d+[\/\-]\d+/.test(clean)) {
              lastDate = clean;
              break;
            }
          }
        }
      }

      let count = 0;
      for (let r = 0; r < result.data.length; r++) {
        const row = result.data[r];
        const rawDate = row[dynamicDateKey] || row['Date'] || row['Dates'];
        if (rawDate) {
          const cleanDate = String(rawDate).trim().replace(/\\/g, '/');
          if (cleanDate && !IGNORED_NON_DATES.includes(cleanDate.toLowerCase())) {
            // Check if it looks like a date
            if (/\d+[\/\-\.]\d+/.test(cleanDate) || !isNaN(new Date(cleanDate).getTime())) {
              lastDate = cleanDate;
            }
          }
        }

        const custName = String(row[dynamicNameKey] || row['Customer Name'] || row['Name'] || '').trim();
        const custPhone = String(row[dynamicPhoneKey] || row['Customer Number'] || row['Number'] || row['Phone'] || '').replace(/\D/g, '');

        if (!custName && !custPhone) continue;

        const sessionDone = String(row[dynamicDoneKey] || row['Physio session Done'] || row['Session Done'] || '').trim();
        const parsed = parseStandardDate(lastDate, config.physio_name);

        if (!parsed.isoDate) {
          // Skip if date could not be parsed
          continue;
        }

        // Deterministic composite ID
        const cleanPhone = custPhone.length >= 7 ? custPhone.slice(-10) : '';
        const identifier = cleanPhone || custName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const taskId = `${config.physio_name}_${identifier}_${parsed.isoDate}`;

        // Check if there was preserved followup state
        const altKey = `${custPhone || custName.toLowerCase()}_${parsed.isoDate}`;
        const preserved = preservedFollowups.get(taskId) || preservedFollowups.get(altKey);

        const rawWhatsapp = dynamicWhatsappKey ? String(row[dynamicWhatsappKey] || '').trim() : '';
        const isWhatsappSent = /yes/i.test(rawWhatsapp);
        const whatsappSentAt = preserved?.whatsapp_sent_at || (isWhatsappSent ? `${parsed.isoDate}T12:00:00.000Z` : null);

        taskMap.set(taskId, {
          id: taskId,
          physio_name: config.physio_name,
          physio_id: config.physio_id,
          customer_name: custName || 'Unknown',
          customer_phone: custPhone,
          consult_date: parsed.isoDate, // Standard YYYY-MM-DD
          pain_point: String(row['Concern / Painpoint'] || row['Customer Concern/Painpoint'] || row['Concern'] || row['Painpoint'] || '').trim(),
          primary_category: String(row['Category'] || row['Primary Category'] || '').trim(),
          physio_pitched: String(row['Physio Pitched'] || '').trim(),
          session_done: sessionDone,
          session_timing: String(row['When was the session done?'] || row['When was the Session Done'] || '').trim(),
          reason_not_done: String(row['Reason why session was not done'] || row['Reason (If Not done)'] || '').trim(),
          duration: String(row['Duration'] || row['Duration of session'] || '').trim(),
          product_suggested: String(row['Product Suggested'] || row['Product suggested'] || '').trim(),
          comments: String(row['Comment'] || row['Comments'] || '').trim(),
          patient_id: preserved?.patient_id || null,
          whatsapp_sent_at: whatsappSentAt,
          updated_at: new Date().toISOString()
        });
        count++;
      }
      console.log(`Processed ${count} rows from ${tabName}.`);
    } catch (err) {
      console.error(`Error processing ${tabName}:`, err.message);
    }
  }

  const allTasks = Array.from(taskMap.values());
  console.log(`\nTotal unique tasks ready to upload: ${allTasks.length}`);

  // Upload in chunks of 200
  const CHUNK_SIZE = 200;
  for (let i = 0; i < allTasks.length; i += CHUNK_SIZE) {
    const chunk = allTasks.slice(i, i + CHUNK_SIZE);
    await sendBatchToSupabase(chunk);
    process.stdout.write(`Uploaded ${Math.min(i + CHUNK_SIZE, allTasks.length)} / ${allTasks.length}...\r`);
  }

  console.log("\nALL TASKS SYNCED SUCCESSFULLY TO SUPABASE WITH CLEAN DATES!");
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/sync-all-physios.mjs')) {
  main().catch(console.error);
}
