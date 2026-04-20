import { supabase } from './supabase';

export type Community = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type MemberEmissions = {
  user_id: string;
  label: string;
  total_kg: number;
  by_category: Record<string, number>;
};

export async function getUserCommunities(userId: string): Promise<Community[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });
  if (memberError) throw memberError;

  const ids = (memberships ?? []).map((m) => m.community_id as string);
  if (ids.length === 0) return [];

  const { data: communities, error: commError } = await supabase
    .from('communities')
    .select('id, name, created_by, created_at')
    .in('id', ids);
  if (commError) throw commError;

  // Preserve join order
  const map = Object.fromEntries((communities ?? []).map((c) => [c.id, c]));
  return ids.map((id) => map[id]).filter(Boolean) as Community[];
}

export async function createCommunity(name: string, userId: string): Promise<Community> {
  const { data: community, error: createError } = await supabase
    .from('communities')
    .insert({ name, created_by: userId })
    .select()
    .single();
  if (createError) throw createError;

  const { error: joinError } = await supabase
    .from('community_members')
    .insert({ community_id: community.id, user_id: userId });
  if (joinError) throw joinError;

  return community as Community;
}

export async function getCommunityById(communityId: string): Promise<Community | null> {
  const { data, error } = await supabase
    .from('communities')
    .select('id, name, created_by, created_at')
    .eq('id', communityId)
    .single();
  if (error) return null;
  return data as Community;
}

export async function isAlreadyMember(communityId: string, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

export async function joinCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .insert({ community_id: communityId, user_id: userId });
  if (error) throw error;
}

export async function getCommunityMemberEmissions(
  communityId: string,
  from: Date,
  to: Date,
  currentUserId: string,
): Promise<MemberEmissions[]> {
  const { data: members, error: membersError } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId);
  if (membersError) throw membersError;

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (memberIds.length === 0) return [];

  const { data: logs, error: logsError } = await supabase
    .from('emission_logs')
    .select('user_id, category, kg_co2e')
    .in('user_id', memberIds)
    .gte('logged_at', from.toISOString())
    .lte('logged_at', to.toISOString());
  if (logsError) throw logsError;

  // Aggregate per member, per category
  const map: Record<string, MemberEmissions> = {};
  let memberIndex = 1;
  for (const memberId of memberIds) {
    map[memberId] = {
      user_id: memberId,
      label: memberId === currentUserId ? 'You' : `Member ${memberIndex++}`,
      total_kg: 0,
      by_category: { Travel: 0, Energy: 0, Food: 0, Other: 0 },
    };
  }

  for (const log of logs ?? []) {
    const entry = map[log.user_id as string];
    if (!entry) continue;
    const cat = (log.category as string) in entry.by_category ? log.category as string : 'Other';
    entry.by_category[cat] += log.kg_co2e as number;
    entry.total_kg += log.kg_co2e as number;
  }

  return Object.values(map).sort((a, b) => {
    if (a.label === 'You') return -1;
    if (b.label === 'You') return 1;
    return b.total_kg - a.total_kg;
  });
}
