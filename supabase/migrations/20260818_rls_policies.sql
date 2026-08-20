alter table patients enable row level security;

-- Physios: strictly isolated to their own patients only
create policy "physios see only their patients"
on patients for select
using (physio_id = auth.uid());

create policy "physios insert only as themselves"
on patients for insert
with check (physio_id = auth.uid());

create policy "physios update only their own patients"
on patients for update
using (physio_id = auth.uid());

-- Admin: full access (all CRUD, all patients)
create policy "admin full access"
on patients for all
using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Manager: read-only access to all patients
create policy "manager read only"
on patients for select
using (exists (select 1 from profiles where id = auth.uid() and role = 'manager'));
