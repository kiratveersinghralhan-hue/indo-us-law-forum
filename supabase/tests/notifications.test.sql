-- LOCAL ONLY: prepared regression tests, no external email and rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();
select is((select count(*)::integer from public.categories where slug is not null),4,'Four exact confirmed slugs');
select is((select count(*)::integer from public.categories where slug is not null and published),0,'Migration never publishes taxonomy automatically');
select ok(not has_function_privilege('anon','public.accept_submission_with_notification(uuid,uuid,uuid,text,jsonb,text,text)','execute'),'Anonymous cannot accept or enqueue');
select ok(not has_function_privilege('authenticated','public.claim_submission_notification()','execute'),'Staff/browser cannot invoke server worker');
select ok(not has_table_privilege('authenticated','private.submission_notifications','select'),'Queue is private');
select is(public.claim_submission_notification(),null::jsonb,'Notification database gate starts disabled');
insert into public.categories(id,label,published) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','LOCAL QUEUE TEST',true);
update private.intake_settings set enabled=true, controls_verified=true where id;
select is(public.accept_submission_with_notification(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'local@example.invalid','{"title":"Local test","excerpt":"Local test","author":"Local test","body":[{"type":"paragraph","text":"Local test"}],"fictional":false}',null,repeat('a',64)
)->>'reference','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Acceptance records an original reference');
select is(public.accept_submission_with_notification(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'local@example.invalid','{"title":"Local test","excerpt":"Local test","author":"Local test","body":[{"type":"paragraph","text":"Local test"}],"fictional":false}',null,repeat('a',64)
)->>'reference','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Retry returns same reference, not another submission');
select is((select count(*)::integer from private.submission_notifications),1,'Retry creates no duplicate notification');
select throws_ok($$select public.accept_submission_with_notification('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','local@example.invalid','{}',null,repeat('b',64))$$,'P0001','Request conflict; contact an editor before retrying with new details','Changed retry is rejected');
update private.notification_settings set enabled=true where id;
create temporary table claimed as select public.claim_submission_notification() as job;
select is((select state from private.submission_notifications),'sending','Claim leases the job');
select is(public.claim_submission_notification(),null::jsonb,'Active lease excludes another worker');
select public.finish_submission_notification((job->>'reference')::uuid,(job->>'lease')::uuid,false,null,'transport',true) from claimed;
select is((select state from private.submission_notifications),'failed','Retryable failure is separate');
select is((select status from public.submissions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'pending','Email failure never removes/rejects acceptance');
select is((select converted_article_id from public.submissions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),null::uuid,'Acceptance never publishes or converts');
select * from finish();
rollback;
