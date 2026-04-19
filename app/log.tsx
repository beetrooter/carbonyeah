import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import {
  getEmissionFactors, calculateKgCo2e, logEmission,
  EmissionCategory, EmissionFactor,
} from '@/lib/emissions';
import { geocodePlace, haversineKm } from '@/lib/geocode';

const CATEGORIES: { key: EmissionCategory; icon: string }[] = [
  { key: 'Travel', icon: '✈️' },
  { key: 'Energy', icon: '⚡' },
  { key: 'Food',   icon: '🍽️' },
  { key: 'Other',  icon: '📦' },
];

const UNIT_LABEL: Record<string, string> = {
  km: 'Distance (km)',
  kWh: 'Energy used (kWh)',
  kg: 'Weight (kg)',
  hour: 'Duration (hours)',
  item: 'Number of items',
};

type Step = 'category' | 'activity' | 'detail';

export default function LogScreen() {
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<EmissionCategory | null>(null);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<EmissionFactor | null>(null);
  const [description, setDescription] = useState('');

  // For km-based activities
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [resolvedKm, setResolvedKm] = useState<number | null>(null);

  // For non-km activities
  const [quantity, setQuantity] = useState('');

  const [loadingFactors, setLoadingFactors] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDistanceBased = selectedFactor?.unit === 'km';
  const effectiveQuantity = isDistanceBased ? resolvedKm : parseFloat(quantity) || null;
  const kgCo2e = selectedFactor && effectiveQuantity
    ? calculateKgCo2e(selectedFactor, effectiveQuantity)
    : null;

  useEffect(() => {
    if (!category) return;
    setLoadingFactors(true);
    getEmissionFactors(category)
      .then(setFactors)
      .finally(() => setLoadingFactors(false));
  }, [category]);

  // Auto-calculate distance when both origin and destination are filled
  useEffect(() => {
    if (!isDistanceBased || !origin.trim() || !destination.trim()) {
      setResolvedKm(null);
      return;
    }
    const timer = setTimeout(calculateDistance, 600);
    return () => clearTimeout(timer);
  }, [origin, destination, isDistanceBased]);

  async function calculateDistance() {
    setCalculatingDistance(true);
    setResolvedKm(null);
    try {
      const [from, to] = await Promise.all([
        geocodePlace(origin.trim()),
        geocodePlace(destination.trim()),
      ]);
      if (!from || !to) {
        return;
      }
      const km = Math.round(haversineKm(from, to));
      setResolvedKm(km);
    } finally {
      setCalculatingDistance(false);
    }
  }

  function pickCategory(cat: EmissionCategory) {
    setCategory(cat);
    setSelectedFactor(null);
    setStep('activity');
  }

  function pickActivity(factor: EmissionFactor) {
    setSelectedFactor(factor);
    setDescription(factor.activity);
    setOrigin('');
    setDestination('');
    setResolvedKm(null);
    setQuantity('');
    setStep('detail');
  }

  async function save() {
    if (!user || !selectedFactor || !kgCo2e || !effectiveQuantity) return;
    setSaving(true);
    try {
      await logEmission(user.id, {
        category: category!,
        subcategory: selectedFactor.subcategory,
        description: description.trim() || selectedFactor.activity,
        quantity: effectiveQuantity,
        unit: selectedFactor.unit,
        kg_co2e: kgCo2e,
        data_source: 'manual',
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save entry.');
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (step === 'detail') { setStep('activity'); return; }
    if (step === 'activity') { setStep('category'); return; }
    router.back();
  }

  const canSave = !!kgCo2e && kgCo2e > 0 && !calculatingDistance;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={back} className="mr-3 p-1">
          <Text className="text-brand-600 text-base font-medium">
            {step === 'category' ? 'Cancel' : '← Back'}
          </Text>
        </TouchableOpacity>
        <Text className="text-gray-900 font-semibold text-base flex-1">
          {step === 'category' && 'Log an activity'}
          {step === 'activity' && category}
          {step === 'detail' && selectedFactor?.activity}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">

        {/* Step 1: Category */}
        {step === 'category' && (
          <View className="gap-3">
            <Text className="text-gray-500 text-sm mb-1">What kind of activity?</Text>
            {CATEGORIES.map(({ key, icon }) => (
              <TouchableOpacity
                key={key}
                onPress={() => pickCategory(key)}
                className="bg-white rounded-2xl p-5 shadow-sm flex-row items-center gap-4"
              >
                <Text className="text-3xl">{icon}</Text>
                <Text className="text-gray-800 font-semibold text-lg">{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2: Activity */}
        {step === 'activity' && (
          loadingFactors ? (
            <ActivityIndicator color="#22c55e" className="mt-10" />
          ) : (
            <View className="gap-2">
              <Text className="text-gray-500 text-sm mb-1">Select an activity</Text>
              {factors.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => pickActivity(f)}
                  className="bg-white rounded-xl px-4 py-3 shadow-sm flex-row justify-between items-center"
                >
                  <Text className="text-gray-800 text-sm flex-1">{f.activity}</Text>
                  <Text className="text-gray-400 text-xs ml-2">
                    {f.kg_co2e_per_unit} kg / {f.unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* Step 3: Detail */}
        {step === 'detail' && selectedFactor && (
          <View className="gap-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-gray-500 text-xs mb-1">Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Flight to Geneva"
                placeholderTextColor="#9ca3af"
                className="text-gray-800 text-base"
                multiline
              />
            </View>

            {isDistanceBased ? (
              <View className="bg-white rounded-2xl p-4 shadow-sm gap-3">
                <View>
                  <Text className="text-gray-500 text-xs mb-1">From</Text>
                  <TextInput
                    value={origin}
                    onChangeText={setOrigin}
                    placeholder="e.g. London"
                    placeholderTextColor="#9ca3af"
                    className="text-gray-800 text-base"
                  />
                </View>
                <View className="h-px bg-gray-100" />
                <View>
                  <Text className="text-gray-500 text-xs mb-1">To</Text>
                  <TextInput
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="e.g. Geneva"
                    placeholderTextColor="#9ca3af"
                    className="text-gray-800 text-base"
                  />
                </View>
                {calculatingDistance && (
                  <View className="flex-row items-center gap-2 pt-1">
                    <ActivityIndicator size="small" color="#22c55e" />
                    <Text className="text-gray-400 text-xs">Calculating distance…</Text>
                  </View>
                )}
                {resolvedKm !== null && !calculatingDistance && (
                  <Text className="text-brand-600 text-xs pt-1">{resolvedKm} km</Text>
                )}
                {origin.trim() && destination.trim() && !resolvedKm && !calculatingDistance && (
                  <Text className="text-amber-500 text-xs pt-1">Couldn't find one of those places — try being more specific.</Text>
                )}
              </View>
            ) : (
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <Text className="text-gray-500 text-xs mb-1">
                  {UNIT_LABEL[selectedFactor.unit] ?? `Quantity (${selectedFactor.unit})`}
                </Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  className="text-gray-800 text-base"
                />
              </View>
            )}

            {kgCo2e !== null && kgCo2e > 0 && (
              <View className="bg-brand-50 rounded-2xl p-4 items-center">
                <Text className="text-brand-700 text-3xl font-bold">{kgCo2e.toFixed(1)}</Text>
                <Text className="text-brand-600 text-sm">kg CO₂e</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={save}
              disabled={!canSave || saving}
              className="bg-brand-600 rounded-2xl py-4 items-center mt-2 mb-8"
              style={{ opacity: canSave ? 1 : 0.4 }}
            >
              {saving
                ? <ActivityIndicator color="white" />
                : <Text className="text-white font-semibold text-base">Save entry</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
