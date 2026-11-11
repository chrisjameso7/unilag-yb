-- =============================================================================
-- Views and functions
--
-- public_*  : security-invoker, readable by anon/authenticated; RLS and column
--             grants on the base tables still apply.
-- admin_*   : service_role only. They join private data (emails, matric
--             numbers) and are never granted to browser roles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Public archive
-- -----------------------------------------------------------------------------
create view public.public_profiles
with (security_invoker = true) as
select
  p.id,
  p.username,
  p.public_identifier,
  p.full_name,
  p.profile_image,
  p.admission_year,
  p.graduation_year,
  p.bio,
  p.graduation_status,
  p.is_demo,
  p.search_indexing,
  p.published_at,
  p.created_at,
  f.id   as faculty_id,
  f.name as faculty_name,
  f.slug as faculty_slug,
  d.id   as department_id,
  d.name as department_name,
  d.slug as department_slug
from public.student_profiles p
join public.faculties f on f.id = p.faculty_id
join public.departments d on d.id = p.department_id
where p.publication_status = 'published';

grant select on public.public_profiles to anon, authenticated;

create view public.public_faces_entries
with (security_invoker = true) as
select
  e.id,
  e.edition_id,
  ed.year as edition_year,
  e.display_order,
  e.portrait_image,
  e.editorial_introduction,
  e.quote,
  p.id   as profile_id,
  p.username,
  p.full_name,
  p.profile_image,
  p.admission_year,
  p.graduation_year,
  p.faculty_name,
  p.faculty_slug,
  p.department_name,
  p.department_slug
from public.faces_entries e
join public.faces_editions ed on ed.id = e.edition_id
join public.public_profiles p on p.id = e.student_profile_id
where e.publication_status = 'published'
  and e.consent_status = 'granted'
  and ed.publication_status in ('published', 'archived');

grant select on public.public_faces_entries to anon, authenticated;

create or replace function public.public_cohort_summaries(p_type text)
returns table (year integer, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    case when p_type = 'admission' then p.admission_year else p.graduation_year end as year,
    count(*) as count
  from public.student_profiles p
  where p.publication_status = 'published'
  group by 1
  order by 1 desc;
$$;

create or replace function public.public_faculty_counts()
returns table (id bigint, name text, slug text, count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select f.id, f.name, f.slug, count(p.id) as count
  from public.faculties f
  left join public.student_profiles p
    on p.faculty_id = f.id and p.publication_status = 'published'
  group by f.id, f.name, f.slug, f.sort_order
  order by f.sort_order, f.name;
$$;

create or replace function public.public_archive_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'published', count(*),
    'faculties', count(distinct p.faculty_id),
    'classes', count(distinct p.graduation_year),
    'newest_graduation_year', max(p.graduation_year)
  )
  from public.student_profiles p
  where p.publication_status = 'published';
$$;

create or replace function public.public_year_facets()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'admission', coalesce((
      select jsonb_agg(y order by y desc) from (
        select distinct admission_year as y from public.student_profiles
        where publication_status = 'published') a), '[]'::jsonb),
    'graduation', coalesce((
      select jsonb_agg(y order by y desc) from (
        select distinct graduation_year as y from public.student_profiles
        where publication_status = 'published') g), '[]'::jsonb)
  );
$$;

grant execute on function public.public_cohort_summaries(text) to anon, authenticated;
grant execute on function public.public_faculty_counts() to anon, authenticated;
grant execute on function public.public_archive_stats() to anon, authenticated;
grant execute on function public.public_year_facets() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Publication gate — the single source of truth.
-- Called by the payment webhook, the payment callback, admin review and the
-- student dashboard. A profile can never become public on the browser's word.
-- -----------------------------------------------------------------------------
create or replace function public.publication_readiness(p_user_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'has_profile', p.id is not null,
    'publication_status', p.publication_status,
    'has_verified_student', exists (
      select 1 from public.verification_records v
      where v.user_id = p_user_id and v.verification_status = 'verified'),
    'has_portrait', coalesce(p.profile_image is not null, false),
    'has_biography', coalesce(char_length(btrim(p.bio)) >= 20, false),
    'has_consent', coalesce(p.consent_public, false),
    'has_paid', exists (
      select 1 from public.payments pay
      where pay.user_id = p_user_id and pay.payment_status = 'succeeded')
  )
  from (select 1) as one
  left join public.student_profiles p on p.user_id = p_user_id;
$$;

