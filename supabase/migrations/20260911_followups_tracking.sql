-- Create followups table to track WhatsApp messages sent to patients
create table followups (
  id uuid default gen_random_uuid() primary key,
  physio_id uuid references profiles(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable RLS
alter table followups enable row level security;

-- Allow authenticated users (physios) to insert their own followups
create policy "physios can insert their own followups"
on followups for insert
with check (auth.uid() = physio_id);

-- Allow Admins to see all followups
create policy "admin can view followups"
on followups for select
using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Allow Managers to see all followups
create policy "manager can view followups"
on followups for select
using (exists (select 1 from profiles where id = auth.uid() and role = 'manager'));
