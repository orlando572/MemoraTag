import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { forwardRef, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { photoUri } from '../object-photos';
import { objectIcon } from '../objects/icons';
import { useStyles, useTheme } from './theme';
import { radius, space, type, type Palette } from './tokens';

export type IconName = keyof typeof Ionicons.glyphMap;

/** Page container: themed background, safe area and status bar style. */
export function Screen({ children, edges = ['top'], style, dark }: { children: ReactNode; edges?: Edge[]; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const { c, dark: isDark } = useTheme();
  return <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: dark ? c.scanner : c.canvas }, style]}>
    <StatusBar style={dark || isDark ? 'light' : 'dark'} />
    {children}
  </SafeAreaView>;
}

/** Top bar with a 48 dp back button, a centred title and an optional trailing action. */
export function NavBar({ title, onBack, right, disabled, onDark }: { title?: string; onBack?: () => void; right?: ReactNode; disabled?: boolean; onDark?: boolean }) {
  const s = useStyles(navStyles);
  const { c } = useTheme();
  return <View style={s.nav}>
    <IconButton icon="arrow-back" label="Volver" disabled={disabled} onPress={onBack ?? (() => router.back())} tone={onDark ? 'onDark' : 'surface'} />
    {title ? <Text accessibilityRole="header" numberOfLines={1} style={[s.title, onDark && { color: c.onScanner }]}>{title}</Text> : <View style={{ flex: 1 }} />}
    {right ?? <View style={s.spacer} />}
  </View>;
}
const navStyles = (c: Palette) => ({
  nav: { minHeight: 64, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { flex: 1, textAlign: 'center', color: c.ink, ...type.headline },
  spacer: { width: 48 },
} as const);

type ButtonProps = { label: string; onPress: () => void; icon?: IconName; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; accessibilityHint?: string };

/** Buttons are at least 52 dp tall and always show a text label (icons are a complement). */
export function Button({ label, onPress, icon, variant = 'primary', disabled, loading, style, accessibilityLabel, accessibilityHint }: ButtonProps) {
  const s = useStyles(buttonStyles);
  const { c } = useTheme();
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? c.danger : c.primary;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} accessibilityState={{ disabled: !!disabled, busy: !!loading }} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [s.base, s[variant], (pressed || disabled) && s.dim, style]}>
    {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
    <Text style={[s.text, { color: fg }]}>{label}</Text>
  </Pressable>;
}
const buttonStyles = (c: Palette) => ({
  base: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  primary: { backgroundColor: c.primary },
  secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.inputBorder },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: c.dangerSoft },
  text: { ...type.label, fontWeight: '700' },
  dim: { opacity: 0.6 },
} as const);

/** Icon-only button: 48 dp target and a mandatory accessible label. */
export function IconButton({ icon, label, onPress, disabled, tone = 'surface', badge }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; tone?: 'surface' | 'soft' | 'onDark' | 'onPhoto'; badge?: boolean }) {
  const { c } = useTheme();
  const bg = tone === 'surface' ? c.surface : tone === 'soft' ? c.primarySoft : tone === 'onDark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.45)';
  const fg = tone === 'surface' ? c.ink : tone === 'soft' ? c.onPrimarySoft : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: tone === 'surface' ? 1 : 0, borderColor: c.line }, (pressed || disabled) && { opacity: 0.6 }]}>
    <Ionicons name={icon} size={22} color={fg} />
    {badge && <View style={{ position: 'absolute', top: 10, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: c.accent }} />}
  </Pressable>;
}

/** Selectable pill used for filters and option groups. */
export function Chip({ label, selected, onPress, icon, color, count }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName; color?: string; count?: number }) {
  const { c } = useTheme();
  const tint = color ?? c.primary;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} accessibilityLabel={count === undefined ? label : `${label}, ${count}`} onPress={onPress}
    style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: space.md, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: selected ? tint : c.line, backgroundColor: selected ? c.surfaceAlt : c.surface }, pressed && { opacity: 0.7 }]}>
    {icon && <Ionicons name={icon} size={17} color={tint} />}
    <Text style={{ ...type.label, color: selected ? c.ink : c.muted }}>{label}</Text>
    {count !== undefined && <Text style={{ ...type.caption, color: c.muted }}>{count}</Text>}
    {selected && <Ionicons name="checkmark" size={16} color={tint} />}
  </Pressable>;
}

