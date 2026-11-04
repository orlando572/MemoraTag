import { router } from 'expo-router';
import { Settings } from '../src/Settings';
import { dataChanged } from '../src/data/bus';
import { useProfile } from '../src/data/profile';

export default function SettingsScreen() {
  const profile = useProfile();
  return <Settings name={profile.name ?? ''} onNameChange={profile.setName}
    onImported={async (name) => { if (name) profile.setName(name); dataChanged(); return true; }}
    onShowTutorial={() => router.push('/onboarding')}
    themeMode={profile.themeMode} onThemeMode={profile.setThemeMode} />;
}
