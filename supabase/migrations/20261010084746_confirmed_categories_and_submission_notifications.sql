-- LOCAL PREPARATION ONLY. No legacy category mapping or sample content import.
begin;

alter table public.categories add column slug text generated always as (
  case label
    when 'Cross Border Insolvency and Restructuring' then 'cross-border-insolvency-and-restructuring'
    when 'M&A and Foreign Investment Regulation' then 'ma-and-foreign-investment-regulation'
    when 'Cross Border Dispute Resolution and Enforcement' then 'cross-border-dispute-resolution-and-enforcement'
    when 'Regulatory Exposure and Enforcement' then 'regulatory-exposure-and-enforcement'
    else null
  end
) stored;
-- Fail for duplicate exact confirmed names. A trusted editor must reconcile UUIDs;
-- never delete/reassign referenced records automatically.
alter table public.categories add constraint categories_confirmed_slug_unique unique(slug);
insert into public.categories(label,description,published)
select v.label, v.description, false from (values
  ('Cross Border Insolvency and Restructuring', 'Research on insolvency and restructuring across India–US borders.'),
  ('M&A and Foreign Investment Regulation', 'Research on cross-border transactions and foreign investment regulation.'),
  ('Cross Border Dispute Resolution and Enforcement', 'Research on resolving cross-border disputes and enforcing outcomes.'),
  ('Regulatory Exposure and Enforcement', 'Research on regulatory exposure and enforcement in an India–US context.')
) v(label,description)
where not exists (select 1 from public.categories c where c.label = v.label);
comment on column public.categories.slug is 'Confirmed article taxonomy only. NULL marks an unmapped legacy or case-specific category; no case taxonomy is inferred.';

create table private.notification_settings (
  id boolean primary key default true check(id),
  enabled boolean not null default false
);
insert into private.notification_settings(id,enabled) values(true,false);
alter table private.notification_settings enable row level security;
revoke all on private.notification_settings from public, anon, authenticated;

create table private.submission_notifications (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  request_fingerprint text not null check(request_fingerprint ~ '^[a-f0-9]{64}$'),
  state text not null default 'pending' check(state in ('pending','sending','failed','sent','needs_attention')),
  attempts integer not null default 0 check(attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  provider_reference text check(length(provider_reference) <= 100),
  error_code text check(error_code in ('transport','provider_temporary','provider_rejected','invalid_response')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index submission_notifications_due on private.submission_notifications(next_attempt_at) where state in ('pending','failed','sending');
alter table private.submission_notifications enable row level security;
revoke all on private.submission_notifications from public, anon, authenticated;
-- Private tables are never exposed through the Data API. Only narrow service RPCs.

create function public.accept_submission_with_notification(
  submission_id uuid, request_id uuid, category_id uuid, email text, payload jsonb,
  attachment_path text, request_fingerprint text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing_id uuid; existing_fingerprint text; accepted_id uuid;
begin
  if request_fingerprint is null or request_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Invalid request fingerprint'; end if;
  -- Serialize retry/concurrent requests for the same random request UUID.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_id::text, 0));
  select s.id, n.request_fingerprint into existing_id, existing_fingerprint
    from public.submissions s left join private.submission_notifications n on n.submission_id = s.id
    where s.request_id = accept_submission_with_notification.request_id;
  if existing_id is not null then
    if existing_fingerprint is distinct from request_fingerprint then raise exception 'Request conflict; contact an editor before retrying with new details'; end if;
    return jsonb_build_object('reference',existing_id,'duplicate',true);
  end if;
  -- Original conservative intake validation, private files and DB gate retained.
  accepted_id := public.accept_submission(submission_id,request_id,category_id,email,payload,attachment_path);
  insert into private.submission_notifications(submission_id,request_fingerprint) values(accepted_id,request_fingerprint);
  return jsonb_build_object('reference',accepted_id,'duplicate',false);
end $$;
revoke all on function public.accept_submission_with_notification(uuid,uuid,uuid,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.accept_submission_with_notification(uuid,uuid,uuid,text,jsonb,text,text) to service_role;

create function public.claim_submission_notification() returns jsonb language plpgsql security definer set search_path = '' as $$
declare job private.submission_notifications; token uuid;
begin
  if not coalesce((select enabled from private.notification_settings where id),false) then return null; end if;
  -- Stop uncertain old jobs rather than resend outside a provider deduplication window.
  update private.submission_notifications set state='needs_attention', updated_at=now()
    where state in ('pending','failed','sending') and (attempts >= 5 or created_at < now()-interval '6 hours')
      and (lease_until is null or lease_until < now());
  select * into job from private.submission_notifications n
    where n.attempts < 5 and n.created_at >= now()-interval '6 hours'
      and ((n.state in ('pending','failed') and n.next_attempt_at <= now()) or (n.state='sending' and n.lease_until < now()))
    order by n.next_attempt_at for update skip locked limit 1;
  if not found then return null; end if;
  token := gen_random_uuid();
  update private.submission_notifications set state='sending', attempts=attempts+1, lease_token=token,
    lease_until=now()+interval '2 minutes', updated_at=now() where submission_id=job.submission_id;
  return jsonb_build_object('reference',job.submission_id,'lease',token);
end $$;
revoke all on function public.claim_submission_notification() from public, anon, authenticated;
grant execute on function public.claim_submission_notification() to service_role;

create function public.finish_submission_notification(
  reference uuid, lease uuid, succeeded boolean, provider_reference text, error_code text, retryable boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if succeeded is null or retryable is null then raise exception 'Invalid notification result'; end if;
  update private.submission_notifications n set
    state=case when succeeded then 'sent' when retryable and n.attempts < 5 then 'failed' else 'needs_attention' end,
    provider_reference=case when succeeded then finish_submission_notification.provider_reference else null end,
    error_code=case when succeeded then null else finish_submission_notification.error_code end,
    next_attempt_at=now()+make_interval(secs => least(3600, 60 * power(2,n.attempts)::integer)),
    lease_until=null, lease_token=null, updated_at=now()
  where n.submission_id=reference and n.lease_token=lease and n.state='sending';
  if not found then raise exception 'Notification lease expired or changed'; end if;
end $$;
revoke all on function public.finish_submission_notification(uuid,uuid,boolean,text,text,boolean) from public, anon, authenticated;
grant execute on function public.finish_submission_notification(uuid,uuid,boolean,text,text,boolean) to service_role;
commit;
