import { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/build/useFocusEffect';
import { useAuthStore } from '@/store/auth';
import {
  getEmissionsForPeriod,
  getCommunityEmissionsForPeriod,
  getCommunityMemberCount,
  getRecentLogs,
} from '@/lib/emissions';
import { supabase } from '@/lib/supabase';

const ANNUAL_ALLOCATION_KG = 2000;
const MONTHLY_ALLOCATION_KG = ANNUAL_ALLOCATION_KG / 12;
const DONUT_SIZE = 120;
const HOLE_SIZE = DONUT_SIZE * 0.72;

function donutColor(ratio: number): string {
  if (ratio >= 1) return '#ef4444';
  if (ratio >= 0.75) return '#f59e0b';
  return '#22c55e';
}

function Donut({ ratio, hasData }: { ratio: number; hasData: boolean }) {
  const clampedRatio = Math.min(ratio, 1);
  const fillPct = hasData ? clampedRatio * 100 : 0;
  const color = donutColor(ratio);
  const track = '#e5e7eb';
  const gradient = hasData
    ? `conic-gradient(from -90deg, ${color} ${fillPct}%, ${track} ${fillPct}%)`
    : `conic-gradient(from -90deg, ${track} 100%)`;

  return (
    <View style={{ width: DONUT_SIZE, height: DONUT_SIZE, borderRadius: DONUT_SIZE / 2, overflow: 'hidden' }}>
      {/* @ts-ignore */}
      <View style={{ width: DONUT_SIZE, height: DONUT_SIZE, backgroundImage: gradient }} />
      <View style={{
        position: 'absolute',
        width: HOLE_SIZE, height: HOLE_SIZE,
        borderRadius: HOLE_SIZE / 2,
        backgroundColor: '#ffffff',
        top: (DONUT_SIZE - HOLE_SIZE) / 2,
        left: (DONUT_SIZE - HOLE_SIZE) / 2,
      }} />
    </View>
  );
}

function AllocationPanel({
  title, subtitle, usedKg, allocatedKg,
}: {
  title: string; subtitle: string; usedKg: number | null; allocatedKg: number;
}) {
  const hasData = usedKg !== null;
  const ratio = hasData ? (usedKg as number) / allocatedKg : 0;
  const remaining = allocatedKg - (usedKg ?? 0);
  const color = donutColor(ratio);
  const statusText = !hasData
    ? `${allocatedKg.toFixed(0)} kg allocated`
    : ratio >= 1
      ? `${Math.abs(remaining).toFixed(0)} kg over`
      : `${remaining.toFixed(0)} kg left`;

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm mb-3 items-center">
      <Text className="text-gray-700 font-semibold text-base mb-0.5">{title}</Text>
      <Text className="text-gray-400 text-xs mb-3">{subtitle}</Text>
      <View style={{ position: 'relative', width: DONUT_SIZE, height: DONUT_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Donut ratio={ratio} hasData={hasData} />
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: hasData ? color : '#9ca3af' }}>
            {hasData ? (usedKg as number).toFixed(0) : '—'}
          </Text>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>kg CO₂e</Text>
        </View>
      </View>
      <Text className="text-xs mt-3" style={{ color: hasData ? color : '#9ca3af' }}>
        {statusText}
      </Text>
    </View>
  );
}

type RecentLog = {
  id: string;
  category: string;
  description: string;
  kg_co2e: number;
  logged_at: string;
};

const CATEGORY_ICON: Record<string, string> = {
  Travel: '✈️', Energy: '⚡', Food: '🍽️', Other: '📦',
};

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const [thisMonthKg, setThisMonthKg] = useState<number | null>(null);
  const [thisYearKg, setThisYearKg] = useState<number | null>(null);
  const [communityUsedKg, setCommunityUsedKg] = useState<number | null>(null);
  const [communityAllocatedKg, setCommunityAllocatedKg] = useState(ANNUAL_ALLOCATION_KG);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) loadDashboard();
    }, [user]),
  );

  async function loadDashboard() {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const [monthKg, yearKg, logs] = await Promise.all([
        getEmissionsForPeriod(user.id, monthStart, now),
        getEmissionsForPeriod(user.id, yearStart, now),
        getRecentLogs(user.id, 5),
      ]);

      setThisMonthKg(monthKg);
      setThisYearKg(yearKg);
      setRecentLogs(logs as RecentLog[]);

      // Load primary community (first one the user belongs to)
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id, communities(name)')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberships) {
        const cId = memberships.community_id as string;
        const cName = (memberships.communities as unknown as { name: string } | null)?.name ?? null;
        setCommunityName(cName);

        const [commKg, memberCount] = await Promise.all([
          getCommunityEmissionsForPeriod(cId, yearStart, now),
          getCommunityMemberCount(cId),
        ]);
        setCommunityUsedKg(commKg);
        setCommunityAllocatedKg(ANNUAL_ALLOCATION_KG * Math.max(memberCount, 1));
      }
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const year = now.getFullYear();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-1">Carbon Dashboard</Text>
        <Text className="text-gray-400 text-sm mb-6">{user?.email}</Text>

        {loading ? (
          <ActivityIndicator color="#22c55e" className="mt-10" />
        ) : (
          <>
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <AllocationPanel
                  title={monthName}
                  subtitle="This month"
                  usedKg={thisMonthKg === 0 ? null : thisMonthKg}
                  allocatedKg={MONTHLY_ALLOCATION_KG}
                />
              </View>
              <View className="flex-1">
                <AllocationPanel
                  title={String(year)}
                  subtitle="This year"
                  usedKg={thisYearKg === 0 ? null : thisYearKg}
                  allocatedKg={ANNUAL_ALLOCATION_KG}
                />
              </View>
            </View>

            <AllocationPanel
              title={communityName ?? 'My Community'}
              subtitle="Community emissions this year"
              usedKg={communityUsedKg === 0 ? null : communityUsedKg}
              allocatedKg={communityAllocatedKg}
            />

            <View className="bg-white rounded-2xl p-4 shadow-sm mt-1 mb-8">
              <Text className="text-gray-700 font-semibold mb-3">Recent Activity</Text>
              {recentLogs.length === 0 ? (
                <Text className="text-gray-400 text-sm">No activity yet — start tracking to see your impact.</Text>
              ) : (
                recentLogs.map((log) => (
                  <TouchableOpacity
                    key={log.id}
                    onPress={() => router.push({ pathname: '/edit-log', params: { id: log.id } })}
                    className="flex-row items-center py-2 border-b border-gray-50"
                  >
                    <Text className="text-lg mr-3">{CATEGORY_ICON[log.category] ?? '📦'}</Text>
                    <View className="flex-1">
                      <Text className="text-gray-700 text-sm" numberOfLines={1}>{log.description}</Text>
                      <Text className="text-gray-400 text-xs">
                        {new Date(log.logged_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className="text-gray-600 text-sm font-medium">{log.kg_co2e.toFixed(1)} kg</Text>
                    <Text className="text-gray-300 text-xs ml-2">›</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      {/* Floating action button */}
      <TouchableOpacity
        onPress={() => router.push('/log')}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: '#16a34a',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Text style={{ color: 'white', fontSize: 28, lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
