import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, BackHandler, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NfcSession, type NfcAdapter, type NfcPhase } from './nfc-session';
import { objectLink } from './qr';
import { findActiveObject, markNfcWritten, objectState, type MemoryObject } from './storage';
import { useFeedback } from './ui/feedback/FeedbackProvider';
import { haptic } from './ui/feedback/haptics';

async function createAdapter(): Promise<NfcAdapter> {
  if (Platform.OS !== 'android') throw new Error('ANDROID_ONLY');
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) throw new Error('DEV_BUILD');
  const { default: manager, NfcTech, NdefStatus } = await import('react-native-nfc-manager');
  return {
    isSupported: () => manager.isSupported(),
    isEnabled: () => manager.isEnabled(),
    start: () => manager.start(),
    request: () => manager.requestTechnology(NfcTech.Ndef),
    tag: () => manager.getTag(),
    status: async () => { const status = await manager.ndefHandler.getNdefStatus(); return { writable: status.status === NdefStatus.ReadWrite, capacity: status.capacity }; },
    write: (bytes) => manager.ndefHandler.writeNdefMessage(bytes),
    read: async () => (await manager.ndefHandler.getNdefMessage())?.ndefMessage ?? [],
    cancel: () => manager.cancelTechnologyRequest(),
  };
}

const messages: Record<string, string> = {
  ANDROID_ONLY: 'Esta función está preparada solo para Android.',
  DEV_BUILD: 'NFC necesita una compilación de desarrollo. No está disponible en Expo Go.',
  UNSUPPORTED: 'Este dispositivo no admite NFC.',
  DISABLED: 'Activa NFC en los ajustes del dispositivo y vuelve a intentarlo.',
  INVALID_TAG: 'La etiqueta no contiene un identificador local de MemoraTag.',
  READ_ONLY: 'La etiqueta no permite escritura o no se pudo comprobar.',
  CAPACITY: 'La etiqueta no tiene espacio suficiente.',
  NO_TAG: 'No se pudo leer la etiqueta. Vuelve a intentarlo.',
  WRITE_UNCONFIRMED: 'No se pudo confirmar la escritura. La etiqueta podría haberse modificado; léela antes de volver a escribirla.',
  BUSY: 'Ya hay una operación NFC en curso.',
};

