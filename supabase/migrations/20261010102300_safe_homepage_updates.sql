-- The hosted Data API loads safeupdate. Feature synchronization must use an
-- explicit predicate and need not rewrite/audit unchanged content rows.
begin;
create or replace function public.save_homepage(payload jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
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
  update public.articles a set featured=(payload->'featuredArticleIds') ? a.id::text
    where a.featured is distinct from ((payload->'featuredArticleIds') ? a.id::text);
  update public.cases c set featured=(payload->'featuredCaseIds') ? c.id::text
    where c.featured is distinct from ((payload->'featuredCaseIds') ? c.id::text);
end $$;
revoke all on function public.save_homepage(jsonb) from public, anon;
grant execute on function public.save_homepage(jsonb) to authenticated;
commit;
