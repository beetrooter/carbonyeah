import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router/build/useFocusEffect';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '@/store/auth';
import {
  getUserCommunities, createCommunity, joinCommunity,
  getCommunityMemberEmissions, type Community, type MemberEmissions,
} from '@/lib/communities';
import { getCommunityEmissionsForPeriod, getCommunityMemberCount } from '@/lib/emissions';

const ANNUAL_ALLOCATION_KG = 2000;

const CATEGORY_COLORS: Record<string, string> = {
  Travel: '#3b82f6',
  Energy: '#f97316',
  Food:   '#22c55e',
  Other:  '#8b5cf6',
};

const CATEGORIES = ['Travel', 'Energy', 'Food', 'Other'] as const;

function getInviteUrl(communityId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/join/${communityId}`;
  }
  return `carbonyeah://join/${communityId}`;
}

// ─── Stacked bar chart ────────────────────────────────────────────────────────

function StackedBar({ member, maxKg }: { member: MemberEmissions; maxKg: number }) {
  const barWidthPct = maxKg > 0 ? (member.total_kg / maxKg) * 100 : 0;
  const isYou = member.label === 'You';

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className={`text-xs font-medium ${isYou ? 'text-green-700' : 'text-gray-600'}`}>
          {member.label}
        </Text>
        <Text className="text-xs text-gray-400">
          {member.total_kg > 0 ? `${member.total_kg.toFixed(1)} kg` : '—'}
        </Text>
      </View>
      <View className="h-5 bg-gray-100 rounded-full overflow-hidden flex-row">
        {member.total_kg > 0 ? (
          // @ts-ignore — width% works on web
          <View style={{ width: `${barWidthPct}%`, flexDirection: 'row', overflow: 'hidden', borderRadius: 999 }}>
            {CATEGORIES.map((cat) => {
              const catPct = member.total_kg > 0
                ? (member.by_category[cat] / member.total_kg) * 100
                : 0;
              if (catPct === 0) return null;
              return (
                <View
                  key={cat}
                  style={{ width: `${catPct}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function CategoryLegend() {
  return (
    <View className="flex-row flex-wrap gap-3 mb-4">
      {CATEGORIES.map((cat) => (
        <View key={cat} className="flex-row items-center gap-1">
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: CATEGORY_COLORS[cat] }} />
          <Text className="text-xs text-gray-500">{cat}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({
  community,
  onClose,
}: {
  community: Community;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = getInviteUrl(community.id);

  function copyLink() {
    Clipboard.setString(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <View className="bg-white rounded-t-3xl p-6 shadow-lg">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-xl font-bold text-gray-900">Invite to {community.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-400 text-base">Done</Text>
            </TouchableOpacity>
          </View>

          {/* QR code */}
          <View className="items-center mb-5">
            <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <QRCode value={url} size={180} />
            </View>
            <Text className="text-gray-400 text-xs mt-3">Scan to join</Text>
          </View>

          {/* Link + copy */}
          <Text className="text-xs text-gray-500 mb-2">Or share this link</Text>
          <View className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 mb-4">
            <Text className="flex-1 text-gray-600 text-xs font-mono" numberOfLines={1}>
              {url}
            </Text>
            <TouchableOpacity
              onPress={copyLink}
              className="ml-2 bg-green-600 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-white text-xs font-semibold">
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-gray-300 text-center">
            Anyone with this link can join your community.
          </Text>
          <View className="h-4" />
        </View>
      </View>
    </Modal>
  );
}

// ─── Community detail card ────────────────────────────────────────────────────

function CommunityCard({
  community, currentUserId, yearStart, now,
}: {
  community: Community;
  currentUserId: string;
  yearStart: Date;
  now: Date;
}) {
  const [members, setMembers] = useState<MemberEmissions[]>([]);
  const [totalKg, setTotalKg] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [community.id]),
  );

  async function load() {
    setLoading(true);
    try {
      const [memberEmissions, commKg, count] = await Promise.all([
        getCommunityMemberEmissions(community.id, yearStart, now, currentUserId),
        getCommunityEmissionsForPeriod(community.id, yearStart, now),
        getCommunityMemberCount(community.id),
      ]);
      setMembers(memberEmissions);
      setTotalKg(commKg);
      setMemberCount(count);
    } finally {
      setLoading(false);
    }
  }

  const allocated = ANNUAL_ALLOCATION_KG * Math.max(memberCount, 1);
  const usedPct = allocated > 0 ? Math.min((totalKg / allocated) * 100, 100) : 0;
  const barColor = usedPct >= 100 ? '#ef4444' : usedPct >= 75 ? '#f59e0b' : '#22c55e';
  const maxMemberKg = Math.max(...members.map((m) => m.total_kg), 1);
  const hasData = totalKg > 0;

  return (
    <>
      <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900">{community.name}</Text>
            <Text className="text-xs text-gray-400">{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setShowInvite(true)}
              className="bg-gray-100 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-gray-600 text-xs font-medium">Invite</Text>
            </TouchableOpacity>
            <View className="items-end">
              <Text className="text-sm font-semibold" style={{ color: barColor }}>
                {hasData ? `${totalKg.toFixed(0)} kg` : '—'}
              </Text>
              <Text className="text-xs text-gray-400">of {allocated.toFixed(0)} kg</Text>
            </View>
          </View>
        </View>

        {/* Community progress bar */}
        <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          {hasData && (
            // @ts-ignore
            <View style={{ width: `${usedPct}%`, backgroundColor: barColor, height: '100%', borderRadius: 999 }} />
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#22c55e" className="my-4" />
        ) : members.length === 0 ? (
          <Text className="text-gray-400 text-sm">No emissions logged yet.</Text>
        ) : (
          <>
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Member breakdown — {new Date().getFullYear()}
            </Text>
            <CategoryLegend />
            {members.map((m) => (
              <StackedBar key={m.user_id} member={m} maxKg={maxMemberKg} />
            ))}
          </>
        )}
      </View>

      {showInvite && (
        <InviteModal community={community} onClose={() => setShowInvite(false)} />
      )}
    </>
  );
}

// ─── Create / Join modal ──────────────────────────────────────────────────────

function CommunityModal({
  visible, onClose, onCreated, userId,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  userId: string;
}) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCommunity(name.trim(), userId);
      setName('');
      onClose();
      onCreated();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not create community');
    } finally {
      setSaving(false);
    }
  }

  async function handleJoin() {
    if (!joinId.trim()) return;
    setSaving(true);
    try {
      await joinCommunity(joinId.trim(), userId);
      setJoinId('');
      onClose();
      onCreated();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not join community — check the ID');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
      >
        <View className="bg-white rounded-t-3xl p-6 shadow-lg">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-xl font-bold text-gray-900">Communities</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-400 text-base">Done</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-5">
            {(['create', 'join'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg items-center ${tab === t ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`text-sm font-medium ${tab === t ? 'text-gray-900' : 'text-gray-400'}`}>
                  {t === 'create' ? 'Create' : 'Join'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'create' ? (
            <>
              <Text className="text-sm text-gray-500 mb-2">Name your community</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Green Street Neighbours"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 text-base mb-4"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <TouchableOpacity
                onPress={handleCreate}
                disabled={saving || !name.trim()}
                className="bg-green-600 rounded-xl py-3.5 items-center"
                style={{ opacity: saving || !name.trim() ? 0.5 : 1 }}
              >
                <Text className="text-white font-semibold text-base">
                  {saving ? 'Creating…' : 'Create Community'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-sm text-gray-500 mb-2">Paste the community ID shared with you</Text>
              <TextInput
                value={joinId}
                onChangeText={setJoinId}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 text-sm mb-4"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleJoin}
              />
              <TouchableOpacity
                onPress={handleJoin}
                disabled={saving || !joinId.trim()}
                className="bg-green-600 rounded-xl py-3.5 items-center"
                style={{ opacity: saving || !joinId.trim() ? 0.5 : 1 }}
              >
                <Text className="text-white font-semibold text-base">
                  {saving ? 'Joining…' : 'Join Community'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View className="h-4" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const user = useAuthStore((s) => s.user);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  useFocusEffect(
    useCallback(() => {
      if (user) load();
    }, [user]),
  );

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserCommunities(user.id);
      setCommunities(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">Community</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-green-600 px-4 py-2 rounded-xl"
          >
            <Text className="text-white text-sm font-semibold">+ New</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#22c55e" className="mt-10" />
        ) : communities.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 shadow-sm items-center">
            <Text className="text-4xl mb-3">🌱</Text>
            <Text className="text-gray-700 font-semibold text-base mb-1">No communities yet</Text>
            <Text className="text-gray-400 text-sm text-center mb-5">
              Create a community to track your collective carbon footprint.
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="bg-green-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Create a community</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mb-8">
            {communities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                currentUserId={user!.id}
                yearStart={yearStart}
                now={now}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {user && (
        <CommunityModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onCreated={load}
          userId={user.id}
        />
      )}
    </SafeAreaView>
  );
}
