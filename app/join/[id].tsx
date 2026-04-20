import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import {
  getCommunityById, joinCommunity, isAlreadyMember, type Community,
} from '@/lib/communities';

type State = 'loading' | 'not_found' | 'already_member' | 'ready' | 'joining' | 'done' | 'error';

export default function JoinCommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [community, setCommunity] = useState<Community | null>(null);
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) {
      // Store the target URL and send to sign-in — expo-router will restore it
      router.replace({ pathname: '/sign-in', params: { next: `/join/${id}` } });
      return;
    }
    load();
  }, [user, id]);

  async function load() {
    if (!id || !user) return;
    const [comm, member] = await Promise.all([
      getCommunityById(id),
      isAlreadyMember(id, user.id),
    ]);
    if (!comm) { setState('not_found'); return; }
    setCommunity(comm);
    setState(member ? 'already_member' : 'ready');
  }

  async function handleJoin() {
    if (!user || !community) return;
    setState('joining');
    try {
      await joinCommunity(community.id, user.id);
      setState('done');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not join community');
      setState('error');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-8">
      {state === 'loading' && (
        <ActivityIndicator color="#22c55e" size="large" />
      )}

      {state === 'not_found' && (
        <View className="items-center">
          <Text className="text-4xl mb-4">🤔</Text>
          <Text className="text-gray-900 font-bold text-lg mb-2">Community not found</Text>
          <Text className="text-gray-400 text-sm text-center mb-6">
            This invite link may be invalid or expired.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/')} className="bg-green-600 px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold">Go to dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      {(state === 'ready' || state === 'joining') && community && (
        <View className="items-center w-full">
          <Text className="text-4xl mb-4">🌱</Text>
          <Text className="text-gray-500 text-sm mb-1">You've been invited to join</Text>
          <Text className="text-gray-900 font-bold text-2xl text-center mb-6">{community.name}</Text>
          <TouchableOpacity
            onPress={handleJoin}
            disabled={state === 'joining'}
            className="bg-green-600 w-full py-4 rounded-xl items-center"
            style={{ opacity: state === 'joining' ? 0.7 : 1 }}
          >
            {state === 'joining'
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold text-base">Join community</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/')} className="mt-4">
            <Text className="text-gray-400 text-sm">Not now</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'already_member' && community && (
        <View className="items-center">
          <Text className="text-4xl mb-4">✅</Text>
          <Text className="text-gray-900 font-bold text-lg mb-2">You're already a member</Text>
          <Text className="text-gray-400 text-sm text-center mb-6">
            You already belong to <Text className="font-semibold text-gray-600">{community.name}</Text>.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/community')} className="bg-green-600 px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold">View community</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'done' && community && (
        <View className="items-center">
          <Text className="text-4xl mb-4">🎉</Text>
          <Text className="text-gray-900 font-bold text-lg mb-2">You've joined!</Text>
          <Text className="text-gray-400 text-sm text-center mb-6">
            Welcome to <Text className="font-semibold text-gray-600">{community.name}</Text>.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/community')} className="bg-green-600 px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold">View community</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'error' && (
        <View className="items-center">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-gray-900 font-bold text-lg mb-2">Something went wrong</Text>
          <Text className="text-gray-400 text-sm text-center mb-6">{errorMsg}</Text>
          <TouchableOpacity onPress={load} className="bg-green-600 px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold">Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
