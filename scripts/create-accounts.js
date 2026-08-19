import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// MUST use service role key to bypass RLS and create users
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const accountsToCreate = [
  { email: 'admin@medic.local', role: 'admin', fullName: 'System Admin' },
  { email: 'manager@medic.local', role: 'manager', fullName: 'Clinic Manager' },
  // 8 Physios
  { email: 'physio1@medic.local', role: 'physio', fullName: 'Physio One' },
  { email: 'physio2@medic.local', role: 'physio', fullName: 'Physio Two' },
  { email: 'physio3@medic.local', role: 'physio', fullName: 'Physio Three' },
  { email: 'physio4@medic.local', role: 'physio', fullName: 'Physio Four' },
  { email: 'physio5@medic.local', role: 'physio', fullName: 'Physio Five' },
  { email: 'physio6@medic.local', role: 'physio', fullName: 'Physio Six' },
  { email: 'physio7@medic.local', role: 'physio', fullName: 'Physio Seven' },
  { email: 'physio8@medic.local', role: 'physio', fullName: 'Physio Eight' },
];

const generatePassword = () => {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!";
};

async function main() {
  const credentials = [];
  
  for (const account of accountsToCreate) {
    const password = generatePassword();
    
    console.log(`Creating user: ${account.email}...`);
    
    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: account.email,
      password: password,
      email_confirm: true // auto-confirm
    });

    if (authError) {
      console.error(`Error creating auth user ${account.email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;

    // 2. Insert into profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      role: account.role,
      full_name: account.fullName
    });

    if (profileError) {
      console.error(`Error creating profile for ${account.email}:`, profileError.message);
      // Optional: cleanup auth user if profile fails
      // await supabaseAdmin.auth.admin.deleteUser(userId);
      continue;
    }

    console.log(`Successfully created ${account.email} (${account.role})`);
    
    credentials.push({
      email: account.email,
      password: password,
      role: account.role,
      fullName: account.fullName
    });
  }

  // Write credentials to a secure local file
  const credsContent = credentials.map(c => 
    `Role: ${c.role.padEnd(8)} | Name: ${c.fullName.padEnd(15)} | Email: ${c.email.padEnd(20)} | Password: ${c.password}`
  ).join('\n');
  
  fs.writeFileSync('.credentials.txt', credsContent, { encoding: 'utf-8' });
  console.log('\nAll accounts processed. Credentials saved to .credentials.txt');
  console.log('IMPORTANT: Do not commit .credentials.txt to version control. Distribute passwords securely.');
}

main().catch(console.error);
