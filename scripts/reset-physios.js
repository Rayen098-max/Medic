import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const generatePassword = () => {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!";
};

async function main() {
  // Get all users
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Error fetching users:", usersError);
    return;
  }

  // Get profiles to know who is a physio
  const { data: profiles, error: profilesError } = await supabaseAdmin.from('profiles').select('*');
  
  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return;
  }

  const credentials = [];

  for (const user of users) {
    const profile = profiles.find(p => p.id === user.id);
    
    if (profile && profile.role === 'physio') {
      const newPassword = generatePassword();
      console.log(`Resetting physio: ${user.email} (${profile.full_name})...`);
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
        user_metadata: { password_changed: false } // Force them to change it again
      });

      if (updateError) {
        console.error(`Error updating ${user.email}:`, updateError.message);
      } else {
        credentials.push({
          email: user.email,
          password: newPassword,
          role: profile.role,
          fullName: profile.full_name
        });
      }
    }
  }

  const credsContent = credentials.map(c => 
    `Role: ${c.role.padEnd(8)} | Name: ${c.fullName.padEnd(25)} | Email: ${c.email.padEnd(20)} | Password: ${c.password}`
  ).join('\n');
  
  fs.writeFileSync('.credentials_reset.txt', credsContent, { encoding: 'utf-8' });
  console.log('\nAll physio accounts reset. Credentials saved to .credentials_reset.txt');
}

main().catch(console.error);
