-- Create tracker_tasks table for direct sync from Google Sheets into Supabase
create table if not exists tracker_tasks (
  id text primary key, -- unique composite ID: e.g. "Hritika_2026-10-15_9876543210" or generated hash
  physio_name text not null,
  physio_id uuid references profiles(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  consult_date text, -- e.g. "13/10" or "2026-10-13"
  pain_point text,
  primary_category text,
  physio_pitched text,
  session_done text,
  session_timing text,
  reason_not_done text,
  duration text,
  product_suggested text,
  comments text,
  patient_id uuid references patients(id) on delete set null,
  whatsapp_sent_at timestamptz,
  is_deleted boolean default false,
  raw_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for lightning fast queries
create index if not exists idx_tracker_tasks_physio_name on tracker_tasks(physio_name);
create index if not exists idx_tracker_tasks_physio_id on tracker_tasks(physio_id);
create index if not exists idx_tracker_tasks_customer_phone on tracker_tasks(customer_phone);
create index if not exists idx_tracker_tasks_patient_id on tracker_tasks(patient_id);

-- Enable RLS
alter table tracker_tasks enable row level security;

-- Drop previous policies if any exist
drop policy if exists "physios view own tasks" on tracker_tasks;
drop policy if exists "physios update own tasks" on tracker_tasks;
drop policy if exists "admin and manager full access to tasks" on tracker_tasks;
drop policy if exists "service role has full access to tasks" on tracker_tasks;

-- Physio can view tasks assigned to their physio_id or matching their name in profiles
create policy "physios view own tasks"
on tracker_tasks for select
using (
  physio_id = auth.uid()
  or exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and (
        lower(profiles.full_name) like '%' || lower(tracker_tasks.physio_name) || '%'
        or lower(tracker_tasks.physio_name) like '%' || lower(profiles.full_name) || '%'
      )
  )
);

-- Physio can update their own tasks (e.g. linking patient_id or marking whatsapp sent or is_deleted)
create policy "physios update own tasks"
on tracker_tasks for update
using (
  physio_id = auth.uid()
  or exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and (
        lower(profiles.full_name) like '%' || lower(tracker_tasks.physio_name) || '%'
        or lower(tracker_tasks.physio_name) like '%' || lower(profiles.full_name) || '%'
      )
  )
);

-- Physio can insert tasks (for manually created consult tasks)
create policy "physios insert own tasks"
on tracker_tasks for insert
with check (
  physio_id = auth.uid()
  or auth.uid() is not null
);

-- Admins and Managers have full select access to all tasks
create policy "admin and manager full access to tasks"
on tracker_tasks for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and role in ('admin', 'manager')
  )
);

-- Admins can update/delete any tasks
create policy "admin full access update tasks"
on tracker_tasks for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and role = 'admin'
  )
);
