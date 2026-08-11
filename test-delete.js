import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkifvxbtisntaewelsng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraWZ2eGJ0aXNudGFld2Vsc25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MzQ0NzcsImV4cCI6MjEwMTQxMDQ3N30.KWEfkeLO1hhqOxra-aaDAweWVdX4-8qRs5lLOjLftnc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  console.log("Fetching patients...");
  const { data: patients, error: fetchError } = await supabase.from('patients').select('id').limit(1);
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  if (patients.length === 0) {
    console.log("No patients found to test deletion.");
    return;
  }
  
  const idToDelete = patients[0].id;
  console.log("Attempting to delete patient with ID:", idToDelete);
  
  const { data, error } = await supabase
    .from('patients')
    .delete()
    .eq('id', idToDelete)
    .select();
    
  if (error) {
    console.error("Delete error:", error);
  } else {
    console.log("Delete success. Returned data:", data);
  }
}

testDelete();
