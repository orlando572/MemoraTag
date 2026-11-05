import { Ionicons } from '@expo/vector-icons';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { objectIdFromQr } from './qr';
import { findActiveObject, objectState } from './storage';
import { Button, NavBar, Screen } from './ui/components';
import { haptic } from './ui/feedback/haptics';
import { useStyles, useTheme } from './ui/theme';
import { radius, space, type, type Palette } from './ui/tokens';

type Problem = { text: string; archived?: boolean };

export function Scanner() {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  async function resolveQr(data: string) {
    const id = objectIdFromQr(data);
    if (!id) { haptic.error(); setProblem({ text: 'Este código no es de MemoraTag.' }); return; }
    try {
      const object = await findActiveObject(id);
      if (!object) {
        haptic.warning();
        const state = await objectState(id).catch(() => 'missing' as const);
        setProblem(state === 'archived' ? { text: 'Este objeto está archivado. Restáuralo para ver su historia.', archived: true } : { text: 'Este objeto no está en este teléfono.' });
        return;
      }
      haptic.success();
      router.replace(`/object/${object.id}`);
    } catch { haptic.error(); setProblem({ text: 'No se pudo consultar el almacenamiento. Vuelve a intentarlo.' }); }
  }

  async function scan(data: string) {
    if (locked.current) return;
    locked.current = true;
    await resolveQr(data);
  }

  async function chooseImage() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) { locked.current = false; return; }
      const codes = await scanFromURLAsync(result.assets[0].uri, ['qr']);
      if (codes.length === 0) { haptic.error(); setProblem({ text: 'No hay un código QR en esta imagen.' }); return; }
      // Prefer a MemoraTag QR when an image contains several codes.
      const code = codes.find((item) => objectIdFromQr(item.data)) ?? codes[0];
      await resolveQr(code.data);
    } catch { haptic.error(); setProblem({ text: 'No se pudo leer la imagen. Elige otra y vuelve a intentarlo.' }); }
    finally { setBusy(false); }
  }

  function retry() { locked.current = false; setProblem(null); }
  const cameraReady = !!permission?.granted;

  return <Screen dark>
    <NavBar title="Escanear objeto" onDark />
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.camera}>
        {cameraReady && <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={problem || busy ? undefined : ({ data }) => void scan(data)} />}
        {!cameraReady && <View style={s.placeholder}><Ionicons name="camera-outline" color={c.onScanner} size={40} /><Text style={s.cameraText}>Para escanear, MemoraTag necesita usar la cámara.</Text></View>}
        {cameraReady && !problem && <View pointerEvents="none" style={s.frame}><View style={[s.corner, s.tl]} /><View style={[s.corner, s.tr]} /><View style={[s.corner, s.bl]} /><View style={[s.corner, s.br]} /></View>}
      </View>

      {problem ? <View style={s.problem}>
        <Ionicons name={problem.archived ? 'archive-outline' : 'alert-circle-outline'} size={28} color={c.scannerMuted} style={{ alignSelf: 'center' }} />
        <Text accessibilityLiveRegion="assertive" style={s.problemText}>{problem.text}</Text>
        {problem.archived && <Button label="Ver objetos archivados" icon="archive-outline" onPress={() => router.replace('/archived')} />}
        <Button label="Escanear de nuevo" icon="scan-outline" variant="secondary" onPress={retry} />
      </View> : !cameraReady ? <Button label={permission && !permission.canAskAgain ? 'Abrir ajustes del teléfono' : 'Permitir la cámara'} icon="camera-outline" style={{ marginTop: space.xl }} onPress={() => { if (permission && !permission.canAskAgain) void Linking.openSettings(); else void requestPermission(); }} />
        : <Text style={s.hint}>Encuadra el código QR del objeto.</Text>}

      {!problem && <View style={s.alternatives}>
        {Platform.OS === 'android' && <Button label="Leer etiqueta NFC" icon="radio-outline" variant="secondary" onPress={() => router.replace('/scan-nfc')} disabled={busy} />}
        <Button label={busy ? 'Leyendo imagen…' : 'Elegir una foto del QR'} icon="images-outline" variant="secondary" onPress={() => void chooseImage()} disabled={busy} />
      </View>}
    </ScrollView>
  </Screen>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  camera: { aspectRatio: 1, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  placeholder: { alignItems: 'center', padding: space.xxxl, gap: space.lg },
  cameraText: { ...type.body, color: c.onScanner, textAlign: 'center' },
  frame: { width: '68%', aspectRatio: 1 },
  corner: { position: 'absolute', width: 38, height: 38, borderColor: c.onScanner },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  hint: { ...type.body, color: c.scannerMuted, textAlign: 'center', marginTop: space.xl },
  problem: { alignItems: 'stretch', gap: space.md, marginTop: space.xl },
  problemText: { ...type.body, color: c.onScanner, textAlign: 'center' },
  alternatives: { gap: space.md, marginTop: space.xxl },
} as const);
