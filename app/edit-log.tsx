import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { calculateKgCo2e } from '@/lib/emissions';
import { geocodePlace, haversineKm } from '@/lib/geocode';

type LogEntry = {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  kg_co2e: number;
  data_source: string;
};

type EmissionFactor = {
  kg_co2e_per_unit: number;
};

export default function EditLogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [entry, setEntry] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [resolvedKm, setResolvedKm] = useState<number | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [factor, setFactor] = useState<EmissionFactor | null>(null);

  // Manual override — user can type directly into the CO₂e field
  const [kgOverride, setKgOverride] = useState('');
  const [overrideMode, setOverrideMode] = useState(false);

  const isDistanceBased = entry?.unit === 'km';
  const effectiveQuantity = isDistanceBased
    ? resolvedKm
    : parseFloat(quantity) || null;
  const calculatedKg = factor && effectiveQuantity
    ? calculateKgCo2e(factor as any, effectiveQuantity)
    : null;
  const displayKg = overrideMode
    ? parseFloat(kgOverride) || 0
    : ((calculatedKg ?? parseFloat(kgOverride)) || 0);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadEntry();
  }, [id]);

  // Auto-calculate distance when origin/destination change
  useEffect(() => {
    if (!isDistanceBased || !origin.trim() || !destination.trim()) {
      setResolvedKm(null);
      return;
    }
    const timer = setTimeout(calculateDistance, 600);
    return () => clearTimeout(timer);
  }, [origin, destination, isDistanceBased]);

  async function loadEntry() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emission_logs')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      const e = data as LogEntry;
      setEntry(e);
      setDescription(e.description ?? '');
      setQuantity(e.quantity != null ? String(e.quantity) : '');
      setKgOverride(String(e.kg_co2e));

      // Load the matching emission factor so we can recalculate
      const { data: factors } = await supabase
        .from('emission_factors')
        .select('kg_co2e_per_unit')
        .eq('category', e.category)
        .eq('subcategory', e.subcategory ?? '')
        .limit(1)
        .single();
      if (factors) setFactor(factors as EmissionFactor);
    } finally {
      setLoading(false);
    }
  }

  async function calculateDistance() {
    setCalculatingDistance(true);
    setResolvedKm(null);
    try {
      const [from, to] = await Promise.all([
        geocodePlace(origin.trim()),
        geocodePlace(destination.trim()),
      ]);
      if (from && to) setResolvedKm(Math.round(haversineKm(from, to)));
    } finally {
      setCalculatingDistance(false);
    }
  }

  async function save() {
    if (!entry) return;
    setSaving(true);
    try {
      const finalKg = overrideMode
        ? parseFloat(kgOverride)
        : (calculatedKg ?? entry.kg_co2e);

      const updates: Partial<LogEntry> & { kg_co2e: number } = {
        description: description.trim() || entry.description,
        kg_co2e: finalKg,
      };

      if (!overrideMode) {
        const q = isDistanceBased ? resolvedKm : parseFloat(quantity) || null;
        if (q != null) {
          updates.quantity = q;
        }
      }

      const { error } = await supabase
        .from('emission_logs')
        .update(updates)
        .eq('id', entry.id);
      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteEntry },
    ]);
  }

  async function deleteEntry() {
    if (!entry) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('emission_logs')
        .delete()
        .eq('id', entry.id);
      if (error) throw error;
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not delete entry.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator color="#22c55e" />
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-400">Entry not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 pt-4 pb-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-brand-600 text-base font-medium">← Back</Text>
        </TouchableOpacity>
        <Text className="text-gray-900 font-semibold text-base flex-1">Edit entry</Text>
        <TouchableOpacity onPress={confirmDelete} disabled={deleting}>
          <Text className="text-red-500 text-sm font-medium">Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">
        <View className="gap-4">

          {/* Category badge */}
          <Text className="text-gray-400 text-xs uppercase tracking-wide">
            {entry.category}{entry.subcategory ? ` · ${entry.subcategory}` : ''}
          </Text>

          {/* Description */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-gray-500 text-xs mb-1">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColor="#9ca3af"
              className="text-gray-800 text-base"
              multiline
            />
          </View>

          {/* Quantity / distance */}
          {!overrideMode && (
            isDistanceBased ? (
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
                  <Text className="text-brand-600 text-xs">{resolvedKm} km</Text>
                )}
                <Text className="text-gray-400 text-xs">
                  Current: {entry.quantity != null ? `${entry.quantity} km` : '—'}
                </Text>
              </View>
            ) : (
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <Text className="text-gray-500 text-xs mb-1">
                  Quantity {entry.unit ? `(${entry.unit})` : ''}
                </Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9ca3af"
                  placeholder={entry.quantity != null ? String(entry.quantity) : '0'}
                  className="text-gray-800 text-base"
                />
              </View>
            )
          )}

          {/* CO₂e result / override */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-500 text-xs">kg CO₂e</Text>
              <TouchableOpacity onPress={() => {
                setOverrideMode(!overrideMode);
                if (!overrideMode) setKgOverride(String(displayKg.toFixed(1)));
              }}>
                <Text className="text-brand-600 text-xs font-medium">
                  {overrideMode ? 'Use calculated value' : 'Override manually'}
                </Text>
              </TouchableOpacity>
            </View>
            {overrideMode ? (
              <TextInput
                value={kgOverride}
                onChangeText={setKgOverride}
                keyboardType="decimal-pad"
                className="text-gray-800 text-3xl font-bold"
                selectTextOnFocus
              />
            ) : (
              <Text className="text-gray-800 text-3xl font-bold">
                {displayKg > 0 ? displayKg.toFixed(1) : entry.kg_co2e.toFixed(1)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            className="bg-brand-600 rounded-2xl py-4 items-center mt-2 mb-8"
          >
            {saving
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold text-base">Save changes</Text>}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
