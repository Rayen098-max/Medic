import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("Starting backfill process...");
  
  // 1. Fetch all physio profiles to map full_name -> id
  const { data: physios, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'physio');

  if (profilesError) {
    console.error("Error fetching physio profiles:", profilesError.message);
    return;
  }

  const physioMap = new Map(physios.map(p => [p.full_name.toLowerCase(), p.id]));
  console.log(`Found ${physios.length} physio profiles.`);

  // 2. Fetch all patients that don't have a physio_id yet
  const { data: patients, error: patientsError } = await supabaseAdmin
    .from('patients')
    .select('id, physioName')
    .is('physio_id', null);

  if (patientsError) {
    console.error("Error fetching patients:", patientsError.message);
    return;
  }

  console.log(`Found ${patients.length} patients requiring backfill.`);

  if (patients.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let updatedCount = 0;
  let unmappedCount = 0;

  for (const patient of patients) {
    if (!patient.physioName) {
      unmappedCount++;
      continue;
    }

    const nameKey = patient.physioName.trim().toLowerCase();
    
    // Fuzzy/exact match logic. You may need to adapt this if old names don't match exactly.
    // For now, looking for exact match on the lowercased full name, or if the old string is included in the new name.
    let matchedId = physioMap.get(nameKey);
    
    if (!matchedId) {
      // Try a looser match (e.g., if old name was "Sarah" and new name is "Physio Sarah")
      for (const [key, id] of physioMap.entries()) {
        if (key.includes(nameKey) || nameKey.includes(key)) {
          matchedId = id;
          break;
        }
      }
    }

    if (matchedId) {
      const { error: updateError } = await supabaseAdmin
        .from('patients')
        .update({ physio_id: matchedId })
        .eq('id', patient.id);

      if (updateError) {
        console.error(`Failed to update patient ${patient.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    } else {
      console.warn(`Could not find a matching physio ID for old name: "${patient.physioName}" (Patient ID: ${patient.id})`);
      unmappedCount++;
    }
  }

  console.log(`\nBackfill complete.`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Unmapped / skipped: ${unmappedCount}`);
}

main().catch(console.error);