create or replace function public.publish_profile_if_ready(p_user_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  prof public.student_profiles%rowtype;
  r jsonb;
begin
  select * into prof from public.student_profiles where user_id = p_user_id for update;
  r := public.publication_readiness(p_user_id);

  if prof.id is null then
    return r || jsonb_build_object('published', false);
  end if;
  if prof.publication_status = 'published' then
    return r || jsonb_build_object('published', true);
  end if;
  if prof.publication_status in ('suspended', 'removed') then
    return r || jsonb_build_object('published', false, 'blocked', true);
  end if;

  if (r ->> 'has_verified_student')::boolean
     and (r ->> 'has_portrait')::boolean
     and (r ->> 'has_biography')::boolean
     and (r ->> 'has_consent')::boolean
     and (r ->> 'has_paid')::boolean then
    update public.student_profiles
       set publication_status = 'published',
           verification_status = 'verified',
           published_at = coalesce(published_at, now())
     where id = prof.id;

    insert into public.cohorts (year, cohort_type)
    values (prof.admission_year, 'admission'), (prof.graduation_year, 'graduation')
    on conflict (year, cohort_type) do nothing;

    return r || jsonb_build_object('published', true);
  end if;

  return r || jsonb_build_object('published', false);
end;
$$;

-- Keep the cached verification_status on the profile in step with the latest record.
create or replace function public.refresh_profile_verification(p_user_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  latest text;
  derived text;
begin
  select v.verification_status into latest
  from public.verification_records v
  where v.user_id = p_user_id
  order by (v.verification_status = 'verified') desc, v.created_at desc
  limit 1;

  derived := case latest
    when 'verified' then 'verified'
    when 'pending' then 'pending'
    when 'rejected' then 'rejected'
    else 'unverified'
  end;

  update public.student_profiles set verification_status = derived where user_id = p_user_id;
  return derived;
end;
$$;

-- -----------------------------------------------------------------------------
-- Payment fulfilment — idempotent, amount/currency checked, row-locked.
-- -----------------------------------------------------------------------------
create or replace function public.fulfil_payment(
  p_reference text,
  p_amount bigint,
  p_currency text,
  p_channel text,
  p_provider text,
  p_mode text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  pay public.payments%rowtype;
  pub jsonb;
begin
  select * into pay from public.payments where transaction_reference = p_reference for update;

  if pay.id is null then
    return jsonb_build_object('ok', false, 'reason', 'Unknown payment reference.');
  end if;
  if pay.payment_status = 'refunded' then
    return jsonb_build_object('ok', false, 'reason', 'This payment was refunded.');
  end if;
  if p_currency is distinct from pay.currency then
    return jsonb_build_object('ok', false, 'reason', 'Currency mismatch.');
  end if;
  if p_amount is null or p_amount < pay.amount then
    return jsonb_build_object('ok', false, 'reason', 'Amount mismatch.');
  end if;

  if pay.payment_status = 'succeeded' then
    return jsonb_build_object(
      'ok', true,
      'already_fulfilled', true,
      'user_id', pay.user_id,
      'published', exists (
        select 1 from public.student_profiles
        where user_id = pay.user_id and publication_status = 'published')
    );
  end if;

  -- 'failed' is included: if the gateway confirms the money arrived after we
  -- gave up on a checkout, the student has still paid.
  update public.payments
     set payment_status = 'succeeded',
         paid_at = now(),
         channel = p_channel,
         provider = p_provider,
         mode = p_mode
   where id = pay.id;

  if pay.user_id is null then
    return jsonb_build_object('ok', true, 'already_fulfilled', false, 'published', false);
  end if;

  pub := public.publish_profile_if_ready(pay.user_id);
  return jsonb_build_object('ok', true, 'already_fulfilled', false, 'user_id', pay.user_id) || pub;
end;
$$;

-- -----------------------------------------------------------------------------
-- Fixed-window rate limiter (atomic upsert)
-- -----------------------------------------------------------------------------
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after integer)
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_start timestamptz;
  v_window interval := make_interval(secs => p_window_seconds);
begin
  insert into public.rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case when rl.window_start < now() - v_window then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - v_window then now() else rl.window_start end
  returning rl.count, rl.window_start into v_count, v_start;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    case when v_count <= p_limit then 0
         else greatest(1, ceil(extract(epoch from (v_start + v_window - now())))::integer)
    end;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin views (service_role only)
-- -----------------------------------------------------------------------------
create view public.admin_student_index with (security_invoker = true) as
select
  p.*,
  u.email,
  u.created_at as user_created_at,
  f.name as faculty_name,
  d.name as department_name
from public.student_profiles p
left join public.users u on u.id = p.user_id
join public.faculties f on f.id = p.faculty_id
join public.departments d on d.id = p.department_id;

create view public.admin_verification_queue with (security_invoker = true) as
select
  v.*,
  u.email,
  p.id as profile_id,
  coalesce(p.full_name, v.claimed_name) as full_name,
  p.username,
  d.name as department_name
from public.verification_records v
join public.users u on u.id = v.user_id
left join public.student_profiles p on p.user_id = v.user_id
left join public.departments d on d.id = p.department_id;

create view public.admin_payment_list with (security_invoker = true) as
select
  pay.*,
  u.email,
  p.id as profile_id,
  p.full_name
from public.payments pay
left join public.users u on u.id = pay.user_id
left join public.student_profiles p on p.user_id = pay.user_id;

create view public.admin_request_list with (security_invoker = true) as
select
  r.*,
  u.email,
  p.id as profile_id,
  p.full_name,
  p.username
from public.profile_edit_requests r
join public.users u on u.id = r.user_id
left join public.student_profiles p on p.user_id = r.user_id;

create view public.admin_audit_list with (security_invoker = true) as
select a.*, u.email as actor_email
from public.audit_logs a
left join public.users u on u.id = a.actor_id;

create view public.admin_editorial_queue with (security_invoker = true) as
select
  s.*,
  p.full_name,
  p.username,
  p.user_id,
  p.publication_status as profile_publication_status,
  f.name as faculty_name,
  d.name as department_name,
  p.admission_year,
  p.graduation_year,
  ed.year as edition_year
from public.editorial_submissions s
join public.student_profiles p on p.id = s.student_profile_id
join public.faculties f on f.id = p.faculty_id
join public.departments d on d.id = p.department_id
left join public.faces_editions ed on ed.id = s.edition_id;

create or replace function public.admin_overview()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'published',        (select count(*) from public.student_profiles where publication_status = 'published'),
    'drafts',           (select count(*) from public.student_profiles where publication_status = 'draft'),
    'awaiting_payment', (select count(*) from public.student_profiles where publication_status = 'pending_payment'),
    'suspended',        (select count(*) from public.student_profiles where publication_status = 'suspended'),
    'removed',          (select count(*) from public.student_profiles where publication_status = 'removed'),
    'total_profiles',   (select count(*) from public.student_profiles),
    'pending_verifications', (select count(*) from public.verification_records where verification_status = 'pending'),
    'verified_students',(select count(distinct user_id) from public.verification_records where verification_status = 'verified'),
    'successful_payments', (select count(*) from public.payments where payment_status = 'succeeded' and mode = 'live'),
    'revenue_kobo',     (select coalesce(sum(amount), 0) from public.payments where payment_status = 'succeeded' and mode = 'live'),
    'failed_payments',  (select count(*) from public.payments where payment_status = 'failed'),
    'refunded_payments',(select count(*) from public.payments where payment_status = 'refunded'),
    'duplicate_payers', (select count(*) from (
                           select user_id from public.payments
                           where payment_status = 'succeeded' and user_id is not null
                           group by user_id having count(*) > 1) d),
    'total_users',      (select count(*) from public.users),
    'open_requests',    (select count(*) from public.profile_edit_requests where status = 'open'),
    'open_submissions', (select count(*) from public.editorial_submissions where submission_status in ('submitted', 'shortlisted'))
  );
$$;

-- Lock everything privileged down to service_role.
revoke all on public.admin_student_index, public.admin_verification_queue,
  public.admin_payment_list, public.admin_request_list, public.admin_audit_list,
  public.admin_editorial_queue
  from anon, authenticated;

revoke execute on function public.publication_readiness(uuid) from public, anon, authenticated;
revoke execute on function public.publish_profile_if_ready(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_profile_verification(uuid) from public, anon, authenticated;
revoke execute on function public.fulfil_payment(text, bigint, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.admin_overview() from public, anon, authenticated;
revoke execute on function public.handle_auth_user_change() from public, anon, authenticated;

grant select on public.admin_student_index, public.admin_verification_queue,
  public.admin_payment_list, public.admin_request_list, public.admin_audit_list,
  public.admin_editorial_queue
  to service_role;
grant execute on function public.publication_readiness(uuid) to service_role;
grant execute on function public.publish_profile_if_ready(uuid) to service_role;
grant execute on function public.refresh_profile_verification(uuid) to service_role;
grant execute on function public.fulfil_payment(text, bigint, text, text, text, text) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.admin_overview() to service_role;
