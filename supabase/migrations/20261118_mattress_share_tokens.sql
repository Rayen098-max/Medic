-- Scoped, opaque share links for the SmartGRID Posture Lab.
--
-- Goals:
--   * never put a patient id or full name in a customer-facing URL
--   * one token resolves to exactly one patient and reveals only a first name
--   * tokens expire and can be revoked
--   * a physio can only mint a token for their own patient
--
-- The table is intentionally not readable by anon/authenticated. All access is
-- through the two security-definer functions below.

create table if not exists public.mattress_share_tokens (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz
);

create index if not exists idx_mattress_share_tokens_patient
  on public.mattress_share_tokens(patient_id);

create index if not exists idx_mattress_share_tokens_active
  on public.mattress_share_tokens(expires_at)
  where revoked_at is null;

alter table public.mattress_share_tokens enable row level security;

-- No policies: anon/authenticated cannot select, insert, update or delete
-- directly. Service role (and the security-definer functions) can.
revoke all on table public.mattress_share_tokens from public;
revoke all on table public.mattress_share_tokens from anon;
revoke all on table public.mattress_share_tokens from authenticated;

comment on table public.mattress_share_tokens is
  'Opaque, expiring share tokens for the SmartGRID Posture Lab. Never expose patient ids in URLs.';

-- ---------------------------------------------------------------------------
-- Mint a token. Only the patient's own physio (or admin/manager) may do this.
-- ---------------------------------------------------------------------------
create or replace function public.create_mattress_share_token(
  p_patient_id uuid,
  p_hours integer default 168
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_patient_physio uuid;
  v_token text;
  v_hours integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select role into v_role
  from public.profiles
  where id = auth.uid();

  if v_role is null then
    raise exception 'Profile not found' using errcode = '42501';
  end if;

  select physio_id into v_patient_physio
  from public.patients
  where id = p_patient_id
    and deleted_at is null;

  if not found then
    raise exception 'Patient not found' using errcode = 'P0002';
  end if;

  -- `is distinct from` is deliberate: a patient with a null physio_id must not
  -- be claimable by any physio.
  if v_role not in ('admin', 'manager')
     and v_patient_physio is distinct from auth.uid() then
    raise exception 'Not authorized for this patient' using errcode = '42501';
  end if;

  v_hours := greatest(1, least(coalesce(p_hours, 168), 720));

  insert into public.mattress_share_tokens (patient_id, created_by, expires_at)
  values (p_patient_id, auth.uid(), now() + make_interval(hours => v_hours))
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.create_mattress_share_token(uuid, integer) from public;
revoke all on function public.create_mattress_share_token(uuid, integer) from anon;
grant execute on function public.create_mattress_share_token(uuid, integer) to authenticated;

comment on function public.create_mattress_share_token(uuid, integer) is
  'Mint an opaque SmartGRID share token for a patient owned by the caller.';

-- ---------------------------------------------------------------------------
-- Resolve a token to a first name only. Expired/revoked/unknown = no row.
-- ---------------------------------------------------------------------------
create or replace function public.get_mattress_share_greeting(p_token text)
returns table (first_name text)
language sql
security definer
set search_path = public
stable
as $$
  select nullif(split_part(btrim(p.name), ' ', 1), '') as first_name
  from public.mattress_share_tokens t
  join public.patients p on p.id = t.patient_id
  where t.token = btrim(p_token)
    and t.revoked_at is null
    and t.expires_at > now()
    and p.deleted_at is null
  limit 1;
$$;

revoke all on function public.get_mattress_share_greeting(text) from public;
grant execute on function public.get_mattress_share_greeting(text) to anon;
grant execute on function public.get_mattress_share_greeting(text) to authenticated;

comment on function public.get_mattress_share_greeting(text) is
  'Return only the first name for a valid SmartGRID share token. No patient id or contact data is exposed.';

-- ---------------------------------------------------------------------------
-- Revoke a token. The owning physio (or admin/manager) can revoke.
-- ---------------------------------------------------------------------------
create or replace function public.revoke_mattress_share_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select role into v_role
  from public.profiles
  where id = auth.uid();

  update public.mattress_share_tokens t
  set revoked_at = now()
  from public.patients p
  where t.token = btrim(p_token)
    and t.patient_id = p.id
    and t.revoked_at is null
    and (
      v_role in ('admin', 'manager')
      or p.physio_id = auth.uid()
    );

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke all on function public.revoke_mattress_share_token(text) from public;
revoke all on function public.revoke_mattress_share_token(text) from anon;
grant execute on function public.revoke_mattress_share_token(text) to authenticated;
