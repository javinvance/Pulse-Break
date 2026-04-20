import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getWeeklyCheckIns, getWeeklyControlRatio, CheckIn, ControlRatio } from '../utils/storage';

const COLORS = {
  sage: '#7A9E7E',
  teal: '#3D8B8B',
  coral: '#D4715A',
  cream: '#F8F5EF',
  dark: '#2D3142',
  gray: '#9A9CB0',
  white: '#FFFFFF',
};

const EMOJI_MAP: Record<number, string> = { 1: '😌', 2: '🙂', 3: '😐', 4: '😟', 5: '😰' };
const LABEL_MAP: Record<number, string> = { 1: 'Calm', 2: 'Okay', 3: 'Mild', 4: 'Stressed', 5: 'Very Stressed' };
const LEVEL_COLOR: Record<number, string> = { 1: '#7A9E7E', 2: '#7A9E7E', 3: '#F0A500', 4: '#D4715A', 5: '#D4715A' };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryScreen() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [highCount, setHighCount] = useState(0);
  const [ratio, setRatio] = useState<ControlRatio | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWeeklyCheckIns().then(data => {
        setCheckIns(data);
        setHighCount(data.filter(c => c.stressLevel >= 4).length);
      });
      getWeeklyControlRatio().then(setRatio);
    }, [])
  );

  const renderItem = ({ item }: { item: CheckIn }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardEmoji}>{EMOJI_MAP[item.stressLevel]}</Text>
      </View>
      <View style={styles.cardMiddle}>
        <Text style={[styles.cardLabel, { color: LEVEL_COLOR[item.stressLevel] }]}>{LABEL_MAP[item.stressLevel]}</Text>
        {item.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text> : null}
        <Text style={styles.cardDate}>{formatDate(item.timestamp)} · {formatTime(item.timestamp)}</Text>
      </View>
      <View style={[styles.cardDot, { backgroundColor: LEVEL_COLOR[item.stressLevel] }]} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.header}>This Week</Text>

        {checkIns.length > 0 && (
          <View style={styles.statsBar}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{checkIns.length}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.coral }]}>{highCount}</Text>
              <Text style={styles.statLabel}>High stress</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.sage }]}>{checkIns.length - highCount}</Text>
              <Text style={styles.statLabel}>Low/moderate</Text>
            </View>
          </View>
        )}

        {ratio && ratio.total > 0 && (
          <View style={styles.ratioCard}>
            <Text style={styles.ratioTitle}>Let Them Breakdown</Text>
            <View style={styles.ratioRow}>
              <View style={styles.ratioStat}>
                <Text style={[styles.ratioValue, { color: COLORS.teal }]}>{ratio.controllable}</Text>
                <Text style={styles.ratioLabel}>I can act</Text>
              </View>
              <View style={styles.ratioBar}>
                <View style={[styles.ratioFill, { flex: ratio.controllable, backgroundColor: COLORS.teal }]} />
                <View style={[styles.ratioFill, { flex: ratio.uncontrollable, backgroundColor: COLORS.sage }]} />
              </View>
              <View style={styles.ratioStat}>
                <Text style={[styles.ratioValue, { color: COLORS.sage }]}>{ratio.uncontrollable}</Text>
                <Text style={styles.ratioLabel}>Let them</Text>
              </View>
            </View>
          </View>
        )}

        <FlatList
          data={checkIns}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={checkIns.length === 0 && styles.emptyContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No check-ins yet.</Text>
              <Text style={styles.emptySubtext}>Log your first one!</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { fontSize: 28, fontWeight: '700', color: COLORS.dark, marginBottom: 20 },
  statsBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E0DDD6' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E0DDD6' },
  ratioCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E0DDD6' },
  ratioTitle: { fontSize: 12, color: COLORS.gray, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  ratioRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratioStat: { alignItems: 'center', minWidth: 44 },
  ratioValue: { fontSize: 18, fontWeight: '700' },
  ratioLabel: { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  ratioBar: { flex: 1, height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#E0DDD6' },
  ratioFill: { height: '100%' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E0DDD6' },
  cardLeft: { marginRight: 12 },
  cardEmoji: { fontSize: 28 },
  cardMiddle: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardNotes: { fontSize: 13, color: COLORS.gray, marginBottom: 2 },
  cardDate: { fontSize: 12, color: COLORS.gray },
  cardDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginBottom: 4 },
  emptySubtext: { fontSize: 15, color: COLORS.gray },
});