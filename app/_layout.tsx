import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#3D8B8B' }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Check-In',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🫀</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>📋</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="break"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="reflection"
          options={{ href: null }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}