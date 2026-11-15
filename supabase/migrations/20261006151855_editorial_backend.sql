-- Prepared locally; no seed content. Apply only to the dedicated reviewed project.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, anon;

create table private.staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table private.staff_accounts enable row level security;
revoke all on private.staff_accounts from public, anon, authenticated;
-- No browser-accessible grant/provisioning function. Bootstrap via trusted SQL only.
create function private.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from private.staff_accounts where user_id = auth.uid() and active);
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from private.staff_accounts where user_id = auth.uid() and active and role = 'admin');
$$;
revoke all on function private.is_staff(), private.is_admin() from public;
grant execute on function private.is_staff(), private.is_admin() to anon, authenticated;
create function public.staff_role() returns text language sql stable security definer set search_path = '' as $$
  select role from private.staff_accounts where user_id = auth.uid() and active and auth.uid() is not null;
$$;
revoke all on function public.staff_role() from public;
grant execute on function public.staff_role() to authenticated;

create function private.valid_blocks(blocks jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare b jsonb; i jsonb;
begin
  if jsonb_typeof(blocks) is distinct from 'array' or jsonb_array_length(blocks) not between 1 and 80 then return false; end if;
  for b in select value from jsonb_array_elements(blocks) loop
    if b->>'type' in ('paragraph','heading','note') then
      if jsonb_typeof(b->'text') is distinct from 'string' or length(b->>'text') not between 1 and 6000 then return false; end if;
    elsif b->>'type' = 'list' then
      if jsonb_typeof(b->'items') is distinct from 'array' or jsonb_array_length(b->'items') not between 1 and 40 then return false; end if;
      for i in select value from jsonb_array_elements(b->'items') loop
        if jsonb_typeof(i) is distinct from 'string' or length(i #>> '{}') not between 1 and 6000 then return false; end if;
      end loop;
    else return false; end if;
  end loop;
  return true;
exception when others then return false;
end $$;
revoke all on function private.valid_blocks(jsonb) from public;
grant execute on function private.valid_blocks(jsonb) to authenticated, service_role;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  label text not null check(length(trim(label)) between 1 and 80),
  description text not null default '' check(length(description) <= 400),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.authors (
  id uuid primary key default gen_random_uuid(),
  label text not null check(length(trim(label)) between 1 and 120),
  description text not null default '' check(length(description) <= 2000),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.editorial_assets (
  id uuid primary key default gen_random_uuid(),
  path text not null unique check(path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp|pdf)$'),
  bucket text not null check(bucket in ('editorial-images','case-documents')),
  label text not null check(length(trim(label)) between 1 and 200),
  mime text not null check(mime in ('image/png','image/jpeg','image/webp','application/pdf')),
  bytes integer not null check(bytes between 1 and 10485760),
  created_at timestamptz not null default now(),
  check((bucket = 'editorial-images' and mime <> 'application/pdf' and bytes <= 3145728) or (bucket = 'case-documents' and mime = 'application/pdf'))
);
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  category_id uuid not null references public.categories(id),
  author_id uuid references public.authors(id),
  cover_asset_id uuid references public.editorial_assets(id),
  status text not null default 'draft' check(status in ('draft','published')),
  display_order integer not null default 0 check(display_order between 0 and 1000),
  featured boolean not null default false,
  data jsonb not null check(jsonb_typeof(data) = 'object' and octet_length(data::text) <= 524288 and coalesce(data->'fictional' = 'false'::jsonb,false) and private.valid_blocks(data->'body') and coalesce(length(trim(data->>'title')) between 1 and 180,false) and coalesce(length(trim(data->>'summary')) between 1 and 1200,false)),
  updated_at timestamptz not null default now(),
  check(status <> 'published' or (author_id is not null and cover_asset_id is not null))
);
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  category_id uuid not null references public.categories(id),
  status text not null default 'draft' check(status in ('draft','published')),
  display_order integer not null default 0 check(display_order between 0 and 1000),
  featured boolean not null default false,
  -- Additional client case fields remain provisional JSON, never authorization inputs.
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 8192),
  data jsonb not null check(jsonb_typeof(data) = 'object' and octet_length(data::text) <= 524288 and coalesce(data->'fictional' = 'false'::jsonb,false) and private.valid_blocks(data->'body') and coalesce(length(trim(data->>'title')) between 1 and 180,false) and coalesce(length(trim(data->>'summary')) between 1 and 1200,false)),
  updated_at timestamptz not null default now()
);
create table public.team_profiles (
  id uuid primary key default gen_random_uuid(),
  cover_asset_id uuid references public.editorial_assets(id),
  status text not null default 'draft' check(status in ('draft','published')),
  display_order integer not null default 0 check(display_order between 0 and 1000),
  data jsonb not null check(jsonb_typeof(data) = 'object' and octet_length(data::text) <= 16384 and coalesce(data->'fictional' = 'false'::jsonb,false) and coalesce(length(trim(data->>'label')) between 1 and 120,false)),
  updated_at timestamptz not null default now(),
  check(status <> 'published' or cover_asset_id is not null)
);
create table public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  asset_id uuid not null references public.editorial_assets(id),
  label text not null check(length(trim(label)) between 1 and 200),
  is_public boolean not null default false,
  unique(case_id, asset_id)
);
create table public.homepage_settings (
  id boolean primary key default true check(id),
  data jsonb not null check(jsonb_typeof(data) = 'object' and octet_length(data::text) <= 32768 and coalesce(data->'fictional' = 'false'::jsonb,false)),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  data jsonb not null check(octet_length(data::text) <= 524288 and private.valid_blocks(data->'body')),
  contact_email text not null check(length(contact_email) <= 254),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  -- Deliberately no FK: the conversion tombstone survives article deletion.
  converted_article_id uuid unique,
  request_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.submission_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  path text not null unique,
  label text not null check(length(label) <= 200)
);
create table public.content_activity (
  id uuid primary key default gen_random_uuid(), at timestamptz not null default now(), message text not null
);
create index articles_public_order on public.articles(display_order) where status = 'published';
create index articles_category on public.articles(category_id);
create index articles_author on public.articles(author_id);
create index articles_cover on public.articles(cover_asset_id);
create index cases_public_order on public.cases(display_order) where status = 'published';
create index cases_category on public.cases(category_id);
create index team_public_order on public.team_profiles(display_order) where status = 'published';
create index team_cover on public.team_profiles(cover_asset_id);
create index case_documents_asset on public.case_documents(asset_id);
create index submission_category on public.submissions(category_id);
create index submission_attachments_parent on public.submission_attachments(submission_id);

