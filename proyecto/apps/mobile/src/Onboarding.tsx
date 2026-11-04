import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, findNodeHandle, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; tip?: string };

const steps: Step[] = [
  { icon: 'time-outline', title: 'Una historia para cada objeto', body: 'Registra notas, incidencias y mantenimientos con fotos y documentos. Todo queda ordenado en su línea de tiempo.', tip: 'Ejemplo: la bici, la guitarra o la caldera de casa.' },
  Platform.OS === 'android'
    ? { icon: 'scan-outline', title: 'Ábrelo con QR o NFC', body: 'Imprime su código QR o graba una etiqueta NFC desde el objeto. Después, escanéalo o acerca la etiqueta a la parte trasera del teléfono para abrir su historia, incluso con la app cerrada.', tip: 'Busca «Código QR» y «Vincular NFC» dentro de cada objeto.' }
    : { icon: 'qr-code-outline', title: 'Ábrelo con su código QR', body: 'Imprime el código QR de cada objeto y pégalo en él. Escanéalo con la cámara para abrir su historia al instante.', tip: 'Busca «Código QR» dentro de cada objeto.' },
  { icon: 'phone-portrait-outline', title: 'Tus datos se quedan contigo', body: 'Todo se guarda en este teléfono, sin cuenta ni conexión. El QR y la etiqueta solo contienen un enlace, nunca la historia.', tip: 'Haz un respaldo desde Ajustes para no perder nada.' },
];

/** Short skippable tutorial shown after the first name entry, and on demand from Settings. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
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

  return <SafeAreaView style={styles.page} edges={['top']}>
    <View style={styles.top}>
      <Text style={styles.counter}>Paso {index + 1} de {steps.length}</Text>
      {!last && <Pressable accessibilityRole="button" accessibilityLabel="Saltar tutorial" hitSlop={12} onPress={onDone} style={styles.skip}><Text style={styles.skipText}>Saltar</Text></Pressable>}
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 12, 0] }) }] }}>
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={styles.artInner}><Ionicons name={step.icon} size={46} color="#176B57" /></View></View>
        <Text ref={titleRef} accessible accessibilityRole="header" style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
        {step.tip && <View style={styles.tip}><Ionicons name="bulb-outline" size={19} color="#176B57" /><Text style={styles.tipText}>{step.tip}</Text></View>}
      </Animated.View>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{steps.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}</View>
      <View style={styles.actions}>
        {index > 0 && <Pressable accessibilityRole="button" onPress={() => setIndex(index - 1)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>Anterior</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => last ? onDone() : setIndex(index + 1)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>{last ? 'Empezar' : 'Siguiente'}</Text><Ionicons name={last ? 'checkmark' : 'arrow-forward'} size={20} color="#fff" /></Pressable>
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F8F6' },
  top: { minHeight: 64, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { color: '#526C65', fontSize: 14, fontWeight: '700' },
  skip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }, skipText: { color: '#176B57', fontSize: 15, fontWeight: '700' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24 },
  art: { width: 170, height: 170, borderRadius: 56, backgroundColor: '#E1EEE7', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 36 },
  artInner: { width: 96, height: 96, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#203934', fontSize: 28, lineHeight: 35, fontWeight: '700', textAlign: 'center' },
  body: { color: '#526C65', fontSize: 16, lineHeight: 25, textAlign: 'center', marginTop: 14 },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#E1EEE7', borderRadius: 15, padding: 16, marginTop: 28 },
  tipText: { flex: 1, color: '#203934', fontSize: 14, lineHeight: 21 },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C6DCD0' }, dotActive: { width: 24, backgroundColor: '#176B57' },
  actions: { flexDirection: 'row', gap: 12 },
  primary: { flex: 1, minHeight: 56, borderRadius: 16, backgroundColor: '#176B57', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: { minHeight: 56, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: '#C6DCD0', alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: '#176B57', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
