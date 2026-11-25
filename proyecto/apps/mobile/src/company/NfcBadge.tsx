import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { useTheme } from '../ui/theme';
import { nfcLabel } from './nfc';

/** NFC state as one icon: filled circle when a tag is linked, dotted outline when not. Tap shows the same text. */
export function NfcBadge({ writtenAt, size = 'md', announce = true }: { writtenAt: string | null | undefined; size?: 'sm' | 'md'; announce?: boolean }) {
  const Alert = useFeedback();
  const { c } = useTheme();
  const active = !!writtenAt && nfcLabel(writtenAt) !== 'Sin etiqueta NFC';
  const label = nfcLabel(writtenAt);
  const box = size === 'sm' ? 24 : 32;
  const circle = <View style={{ width: box, height: box, borderRadius: box / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? c.primarySoft : 'transparent', borderWidth: active ? 0 : 1.5, borderStyle: 'dotted', borderColor: c.muted }}>
    <Ionicons name="radio" size={box * 0.56} color={active ? c.primary : c.muted} />
  </View>;
  // In cards the whole card is the touch target, so the icon only carries its label.
  if (!announce) return <View accessible accessibilityLabel={label}>{circle}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={() => Alert.toast(label, { tone: 'info' })}>{circle}</Pressable>;
}
