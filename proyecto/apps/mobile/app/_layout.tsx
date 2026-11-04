import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ProfileProvider, useProfile } from '../src/data/profile';
import { ErrorMessage, Screen } from '../src/ui/components';
import { FeedbackProvider } from '../src/ui/feedback/FeedbackProvider';
import { useTheme } from '../src/ui/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Objects opened from a QR or NFC link keep the home screen underneath, so «Volver» works.
export const unstable_settings = { initialRouteName: 'index' };

export default function Layout() {
  return <ProfileProvider><FeedbackProvider><RootStack /></FeedbackProvider></ProfileProvider>;
}

function RootStack() {
  const { c } = useTheme();
  const profile = useProfile();
  useEffect(() => { if (!profile.loading) void SplashScreen.hideAsync().catch(() => {}); }, [profile.loading]);

  if (profile.loading) return null; // The splash screen stays visible.
  if (profile.error) return <Screen><ErrorMessage text="No se pudo cargar tu información." onRetry={() => void profile.reload()} /></Screen>;

  const task = { animation: 'slide_from_bottom' as const };
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.canvas } }}>
    <Stack.Protected guard={!profile.name}>
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
    </Stack.Protected>
    <Stack.Protected guard={!!profile.name}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="object/new" options={task} />
      <Stack.Screen name="object/[id]/index" />
      <Stack.Screen name="object/[id]/edit" options={task} />
      <Stack.Screen name="object/[id]/qr" />
      <Stack.Screen name="object/[id]/nfc" />
      <Stack.Screen name="object/[id]/event/new" options={task} />
      <Stack.Screen name="object/[id]/event/[eventId]" options={task} />
      <Stack.Screen name="scan" options={{ animation: 'fade' }} />
      <Stack.Screen name="scan-nfc" />
      <Stack.Screen name="archived" />
      <Stack.Screen name="settings" />
    </Stack.Protected>
  </Stack>;
}
