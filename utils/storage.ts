import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CheckIn {
  id: string;
  timestamp: string;
  stressLevel: number;
  notes?: string;
}

const CHECKINS_KEY = 'pulse_break_checkins';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function saveCheckIn(stressLevel: number, notes?: string, existingId?: string): Promise<CheckIn> {
  const entry: CheckIn = {
    id: existingId ?? generateId(),
    timestamp: new Date().toISOString(),
    stressLevel,
    notes,
  };
  const existing = await getCheckIns();
  const updated = [entry, ...existing];
  await AsyncStorage.setItem(CHECKINS_KEY, JSON.stringify(updated));
  return entry;
}

export async function getCheckIns(): Promise<CheckIn[]> {
  try {
    const raw = await AsyncStorage.getItem(CHECKINS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export interface Reflection {
  id: string;
  checkInId: string;
  timestamp: string;
  promptShown: string;
  userResponse: 'controllable' | 'uncontrollable';
}

const REFLECTIONS_KEY = 'pulse_break_reflections';

export async function saveReflection(
  checkInId: string,
  promptShown: string,
  userResponse: 'controllable' | 'uncontrollable'
): Promise<Reflection> {
  const entry: Reflection = {
    id: generateId(),
    checkInId,
    timestamp: new Date().toISOString(),
    promptShown,
    userResponse,
  };
  const existing = await getReflections();
  const updated = [entry, ...existing];
  await AsyncStorage.setItem(REFLECTIONS_KEY, JSON.stringify(updated));
  return entry;
}

export async function getReflections(): Promise<Reflection[]> {
  try {
    const raw = await AsyncStorage.getItem(REFLECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getWeeklyCheckIns(): Promise<CheckIn[]> {
  const all = await getCheckIns();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return all.filter(c => new Date(c.timestamp) >= sevenDaysAgo);
}

export interface ControlRatio {
  controllable: number;
  uncontrollable: number;
  total: number;
}

export async function getWeeklyControlRatio(): Promise<ControlRatio> {
  const all = await getReflections();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekly = all.filter(r => new Date(r.timestamp) >= sevenDaysAgo);
  const controllable = weekly.filter(r => r.userResponse === 'controllable').length;
  const uncontrollable = weekly.filter(r => r.userResponse === 'uncontrollable').length;
  return { controllable, uncontrollable, total: weekly.length };
}