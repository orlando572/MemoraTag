import { router } from 'expo-router';
import { Onboarding } from '../src/Onboarding';
import { useProfile } from '../src/data/profile';

export default function OnboardingScreen() {
  const profile = useProfile();
  return <Onboarding onDone={() => { profile.completeOnboarding(); if (router.canGoBack()) router.back(); else router.replace('/'); }} />;
}