do $$ declare t text; begin
  foreach t in array array['articles','cases','team_profiles','categories','authors','editorial_assets','case_documents','homepage_settings','submissions','submission_attachments','content_activity'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy staff_read on public.%I for select to authenticated using ((select private.is_staff()))', t);
    if t not in ('submissions','submission_attachments','content_activity') then
      execute format('create policy staff_insert on public.%I for insert to authenticated with check ((select private.is_staff()))', t);
      execute format('create policy staff_update on public.%I for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))', t);
      execute format('create policy staff_delete on public.%I for delete to authenticated using ((select private.is_staff()))', t);
    end if;
  end loop;
end $$;
create policy public_articles on public.articles for select to anon, authenticated using(status = 'published');
create policy public_cases on public.cases for select to anon, authenticated using(status = 'published');
create policy public_team on public.team_profiles for select to anon, authenticated using(status = 'published');
create policy public_categories on public.categories for select to anon, authenticated using(published);
create policy public_authors on public.authors for select to anon, authenticated using(published);
create policy public_homepage on public.homepage_settings for select to anon, authenticated using(published);
create policy public_case_documents on public.case_documents for select to anon, authenticated using(is_public and exists(select 1 from public.cases where id = case_id and status = 'published'));
create policy public_assets on public.editorial_assets for select to anon, authenticated using(
  exists(select 1 from public.articles where cover_asset_id = editorial_assets.id and status = 'published')
  or exists(select 1 from public.team_profiles where cover_asset_id = editorial_assets.id and status = 'published')
  or exists(select 1 from public.case_documents d join public.cases c on c.id = d.case_id where d.asset_id = editorial_assets.id and d.is_public and c.status = 'published')
);
-- Avoid circular RLS dependencies: content policies do not query assets.
create function private.record_activity() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'DELETE' then new.updated_at = now(); end if;
  insert into public.content_activity(message) values(tg_table_name || ': ' || lower(tg_op));
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;
revoke all on function private.record_activity() from public;
do $$ declare t text; begin
  foreach t in array array['articles','cases','team_profiles','categories','authors','homepage_settings'] loop
    execute format('create trigger content_activity before insert or update or delete on public.%I for each row execute function private.record_activity()', t);
  end loop;
end $$;

-- Narrow definer RPCs because reviewers must not edit contributor data or conversion IDs.
create function public.review_submission(submission_id uuid, decision text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_staff() or decision not in ('approved','rejected') then raise exception 'Not permitted' using errcode='42501'; end if;
  update public.submissions set status = decision, updated_at = now() where id = submission_id and converted_article_id is null;
  if not found then raise exception 'Submission unavailable or already converted'; end if;
  insert into public.content_activity(message) values('Submission reviewed');
end $$;
create function public.convert_submission(submission_id uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.submissions; article_id uuid; category_label text; generated_slug text;
begin
  if not private.is_staff() then raise exception 'Not permitted' using errcode='42501'; end if;
  select * into s from public.submissions where id = submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if s.converted_article_id is not null then
    if not exists(select 1 from public.articles where id = s.converted_article_id) then raise exception 'Converted article was removed; conversion cannot be repeated'; end if;
    return s.converted_article_id;
  end if;
  if s.status <> 'approved' then raise exception 'Approve before converting'; end if;
  article_id = gen_random_uuid(); generated_slug = 'submission-' || article_id::text;
  select label into category_label from public.categories where id = s.category_id;
  insert into public.articles(id,slug,category_id,data) values(article_id,generated_slug,s.category_id,
    jsonb_build_object('title',s.data->>'title','summary',s.data->>'excerpt','body',s.data->'body','sampleAuthor',s.data->>'author','categoryLabel',category_label,'readingMinutes',1,'artwork','institutions','publicationLabel','','fictional',false));
  update public.submissions set converted_article_id = article_id, updated_at = now() where id = s.id;
  return article_id;
end $$;
revoke all on function public.review_submission(uuid,text), public.convert_submission(uuid) from public;
grant execute on function public.review_submission(uuid,text), public.convert_submission(uuid) to authenticated;

-- Every bucket is physically private. Anonymous access is RLS-gated to assets
-- referenced by published content; short-lived signed URLs are issued by the reader.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('editorial-images','editorial-images',false,3145728,array['image/png','image/jpeg','image/webp']),
 ('case-documents','case-documents',false,10485760,array['application/pdf']),
 ('submission-attachments','submission-attachments',false,5242880,array['application/pdf']);
create policy editorial_read on storage.objects for select to anon, authenticated using(
  bucket_id in ('editorial-images','case-documents') and exists(select 1 from public.editorial_assets a where a.path = name and a.bucket = bucket_id)
);
create policy staff_attachment_read on storage.objects for select to authenticated using(bucket_id = 'submission-attachments' and (select private.is_staff()));
create policy staff_asset_insert on storage.objects for insert to authenticated with check(
  bucket_id in ('editorial-images','case-documents') and (select private.is_staff()) and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy staff_asset_delete on storage.objects for delete to authenticated using(
  bucket_id in ('editorial-images','case-documents') and (select private.is_staff())
);
-- No anonymous INSERT/UPDATE policy, no browser submission-attachment writes,
-- no upsert policy. Files get unique paths. Intake writes require service auth.

create table private.intake_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 controls_verified boolean not null default false
);
insert into private.intake_settings default values;
create table private.intake_limits (
  key text primary key, window_start timestamptz not null, count integer not null
);
alter table private.intake_settings enable row level security;
alter table private.intake_limits enable row level security;
revoke all on private.intake_settings, private.intake_limits from public, anon, authenticated;
create function public.intake_enabled() returns boolean language sql stable security definer set search_path = '' as $$
 select coalesce((select enabled and controls_verified from private.intake_settings where id),false);
$$;
revoke all on function public.intake_enabled() from public;
grant execute on function public.intake_enabled() to anon, authenticated, service_role;
create function public.consume_intake_limit(rate_key text) returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.intake_enabled() or length(rate_key) <> 64 then return false; end if;
  insert into private.intake_limits(key,window_start,count) values(rate_key,now(),1)
  on conflict(key) do update set
    count = case when private.intake_limits.window_start < now() - interval '1 hour' then 1 else private.intake_limits.count+1 end,
    window_start = case when private.intake_limits.window_start < now() - interval '1 hour' then now() else private.intake_limits.window_start end
  returning count into n;
  return n <= 5;
end $$;
revoke all on function public.consume_intake_limit(text) from public, anon, authenticated;
grant execute on function public.consume_intake_limit(text) to service_role;

-- Atomic settings/catalog/ordering operations; no partially saved homepage.
create function public.save_homepage(payload jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare c jsonb;
begin
  if not private.is_staff() or payload->'fictional' <> 'false'::jsonb then raise exception 'Not permitted' using errcode='42501'; end if;
  perform 1 from public.homepage_settings where id for update;
  if exists(select 1 from public.homepage_settings where id) and not exists(select 1 from public.homepage_settings where id and updated_at=(payload->>'updatedAt')::timestamptz) then raise exception 'Homepage settings changed; reload before saving'; end if;
  if exists(select 1 from jsonb_array_elements_text(payload->'featuredArticleIds') x where not exists(select 1 from public.articles where id=x::uuid)) or exists(select 1 from jsonb_array_elements_text(payload->'featuredCaseIds') x where not exists(select 1 from public.cases where id=x::uuid)) then raise exception 'Broken featured reference'; end if;
  for c in select value from jsonb_array_elements(payload->'categories') loop
    update public.categories set label=c->>'label',description=c->>'description' where id=(c->>'id')::uuid;
  end loop;
  insert into public.homepage_settings(id,data,published) values(true,payload - 'categories' - 'updatedAt',true)
  on conflict(id) do update set data=excluded.data,published=true;
  update public.articles set featured=(payload->'featuredArticleIds') ? id::text;
  update public.cases set featured=(payload->'featuredCaseIds') ? id::text;
end $$;
create function public.reorder_content(kind text, ids uuid[]) returns void language plpgsql security invoker set search_path = '' as $$
declare t text; n integer;
begin
  if not private.is_staff() then raise exception 'Not permitted' using errcode='42501'; end if;
  t = case kind when 'articles' then 'articles' when 'cases' then 'cases' when 'team' then 'team_profiles' else null end;
  if t is null then raise exception 'Unsupported collection'; end if;
  execute format('select count(*) from public.%I',t) into n;
  if n <> cardinality(ids) or n <> (select count(distinct i) from unnest(ids) i) then raise exception 'Collection changed'; end if;
  execute format('update public.%I r set display_order = x.ord-1 from unnest($1) with ordinality x(id,ord) where r.id = x.id',t) using ids;
  get diagnostics n = row_count;
  if n <> cardinality(ids) then raise exception 'Collection changed'; end if;
end $$;
revoke all on function public.save_homepage(jsonb), public.reorder_content(text,uuid[]) from public;
grant execute on function public.save_homepage(jsonb), public.reorder_content(text,uuid[]) to authenticated;
-- The service endpoint cannot accept without the independent database gate.
create function public.accept_submission(submission_id uuid, request_id uuid, category_id uuid, email text, payload jsonb, attachment_path text default null) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.intake_enabled() then raise exception 'Intake disabled'; end if;
  if length(email) not between 3 and 254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or not private.valid_blocks(payload->'body') or not exists(select 1 from public.categories c where c.id = category_id and c.published) then raise exception 'Invalid submission'; end if;
  if attachment_path is not null and attachment_path !~ ('^' || submission_id::text || '/[0-9a-f-]{36}[.]pdf$') then raise exception 'Invalid attachment'; end if;
  insert into public.submissions(id,request_id,category_id,contact_email,data,status) values(submission_id,request_id,category_id,email,payload,'pending');
  if attachment_path is not null then insert into public.submission_attachments(submission_id,path,label) values(submission_id,attachment_path,'Contributor attachment'); end if;
  return submission_id;
end $$;
revoke all on function public.accept_submission(uuid,uuid,uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.accept_submission(uuid,uuid,uuid,text,jsonb,text) to service_role;
grant all on all tables in schema public to service_role;
-- Validate referenced publication visibility and asset kind on the server.
create function private.validate_publication() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name in ('articles','cases') then
    if new.status = 'published' and not exists(select 1 from public.categories where id=new.category_id and published) then raise exception 'Publish an approved category first'; end if;
  end if;
  if tg_table_name = 'articles' then
    if new.author_id is not null and not exists(select 1 from public.authors where id=new.author_id and published) and new.status='published' then raise exception 'Publish an approved author first'; end if;
    if new.cover_asset_id is not null and not exists(select 1 from public.editorial_assets where id=new.cover_asset_id and bucket='editorial-images') then raise exception 'Cover must be an editorial image'; end if;
  elsif tg_table_name = 'team_profiles' then
    if new.cover_asset_id is not null and not exists(select 1 from public.editorial_assets where id=new.cover_asset_id and bucket='editorial-images') then raise exception 'Profile must use an editorial image'; end if;
  end if;
  return new;
end $$;
revoke all on function private.validate_publication() from public;
create trigger validate_publication before insert or update on public.articles for each row execute function private.validate_publication();
create trigger validate_publication before insert or update on public.cases for each row execute function private.validate_publication();
create trigger validate_publication before insert or update on public.team_profiles for each row execute function private.validate_publication();
create policy staff_editorial_read on storage.objects for select to authenticated using(bucket_id in ('editorial-images','case-documents') and (select private.is_staff()));
-- Prevent hiding taxonomy/attribution while published content still references it.
create function private.validate_catalog_visibility() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.published and not new.published then
    if tg_table_name='categories' and (exists(select 1 from public.articles where category_id=new.id and status='published') or exists(select 1 from public.cases where category_id=new.id and status='published')) then raise exception 'Unpublish referencing content before hiding this category'; end if;
    if tg_table_name='authors' and exists(select 1 from public.articles where author_id=new.id and status='published') then raise exception 'Unpublish referencing articles before hiding this author'; end if;
  end if;
  return new;
end $$;
revoke all on function private.validate_catalog_visibility() from public;
create trigger validate_visibility before update on public.categories for each row execute function private.validate_catalog_visibility();
create trigger validate_visibility before update on public.authors for each row execute function private.validate_catalog_visibility();
create function private.valid_homepage(d jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(d->'hero') is distinct from 'object' or jsonb_typeof(d->'hero'->'lines') is distinct from 'array' or jsonb_array_length(d->'hero'->'lines') <> 3 or coalesce(length(trim(d->'hero'->>'introduction')) not between 1 and 600,true) or coalesce(length(trim(d->'hero'->>'eyebrow')) not between 1 and 100,true) then return false; end if;
  for item in select value from jsonb_array_elements(d->'hero'->'lines') loop
    if jsonb_typeof(item) is distinct from 'string' or length(trim(item #>> '{}')) not between 1 and 100 then return false; end if;
  end loop;
  if jsonb_typeof(d->'sections') is distinct from 'array' or jsonb_array_length(d->'sections') <> 5 then return false; end if;
  if (select count(distinct x->>'id') from jsonb_array_elements(d->'sections') x) <> 5 then return false; end if;
  for item in select value from jsonb_array_elements(d->'sections') loop
    if coalesce(item->>'id' not in ('focus','featured','repository','team','contribution'),true) or jsonb_typeof(item->'visible') is distinct from 'boolean' or jsonb_typeof(item->'label') is distinct from 'string' then return false; end if;
  end loop;
  if jsonb_typeof(d->'featuredArticleIds') is distinct from 'array' or jsonb_typeof(d->'featuredCaseIds') is distinct from 'array' or jsonb_array_length(d->'featuredArticleIds') > 50 or jsonb_array_length(d->'featuredCaseIds') > 50 then return false; end if;
  if jsonb_typeof(d->'contact') is distinct from 'object' or coalesce(length(d->'contact'->>'address') > 500,true) or coalesce(length(d->'contact'->>'email') > 254,true) then return false; end if;
  if jsonb_typeof(d->'socialLinks') is distinct from 'array' or jsonb_array_length(d->'socialLinks') > 12 then return false; end if;
  for item in select value from jsonb_array_elements(d->'socialLinks') loop
    if coalesce(length(trim(item->>'label')) not between 1 and 80,true) or coalesce(length(item->>'url') > 500,true) or coalesce(item->>'url' !~* '^https?://[^/@[:space:]]+([/?#].*)?$',true) then return false; end if;
  end loop;
  return true;
exception when others then return false;
end $$;
revoke all on function private.valid_homepage(jsonb) from public;
grant execute on function private.valid_homepage(jsonb) to authenticated, service_role;
alter table public.homepage_settings add constraint valid_homepage check(private.valid_homepage(data));
create function private.validate_document_asset() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.editorial_assets where id=new.asset_id and bucket='case-documents') then raise exception 'Supporting documents must use a restricted PDF asset'; end if;
  return new;
end $$;
revoke all on function private.validate_document_asset() from public;
create trigger document_asset before insert or update on public.case_documents for each row execute function private.validate_document_asset();
create function private.prune_featured() returns trigger language plpgsql security definer set search_path = '' as $$
declare field text;
begin
  field=case tg_table_name when 'articles' then 'featuredArticleIds' else 'featuredCaseIds' end;
  update public.homepage_settings set data=jsonb_set(data,array[field],coalesce((select jsonb_agg(x) from jsonb_array_elements(data->field) x where x #>> '{}' <> old.id::text),'[]'::jsonb)) where id;
  return old;
end $$;
revoke all on function private.prune_featured() from public;
create trigger prune_featured after delete on public.articles for each row execute function private.prune_featured();
create trigger prune_featured after delete on public.cases for each row execute function private.prune_featured();
create function public.dashboard_counts() returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'Not permitted' using errcode='42501'; end if;
  return jsonb_build_object('drafts',(select count(*) from public.articles where status='draft'),'published',(select count(*) from public.articles where status='published'),'pending',(select count(*) from public.submissions where status='pending'),'cases',(select count(*) from public.cases));
end $$;
revoke all on function public.dashboard_counts() from public;
grant execute on function public.dashboard_counts() to authenticated;
-- Public payloads cannot accidentally carry private contributor/account fields.
alter table public.articles add constraint article_payload_fields check(data - array['slug','title','summary','categoryId','categoryLabel','readingMinutes','sampleAuthor','featured','artwork','publicationLabel','body','status','fictional','authorId']::text[] = '{}'::jsonb);
alter table public.cases add constraint case_payload_fields check(data - array['slug','title','summary','categoryId','categoryLabel','featured','reference','kind','setting','tags','dateLabel','sourceNote','body','supportingDocuments','status','fictional','metadata']::text[] = '{}'::jsonb);
alter table public.team_profiles add constraint team_payload_fields check(data - array['label','role','description','artwork','links','status','fictional']::text[] = '{}'::jsonb);
alter table public.homepage_settings add constraint homepage_payload_fields check(data - array['hero','sections','contact','socialLinks','featuredArticleIds','featuredCaseIds','fictional']::text[] = '{}'::jsonb);
alter table public.submissions add constraint submission_payload_fields check(data - array['title','excerpt','author','body','fictional']::text[] = '{}'::jsonb);
create function public.backend_project_marker() returns text language sql immutable security invoker set search_path = '' as $$select 'dilraj-editorial-v1'::text$$;
revoke all on function public.backend_project_marker() from public;
grant execute on function public.backend_project_marker() to anon, authenticated, service_role;
-- Review/conversion only through the narrow audited RPCs, never raw browser writes.
revoke insert, update, delete on public.submissions, public.submission_attachments, public.content_activity from authenticated;
commit;
