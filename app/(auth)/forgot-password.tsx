import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function ForgotPassword() {
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    setError(null);
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <View className="flex-1 bg-white justify-center px-6 items-center">
        <Text className="text-2xl font-bold text-brand-700 mb-3">Check your email</Text>
        <Text className="text-gray-500 text-center mb-6">
          We sent a password reset link to {email}.
        </Text>
        <Link href="/(auth)/sign-in" className="text-brand-600 font-semibold">
          Back to sign in
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-brand-700 mb-2">Reset password</Text>
        <Text className="text-gray-500 mb-8">
          Enter your email and we'll send you a reset link.
        </Text>

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 mb-6 text-base"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TouchableOpacity
          className="bg-brand-600 rounded-xl py-4 items-center"
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500">Remembered it? </Text>
          <Link href="/(auth)/sign-in" className="text-brand-600 font-semibold">
            Sign in
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