/** Small status label. Colour is never the only cue: it always carries text and, optionally, an icon. */
export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'primary' | 'danger' | 'success' | 'warning' | 'accent'; icon?: IconName }) {
  const { c } = useTheme();
  const map = { neutral: [c.surfaceAlt, c.muted], primary: [c.primarySoft, c.onPrimarySoft], danger: [c.dangerSoft, c.danger], success: [c.successSoft, c.success], warning: [c.warningSoft, c.warning], accent: [c.accentSoft, c.onAccentSoft] } as const;
  const [bg, fg] = map[tone];
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
    {icon && <Ionicons name={icon} size={14} color={fg} />}
    <Text style={{ ...type.caption, fontWeight: '700', color: fg }}>{label}</Text>
  </View>;
}

export function Card({ children, style, onPress, accessibilityLabel, accessibilityHint }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string; accessibilityHint?: string }) {
  const { c } = useTheme();
  const base = { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: space.lg };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.75 }]}>{children}</Pressable>;
}

export function SectionHeader({ title, detail, right }: { title: string; detail?: string; right?: ReactNode }) {
  const { c } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.md }}>
    <Text accessibilityRole="header" style={{ ...type.headline, color: c.ink, flexShrink: 1 }}>{title}</Text>
    {right ?? (detail ? <Text style={{ ...type.caption, color: c.muted }}>{detail}</Text> : null)}
  </View>;
}

/** Empty states explain what the space is for and offer the next step. */
export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: { label: string; onPress: () => void; icon?: IconName } }) {
  const { c } = useTheme();
  return <View style={{ alignItems: 'center', paddingHorizontal: space.xxl, paddingVertical: space.xxxl }}>
    <View style={{ width: 76, height: 76, borderRadius: 26, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg }}><Ionicons name={icon} size={32} color={c.onPrimarySoft} /></View>
    <Text accessibilityRole="header" style={{ ...type.headline, color: c.ink, textAlign: 'center' }}>{title}</Text>
    <Text style={{ ...type.body, fontSize: 15, color: c.muted, textAlign: 'center', marginTop: space.sm }}>{text}</Text>
    {action && <Button label={action.label} icon={action.icon} variant="secondary" onPress={action.onPress} style={{ marginTop: space.xl }} />}
  </View>;
}

type FieldProps = TextInputProps & { label: string; optional?: boolean; error?: string; hint?: string };

/** Labelled input; errors are shown next to the field, in text, and announced. */
export const TextField = forwardRef<TextInput, FieldProps>(function TextField({ label, optional, error, hint, style, ...input }, ref) {
  const { c } = useTheme();
  return <View style={{ marginBottom: space.xl }}>
    <Text style={{ ...type.label, color: c.ink, marginBottom: space.sm }}>{label}{optional && <Text style={{ color: c.muted, fontWeight: '400' }}> · opcional</Text>}</Text>
    <TextInput ref={ref} accessibilityLabel={label} accessibilityHint={error ?? hint} placeholderTextColor={c.muted}
      style={[{ minHeight: 54, backgroundColor: c.surface, borderWidth: error ? 2 : 1, borderColor: error ? c.danger : c.inputBorder, borderRadius: radius.md, paddingHorizontal: space.lg, color: c.ink, ...type.body }, style]} {...input} />
    {error ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}><Ionicons name="alert-circle" size={16} color={c.danger} /><Text accessibilityLiveRegion="polite" style={{ ...type.caption, color: c.danger }}>{error}</Text></View>
      : hint ? <Text style={{ ...type.caption, color: c.muted, marginTop: 6 }}>{hint}</Text> : null}
  </View>;
});

/** Object thumbnail: its photo, or its icon on its colour. */
export function ObjectCover({ object, size = 64 }: { object: { name: string; cover_image: string | null; color: string; icon?: string | null }; size?: number }) {
  const theme = useTheme();
  const tone = theme.object(object.color);
  const uri = photoUri(object.cover_image);
  return <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors /> : <Ionicons name={objectIcon(object.icon, object.name)} size={size * 0.46} color={tone.fg} />}
  </View>;
}

/** Bottom action area that stays above the gesture bar. */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  return <View style={{ flexDirection: 'row', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.lg), borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.canvas }}>{children}</View>;
}

export function Loading() {
  const { c } = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl }}><ActivityIndicator color={c.primary} size="large" /></View>;
}

export function ErrorMessage({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const { c } = useTheme();
  return <View style={{ alignItems: 'center', padding: space.xxl, gap: space.md }}>
    <Ionicons name="cloud-offline-outline" size={28} color={c.danger} />
    <Text accessibilityLiveRegion="polite" style={{ ...type.body, color: c.ink, textAlign: 'center' }}>{text}</Text>
    {onRetry && <Button label="Reintentar" icon="refresh" variant="secondary" onPress={onRetry} />}
  </View>;
}
