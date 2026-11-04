import { Ionicons } from '@expo/vector-icons';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { objectIdFromQr } from './qr';
import { findActiveObject, objectState, type MemoryObject } from './storage';
import { haptic } from './ui/feedback/haptics';

export function Scanner({ onBack, onFound, onReadNfc, onShowArchived }: { onBack: () => void; onFound: (object: MemoryObject) => void; onReadNfc: () => void; onShowArchived: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState('');
  const [archived, setArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  async function resolveQr(data: string) {
    const id = objectIdFromQr(data);
    if (!id) { haptic.error(); setMessage('Este código no pertenece a MemoraTag.'); return; }
    try {
      const object = await findActiveObject(id);
      if (!object) {
        haptic.warning();
        const state = await objectState(id).catch(() => 'missing' as const);
        setArchived(state === 'archived');
        setMessage(state === 'archived' ? 'Este objeto está archivado. Restáuralo para ver su historia.' : 'Este objeto no está guardado en este teléfono. Puede haberse creado en otro dispositivo.');
        return;
      }
      haptic.success();
      onFound(object);
    } catch { haptic.error(); setMessage('No se pudo consultar el almacenamiento. Vuelve a intentarlo.'); }
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
      if (codes.length === 0) { haptic.error(); setMessage('No se encontró un código QR en esta imagen.'); return; }
      // Prefer a MemoraTag QR when an image contains several codes.
      const code = codes.find((item) => objectIdFromQr(item.data)) ?? codes[0];
      await resolveQr(code.data);
    } catch { setMessage('No se pudo leer la imagen. Elige otra y vuelve a intentarlo.'); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.page}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={onBack}><Ionicons name="arrow-back" size={23} color="#fff" /></Pressable><Text accessibilityRole="header" style={styles.title}>Escanear objeto</Text><View style={styles.spacer} /></View>
    <View style={styles.content}>
      <View style={styles.camera}>
        {permission?.granted && <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={message || busy ? undefined : ({ data }) => void scan(data)} />}
        {!permission?.granted && <View style={styles.permissionPlaceholder}><Ionicons name="camera-outline" color="#fff" size={36} /><Text style={styles.cameraText}>Permite el acceso a la cámara para escanear el QR.</Text></View>}
        {permission?.granted && !message && <View pointerEvents="none" style={styles.frame} />}
      </View>
      {message ? <View style={styles.message}><Text accessibilityLiveRegion="assertive" style={styles.messageText}>{message}</Text>{archived && <Pressable accessibilityRole="button" style={styles.action} onPress={onShowArchived}><Text style={styles.actionText}>Ver objetos archivados</Text></Pressable>}<Pressable accessibilityRole="button" style={archived ? styles.galleryAction : styles.action} onPress={() => { locked.current = false; setArchived(false); setMessage(''); }}><Text style={archived ? styles.galleryText : styles.actionText}>Escanear de nuevo</Text></Pressable></View> : !permission?.granted ? <Pressable accessibilityRole="button" style={styles.action} onPress={() => { if (permission && !permission.canAskAgain) void Linking.openSettings(); else void requestPermission(); }}><Text style={styles.actionText}>{permission && !permission.canAskAgain ? 'Abrir ajustes' : 'Activar cámara'}</Text></Pressable> : <Text style={styles.hint}>Apunta al QR del objeto.{Platform.OS === 'android' ? ' También puedes acercar su etiqueta NFC a la parte trasera del teléfono.' : ''}</Text>}
      {!message && <Pressable accessibilityRole="button" disabled={busy} style={[styles.galleryAction, busy && { opacity: 0.6 }]} onPress={() => void chooseImage()}><Ionicons name="images-outline" size={20} color="#fff" /><Text style={styles.galleryText}>{busy ? 'Leyendo imagen…' : 'Elegir imagen de la galería'}</Text></Pressable>}
      {!message && <Pressable accessibilityRole="button" disabled={busy} style={[styles.galleryAction, busy && { opacity: 0.6 }]} onPress={onReadNfc}><Ionicons name="radio-outline" size={20} color="#fff" /><Text style={styles.galleryText}>Leer etiqueta NFC</Text></Pressable>}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#172D27' }, header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, back: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#304B40', alignItems: 'center', justifyContent: 'center' }, spacer: { width: 48 }, title: { color: '#fff', fontWeight: '700', fontSize: 16 }, content: { flex: 1, paddingHorizontal: 20, paddingTop: 28 }, camera: { height: '60%', maxHeight: 480, minHeight: 260, borderRadius: 22, overflow: 'hidden', backgroundColor: '#304B40', justifyContent: 'center', alignItems: 'center' }, frame: { width: '70%', aspectRatio: 1, borderWidth: 2, borderColor: '#E1EEE7', borderRadius: 22 }, permissionPlaceholder: { alignItems: 'center', padding: 30, gap: 15 }, cameraText: { color: '#fff', textAlign: 'center', fontSize: 16, lineHeight: 23 }, hint: { color: '#C7D8CC', textAlign: 'center', fontSize: 14, lineHeight: 21, marginTop: 25 }, action: { backgroundColor: '#fff', minHeight: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 }, actionText: { color: '#176B57', fontWeight: '700', fontSize: 15 }, message: { paddingTop: 20 }, messageText: { color: '#fff', textAlign: 'center', fontSize: 15, lineHeight: 22 }, galleryAction: { minHeight: 50, marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#89A59A', flexDirection: 'row', gap: 9, justifyContent: 'center', alignItems: 'center' }, galleryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
