import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MemoryProvider } from '@/features/memories/memory-store';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MemoryProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </MemoryProvider>
    </SafeAreaProvider>
  );
}
