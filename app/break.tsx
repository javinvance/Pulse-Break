import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const COLORS = {
  sage: '#7A9E7E',
  teal: '#3D8B8B',
  coral: '#D4715A',
  cream: '#F8F5EF',
  dark: '#2D3142',
  gray: '#9A9CB0',
  white: '#FFFFFF',
};

function getNextBreakWindow(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  // round up to next 15-min boundary
  const remainder = 15 - (minutes % 15);
  const start = new Date(now.getTime() + remainder * 60000);
  const end = new Date(start.getTime() + 15 * 60000);

  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return `${fmt(start)} — ${fmt(end)}`;
}

export default function BreakScreen() {
  const router = useRouter();
  const { checkInId, stressCategory } = useLocalSearchParams<{ checkInId: string; stressCategory: string }>();
  const isVeryHigh = stressCategory === 'very_high';
  const breakWindow = getNextBreakWindow();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        <View style={styles.accent} />

        <Text style={styles.eyebrow}>{isVeryHigh ? 'Urgent' : 'High stress detected'}</Text>
        <Text style={styles.header}>
          {isVeryHigh ? 'You need a break\nright now.' : "Let's take a quick\nbreak to reset."}
        </Text>

        <View style={styles.durationCard}>
          <Text style={styles.durationLabel}>Recommended duration</Text>
          <Text style={styles.durationValue}>10–15 minutes</Text>
        </View>

        <View style={styles.calendarCard}>
          <Text style={styles.calendarLabel}>Next opening</Text>
          <Text style={styles.calendarValue}>{breakWindow}</Text>
        </View>

        <View style={styles.tipsWrapper}>
          <Text style={styles.tipsHeader}>During your break, try:</Text>
          <Text style={styles.tip}>Step away from your screen</Text>
          <Text style={styles.tip}>Take 5 slow, deep breaths</Text>
          <Text style={styles.tip}>Drink a glass of water</Text>
          <Text style={styles.tip}>Take a short walk</Text>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push({ pathname: '/reflection', params: { checkInId } } as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Break</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.push('/' as any)}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  accent: { width: 48, height: 5, borderRadius: 99, backgroundColor: COLORS.coral, marginBottom: 24 },
  eyebrow: { fontSize: 13, color: COLORS.coral, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  header: { fontSize: 30, fontWeight: '700', color: COLORS.dark, lineHeight: 38, marginBottom: 32 },
  durationCard: { backgroundColor: COLORS.teal + '18', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.teal + '44' },
  durationLabel: { fontSize: 12, color: COLORS.teal, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  durationValue: { fontSize: 22, fontWeight: '700', color: COLORS.teal },
  calendarCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E0DDD6' },
  calendarLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  calendarValue: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  tipsWrapper: { marginBottom: 32 },
  tipsHeader: { fontSize: 13, color: COLORS.gray, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tip: { fontSize: 15, color: COLORS.dark, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E0DDD6' },
  startButton: { backgroundColor: COLORS.coral, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  startButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, color: COLORS.gray },
});