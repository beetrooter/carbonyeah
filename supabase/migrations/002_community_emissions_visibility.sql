-- ============================================================
-- 002_community_emissions_visibility.sql
-- Allow community members to view each other's emission logs
-- so the community breakdown chart can show per-member data.
-- ============================================================

-- Replace the self-only select policy with one that also
-- grants read access to fellow community members.
drop policy if exists "emission_logs_select" on emission_logs;

create policy "emission_logs_select" on emission_logs
  for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from community_members cm1
      join community_members cm2 on cm1.community_id = cm2.community_id
      where cm1.user_id = emission_logs.user_id
        and cm2.user_id = auth.uid()
    )
  );
