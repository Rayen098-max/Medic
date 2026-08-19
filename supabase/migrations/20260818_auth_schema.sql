-- 1a. Role enum + profiles table linking auth.users to roles
create type user_role as enum ('physio', 'admin', 'manager');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  created_at timestamptz default now()
);

-- 1b. Link patients to their owning physio via real foreign key
alter table patients add column physio_id uuid references profiles(id);
create index idx_patients_physio_id on patients(physio_id);

-- 1c. Soft delete support
alter table patients add column deleted_at timestamptz;

-- 1d. Audit log for admin actions
create table audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid references profiles(id),
  action text,
  target_id uuid,
  created_at timestamptz default now()
);
