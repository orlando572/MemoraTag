import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Platform, ScrollView, Text, View } from 'react-native';
import { NfcSession, type NfcAdapter, type NfcPhase } from './nfc-session';
import { objectLink } from './qr';
import { findActiveObject, markNfcWritten, objectState, type MemoryObject } from './storage';
import { useFeedback } from './ui/feedback/FeedbackProvider';
import { haptic } from './ui/feedback/haptics';
import { Button, NavBar, Screen } from './ui/components';
import { useStyles, useTheme } from './ui/theme';
import { radius, space, type, type Palette } from './ui/tokens';

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
  INVALID_TAG: 'Esta etiqueta está vacía o no es de MemoraTag. Puedes vincularla desde un objeto.',
  READ_ONLY: 'La etiqueta no permite escritura o no se pudo comprobar.',
  CAPACITY: 'La etiqueta no tiene espacio suficiente.',
  NO_TAG: 'No se pudo leer la etiqueta. Vuelve a intentarlo.',
  TIMEOUT: 'No se detectó ninguna etiqueta en 12 segundos. Acércala y vuelve a intentarlo.',
  WRITE_UNCONFIRMED: 'No se pudo confirmar la escritura. La etiqueta podría haberse modificado; léela antes de volver a escribirla.',
  BUSY: 'Ya hay una operación NFC en curso.',
};

export function NfcScreen({ object, onFound, onWritten }: { object?: MemoryObject; onFound?: (object: MemoryObject) => void; onWritten?: (at: string) => void }) {
  const Alert = useFeedback();
  const { c } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const [archivedFound, setArchivedFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [phase, setPhase] = useState<NfcPhase | null>(null);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorCode, setErrorCode] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const session = useRef<NfcSession | null>(null);
  const alive = useRef(true);
  const running = useRef(false);
  const cancelRequested = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; void session.current?.cancel().catch(() => {}); };
  }, []);
  // Leaving is blocked only while a write is in progress, so the tag is never left half written.
  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (!running.current || (phase !== 'writing' && phase !== 'verifying')) return;
    event.preventDefault();
    announce('Escritura en curso. Mantén la etiqueta cerca hasta terminar.');
  }), [navigation, phase]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setErrorCode('');
    setArchivedFound(false);
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
        if (found) { haptic.success(); onFound?.(found); }
        else {
          haptic.warning();
          setResult('error');
          const state = await objectState(id).catch(() => 'missing' as const);
          if (alive.current) setArchivedFound(state === 'archived');
          if (alive.current) announce(state === 'archived' ? 'Este objeto está archivado. Restáuralo desde «Objetos archivados» para ver su historia.' : 'Este objeto no está guardado en este teléfono. Puede haberse creado en otro dispositivo.');
        }
      }
    } catch (error) {
      if (alive.current) {
        const code = error instanceof Error ? error.message : '';
        setErrorCode(code);
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
    Alert.alert('¿Escribir etiqueta NFC?', 'Se reemplazará el contenido de la etiqueta.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar', style: 'destructive', onPress: () => void run() },
    ]);
  }

  const tone = result === 'success' ? c.success : result === 'error' ? c.danger : c.primary;
  const soft = result === 'success' ? c.successSoft : result === 'error' ? c.dangerSoft : c.primarySoft;
  const writing = phase === 'writing' || phase === 'verifying';
  const cannotRetry = result === 'error' && ['UNSUPPORTED', 'ANDROID_ONLY', 'DEV_BUILD'].includes(errorCode);
  return <Screen>
    <NavBar title={object ? 'Vincular etiqueta NFC' : 'Leer etiqueta NFC'} disabled={busy && writing} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.illustrationWrap} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {phase === 'waiting' && !reduceMotion && <Animated.View style={[styles.pulse, { backgroundColor: c.primary, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]} />}
        <View style={[styles.illustration, { backgroundColor: result === 'success' ? c.success : soft }]}>
          <Ionicons name={result === 'success' ? 'checkmark' : result === 'error' ? 'alert' : phase === 'waiting' ? 'phone-portrait-outline' : 'radio-outline'} size={50} color={result === 'success' ? c.onPrimary : tone} />
        </View>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{object ? object.name : 'Acerca una etiqueta'}</Text>
      <Text style={styles.description}>{phase === 'waiting' ? 'Acerca la etiqueta a la parte trasera del teléfono, cerca de la cámara, y mantenla quieta.' : object ? (object.nfc_written_at ? 'Este objeto ya tiene una etiqueta. Puedes escribir otra o reemplazarla.' : 'Graba el enlace de este objeto en una etiqueta NFC.') : 'Abre la historia de un objeto acercando su etiqueta NFC.'}</Text>
      {!!status && <View accessibilityLiveRegion="none" style={[styles.status, { backgroundColor: soft }]}>
        {busy ? <ActivityIndicator color={tone} /> : <Ionicons name={result === 'success' ? 'checkmark-circle' : result === 'error' ? 'alert-circle' : 'information-circle'} size={22} color={tone} />}
        <Text style={[styles.statusText, { color: c.ink }]}>{status}</Text>
      </View>}
      <View style={styles.actions}>
        {/* Retrying cannot help when the phone has no NFC (or this build cannot use it), so no button is offered. */}
        {!busy && !cannotRetry && <Button label={result === 'success' ? 'Escribir otra etiqueta' : result === 'error' ? 'Reintentar' : object ? 'Escribir etiqueta' : 'Leer etiqueta'} icon="radio-outline" variant={result === 'success' ? 'secondary' : 'primary'} onPress={start} />}
        {!busy && result === 'success' && object && <Button label="Volver al objeto" icon="arrow-back" onPress={() => router.back()} />}
        {!busy && archivedFound && <Button label="Ver objetos archivados" icon="archive-outline" variant="secondary" onPress={() => router.replace('/archived')} />}
        {busy && !writing && <Button label="Cancelar" variant="ghost" onPress={() => { cancelRequested.current = true; void session.current?.cancel().catch(() => {}); }} />}
      </View>
      <View style={styles.notice}>
        <Ionicons name="lock-closed-outline" size={18} color={c.muted} />
        <Text style={styles.noticeText}>Solo guarda un enlace, no la historia. Usa etiquetas NTAG213 o NTAG215.</Text>
      </View>
    </ScrollView>
  </Screen>;
}

const makeStyles = (c: Palette) => ({
  content: { alignItems: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  illustrationWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 136, height: 136, borderRadius: 68 },
  illustration: { width: 136, height: 136, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: c.ink, textAlign: 'center' },
  description: { ...type.body, color: c.muted, textAlign: 'center', marginTop: space.sm, maxWidth: 330 },
  status: { flexDirection: 'row', gap: space.md, alignItems: 'center', marginTop: space.xl, padding: space.lg, borderRadius: radius.lg, width: '100%' },
  statusText: { ...type.body, flex: 1 },
  actions: { width: '100%', gap: space.md, marginTop: space.xl },
  notice: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', marginTop: space.xxl },
  noticeText: { ...type.secondary, color: c.muted, flex: 1 },
} as const);
