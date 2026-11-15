-- Direct PostgreSQL/RLS tests, never a frontend security claim. LOCAL ONLY.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into private.staff_accounts(user_id,role) values('22222222-2222-4222-8222-222222222222','editor');
insert into public.categories(id,label,published) values('33333333-3333-4333-8333-333333333333','LOCAL TEST ONLY',true);
insert into public.authors(id,label,published) values('44444444-4444-4444-8444-444444444444','LOCAL TEST AUTHOR',true);
insert into public.editorial_assets(id,path,bucket,label,mime,bytes) values
('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555.png','editorial-images','LOCAL TEST IMAGE','image/png',8),
('55555555-5555-4555-8555-555555555556','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555556.png','editorial-images','LOCAL DRAFT IMAGE','image/png',8);
insert into public.articles(id,slug,category_id,author_id,cover_asset_id,status,data) values
('66666666-6666-4666-8666-666666666666','local-published','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','published','{"title":"Local test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}'),
('66666666-6666-4666-8666-666666666667','local-draft','33333333-3333-4333-8333-333333333333',null,'55555555-5555-4555-8555-555555555556','draft','{"title":"Local test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}');
insert into public.submissions(id,category_id,contact_email,request_id,data) values
('77777777-7777-4777-8777-777777777777','33333333-3333-4333-8333-333333333333','local-test@example.invalid','88888888-8888-4888-8888-888888888888','{"title":"Local intake test","excerpt":"Local test","author":"Local test","body":[{"type":"paragraph","text":"Local test"}]}');
insert into public.submission_attachments(submission_id,path,label) values('77777777-7777-4777-8777-777777777777','77777777-7777-4777-8777-777777777777/test.pdf','Local test');
insert into public.cases(id,slug,category_id,status,data) values
('99999999-9999-4999-8999-999999999991','local-case-published','33333333-3333-4333-8333-333333333333','published','{"title":"Local test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}'),
('99999999-9999-4999-8999-999999999992','local-case-draft','33333333-3333-4333-8333-333333333333','draft','{"title":"Local test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}');
insert into public.team_profiles(id,cover_asset_id,status,data) values
('99999999-9999-4999-8999-999999999993','55555555-5555-4555-8555-555555555555','published','{"label":"Local test","fictional":false}'),
('99999999-9999-4999-8999-999999999994','55555555-5555-4555-8555-555555555556','draft','{"label":"Local test","fictional":false}');
insert into public.editorial_assets(id,path,bucket,label,mime,bytes) values
('55555555-5555-4555-8555-555555555557','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555557.pdf','case-documents','LOCAL PUBLIC PDF','application/pdf',10),
('55555555-5555-4555-8555-555555555558','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555558.pdf','case-documents','LOCAL PRIVATE PDF','application/pdf',10);
insert into public.case_documents(case_id,asset_id,label,is_public) values
('99999999-9999-4999-8999-999999999991','55555555-5555-4555-8555-555555555557','Public local document',true),
('99999999-9999-4999-8999-999999999992','55555555-5555-4555-8555-555555555558','Draft local document',true);
insert into storage.objects(bucket_id,name) values
('editorial-images','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555.png'),
('editorial-images','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555556.png'),
('submission-attachments','77777777-7777-4777-8777-777777777777/test.pdf'),
('case-documents','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555557.pdf'),
('case-documents','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555558.pdf');

set local role anon;
select is((select count(*)::integer from articles),1,'Anonymous reads only published articles');
select is((select count(*)::integer from submissions),0,'Anonymous cannot read submissions');
select is((select count(*)::integer from submission_attachments),0,'Anonymous cannot read attachment metadata');
select is((select count(*)::integer from editorial_assets),2,'Only published image/PDF metadata is public');
select is((select count(*)::integer from cases),1,'Anonymous cannot read draft cases');
select is((select count(*)::integer from team_profiles),1,'Anonymous cannot read draft team profiles');
select is((select count(*)::integer from case_documents),1,'Draft-case document links remain private');
select is((select count(*)::integer from storage.objects where bucket_id='case-documents'),1,'Draft-case PDF objects remain private');
select is((select count(*)::integer from storage.objects where bucket_id='editorial-images'),1,'Draft cover object is private');
select is((select count(*)::integer from storage.objects where bucket_id='submission-attachments'),0,'Anonymous cannot read private objects');
select throws_ok($$insert into public.cases(id,slug,category_id,status,data) values
('99999999-9999-4999-8999-999999999991','local-case-published','33333333-3333-4333-8333-333333333333','published','{"title":"Local test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}'),
('99999999-9999-4999-8999-999999999992','local-case-draft','33333333-3333-4333-8333-333333333333','draft','{"title":"Local test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}');
insert into public.team_profiles(id,cover_asset_id,status,data) values
('99999999-9999-4999-8999-999999999993','55555555-5555-4555-8555-555555555555','published','{"label":"Local test","fictional":false}'),
('99999999-9999-4999-8999-999999999994','55555555-5555-4555-8555-555555555556','draft','{"label":"Local test","fictional":false}');
insert into public.editorial_assets(id,path,bucket,label,mime,bytes) values
('55555555-5555-4555-8555-555555555557','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555557.pdf','case-documents','LOCAL PUBLIC PDF','application/pdf',10),
('55555555-5555-4555-8555-555555555558','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555558.pdf','case-documents','LOCAL PRIVATE PDF','application/pdf',10);
insert into public.case_documents(case_id,asset_id,label,is_public) values
('99999999-9999-4999-8999-999999999991','55555555-5555-4555-8555-555555555557','Public local document',true),
('99999999-9999-4999-8999-999999999992','55555555-5555-4555-8555-555555555558','Draft local document',true);
insert into storage.objects(bucket_id,name) values('submission-attachments','anonymous/file.pdf')$$,'42501',null,'Anonymous upload is denied');
select throws_ok($$select public.convert_submission('77777777-7777-4777-8777-777777777777')$$,'42501',null,'Anonymous conversion is denied');
select is(public.intake_enabled(),false,'Intake is disabled by default');

reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
select is(public.staff_role(),null::text,'Ordinary authenticated account has no staff role');
select is((select count(*)::integer from articles),1,'Ordinary user cannot read drafts');
select is((select count(*)::integer from submissions),0,'Ordinary user cannot read submissions');
select is_empty($$update articles set status='draft' where slug='local-published' returning id$$,'Ordinary user cannot edit content');
select throws_ok($$insert into private.staff_accounts(user_id,role) values('11111111-1111-4111-8111-111111111111','admin')$$,'42501',null,'Users cannot self-assign staff');
select throws_ok($$select public.review_submission('77777777-7777-4777-8777-777777777777','approved')$$,'42501',null,'Ordinary user cannot review');
select throws_ok($$select public.consume_intake_limit(repeat('a',64))$$,'42501',null,'Browser cannot call service intake limiter');
select throws_ok($$insert into public.cases(id,slug,category_id,status,data) values
('99999999-9999-4999-8999-999999999991','local-case-published','33333333-3333-4333-8333-333333333333','published','{"title":"Local test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}'),
('99999999-9999-4999-8999-999999999992','local-case-draft','33333333-3333-4333-8333-333333333333','draft','{"title":"Local test","summary":"Local test","fictional":false,"body":[{"type":"paragraph","text":"Local test"}]}');
insert into public.team_profiles(id,cover_asset_id,status,data) values
('99999999-9999-4999-8999-999999999993','55555555-5555-4555-8555-555555555555','published','{"label":"Local test","fictional":false}'),
('99999999-9999-4999-8999-999999999994','55555555-5555-4555-8555-555555555556','draft','{"label":"Local test","fictional":false}');
insert into public.editorial_assets(id,path,bucket,label,mime,bytes) values
('55555555-5555-4555-8555-555555555557','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555557.pdf','case-documents','LOCAL PUBLIC PDF','application/pdf',10),
('55555555-5555-4555-8555-555555555558','22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555558.pdf','case-documents','LOCAL PRIVATE PDF','application/pdf',10);
insert into public.case_documents(case_id,asset_id,label,is_public) values
('99999999-9999-4999-8999-999999999991','55555555-5555-4555-8555-555555555557','Public local document',true),
('99999999-9999-4999-8999-999999999992','55555555-5555-4555-8555-555555555558','Draft local document',true);
insert into storage.objects(bucket_id,name) values('editorial-images','11111111-1111-4111-8111-111111111111/test.png')$$,'42501',null,'Ordinary user cannot upload editorial files');

reset role;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
set local role authenticated;
select is(public.staff_role(),'editor','Staff role is database-backed');
select is((select count(*)::integer from cases),2,'Staff can read draft cases');
select is((select count(*)::integer from team_profiles),2,'Staff can read draft team profiles');
select is((public.dashboard_counts()->>'cases')::integer,2,'Dashboard counts real case records');
select is((select count(*)::integer from articles),2,'Staff can read drafts');
select is((select count(*)::integer from submissions),1,'Staff can review private submissions');
select is((select count(*)::integer from storage.objects where bucket_id='submission-attachments'),1,'Staff can read private attachment objects');
select lives_ok($$update articles set data=jsonb_set(data,'{title}','"Updated local test"') where slug='local-draft'$$,'Staff can edit content');
select throws_ok($$update private.staff_accounts set role='admin'$$,'42501',null,'Editor cannot change staff grants');
select throws_ok($$update submissions set status='approved' returning id$$,'42501',null,'Direct submission mutation is denied; narrow review RPC required');
select throws_ok($$select public.convert_submission('77777777-7777-4777-8777-777777777777')$$,'P0001','Approve before converting','Unapproved submissions cannot convert');
select lives_ok($$select public.review_submission('77777777-7777-4777-8777-777777777777','approved')$$,'Staff can approve without publishing');
select lives_ok($$select public.convert_submission('77777777-7777-4777-8777-777777777777')$$,'Approved submission converts to draft');
select is(public.convert_submission('77777777-7777-4777-8777-777777777777'),(select converted_article_id from submissions limit 1),'Repeated conversion returns the same draft');
select is((select status from articles where id=(select converted_article_id from submissions limit 1)),'draft','Conversion never publishes');
delete from articles where id=(select converted_article_id from submissions limit 1);
select throws_ok($$select public.convert_submission('77777777-7777-4777-8777-777777777777')$$,'P0001','Converted article was removed; conversion cannot be repeated','Deletion preserves conversion tombstone');

reset role;
update private.staff_accounts set active=false where user_id='22222222-2222-4222-8222-222222222222';
set local role authenticated;
select is(public.staff_role(),null::text,'Revocation takes effect without replacing JWT');
select is((select count(*)::integer from submissions),0,'Revoked staff cannot read submissions');
select is((select count(*)::integer from articles),1,'Revoked staff cannot read drafts');
reset role;
select is((select public from storage.buckets where id='editorial-images'),false,'Editorial bucket cannot bypass RLS with public downloads');
select is((select file_size_limit::integer from storage.buckets where id='submission-attachments'),5242880,'Private attachment server size limit');
select * from finish();
rollback;
