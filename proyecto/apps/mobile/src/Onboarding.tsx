import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, findNodeHandle, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Screen } from './ui/components';
import { useStyles, useTheme } from './ui/theme';
import { radius, space, type, type Palette } from './ui/tokens';

type Step = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; tip?: string };

const steps: Step[] = [
  { icon: 'time-outline', title: 'Una historia para cada objeto', body: 'Registra notas, incidencias y mantenimientos con fotos y documentos. Todo queda ordenado en su línea de tiempo.', tip: 'Ejemplo: la bici, la guitarra o la caldera de casa.' },
  { icon: 'alert-circle-outline', title: 'Sigue lo que hay que arreglar', body: 'Las incidencias quedan abiertas hasta que las marcas como resueltas, y cada objeto te muestra cuántas tiene pendientes y su último mantenimiento.', tip: 'Si te equivocas al archivar o borrar, toca «Deshacer».' },
  Platform.OS === 'android'
    ? { icon: 'scan-outline', title: 'Ábrelo con QR o NFC', body: 'Imprime su código QR o graba una etiqueta NFC desde el objeto. Después, escanéalo o acerca la etiqueta a la parte trasera del teléfono para abrir su historia, incluso con la app cerrada.', tip: 'Busca «Código QR» y «Vincular NFC» dentro de cada objeto.' }
    : { icon: 'qr-code-outline', title: 'Ábrelo con su código QR', body: 'Imprime el código QR de cada objeto y pégalo en él. Escanéalo con la cámara para abrir su historia al instante.', tip: 'Busca «Código QR» dentro de cada objeto.' },
  { icon: 'phone-portrait-outline', title: 'Tus datos se quedan contigo', body: 'Todo se guarda en este teléfono, sin cuenta ni conexión. El QR y la etiqueta solo contienen un enlace, nunca la historia.', tip: 'Haz un respaldo desde Ajustes para no perder nada.' },
];

/** Short skippable tutorial shown after the first name entry, and on demand from Settings. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const styles = useStyles(makeStyles);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const titleRef = useRef<Text>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (index > 0) { setIndex(index - 1); return true; } onDone(); return true; });
    return () => listener.remove();
  }, [index, onDone]);

  useEffect(() => {
    fade.setValue(reduceMotion ? 1 : 0);
    Animated.timing(fade, { toValue: 1, duration: reduceMotion ? 0 : 220, useNativeDriver: true }).start();
    const timer = setTimeout(() => { const node = findNodeHandle(titleRef.current); if (node) AccessibilityInfo.setAccessibilityFocus(node); }, 120);
    return () => clearTimeout(timer);
  }, [index, fade, reduceMotion]);

  return <Screen>
    <View style={styles.top}>
      <Text style={styles.counter}>Paso {index + 1} de {steps.length}</Text>
      {!last && <Pressable accessibilityRole="button" accessibilityLabel="Saltar tutorial" hitSlop={12} onPress={onDone} style={styles.skip}><Text style={styles.skipText}>Saltar</Text></Pressable>}
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 12, 0] }) }] }}>
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={styles.artInner}><Ionicons name={step.icon} size={46} color={c.primary} /></View></View>
        <Text ref={titleRef} accessible accessibilityRole="header" style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
        {step.tip && <View style={styles.tip}><Ionicons name="bulb-outline" size={19} color={c.onAccentSoft} /><Text style={styles.tipText}>{step.tip}</Text></View>}
      </Animated.View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{steps.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}</View>
      <View style={styles.actions}>
        {index > 0 && <Button label="Anterior" variant="secondary" onPress={() => setIndex(index - 1)} />}
        <Button label={last ? 'Empezar' : 'Siguiente'} icon={last ? 'checkmark' : 'arrow-forward'} onPress={() => last ? onDone() : setIndex(index + 1)} style={{ flex: 1 }} />
      </View>
    </View>
  </Screen>;
}

const makeStyles = (c: Palette) => ({
  top: { minHeight: 64, paddingHorizontal: space.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { ...type.caption, color: c.muted, fontWeight: '700' },
  skip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.sm }, skipText: { ...type.label, color: c.primary, fontWeight: '700' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: space.xxl },
  art: { width: 170, height: 170, borderRadius: 56, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 36 },
  artInner: { width: 96, height: 96, borderRadius: 32, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, fontSize: 28, lineHeight: 35, color: c.ink, textAlign: 'center' },
  body: { ...type.body, color: c.muted, lineHeight: 25, textAlign: 'center', marginTop: 14 },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: c.accentSoft, borderRadius: radius.md, padding: space.lg, marginTop: 28 },
  tipText: { flex: 1, ...type.caption, fontSize: 14, lineHeight: 21, color: c.onAccentSoft },
  footer: { paddingHorizontal: space.xxl, paddingTop: space.md, gap: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.line }, dotActive: { width: 24, backgroundColor: c.primary },
  actions: { flexDirection: 'row', gap: space.md },
} as const);
