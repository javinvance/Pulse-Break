import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { saveReflection } from '../utils/storage';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import promptData from '../content/reflection-prompts.json';

const COLORS = {
  sage: '#7A9E7E',
  teal: '#3D8B8B',
  coral: '#D4715A',
  cream: '#F8F5EF',
  dark: '#2D3142',
  gray: '#9A9CB0',
  white: '#FFFFFF',
};

const PROMPTS: string[] = (promptData as { prompts: { id: string; text: string; category: string }[] }).prompts.map(p => p.text);

const FOLLOW_UPS = {
  controllable: {
    headline: "Let me take action.",
    message: "You have the power to change this. Take one small step when you're ready — you don't have to solve it all right now.",
  },
  uncontrollable: {
    headline: "Let them.",
    message: "This is not yours to carry. You cannot control others — only your response. Release it, and protect your energy.",
  },
};

type Response = 'controllable' | 'uncontrollable' | null;

export default function ReflectionScreen() {
  const router = useRouter();
  const { checkInId } = useLocalSearchParams<{ checkInId: string }>();
  const [response, setResponse] = useState<Response>(null);
  const [prompt] = useState(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  const handleResponse = async (type: 'controllable' | 'uncontrollable') => {
    await saveReflection(checkInId ?? 'unknown', prompt, type);
    setResponse(type);
  };

  const followUp = response ? FOLLOW_UPS[response] : null;

  useFocusEffect(
    useCallback(() => {
        setResponse(null);
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>Reflection</Text>
        <Text style={styles.header}>Take a breath.{'\n'}Then ask yourself:</Text>

        <View style={styles.promptCard}>
          <Text style={styles.promptText}>{prompt}</Text>
        </View>

        {!response && (
          <View style={styles.responseRow}>
            <TouchableOpacity style={[styles.responseButton, styles.responseYes]} onPress={() => handleResponse('controllable')} activeOpacity={0.8}>
              <Text style={styles.responseYesText}>Yes, I can act</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.responseButton, styles.responseNo]} onPress={() => handleResponse('uncontrollable')} activeOpacity={0.8}>
              <Text style={styles.responseNoText}>No, let them</Text>
            </TouchableOpacity>
          </View>
        )}

        {followUp && (
          <View style={[styles.followUpCard, response === 'controllable' ? styles.followUpTeal : styles.followUpSage]}>
            <Text style={[styles.followUpHeadline, response === 'controllable' ? styles.followUpTealText : styles.followUpSageText]}>
              {followUp.headline}
            </Text>
            <Text style={styles.followUpMessage}>{followUp.message}</Text>
          </View>
        )}

        {response && (
          <TouchableOpacity style={styles.doneButton} onPress={() => router.push('/' as any)} activeOpacity={0.8}>
            <Text style={styles.doneText}>Back to Home</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  eyebrow: { fontSize: 13, color: COLORS.sage, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  header: { fontSize: 28, fontWeight: '700', color: COLORS.dark, lineHeight: 36, marginBottom: 32 },
  promptCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, marginBottom: 28, borderWidth: 1, borderColor: '#E0DDD6' },
  promptText: { fontSize: 20, fontWeight: '600', color: COLORS.dark, lineHeight: 28 },
  responseRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  responseButton: { flex: 1, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5 },
  responseYes: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  responseNo: { backgroundColor: COLORS.white, borderColor: COLORS.sage },
  responseYesText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  responseNoText: { color: COLORS.sage, fontWeight: '700', fontSize: 15 },
  followUpCard: { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1 },
  followUpTeal: { backgroundColor: COLORS.teal + '15', borderColor: COLORS.teal + '44' },
  followUpSage: { backgroundColor: COLORS.sage + '15', borderColor: COLORS.sage + '44' },
  followUpHeadline: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  followUpTealText: { color: COLORS.teal },
  followUpSageText: { color: COLORS.sage },
  followUpMessage: { fontSize: 15, color: COLORS.dark, lineHeight: 22 },
  doneButton: { backgroundColor: COLORS.dark, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  doneText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});