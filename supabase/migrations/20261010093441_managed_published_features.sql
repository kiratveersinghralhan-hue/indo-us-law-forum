-- Reuse existing feature flags, ordered homepage IDs and cover_asset_id.
-- Local preparation only. Existing RLS and narrow staff RPC grants are retained.
begin;

update public.homepage_settings h set data = jsonb_set(h.data, '{featuredArticleIds}',
  coalesce((select jsonb_agg(x.value order by x.ordinality)
    from jsonb_array_elements(h.data->'featuredArticleIds') with ordinality x(value, ordinality)
    where exists(select 1 from public.articles a where a.id::text=x.value #>> '{}' and a.status='published')), '[]'::jsonb))
where id;
update public.articles a set featured = a.status='published' and coalesce(
  (select (h.data->'featuredArticleIds') ? a.id::text from public.homepage_settings h where h.id), false);

create function private.validate_featured_articles() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(new.data->'featuredArticleIds') is distinct from 'array' then
    raise exception 'Featured articles must be an ordered array';
  end if;
  if (select count(*) <> count(distinct x) from jsonb_array_elements_text(new.data->'featuredArticleIds') x)
     or exists(select 1 from jsonb_array_elements_text(new.data->'featuredArticleIds') x
       where not exists(select 1 from public.articles a where a.id::text=x and a.status='published')) then
    raise exception 'Only distinct published articles may be featured';
  end if;
  return new;
end $$;
revoke all on function private.validate_featured_articles() from public, anon, authenticated;
create trigger validate_featured_articles before insert or update on public.homepage_settings
for each row execute function private.validate_featured_articles();

create function private.normalize_article_feature() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status <> 'published' then new.featured=false; end if;
  return new;
end $$;
revoke all on function private.normalize_article_feature() from public, anon, authenticated;
create trigger normalize_article_feature before insert or update on public.articles
for each row execute function private.normalize_article_feature();
alter table public.articles add constraint featured_articles_published check(not featured or status='published');

-- Internal trigger must maintain the public settings when a record changes.
-- No external caller can execute it; arbitrary payloads still pass the staff
-- RPC/RLS, revision check and the validation trigger above.
create function private.sync_article_feature() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.featured and new.status='published' then
    update public.homepage_settings h set data=jsonb_set(h.data,'{featuredArticleIds}',
      (h.data->'featuredArticleIds') || jsonb_build_array(new.id::text))
      where h.id and not ((h.data->'featuredArticleIds') ? new.id::text);
  else
    update public.homepage_settings h set data=jsonb_set(h.data,'{featuredArticleIds}',
      coalesce((select jsonb_agg(x.value order by x.ordinality)
        from jsonb_array_elements(h.data->'featuredArticleIds') with ordinality x(value,ordinality)
        where x.value #>> '{}' <> new.id::text),'[]'::jsonb))
      where h.id and (h.data->'featuredArticleIds') ? new.id::text;
  end if;
  return new;
end $$;
revoke all on function private.sync_article_feature() from public, anon, authenticated;
create trigger sync_article_feature after insert or update of featured,status on public.articles
for each row execute function private.sync_article_feature();
commit;
