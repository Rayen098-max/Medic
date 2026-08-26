-- Create patient_sessions table to track link opens and time spent
create table patient_sessions (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade,
  duration_seconds integer default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table patient_sessions enable row level security;

-- Allow ANYONE (including anonymous customers opening their link) to insert a new session
create policy "anon can insert session"
on patient_sessions for insert
with check (true);

-- Allow ANYONE to update a session (so heartbeat timer can update duration_seconds)
create policy "anon can update session"
on patient_sessions for update
using (true);

-- Allow Admins to see all sessions
create policy "admin can view sessions"
on patient_sessions for select
using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Allow Managers to see all sessions
create policy "manager can view sessions"
on patient_sessions for select
using (exists (select 1 from profiles where id = auth.uid() and role = 'manager'));
