-- Authorization tests for SmartGRID share tokens.
--
-- Run this in a Supabase SQL editor (or `supabase db test`) against a staging
-- project that has at least two non-deleted patients owned by two different
-- physios. Everything runs inside a transaction and is rolled back, so no
-- tokens or patient data are left behind.
--
-- The test asserts:
--   1. a physio can mint a token for their own patient
--   2. a physio cannot mint a token for another physio's patient
--   3. anon resolves a token to its own first name only
--   4. anon cannot read the token table directly
--   5. revoking a token immediately stops the greeting
--   6. an expired token returns no greeting
--   7. an unknown token returns no greeting
--   8. one patient's token never resolves to another patient's name

begin;

-- Pick two patients with different owners.
do $$
declare
  patient_a record;
  patient_b record;
begin
  select p.id, p.physio_id, p.name
    into patient_a
  from public.patients p
  where p.physio_id is not null
    and p.deleted_at is null
  order by p.id
  limit 1;

  select p.id, p.physio_id, p.name
    into patient_b
  from public.patients p
  where p.physio_id is not null
    and p.physio_id <> patient_a.physio_id
    and p.deleted_at is null
  order by p.id
  limit 1;

  if patient_a.id is null or patient_b.id is null then
    raise exception 'TEST SETUP: seed at least two non-deleted patients owned by different physios.';
  end if;

  perform set_config('test.p1', patient_a.id::text, true);
  perform set_config('test.p2', patient_b.id::text, true);
  perform set_config('test.physio_a', patient_a.physio_id::text, true);
  perform set_config('test.physio_b', patient_b.physio_id::text, true);
  perform set_config(
    'test.expected_a',
    split_part(btrim(coalesce(patient_a.name, 'Patient')), ' ', 1),
    true
  );
  perform set_config(
    'test.expected_b',
    split_part(btrim(coalesce(patient_b.name, 'Patient')), ' ', 1),
    true
  );
end $$;

-- ---------------------------------------------------------------------------
-- 1 + 2: physio A mints only for their own patient
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.physio_a'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select set_config(
  'test.token_a',
  public.create_mattress_share_token(current_setting('test.p1')::uuid),
  true
);

do $$
begin
  begin
    perform public.create_mattress_share_token(current_setting('test.p2')::uuid);
    raise exception 'AUTHZ FAILURE: physio A minted a token for physio B''s patient';
  exception
    when insufficient_privilege then
      null; -- expected
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 3 + 4 + 8: anon sees only the first name for token A
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;

select set_config(
  'test.greeting_a',
  coalesce(
    (select first_name from public.get_mattress_share_greeting(current_setting('test.token_a'))),
    ''
  ),
  true
);

do $$
begin
  if current_setting('test.greeting_a') <> current_setting('test.expected_a') then
    raise exception 'AUTHZ FAILURE: token A resolved to the wrong greeting';
  end if;

  -- The token table must not be readable through PostgREST/anon.
  begin
    perform count(*) from public.mattress_share_tokens;
    raise exception 'AUTHZ FAILURE: anon can read the token table directly';
  exception
    when insufficient_privilege then
      null; -- expected
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 3 + 8: physio B's token resolves to B only; A still resolves to A
-- ---------------------------------------------------------------------------
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.physio_b'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select set_config(
  'test.token_b',
  public.create_mattress_share_token(current_setting('test.p2')::uuid),
  true
);

do $$
begin
  begin
    perform public.create_mattress_share_token(current_setting('test.p1')::uuid);
    raise exception 'AUTHZ FAILURE: physio B minted a token for physio A''s patient';
  exception
    when insufficient_privilege then
      null; -- expected
  end;
end $$;

reset role;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;

select set_config(
  'test.greeting_b',
  coalesce(
    (select first_name from public.get_mattress_share_greeting(current_setting('test.token_b'))),
    ''
  ),
  true
);
select set_config(
  'test.greeting_a_again',
  coalesce(
    (select first_name from public.get_mattress_share_greeting(current_setting('test.token_a'))),
    ''
  ),
  true
);

do $$
begin
  if current_setting('test.greeting_b') <> current_setting('test.expected_b') then
    raise exception 'AUTHZ FAILURE: token B did not resolve to its own patient';
  end if;

  if current_setting('test.greeting_a_again') <> current_setting('test.expected_a') then
    raise exception 'AUTHZ FAILURE: token A changed patient after token B was minted';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5: revocation is immediate
-- ---------------------------------------------------------------------------
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.physio_a'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select set_config(
  'test.revoked_a',
  public.revoke_mattress_share_token(current_setting('test.token_a'))::text,
  true
);

do $$
begin
  if current_setting('test.revoked_a') <> 'true' then
    raise exception 'AUTHZ FAILURE: physio A could not revoke their own token';
  end if;
end $$;

reset role;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;

select set_config(
  'test.greeting_a_revoked',
  coalesce(
    (select first_name from public.get_mattress_share_greeting(current_setting('test.token_a'))),
    ''
  ),
  true
);

do $$
begin
  if current_setting('test.greeting_a_revoked') <> '' then
    raise exception 'AUTHZ FAILURE: revoked token still resolves a greeting';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6 + 7: expired and unknown tokens return no greeting
-- ---------------------------------------------------------------------------
reset role;
update public.mattress_share_tokens
set expires_at = now() - interval '1 minute'
where token = current_setting('test.token_b');

select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;

select set_config(
  'test.greeting_b_expired',
  coalesce(
    (select first_name from public.get_mattress_share_greeting(current_setting('test.token_b'))),
    ''
  ),
  true
);
select set_config(
  'test.greeting_unknown',
  coalesce(
    (select first_name from public.get_mattress_share_greeting('00000000000000000000000000000000')),
    ''
  ),
  true
);

do $$
begin
  if current_setting('test.greeting_b_expired') <> '' then
    raise exception 'AUTHZ FAILURE: expired token still resolves a greeting';
  end if;

  if current_setting('test.greeting_unknown') <> '' then
    raise exception 'AUTHZ FAILURE: unknown token resolved a greeting';
  end if;
end $$;

select 'SmartGRID share-token authorization tests passed' as result;

rollback;
