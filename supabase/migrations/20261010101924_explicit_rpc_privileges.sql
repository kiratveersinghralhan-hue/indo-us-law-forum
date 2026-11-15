-- Hosted defaults separately grant EXECUTE to anon/authenticated, so revoking
-- PUBLIC alone does not remove those explicit grants. Preserve staff guards.
begin;
revoke all on function public.staff_role(),
  public.review_submission(uuid,text), public.convert_submission(uuid),
  public.save_homepage(jsonb), public.reorder_content(text,uuid[]),
  public.dashboard_counts() from public, anon;
grant execute on function public.staff_role(),
  public.review_submission(uuid,text), public.convert_submission(uuid),
  public.save_homepage(jsonb), public.reorder_content(text,uuid[]),
  public.dashboard_counts() to authenticated;

-- Supabase's pre-existing event trigger is internal infrastructure, not an RPC.
-- Keep the trigger/function intact and remove only external execution grants.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- New application functions must choose their callers explicitly. PostgreSQL's
-- global PUBLIC default must be revoked globally; per-schema REVOKE alone
-- cannot subtract that inherited global grant. Existing grants are unchanged.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
commit;
