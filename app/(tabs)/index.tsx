import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-1">Your Carbon Dashboard</Text>
        <Text className="text-gray-500 mb-6">{user?.email}</Text>

        {/* Summary cards placeholder */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-500 text-xs mb-1">This Month</Text>
            <Text className="text-2xl font-bold text-brand-700">—</Text>
            <Text className="text-gray-400 text-xs">kg CO₂</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-500 text-xs mb-1">Credits</Text>
            <Text className="text-2xl font-bold text-brand-700">—</Text>
            <Text className="text-gray-400 text-xs">available</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-2">Recent Activity</Text>
          <Text className="text-gray-400 text-sm">No activity yet — start tracking to see your impact.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
