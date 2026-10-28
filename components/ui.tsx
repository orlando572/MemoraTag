import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const palette = { ink: '#14213D', muted: '#5B6877', softMuted: '#7E8A98', canvas: '#F4F7F6', surface: '#FFFFFF', line: '#DDE5E2', green: '#147A63', darkGreen: '#0D5244', paleGreen: '#E1F1EA', lavender: '#E8E4F4', apricot: '#E7A367', orange: '#B96439', danger: '#C54B4D', dangerSurface: '#FCEEEF' };

export function Screen({ children }: PropsWithChildren) { return <View style={styles.screen}>{children}</View>; }

export function BackButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityLabel="Volver" onPress={onPress} style={styles.back}><Ionicons name="arrow-back" size={22} color={palette.ink} /></Pressable>;
}

export function PrimaryButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>{label}</Text>{icon && <Ionicons name={icon} size={19} color="#fff" />}</Pressable>;
}

function objectIcon(name: string): keyof typeof Ionicons.glyphMap {
  const objectName = name.toLowerCase();
  if (objectName.includes('bici') || objectName.includes('bicicleta')) return 'bicycle-outline';
  if (objectName.includes('cámara') || objectName.includes('camara')) return 'camera-outline';
  if (objectName.includes('guitarra')) return 'musical-notes-outline';
  if (objectName.includes('llave')) return 'key-outline';
  if (objectName.includes('planta')) return 'leaf-outline';
  if (objectName.includes('libro')) return 'book-outline';
  return 'cube-outline';
}

export function ObjectArtwork({ name, size = 32 }: { name: string; size?: number }) { return <View style={styles.art}><View style={styles.artShadow} /><View style={styles.artBox}><Ionicons name={objectIcon(name)} size={size} color={palette.darkGreen} /></View></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: palette.line, borderRadius: 14, backgroundColor: palette.surface },
  primary: { minHeight: 56, borderRadius: 15, backgroundColor: palette.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20, shadowColor: '#0D5244', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 3 },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pressed: { opacity: 0.78 },
  art: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' }, artShadow: { position: 'absolute', bottom: 2, width: 34, height: 8, borderRadius: 10, backgroundColor: '#B6D7CA' }, artBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F4FFFA', borderWidth: 1, borderColor: '#C6E0D4', justifyContent: 'center', alignItems: 'center' }
});
