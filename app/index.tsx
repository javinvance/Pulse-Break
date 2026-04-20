import React, { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { saveCheckIn } from '../utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
//
const COLORS = {
  sage: '#7A9E7E',
  teal: '#3D8B8B',
  coral: '#D4715A',
  cream: '#F8F5EF',
  dark: '#2D3142',
  gray: '#9A9CB0',
  white: '#FFFFFF',
};

const EMOJI_SCALE = [
  { level: 1, emoji: '😌', label: 'Calm' },
  { level: 2, emoji: '🙂', label: 'Okay' },
  { level: 3, emoji: '😐', label: 'Mild' },
  { level: 4, emoji: '😟', label: 'Stressed' },
  { level: 5, emoji: '😰', label: 'Very Stressed' },
];

function evaluateStress(level: number): 'low' | 'moderate' | 'high' | 'very_high' {
  if (level <= 2) return 'low';
  if (level === 3) return 'moderate';
  if (level === 4) return 'high';
  return 'very_high';
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [stressCategory, setStressCategory] = useState<'low' | 'moderate' | 'high' | 'very_high' | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSelected(null);
      setNotes('');
      setConfirmed(false);
      setStressCategory(null);
    }, [])
  );

  const handleSelect = (level: number) => {
    setSelected(level);
    setConfirmed(false);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const category = evaluateStress(selected);
    setStressCategory(category);
    const checkInId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    saveCheckIn(selected, notes || undefined, checkInId).catch(console.error);
    setConfirmed(true);
    if (category === 'high' || category === 'very_high') {
      setTimeout(() => {
        router.push({ pathname: '/break', params: { checkInId, stressCategory: category } } as any);
      }, 2000);
    } else {
      setTimeout(() => {
        setSelected(null);
        setNotes('');
        setConfirmed(false);
      }, 2000);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>

          <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
          <Text style={styles.header}>How are you feeling?</Text>

          <View style={styles.emojiRow}>
            {EMOJI_SCALE.map(({ level, emoji, label }) => {
              const isSelected = selected === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.emojiButton, isSelected && styles.emojiSelected]}
                  onPress={() => handleSelect(level)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                  <Text style={[styles.emojiLabel, isSelected && styles.emojiLabelSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selected && !confirmed && (
            <View style={styles.notesWrapper}>
              <TextInput
                style={styles.notesInput}
                placeholder="What's on your mind? (optional)"
                placeholderTextColor={COLORS.gray}
                value={notes}
                onChangeText={setNotes}
                maxLength={200}
                multiline
              />
              <Text style={styles.charCount}>{notes.length}/200</Text>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitText}>Log Check-In</Text>
              </TouchableOpacity>
            </View>
          )}

          {confirmed && stressCategory && (
            <View style={[
              styles.confirmation,
              (stressCategory === 'high' || stressCategory === 'very_high') && styles.confirmationHigh,
            ]}>
              <Text style={[
                styles.confirmationText,
                (stressCategory === 'high' || stressCategory === 'very_high') && styles.confirmationTextHigh,
              ]}>
                {stressCategory === 'low' && "You're doing great. Keep it up!"}
                {stressCategory === 'moderate' && "Feeling the pressure? Consider a short pause."}
                {stressCategory === 'high' && "Stress detected. Let's take a break."}
                {stressCategory === 'very_high' && "High stress detected. You need a break now."}
              </Text>
            </View>
          )}

        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  greeting: { fontSize: 14, color: COLORS.gray, textTransform: 'capitalize', marginBottom: 4 },
  header: { fontSize: 28, fontWeight: '700', color: COLORS.dark, marginBottom: 40 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  emojiButton: { alignItems: 'center', padding: 6, borderRadius: 12, flex: 1, marginHorizontal: 2, height: 80, justifyContent: 'center' },
  emojiSelected: { backgroundColor: COLORS.sage + '33', borderWidth: 1.5, borderColor: COLORS.sage },
  emoji: { fontSize: 32, marginBottom: 4 },
  emojiLabel: { fontSize: 9, color: COLORS.gray, textAlign: 'center', flexWrap: 'nowrap' },
  emojiLabelSelected: { color: COLORS.sage, fontWeight: '600' },
  notesWrapper: { marginTop: 8 },
  notesInput: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, fontSize: 15, color: COLORS.dark, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E0DDD6' },
  charCount: { fontSize: 12, color: COLORS.gray, textAlign: 'right', marginTop: 4, marginBottom: 16 },
  submitButton: { backgroundColor: COLORS.teal, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  confirmation: { backgroundColor: COLORS.sage + '22', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: COLORS.sage },
  confirmationText: { fontSize: 16, color: COLORS.sage, fontWeight: '600' },
  confirmationHigh: { backgroundColor: '#D4715A22', borderColor: '#D4715A' },
  confirmationTextHigh: { color: '#D4715A' },
});