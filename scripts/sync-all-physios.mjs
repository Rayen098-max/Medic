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

function parseStandardDate(raw) {
  if (!raw) return { isoDate: '', displayDate: 'No Date', monthKey: '', monthName: '', timestamp: 0 };
  const str = String(raw).trim();
  
  // Format 1: DD/MM or DD/MM/YYYY or DD-MM-YYYY
  const slashParts = str.split(/[\/\-]/);
  if (slashParts.length >= 2) {
    const d = parseInt(slashParts[0], 10);
    const m = parseInt(slashParts[1], 10);
    const y = slashParts.length >= 3 ? parseInt(slashParts[2], 10) : 2026;
    const year = y < 100 ? 2000 + y : y;
    if (!isNaN(d) && !isNaN(m) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const dt = new Date(year, m - 1, d);
      const isoDate = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const monthKey = `${year}-${String(m).padStart(2, '0')}`;
      const monthName = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const displayDate = dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return { isoDate, displayDate, monthKey, monthName, timestamp: dt.getTime() };
    }
  }

  // Format 2: JS Date string e.g. "Sat Oct 10 2026..." or ISO string
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const year = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const d = dt.getDate();
    const isoDate = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const monthKey = `${year}-${String(m).padStart(2, '0')}`;
    const monthName = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const displayDate = dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return { isoDate, displayDate, monthKey, monthName, timestamp: dt.getTime() };
  }

  return { isoDate: str, displayDate: str, monthKey: 'Other', monthName: 'Other', timestamp: 0 };
}

async function fetchTabCsv(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&_cb=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${tabName}`);
  return await res.text();
}

async function sendBatchToSupabase(records) {
  const endpoint = `${SUPABASE_URL}/rest/v1/tracker_tasks?on_conflict=id`;
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
}

async function main() {
  console.log("=== STARTING FULL CLEAN SYNC WITH STANDARDIZED DATES ===");
  const allTasks = [];

  for (const [tabName, config] of Object.entries(TAB_PHYSIO_MAPPING)) {
    console.log(`\nFetching ${tabName} for ${config.full_name}...`);
    try {
      const csv = await fetchTabCsv(tabName);
      const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
      let lastDate = "";
      let count = 0;

      for (let r = 0; r < result.data.length; r++) {
        const row = result.data[r];
        const rawDate = row['Date'] || row['Dates'];
        const dateTrim = rawDate ? String(rawDate).trim() : "";
        if (dateTrim && !['Start', 'Mid', 'End', 'cc', 'no cc'].includes(dateTrim)) {
          lastDate = dateTrim;
        }

        const custName = String(row['Customer Name'] || row['Name'] || '').trim();
        const custPhone = String(row['Customer Number'] || row['Number'] || row['Phone'] || '').replace(/\D/g, '');

        if (!custName && !custPhone) continue;

        const sessionDone = String(row['Physio session Done'] || row['Session Done'] || '').trim();
        const parsed = parseStandardDate(lastDate);

        // Standardized composite ID
        const identifier = custPhone || custName.toLowerCase().replace(/\s+/g, '_');
        const taskId = `${config.physio_name}_${identifier}_r${r}_${parsed.isoDate || 'nodate'}`;

        allTasks.push({
          id: taskId,
          physio_name: config.physio_name,
          physio_id: config.physio_id,
          customer_name: custName || 'Unknown',
          customer_phone: custPhone,
          consult_date: parsed.isoDate || lastDate, // Standard YYYY-MM-DD
          pain_point: String(row['Concern / Painpoint'] || row['Concern'] || row['Painpoint'] || '').trim(),
          primary_category: String(row['Category'] || '').trim(),
          physio_pitched: String(row['Physio Pitched'] || '').trim(),
          session_done: sessionDone,
          session_timing: String(row['When was the session done?'] || '').trim(),
          reason_not_done: String(row['Reason why session was not done'] || '').trim(),
          duration: String(row['Duration'] || '').trim(),
          product_suggested: String(row['Product Suggested'] || '').trim(),
          comments: String(row['Comment'] || row['Comments'] || '').trim(),
          updated_at: new Date().toISOString()
        });
        count++;
      }
      console.log(`Processed ${count} rows from ${tabName}.`);
    } catch (err) {
      console.error(`Error processing ${tabName}:`, err.message);
    }
  }

  console.log(`\nTotal tasks ready to upload: ${allTasks.length}`);

  // Upload in chunks of 200
  const CHUNK_SIZE = 200;
  for (let i = 0; i < allTasks.length; i += CHUNK_SIZE) {
    const chunk = allTasks.slice(i, i + CHUNK_SIZE);
    await sendBatchToSupabase(chunk);
    process.stdout.write(`Uploaded ${Math.min(i + CHUNK_SIZE, allTasks.length)} / ${allTasks.length}...\r`);
  }

  console.log("\nALL TASKS SYNCED SUCCESSFULLY TO SUPABASE WITH CLEAN DATES!");
}

main().catch(console.error);
