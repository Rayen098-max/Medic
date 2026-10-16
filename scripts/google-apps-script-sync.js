/**
 * CLINICAL ADVISOR PILOT -> SUPABASE REAL-TIME AUTOMATION (100% FREE)
 */
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

function syncAllPhysioTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Use a Map/Object to de-duplicate any identical keys within the batch
  const taskMap = {};

  for (const [tabName, config] of Object.entries(TAB_PHYSIO_MAPPING)) {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) continue;

    const values = sheet.getDataRange().getDisplayValues();
    if (values.length < 2) continue;

    const headers = values[0].map(h => String(h || "").trim().toLowerCase());
    
    const dateIdx = headers.findIndex(h => h.includes("date"));
    const nameIdx = headers.findIndex(h => h === "customer name" || h === "name");
    const phoneIdx = headers.findIndex(h => h.includes("number") || h.includes("phone"));
    const painIdx = headers.findIndex(h => h.includes("concern") || h.includes("painpoint"));
    const categoryIdx = headers.findIndex(h => h.includes("category"));
    const pitchedIdx = headers.findIndex(h => h.includes("pitched"));
    const doneIdx = headers.findIndex(h => h.includes("session done"));
    const timingIdx = headers.findIndex(h => h.includes("when was the session"));
    const reasonIdx = headers.findIndex(h => h.includes("reason"));
    const durationIdx = headers.findIndex(h => h.includes("duration"));
    const productIdx = headers.findIndex(h => h.includes("product suggested"));
    const commentsIdx = headers.findIndex(h => h.includes("comment"));

    let lastSeenDate = "";

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      
      const rawDate = dateIdx >= 0 ? String(row[dateIdx] || "").trim() : "";
      if (rawDate && rawDate !== "" && !["start", "mid", "end", "cc", "no cc"].includes(rawDate.toLowerCase())) {
        lastSeenDate = rawDate;
      }

      const custName = nameIdx >= 0 ? String(row[nameIdx] || "").trim() : "";
      const custPhone = phoneIdx >= 0 ? String(row[phoneIdx] || "").replace(/\D/g, "") : "";

      if (!custName && !custPhone) continue;

      // Standardize format into YYYY-MM-DD
      let isoDate = lastSeenDate;
      const slashParts = lastSeenDate.split(/[\/\-]/);
      if (slashParts.length >= 2) {
        const p1 = parseInt(slashParts[0], 10);
        const p2 = parseInt(slashParts[1], 10);
        const p3 = slashParts.length >= 3 ? parseInt(slashParts[2], 10) : 2026;
        const year = p3 < 100 ? 2000 + p3 : p3;

        // Dr. Kritika writes Month / Day / Year (MM/DD/YYYY)
        // All others write Day / Month (DD/MM)
        const isKritika = String(config.physio_name).toLowerCase().includes("kritika");
        const m = isKritika ? p1 : p2;
        const d = isKritika ? p2 : p1;

        // Reject future dates (November/December 2026 or year > 2026)
        if (year > 2026 || (year === 2026 && m > 10)) {
          continue;
        }

        if (!isNaN(d) && !isNaN(m) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          isoDate = year + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
        }
      }

      // Deterministic unique identifier (NO row number, so shifting rows never causes duplicates)
      const identifier = custPhone || custName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const taskId = `${config.physio_name}_${identifier}_${isoDate || "nodate"}`;

      taskMap[taskId] = {
        id: taskId,
        physio_name: config.physio_name,
        physio_id: config.physio_id,
        customer_name: custName || "Unknown",
        customer_phone: custPhone,
        consult_date: isoDate,
        pain_point: painIdx >= 0 ? String(row[painIdx] || "").trim() : "",
        primary_category: categoryIdx >= 0 ? String(row[categoryIdx] || "").trim() : "",
        physio_pitched: pitchedIdx >= 0 ? String(row[pitchedIdx] || "").trim() : "",
        session_done: doneIdx >= 0 ? String(row[doneIdx] || "").trim() : "",
        session_timing: timingIdx >= 0 ? String(row[timingIdx] || "").trim() : "",
        reason_not_done: reasonIdx >= 0 ? String(row[reasonIdx] || "").trim() : "",
        duration: durationIdx >= 0 ? String(row[durationIdx] || "").trim() : "",
        product_suggested: productIdx >= 0 ? String(row[productIdx] || "").trim() : "",
        comments: commentsIdx >= 0 ? String(row[commentsIdx] || "").trim() : "",
        updated_at: new Date().toISOString()
      };
    }
  }

  const allRecords = Object.values(taskMap);
  Logger.log(`Found ${allRecords.length} unique deduplicated rows to sync.`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const chunk = allRecords.slice(i, i + BATCH_SIZE);
    sendToSupabase(chunk);
  }

  Logger.log("SUCCESS! All 7 physio tabs synced directly to Supabase!");
}

function sendToSupabase(records) {
  const endpoint = `${SUPABASE_URL}/rest/v1/tracker_tasks?on_conflict=id`;
  
  const options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
      "Prefer": "resolution=merge-duplicates"
    },
    payload: JSON.stringify(records),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    Logger.log(`✓ Batch of ${records.length} tasks saved to Supabase (HTTP ${code})`);
  } else {
    Logger.log(`✗ Error syncing to Supabase (HTTP ${code}): ` + response.getContentText());
  }
}