export function NfcScreen({ object, onBack, onFound, onWritten }: { object?: MemoryObject; onBack: () => void; onFound: (object: MemoryObject) => void; onWritten?: (at: string) => void }) {
  const Alert = useFeedback();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [phase, setPhase] = useState<NfcPhase | null>(null);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const session = useRef<NfcSession | null>(null);
  const alive = useRef(true);
  const running = useRef(false);
  const cancelRequested = useRef(false);
  const back = useRef(onBack);
  back.current = onBack;

  useEffect(() => {
    alive.current = true;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (running.current) return true;
      back.current();
      return true;
    });
    return () => { alive.current = false; listener.remove(); void session.current?.cancel().catch(() => {}); };
  }, []);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);

  // "Bring the tag closer" pulse while the phone waits for a tag.
  useEffect(() => {
    if (phase !== 'waiting' || reduceMotion) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [phase, reduceMotion, pulse]);

  function announce(message: string) {
    setStatus(message);
    AccessibilityInfo.announceForAccessibility(message);
  }

  async function run() {
    if (running.current) return;
    running.current = true;
    cancelRequested.current = false;
    setBusy(true);
    setResult(null);
    setPhase('checking');
    setStatus('Comprobando NFC…');
    try {
      const adapter = await createAdapter();
      if (!alive.current) return;
      if (cancelRequested.current) throw new Error('CANCELLED');
      const phaseMessages: Record<NfcPhase, string> = { checking: 'Comprobando NFC…', waiting: 'Esperando etiqueta. Acércala al teléfono.', reading: 'Leyendo etiqueta…', checkingTag: 'Comprobando etiqueta…', writing: 'Escribiendo… Mantén la etiqueta cerca.', verifying: 'Verificando… Mantén la etiqueta cerca.' };
      const current = new NfcSession(adapter, (value) => { if (alive.current) { setPhase(value); if (value === 'waiting') announce(phaseMessages[value]); else setStatus(phaseMessages[value]); } });
      session.current = current;
      const id = await current.run(object ? 'write' : 'read', object ? objectLink(object.id) : undefined);
      if (!alive.current) return;
      if (object) {
        const at = await markNfcWritten(object.id).catch(() => null);
        if (!alive.current) return;
        if (at) onWritten?.(at);
        haptic.success();
        setResult('success');
        announce('Etiqueta escrita y verificada. Acércala al teléfono, incluso con la app cerrada, para abrir este objeto.');
      }
      else {
        const found = await findActiveObject(id);
        if (!alive.current) return;
        if (found) { haptic.success(); onFound(found); }
        else {
          haptic.warning();
          setResult('error');
          const state = await objectState(id).catch(() => 'missing' as const);
          if (alive.current) announce(state === 'archived' ? 'Este objeto está archivado. Restáuralo desde «Objetos archivados» para ver su historia.' : 'Este objeto no está guardado en este teléfono. Puede haberse creado en otro dispositivo.');
        }
      }
    } catch (error) {
      if (alive.current) {
        const code = error instanceof Error ? error.message : '';
        if (code !== 'CANCELLED') { haptic.error(); setResult('error'); }
        announce(code === 'CANCELLED' ? 'Operación cancelada.' : messages[code] ?? 'No se pudo completar la operación NFC. Vuelve a intentarlo.');
      }
    } finally {
      session.current = null;
      running.current = false;
      if (alive.current) { setBusy(false); setPhase(null); }
    }
  }

  function start() {
    if (!object) { void run(); return; }
    Alert.alert('¿Escribir etiqueta NFC?', 'Se reemplazará todo el contenido actual de la etiqueta. Usa una etiqueta de prueba y mantenla cerca hasta completar la verificación.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar', style: 'destructive', onPress: () => void run() },
    ]);
  }

  return <SafeAreaView style={styles.page} edges={['top']}>
    <View style={styles.nav}><Pressable accessibilityRole="button" accessibilityLabel="Volver" disabled={busy} style={[styles.back, busy && styles.disabled]} onPress={onBack}><Ionicons name="arrow-back" size={22} color="#203934" /></Pressable><Text accessibilityRole="header" style={styles.navTitle}>Etiqueta NFC</Text><View style={styles.spacer} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.illustrationWrap} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {phase === 'waiting' && !reduceMotion && <Animated.View style={[styles.pulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]} />}
        <View style={[styles.illustration, result === 'success' && styles.illustrationSuccess, result === 'error' && styles.illustrationError]}><Ionicons name={result === 'success' ? 'checkmark' : result === 'error' ? 'alert' : 'radio-outline'} size={46} color={result === 'success' ? '#FFFFFF' : result === 'error' ? '#A33F43' : '#176B57'} /></View>
      </View>
      {phase === 'waiting' && <Text style={styles.howTo}>Acerca la etiqueta a la parte trasera del teléfono, cerca de la cámara, y mantenla quieta.</Text>}
      <Text accessibilityRole="header" style={styles.title}>{object ? `Etiqueta para ${object.name}` : 'Leer etiqueta NFC'}</Text>
      <Text style={styles.description}>{object ? 'Guarda el identificador de este objeto en una etiqueta NFC.' : 'Abre un objeto guardado en este dispositivo acercando su etiqueta.'}</Text>
      <View style={styles.notice}><Ionicons name="information-circle-outline" size={20} color="#176B57" /><Text style={styles.noticeText}>La etiqueta guarda solo un enlace al objeto, no su historia. Abre el objeto en este teléfono; en otro dispositivo no estará disponible.</Text></View>
      {!!status && <View style={styles.status}>{busy && <ActivityIndicator color="#176B57" />}<Text style={styles.statusText}>{status}</Text></View>}
      {!busy && <Pressable accessibilityRole="button" style={styles.primary} onPress={start}><Ionicons name="radio-outline" size={20} color="#fff" /><Text style={styles.primaryText}>{object ? 'Escribir etiqueta' : 'Leer etiqueta'}</Text></Pressable>}
      {busy && phase !== 'writing' && phase !== 'verifying' && <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => { cancelRequested.current = true; void session.current?.cancel().then((cancelled) => { if (!cancelled && alive.current) setStatus('Escritura en curso. Mantén la etiqueta cerca hasta terminar.'); }).catch(() => {}); }}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F8F6' }, nav: { minHeight: 74, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DBE7E1', alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.5 }, spacer: { width: 48 }, navTitle: { color: '#203934', fontSize: 16, fontWeight: '800' }, content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 48 }, illustrationWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }, pulse: { position: 'absolute', width: 128, height: 128, borderRadius: 64, backgroundColor: '#176B57' }, illustration: { width: 128, height: 128, borderRadius: 44, backgroundColor: '#E1EEE7', alignItems: 'center', justifyContent: 'center' }, illustrationSuccess: { backgroundColor: '#176B57' }, illustrationError: { backgroundColor: '#F6E3E3' }, howTo: { color: '#203934', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 4, maxWidth: 300, fontWeight: '600' }, title: { color: '#203934', fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 25 }, description: { color: '#526C65', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 12, maxWidth: 310 }, notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#E1EEE7', borderRadius: 15, padding: 16, marginTop: 24, width: '100%' }, noticeText: { color: '#203934', flex: 1, fontSize: 14, lineHeight: 20 }, status: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 22 }, statusText: { color: '#203934', flex: 1, fontSize: 15, lineHeight: 22 }, primary: { width: '100%', minHeight: 56, borderRadius: 16, backgroundColor: '#176B57', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' }, secondary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, secondaryText: { color: '#176B57', fontWeight: '700', fontSize: 15 },
});
