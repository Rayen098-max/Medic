import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
};

const DUMMY_EMAIL = "dummy.physio@medic.local";
const DUMMY_PASSWORD = "MedicTest2026!";
const DUMMY_NAME = "Dr. Dipti Mestry";
const DUMMY_ROLE = "physio";

async function main() {
  console.log(`Checking if user ${DUMMY_EMAIL} already exists in Supabase Auth...`);

  // 1. List users
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers });
  if (!listRes.ok) {
    throw new Error(`Failed to list users: ${listRes.status} ${await listRes.text()}`);
  }
  const { users } = await listRes.json();
  const existingUser = (users || []).find(u => u.email?.toLowerCase() === DUMMY_EMAIL.toLowerCase());

  let userId;

  if (existingUser) {
    console.log(`User found with ID: ${existingUser.id}. Updating password...`);
    userId = existingUser.id;
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        password: DUMMY_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DUMMY_NAME, password_changed: true }
      })
    });
    if (!updateRes.ok) {
      throw new Error(`Failed to update user: ${updateRes.status} ${await updateRes.text()}`);
    }
    console.log("Auth user updated successfully.");
  } else {
    console.log(`Creating new auth user ${DUMMY_EMAIL}...`);
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: DUMMY_EMAIL,
        password: DUMMY_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DUMMY_NAME, password_changed: true }
      })
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create user: ${createRes.status} ${await createRes.text()}`);
    }
    const newUser = await createRes.json();
    userId = newUser.id;
    console.log(`Auth user created successfully with ID: ${userId}`);
  }

  // 2. Upsert into profiles table
  console.log(`Upserting profile for user ${userId} (${DUMMY_NAME}, role: ${DUMMY_ROLE})...`);
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      ...headers,
      "Prefer": "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      id: userId,
      full_name: DUMMY_NAME,
      role: DUMMY_ROLE
    })
  });

  if (!profileRes.ok) {
    throw new Error(`Failed to upsert profile: ${profileRes.status} ${await profileRes.text()}`);
  }

  const profileData = await profileRes.json();
  console.log("Profile upserted successfully:", profileData);

  console.log("\n=========================================");
  console.log("DUMMY PHYSIO ACCOUNT READY FOR USE:");
  console.log(`Email:    ${DUMMY_EMAIL}`);
  console.log(`Password: ${DUMMY_PASSWORD}`);
  console.log(`Role:     ${DUMMY_ROLE}`);
  console.log(`Name:     ${DUMMY_NAME}`);
  console.log("=========================================\n");
}

main().catch(err => {
  console.error("Error creating dummy physio:", err);
  process.exit(1);
});
