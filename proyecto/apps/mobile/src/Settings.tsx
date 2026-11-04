import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveLocalName } from './storage';
import { createBackupDocument } from './backup-export';
import { applyBackupImport, prepareBackupImport, type PreparedImport } from './backup-import';
import { getStorageUsage } from './storage-usage';
import { useKeyboardScroll } from './useKeyboardScroll';
import { useFeedback } from './ui/feedback/FeedbackProvider';

type Usage = Awaited<ReturnType<typeof getStorageUsage>>;
type NfcState = 'checking' | 'enabled' | 'disabled' | 'unsupported' | 'expo' | 'platform' | 'error';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const nfcMessages: Record<NfcState, string> = {
  checking: 'Consultando…', enabled: 'Disponible y activado', disabled: 'Disponible, pero desactivado', unsupported: 'Este dispositivo no admite NFC', expo: 'NFC no está disponible en Expo Go', platform: 'NFC solo está preparado para Android', error: 'No se pudo consultar el estado',
};

export function Settings({ name, onNameChange, onImported, onBack }: { name: string; onNameChange: (name: string) => void; onImported: (name: string | null) => Promise<boolean>; onBack: () => void }) {
  const Alert = useFeedback();
  const insets = useSafeAreaInsets();
  const scroll = useKeyboardScroll();
  const nameInput = useRef<TextInput>(null);
  const mounted = useRef(true);
  const back = useRef(onBack);
  const busyRef = useRef(false);
  back.current = onBack;
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const nameSavingRef = useRef(false);
  const [nameError, setNameError] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageError, setUsageError] = useState(false);
  const [nfc, setNfc] = useState<NfcState>('checking');
  const [busy, setBusy] = useState(false);
  const [operationStatus, setOperationStatus] = useState('');
  const [prepared, setPrepared] = useState<PreparedImport | null>(null);
  const [conflictChoice, setConflictChoice] = useState<'current' | 'incoming' | null>(null);
  const [useProfile, setUseProfile] = useState(false);

  useEffect(() => { setDraft(name); }, [name]);

  const refreshUsage = useCallback(async () => {
    try { const value = await getStorageUsage(); if (mounted.current) { setUsage(value); setUsageError(false); } }
    catch { if (mounted.current) setUsageError(true); }
  }, []);

  const refreshNfc = useCallback(async () => {
    if (Platform.OS !== 'android') { setNfc('platform'); return; }
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) { setNfc('expo'); return; }
    try {
      const { default: manager } = await import('react-native-nfc-manager');
      const supported = await manager.isSupported();
      const state = !supported ? 'unsupported' : await manager.isEnabled() ? 'enabled' : 'disabled';
      if (mounted.current) setNfc(state);
    } catch { if (mounted.current) setNfc('error'); }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refreshUsage();
    void refreshNfc();
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') { void refreshUsage(); void refreshNfc(); } });
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { if (!busyRef.current && !nameSavingRef.current) back.current(); return true; });
    return () => { mounted.current = false; appState.remove(); handler.remove(); };
  }, [refreshUsage, refreshNfc]);

  async function saveName() {
    const clean = draft.trim();
    if (!clean) { setNameError(true); nameInput.current?.focus(); return; }
    if (nameSavingRef.current || busyRef.current) return;
    nameSavingRef.current = true;
    setSaving(true);
    try { await saveLocalName(clean); onNameChange(clean); setDraft(clean); nameInput.current?.blur(); Alert.toast('Nombre actualizado'); }
    catch { Alert.alert('No se pudo guardar el nombre', 'Vuelve a intentarlo.'); }
    finally { nameSavingRef.current = false; if (mounted.current) setSaving(false); }
  }

  function setOperation(value: boolean) { busyRef.current = value; setBusy(value); }

  function exportBackup() {
    Alert.alert('Crear respaldo', 'La copia contiene tus datos y archivos sin cifrar. Guárdala en un lugar seguro. El menú no confirma si se guardó; comprueba la recuperación antes de depender de esta copia.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar', onPress: () => { void (async () => {
        if (busyRef.current || saving) return;
        setOperationStatus('Preparando datos…');
        setOperation(true);
        let temporary: string | null = null;
        try {
          if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) throw new Error('SHARE_UNAVAILABLE');
          const output = await createBackupDocument((message) => { if (mounted.current) setOperationStatus(message); });
          const candidate = `${FileSystem.cacheDirectory}memoratag-respaldo-${Crypto.randomUUID()}.json`;
          if ((await FileSystem.getInfoAsync(candidate)).exists) throw new Error('BACKUP_FILE_WRITE');
          temporary = candidate;
          await FileSystem.writeAsStringAsync(temporary, output);
          setOperationStatus('Respaldo listo para compartir.');
          await Sharing.shareAsync(temporary, { mimeType: 'application/json', dialogTitle: 'Guardar respaldo de MemoraTag' });
        } catch (error) {
          const code = error instanceof Error ? error.message : '';
          const message = code === 'BACKUP_FILE_MISSING' ? 'Falta un archivo asociado. No se creó un respaldo incompleto.' : code === 'BACKUP_LIMIT' ? 'La información supera el límite del respaldo: 20 MiB en archivos y 32 MiB en total.' : code === 'SHARE_UNAVAILABLE' ? 'Este dispositivo no permite compartir el archivo.' : 'No se pudo crear la copia. Comprueba el almacenamiento e inténtalo de nuevo.';
          Alert.alert('No se pudo crear el respaldo', message);
        } finally {
          if (temporary) await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
          if (mounted.current) setOperation(false); else busyRef.current = false;
        }
      })(); } },
    ]);
  }

  async function selectBackup() {
    if (busyRef.current || saving) return;
    setOperationStatus('Selecciona un respaldo…');
    setOperation(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: Platform.OS !== 'android', multiple: false });
      if (result.canceled) return;
      const item = result.assets[0];
      const preview = await prepareBackupImport(item.uri, item.size, (message) => { if (mounted.current) setOperationStatus(message); });
      if (mounted.current) { setPrepared(preview); setConflictChoice(null); setUseProfile(false); }
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const message = code === 'BACKUP_SIZE' || code === 'BACKUP_LIMIT' ? 'El archivo o los datos actuales superan los límites admitidos, o no se pudo comprobar el tamaño.' : code === 'BACKUP_FILE_MISSING' ? 'Falta un archivo de tus datos actuales. No se modificó nada.' : code === 'BACKUP_SPACE' ? 'No hay espacio suficiente para preparar los archivos.' : code === 'BACKUP_SPACE_UNKNOWN' ? 'No se pudo comprobar el espacio libre. No se modificó nada.' : 'El archivo no es un respaldo válido o no se pudo leer. No se modificó nada.';
      Alert.alert('No se pudo preparar la importación', message);
    } finally { if (mounted.current) setOperation(false); else busyRef.current = false; }
  }

  function confirmImport() {
    if (!prepared || busyRef.current || saving) return;
    const conflicts = prepared.plan.objectConflicts.length + prepared.plan.eventConflicts.length;
    if (conflicts && !conflictChoice) { Alert.alert('Elige cómo resolver los conflictos', 'Selecciona qué versión conservar antes de continuar.'); return; }
    const warning = conflictChoice === 'incoming' && conflicts ? `Se reemplazarán ${conflicts} registros existentes; ${prepared.plan.archiveChanges} objetos cambiarán su estado de archivo. ` : 'Los registros existentes se conservarán. ';
    Alert.alert('¿Importar respaldo?', `${warning}Se añadirán ${prepared.plan.newObjects.length} objetos y ${prepared.plan.newEvents.length} eventos nuevos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Importar', style: conflictChoice === 'incoming' && conflicts ? 'destructive' : 'default', onPress: () => { void (async () => {
        if (busyRef.current) return;
        setOperationStatus('Comprobando datos actuales…');
        setOperation(true);
        try {
          const result = await applyBackupImport(prepared, conflictChoice ?? 'current', useProfile, (message) => { if (mounted.current) setOperationStatus(message); });
          setPrepared(null);
          void refreshUsage();
          const refreshed = await onImported(result.name).catch(() => false);
          if (refreshed) Alert.toast(`Importación completada: ${result.objects} objetos y ${result.events} eventos.`);
          else Alert.alert('Importación completada', 'Los datos se guardaron, pero no se pudo actualizar la lista. Vuelve a la pantalla principal y pulsa Reintentar.');
        } catch (error) {
          const code = error instanceof Error ? error.message : '';
          const message = code === 'BACKUP_STALE' ? 'Los datos cambiaron desde la revisión. Selecciona el respaldo de nuevo.' : code === 'BACKUP_SPACE' ? 'No hay espacio suficiente para preparar los archivos.' : code === 'BACKUP_SPACE_UNKNOWN' ? 'No se pudo comprobar el espacio libre.' : 'No se pudo completar la importación. Vuelve a intentarlo.';
          Alert.alert('No se pudo importar', message);
          setPrepared(null);
        } finally { if (mounted.current) setOperation(false); else busyRef.current = false; }
      })(); } },
    ]);
  }

  async function openNfcSettings() {
    try {
      if (Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
        const { default: manager } = await import('react-native-nfc-manager');
        if (await manager.goToNfcSetting()) return;
      }
      await Linking.openSettings();
    } catch { Alert.alert('No se pudieron abrir los ajustes', 'Abre los ajustes de NFC desde la configuración del teléfono.'); }
  }

  return <SafeAreaView style={styles.page} edges={['top']}><KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.nav}><Pressable accessibilityRole="button" accessibilityLabel="Volver" disabled={busy || saving} onPress={onBack} style={[styles.back, (busy || saving) && styles.disabled]}><Ionicons name="arrow-back" size={22} color="#203934" /></Pressable><Text style={styles.navTitle}>Ajustes</Text><View style={styles.spacer} /></View>
    {busy && <View accessibilityLiveRegion="polite" style={styles.progress}><ActivityIndicator color="#176B57" /><Text style={styles.hint}>{operationStatus} No cierres la aplicación.</Text></View>}
    <ScrollView pointerEvents={busy ? 'none' : 'auto'} accessibilityElementsHidden={busy} importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'} ref={scroll.scrollRef} onLayout={scroll.onLayout} onScroll={scroll.onScroll} onContentSizeChange={scroll.onContentSizeChange} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + scroll.extraSpace }]}>
      <Text style={styles.section}>Perfil</Text><View style={styles.card}><Text style={styles.label}>Nombre</Text><TextInput ref={nameInput} onFocus={() => scroll.focus(nameInput)} onBlur={() => scroll.blur(nameInput)} editable={!saving} accessibilityLabel="Nombre" accessibilityHint={nameError ? 'Escribe tu nombre para continuar' : undefined} maxLength={60} value={draft} onChangeText={(value) => { setDraft(value); if (value.trim()) setNameError(false); }} autoCapitalize="words" style={[styles.input, nameError && styles.invalidInput]} />{nameError && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>Escribe tu nombre para continuar.</Text>}<Text style={styles.hint}>Este nombre se guarda en este dispositivo. No es una cuenta.</Text><View style={styles.nameActions}><Pressable accessibilityRole="button" disabled={saving || draft.trim() === name} onPress={() => void saveName()} style={[styles.button, (saving || draft.trim() === name) && styles.disabled]}>{saving ? <View style={styles.savingRow}><ActivityIndicator color="#fff" /><Text style={styles.buttonText}>Guardando…</Text></View> : <Text style={styles.buttonText}>Guardar nombre</Text>}</Pressable>{draft !== name && <Pressable accessibilityRole="button" disabled={saving} onPress={() => { setDraft(name); setNameError(false); nameInput.current?.blur(); }}><Text style={styles.link}>Cancelar</Text></Pressable>}</View></View>
      <Text style={styles.section}>Datos y respaldo</Text><View style={styles.card}><Text style={styles.hint}>El respaldo incluye tus objetos, eventos, fotos y documentos. No está cifrado.</Text><Pressable accessibilityRole="button" disabled={saving} style={[styles.button, saving && styles.disabled]} onPress={exportBackup}><Text style={styles.buttonText}>Exportar respaldo</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={() => void selectBackup()}><Text style={styles.link}>Seleccionar respaldo para importar</Text></Pressable><Text style={styles.hint}>El sistema no confirma si guardaste la copia compartida.</Text>
        {prepared && <><View style={styles.divider} /><Text style={styles.label}>Revisar respaldo</Text><Text style={styles.hint}>{prepared.incoming.objects.filter((item) => item.archived_at === null).length} objetos activos · {prepared.incoming.objects.filter((item) => item.archived_at !== null).length} archivados · {prepared.incoming.events.length} eventos · {prepared.incoming.files.length} archivos</Text><Text style={styles.hint}>Espacio estimado para archivos: hasta {formatBytes(prepared.requiredBytes)}.</Text><Text style={styles.hint}>{prepared.plan.newObjects.length} objetos y {prepared.plan.newEvents.length} eventos nuevos. {prepared.plan.unchangedObjects + prepared.plan.unchangedEvents} registros sin cambios.</Text><Text style={styles.hint}>Conflictos: {prepared.plan.objectConflicts.length} objetos y {prepared.plan.eventConflicts.length} eventos.</Text>{prepared.plan.archiveChanges > 0 && <Text style={styles.warning}>{prepared.plan.archiveChanges} objetos tienen un estado de archivo diferente.</Text>}
          {prepared.plan.objectConflicts.slice(0, 5).map(({ incoming }) => <Text key={incoming.id} style={styles.hint}>Objeto: {incoming.name}</Text>)}{prepared.plan.eventConflicts.slice(0, 5).map(({ incoming }) => <Text key={incoming.id} style={styles.hint}>Evento: {incoming.title}</Text>)}{(prepared.plan.objectConflicts.length > 5 || prepared.plan.eventConflicts.length > 5) && <Text style={styles.hint}>Se muestran hasta cinco conflictos de cada tipo.</Text>}
          {(prepared.plan.objectConflicts.length + prepared.plan.eventConflicts.length > 0) && <><Text style={styles.label}>Para todos los conflictos</Text>{(['current', 'incoming'] as const).map((choice) => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ selected: conflictChoice === choice }} style={styles.choice} onPress={() => setConflictChoice(choice)}><Ionicons name={conflictChoice === choice ? 'radio-button-on' : 'radio-button-off'} size={21} color="#176B57" /><Text style={styles.rowLabel}>{choice === 'current' ? 'Conservar versiones actuales' : 'Usar versiones del respaldo'}</Text></Pressable>)}</>}
          {prepared.incoming.profile && prepared.plan.profileChanged && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: useProfile }} style={styles.choice} onPress={() => setUseProfile(!useProfile)}><Ionicons name={useProfile ? 'checkbox' : 'square-outline'} size={21} color="#176B57" /><Text style={styles.rowLabel}>Usar el nombre del respaldo</Text></Pressable>}
          <View style={styles.nameActions}><Pressable accessibilityRole="button" style={styles.button} onPress={confirmImport}><Text style={styles.buttonText}>Importar</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPrepared(null)}><Text style={styles.link}>Cancelar</Text></Pressable></View>
        </>}
      </View>
      <Text style={styles.section}>Almacenamiento</Text><View style={styles.card}>{usageError ? <><Text style={styles.hint}>No se pudo consultar el almacenamiento.</Text><Pressable accessibilityRole="button" onPress={() => void refreshUsage()}><Text style={styles.link}>Reintentar</Text></Pressable></> : !usage ? <ActivityIndicator color="#176B57" /> : <><View style={styles.row}><Text style={styles.rowLabel}>Fotografías</Text><Text style={styles.rowValue}>{formatBytes(usage.photoBytes)}</Text></View><View style={styles.row}><Text style={styles.rowLabel}>Documentos</Text><Text style={styles.rowValue}>{formatBytes(usage.documentBytes)}</Text></View><View style={styles.row}><Text style={styles.rowLabel}>Total de archivos</Text><Text style={styles.rowValue}>{formatBytes(usage.photoBytes + usage.documentBytes)}</Text></View><View style={styles.divider} /><Text style={styles.hint}>{usage.active} objetos activos · {usage.archived} archivados · {usage.events} eventos</Text>{usage.missing > 0 && <Text style={styles.warning}>{usage.missing} archivos no están disponibles y no se incluyen en el tamaño.</Text>}</>}</View>
      <Text style={styles.section}>NFC</Text><View style={styles.card}><View style={styles.row}><Text style={styles.rowLabel}>Estado</Text><Text style={styles.nfcValue}>{nfcMessages[nfc]}</Text></View><Pressable accessibilityRole="button" onPress={() => void refreshNfc()}><Text style={styles.link}>Consultar de nuevo</Text></Pressable>{Platform.OS === 'android' && nfc === 'disabled' && <Pressable accessibilityRole="button" onPress={() => void openNfcSettings()}><Text style={styles.link}>Abrir ajustes del teléfono</Text></Pressable>}</View>
      <Text style={styles.section}>Acerca de MemoraTag</Text><View style={styles.card}><View style={styles.row}><Text style={styles.rowLabel}>Versión</Text><Text style={styles.rowValue}>{Constants.expoConfig?.version ?? 'No disponible'}</Text></View><Text style={styles.hint}>Tus objetos, eventos y archivos se guardan en este dispositivo. Podrían perderse si borras los datos de la aplicación o pierdes el teléfono.</Text></View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  invalidInput: { borderColor: '#A33F43', borderWidth: 2 }, fieldError: { color: '#A33F43', fontSize: 13 }, savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  page: { flex: 1, backgroundColor: '#F5F8F6' }, fill: { flex: 1 }, nav: { height: 74, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DBE7E1', justifyContent: 'center', alignItems: 'center' }, spacer: { width: 44 }, navTitle: { color: '#203934', fontSize: 16, fontWeight: '800' }, content: { paddingHorizontal: 20, paddingTop: 8 }, section: { color: '#203934', fontSize: 19, fontWeight: '700', marginTop: 20, marginBottom: 12 }, card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DBE7E1', borderRadius: 18, padding: 18, gap: 10 }, label: { color: '#203934', fontSize: 14, fontWeight: '700' }, input: { height: 54, borderWidth: 1, borderColor: '#DBE7E1', borderRadius: 14, paddingHorizontal: 14, color: '#203934', fontSize: 16 }, hint: { color: '#526C65', fontSize: 14, lineHeight: 21 }, progress: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 10 }, choice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }, nameActions: { flexDirection: 'row', alignItems: 'center', gap: 18 }, button: { alignSelf: 'flex-start', backgroundColor: '#176B57', borderRadius: 13, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', marginTop: 3 }, disabled: { opacity: 0.5 }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, rowLabel: { color: '#203934', fontSize: 15 }, rowValue: { color: '#203934', fontSize: 15, fontWeight: '700' }, nfcValue: { color: '#526C65', fontSize: 14, textAlign: 'right', flexShrink: 1 }, divider: { height: 1, backgroundColor: '#DBE7E1', marginVertical: 3 }, warning: { color: '#924C23', fontSize: 14, lineHeight: 20 }, link: { color: '#176B57', fontSize: 14, fontWeight: '700', paddingVertical: 6 },
});
