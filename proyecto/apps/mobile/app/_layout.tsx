// One import per weight, so Metro bundles only these three font files and not the whole family.
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { useFonts } from 'expo-font';
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
  // Fraunces and DM Sans are separate files per weight; see `fonts` in src/ui/tokens.ts.
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold, DMSans_400Regular, DMSans_600SemiBold });
  // If a font fails to load the app still opens, with the system font instead of a blank screen.
  const ready = !profile.loading && (fontsLoaded || !!fontError);
  useEffect(() => { if (ready) void SplashScreen.hideAsync().catch(() => {}); }, [ready]);

  if (!ready) return null; // The splash screen stays visible until the data and the fonts are ready.
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
