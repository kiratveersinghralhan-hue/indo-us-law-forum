-- Dedicated local transaction fixtures; not run against a remote project.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id) values ('a1111111-1111-4111-8111-111111111111'),('a2222222-2222-4222-8222-222222222222');
insert into private.staff_accounts(user_id,role) values('a2222222-2222-4222-8222-222222222222','editor');
insert into public.categories(id,label,published) values('a3333333-3333-4333-8333-333333333333','LOCAL FEATURE TEST',true);
insert into public.authors(id,label,published) values('a4444444-4444-4444-8444-444444444444','LOCAL AUTHOR TEST',true);
insert into public.editorial_assets(id,path,bucket,label,mime,bytes) values
('a5555555-5555-4555-8555-555555555555','a2222222-2222-4222-8222-222222222222/a5555555-5555-4555-8555-555555555555.png','editorial-images','LOCAL FEATURE COVER','image/png',8);
insert into public.articles(id,slug,category_id,author_id,cover_asset_id,status,data) values
('a6666666-6666-4666-8666-666666666666','local-feature-published','a3333333-3333-4333-8333-333333333333','a4444444-4444-4444-8444-444444444444','a5555555-5555-4555-8555-555555555555','published','{"title":"Local feature test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}'),
('a6666666-6666-4666-8666-666666666667','local-feature-draft','a3333333-3333-4333-8333-333333333333',null,null,'draft','{"title":"Local draft test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}');
insert into public.homepage_settings(id,published,data) values(true,true,'{"hero":{"eyebrow":"Local test","lines":["Local","test","only"],"introduction":"Local test"},"sections":[{"id":"focus","visible":true,"label":"Local"},{"id":"featured","visible":true,"label":"Local"},{"id":"repository","visible":true,"label":"Local"},{"id":"team","visible":true,"label":"Local"},{"id":"contribution","visible":true,"label":"Local"}],"contact":{"email":"","address":""},"socialLinks":[],"featuredArticleIds":[],"featuredCaseIds":[],"fictional":false}')
on conflict(id) do update set data=excluded.data,published=true;

set local role anon;
select is((select count(*)::integer from articles where slug like 'local-feature-%'),1,'Anonymous cannot read featured draft metadata');
select throws_ok($$update homepage_settings set data=jsonb_set(data,'{featuredArticleIds}','[]')$$,'42501',null,'Anonymous cannot manage features');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
select throws_ok($$select save_homepage('{}')$$,'42501',null,'Ordinary users cannot call staff feature management');
select is_empty($$update homepage_settings set published=false where id returning id$$,'Ordinary users cannot bypass the RPC through direct settings writes');
select set_config('request.jwt.claim.sub','a2222222-2222-4222-8222-222222222222',true);
select lives_ok($$update articles set featured=true where slug='local-feature-published'$$,'Staff can select a published article');
select is((select data->'featuredArticleIds' from homepage_settings where id),'["a6666666-6666-4666-8666-666666666666"]'::jsonb,'Article feature flag updates the shared ordered source');
select throws_ok($$update homepage_settings set data=jsonb_set(data,'{featuredArticleIds}','["a6666666-6666-4666-8666-666666666667"]')$$,'P0001','Only distinct published articles may be featured','A draft cannot be selected through direct settings writes');
select throws_ok($$update homepage_settings set data=jsonb_set(data,'{featuredArticleIds}','["a6666666-6666-4666-8666-666666666666","a6666666-6666-4666-8666-666666666666"]')$$,'P0001','Only distinct published articles may be featured','Duplicate covers are rejected');
select lives_ok($$update articles set status='draft' where slug='local-feature-published'$$,'Staff may unpublish featured content');
select is((select data->'featuredArticleIds' from homepage_settings where id),'[]'::jsonb,'Unpublishing prunes the shared feature source');
select is((select featured from articles where slug='local-feature-published'),false,'Unpublished article is no longer flagged as featured');
select lives_ok($$update articles set status='published',featured=true where slug='local-feature-published'$$,'Staff may explicitly reselect after republishing');
select lives_ok($$delete from articles where slug='local-feature-published'$$,'Staff may delete featured content');
select is((select data->'featuredArticleIds' from homepage_settings where id),'[]'::jsonb,'Deletion prunes the feature source');
reset role;
select * from finish();
rollback;
