import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function Profile() {
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Profile</Text>

        <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <Text className="text-gray-500 text-xs mb-1">Email</Text>
          <Text className="text-gray-900">{user?.email}</Text>
        </View>

        <TouchableOpacity
          className="bg-red-50 border border-red-100 rounded-2xl py-4 items-center"
          onPress={handleSignOut}
        >
          <Text className="text-red-600 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
