import { supabase } from './supabase';

export type EmissionCategory = 'Travel' | 'Energy' | 'Food' | 'Other';

export type EmissionFactor = {
  id: string;
  category: EmissionCategory;
  subcategory: string;
  activity: string;
  kg_co2e_per_unit: number;
  unit: string;
};

export type NewEmissionLog = {
  category: EmissionCategory;
  subcategory: string;
  description: string;
  quantity: number;
  unit: string;
  kg_co2e: number;
  data_source?: string;
  external_ref?: string;
};

// ─── Lookup table calculation (v1.0) ────────────────────────────────────────

export async function getEmissionFactors(
  category?: EmissionCategory,
): Promise<EmissionFactor[]> {
  let query = supabase.from('emission_factors').select('*').order('category').order('subcategory');
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) throw error;
  return data as EmissionFactor[];
}

export function calculateKgCo2e(factor: EmissionFactor, quantity: number): number {
  return factor.kg_co2e_per_unit * quantity;
}

// ─── v1.1 placeholders — swap these for real integrations ───────────────────

/**
 * PLACEHOLDER: parse a natural-language / voice description and return the
 * best-matching emission factor + estimated quantity.
 * v1.1: call an LLM or NLP service here.
 */
export async function estimateFromDescription(
  _description: string,
): Promise<{ factor: EmissionFactor; quantity: number } | null> {
  return null;
}

/**
 * PLACEHOLDER: pull transactions from a connected bank feed and convert
 * eligible ones into emission logs.
 * v1.1: integrate Open Banking / Plaid / TrueLayer here.
 */
export async function importFromBankFeed(
  _userId: string,
): Promise<NewEmissionLog[]> {
  return [];
}

/**
 * PLACEHOLDER: pull trips from a connected travel app (e.g. TripIt, Google
 * Maps Timeline) and convert them into emission logs.
 * v1.1: integrate travel API here.
 */
export async function importFromTravelApp(
  _userId: string,
): Promise<NewEmissionLog[]> {
  return [];
}

/**
 * PLACEHOLDER: use device motion / GPS data to detect travel mode and distance.
 * v1.1: integrate Expo Location + activity recognition here.
 */
export async function importFromMotionData(
  _userId: string,
): Promise<NewEmissionLog[]> {
  return [];
}

// ─── Log an emission entry ───────────────────────────────────────────────────

export async function logEmission(
  userId: string,
  entry: NewEmissionLog,
): Promise<void> {
  const { error } = await supabase.from('emission_logs').insert({
    user_id: userId,
    ...entry,
    data_source: entry.data_source ?? 'manual',
  });
  if (error) throw error;
}

// ─── Dashboard queries ───────────────────────────────────────────────────────

export async function getEmissionsForPeriod(
  userId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const { data, error } = await supabase
    .from('emission_logs')
    .select('kg_co2e')
    .eq('user_id', userId)
    .gte('logged_at', from.toISOString())
    .lte('logged_at', to.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.kg_co2e as number), 0);
}

export async function getCommunityEmissionsForPeriod(
  communityId: string,
  from: Date,
  to: Date,
): Promise<number> {
  // Sum emissions of all members of this community for the period
  const { data: members, error: memberError } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId);
  if (memberError) throw memberError;

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (memberIds.length === 0) return 0;

  const { data, error } = await supabase
    .from('emission_logs')
    .select('kg_co2e')
    .in('user_id', memberIds)
    .gte('logged_at', from.toISOString())
    .lte('logged_at', to.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.kg_co2e as number), 0);
}

export async function getCommunityMemberCount(communityId: string): Promise<number> {
  const { count, error } = await supabase
    .from('community_members')
    .select('*', { count: 'exact', head: true })
    .eq('community_id', communityId);
  if (error) throw error;
  return count ?? 0;
}

export async function getRecentLogs(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('emission_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
