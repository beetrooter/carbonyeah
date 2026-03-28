import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Trade() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-2xl font-bold text-gray-900 mb-6">Trade Credits</Text>
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-gray-400 text-sm">Carbon credit trading coming soon.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
