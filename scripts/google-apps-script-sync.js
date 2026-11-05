/**
 * CLINICAL ADVISOR PILOT -> SUPABASE REAL-TIME AUTOMATION (100% FREE)
 * 
 * Instructions to set up in Google Sheets:
 * 1. Open the Google Spreadsheet: https://docs.google.com/spreadsheets/d/1tKa5y8t7PxuqBTMJSwJRDLI9SJX5X00aeSZ8fcQwmsU
 * 2. In the menu, go to: Extensions -> Apps Script
 * 3. Replace the code in Code.gs with this entire script.
 * 4. Click the Save icon (floppy disk).
 * 5. Run the function `syncAllPhysioTabs` once to test.
 * 6. Set up an automated Trigger:
 *    - Click the clock icon on the left (Triggers).
 *    - Click "+ Add Trigger" (bottom right).
 *    - Choose which function to run: `syncAllPhysioTabs`.
 *    - Which runs at deployment: Head.
 *    - Select event source: "Time-driven" -> "Minutes timer" -> "Every 15 minutes" (or "On change").
 *    - Click Save.
 * 
 * Now every time physios enter consultations, they are automatically synced to Supabase!
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

const IGNORED_NON_DATES = [
  'start', 'mid', 'end', 'cc', 'no cc', '..', '...', 'physio', 
  'dates', 'date', 'lbp', 'na', 'n/a', '', 'yes', 'no'
];

function syncAllPhysioTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
    if (dateIdx >= 0) {
      const headerDateMatch = headers[dateIdx].match(/(\d+[\/\-]\d+)/);
      if (headerDateMatch) {
        lastSeenDate = headerDateMatch[1];
      }
    }

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      
      const rawDate = dateIdx >= 0 ? String(row[dateIdx] || "").trim().replace(/\\/g, '/') : "";
      if (rawDate && !IGNORED_NON_DATES.includes(rawDate.toLowerCase())) {
        if (/\d+[\/\-\.]\d+/.test(rawDate)) {
          lastSeenDate = rawDate;
        }
      }

      const custName = nameIdx >= 0 ? String(row[nameIdx] || "").trim() : "";
      const custPhone = phoneIdx >= 0 ? String(row[phoneIdx] || "").replace(/\D/g, "") : "";

      if (!custName && !custPhone) continue;

      // Standardize format into YYYY-MM-DD
      let isoDate = "";
      const slashParts = lastSeenDate.split(/[\/\-\.]/);
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

        if (year >= 2024 && year <= 2027 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          isoDate = year + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
        }
      }

      if (!isoDate) continue;

      // Deterministic unique identifier
      const cleanPhone = custPhone.length >= 7 ? custPhone.slice(-10) : '';
      const identifier = cleanPhone || custName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const taskId = `${config.physio_name}_${identifier}_${isoDate}`;

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
  Logger.log("Total unique records ready to push: " + allRecords.length);

  // Send to Supabase in batches of 200
  const BATCH_SIZE = 200;
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const chunk = allRecords.slice(i, i + BATCH_SIZE);
    sendBatchToSupabase(chunk);
  }

  Logger.log("Supabase Sync Complete!");
}

function sendBatchToSupabase(chunk) {
  const endpoint = `${SUPABASE_URL}/rest/v1/tracker_tasks?on_conflict=id`;
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
      "Prefer": "resolution=merge-duplicates"
    },
    payload: JSON.stringify(chunk),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(endpoint, options);
    if (res.getResponseCode() >= 400) {
      Logger.log("Supabase error (" + res.getResponseCode() + "): " + res.getContentText());
    }
  } catch (err) {
    Logger.log("Fetch error: " + err.toString());
  }
}
