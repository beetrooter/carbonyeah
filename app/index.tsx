import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const { session, loading } = useAuthStore();

  if (loading) return null;

  return <Redirect href={session ? '/(tabs)' : '/(auth)/sign-in'} />;
}
