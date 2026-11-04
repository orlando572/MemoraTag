import { router } from 'expo-router';
import { NfcScreen } from '../src/NfcScreen';

export default function ReadNfc() {
  return <NfcScreen onFound={(object) => router.replace(`/object/${object.id}`)} />;
}
