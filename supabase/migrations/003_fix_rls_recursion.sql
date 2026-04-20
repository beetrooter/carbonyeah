-- ============================================================
-- 003_fix_rls_recursion.sql
-- Fix infinite RLS recursion on community_members.
--
-- The original community_members_select policy used a self-join
-- on community_members inside its own USING clause. PostgreSQL
-- re-applies RLS to that subquery, causing infinite recursion
-- and a 500 error from Supabase.
--
-- Fix: a SECURITY DEFINER helper function that bypasses RLS to
-- fetch the current user's community IDs. Both affected policies
-- call this function instead of querying the table directly.
-- ============================================================

-- Helper: returns the community IDs the current user belongs to.
-- SECURITY DEFINER means it runs as the function owner (bypasses RLS)
-- so it never triggers community_members policies recursively.
create or replace function public.get_my_community_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select community_id from community_members where user_id = auth.uid();
$$;

-- Fix community_members_select: drop the self-join, use the helper instead.
drop policy if exists "community_members_select" on community_members;
create policy "community_members_select" on community_members
  for select using (
    user_id = auth.uid()
    or community_id in (select public.get_my_community_ids())
  );

-- Re-apply the emission_logs policy from 002, also using the helper
-- so it doesn't trigger the old recursive community_members policy.
drop policy if exists "emission_logs_select" on emission_logs;
create policy "emission_logs_select" on emission_logs
  for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from community_members cm
      where cm.user_id  = emission_logs.user_id
        and cm.community_id in (select public.get_my_community_ids())
    )
  );
