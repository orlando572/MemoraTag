import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, NavBar, Screen, TextField } from './ui/components';
import { useStyles, useTheme } from './ui/theme';
import { radius, space, type, type Palette } from './ui/tokens';
import { saveLocalName, type ThemeMode } from './storage';
import { createBackupDocument } from './backup-export';
import { applyBackupImport, prepareBackupImport, type PreparedImport } from './backup-import';
import { getStorageUsage } from './storage-usage';
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

export function Settings({ name, onNameChange, onImported, onShowTutorial, themeMode, onThemeMode }: { name: string; onNameChange: (name: string) => void; onImported: (name: string | null) => Promise<boolean>; onShowTutorial: () => void; themeMode: ThemeMode; onThemeMode: (mode: ThemeMode) => Promise<void> }) {
  const Alert = useFeedback();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const styles = useStyles(makeStyles);
  const navigation = useNavigation();
  const nameInput = useRef<TextInput>(null);
  const mounted = useRef(true);
  const busyRef = useRef(false);
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
    // A backup or import in progress must finish before leaving the screen.
    const leave = navigation.addListener('beforeRemove', (event) => { if (busyRef.current || nameSavingRef.current) event.preventDefault(); });
    return () => { mounted.current = false; appState.remove(); leave(); };
  }, [refreshUsage, refreshNfc, navigation]);

  async function saveName() {
    const clean = draft.trim();
    if (!clean) { setNameError(true); nameInput.current?.focus(); return; }
    if (nameSavingRef.current || busyRef.current) return;
    nameSavingRef.current = true;
    setSaving(true);
    try { await saveLocalName(clean); onNameChange(clean); setDraft(clean); nameInput.current?.blur(); Alert.toast('Nombre actualizado'); }
    catch { Alert.error('No se pudo guardar el nombre', 'Vuelve a intentarlo.'); }
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
          Alert.error('No se pudo crear el respaldo', message);
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
      Alert.error('No se pudo preparar la importación', message);
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
          Alert.error('No se pudo importar', message);
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
    } catch { Alert.error('No se pudieron abrir los ajustes', 'Abre los ajustes de NFC desde la configuración del teléfono.'); }
  }

  const nfcTone = nfc === 'enabled' ? c.success : nfc === 'disabled' ? c.warning : c.muted;
  return <Screen>
    <NavBar title="Ajustes y ayuda" disabled={busy || saving} />
    {busy && <View accessibilityLiveRegion="polite" style={styles.progress}><ActivityIndicator color={c.primary} /><Text style={styles.progressText}>{operationStatus} No cierres la aplicación.</Text></View>}
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView pointerEvents={busy ? 'none' : 'auto'} accessibilityElementsHidden={busy} importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + space.xl }]}>
      <Section title="Tu perfil" icon="person-circle-outline">
        <TextField ref={nameInput} label="Nombre" value={draft} maxLength={60} editable={!saving} autoCapitalize="words" flush
          error={nameError ? 'Escribe tu nombre para continuar.' : undefined} onChangeText={(value) => { setDraft(value); if (value.trim()) setNameError(false); }} style={{ marginBottom: 0 }} />
        {draft !== name && <View style={styles.row}>
          <Button label={saving ? 'Guardando…' : 'Guardar nombre'} icon="checkmark" loading={saving} disabled={!draft.trim()} onPress={() => void saveName()} style={{ flex: 1 }} />
          <Button label="Cancelar" variant="ghost" disabled={saving} onPress={() => { setDraft(name); setNameError(false); nameInput.current?.blur(); }} />
        </View>}
      </Section>

      <Section title="Apariencia" icon="color-palette-outline">
        <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
          {themeOptions.map((option) => {
            const selected = themeMode === option.mode;
            return <Pressable key={option.mode} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={option.detail ? `${option.label}. ${option.detail}` : option.label}
              onPress={() => { if (!selected) void onThemeMode(option.mode).catch(() => Alert.error('No se pudo guardar la preferencia', 'El tema se aplicó, pero volverá al anterior al reiniciar la app.')); }}
              style={({ pressed }) => [styles.themeOption, selected && { borderColor: c.primary, borderWidth: 2, backgroundColor: c.primarySoft }, pressed && { opacity: 0.75 }]}>
              <Ionicons name={option.icon} size={22} color={selected ? c.onPrimarySoft : c.ink} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, selected && { color: c.onPrimarySoft }]}>{option.label}</Text>
                {!!option.detail && <Text style={[styles.hint, selected && { color: c.onPrimarySoft }]}>{option.detail}</Text>}
              </View>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? c.onPrimarySoft : c.muted} />
            </Pressable>;
          })}
        </View>
      </Section>

      <Section title="Ayuda" icon="help-buoy-outline">
        <Help icon="qr-code-outline" title="Abrir un objeto con su QR" text="Dentro del objeto, toca «Código QR» y compártelo para imprimirlo. Para abrirlo, usa «Escanear» o la cámara del teléfono." />
        {Platform.OS === 'android' && <Help icon="radio-outline" title="Usar una etiqueta NFC" text="Dentro del objeto, toca «Etiqueta NFC» y acerca una NTAG213/215 a la parte trasera del teléfono hasta que se verifique. Después se abre al acercarla, incluso con la app cerrada." />}
        <Help icon="alert-circle-outline" title="Incidencias" text="Registra una incidencia cuando algo falle y márcala como resuelta al arreglarlo. El objeto muestra cuántas siguen abiertas." />
        <Help icon="arrow-undo-outline" title="Deshacer" text="Al archivar un objeto o borrar un evento aparece «Deshacer» durante unos segundos." />
        <Help icon="phone-portrait-outline" title="Si un código no abre nada" text="Los datos solo están en el teléfono donde creaste el objeto. Si lo archivaste, restáuralo desde «Objetos archivados»." />
        <Button label="Ver el tutorial de nuevo" icon="play-circle-outline" variant="secondary" onPress={onShowTutorial} />
      </Section>

      <Section title="Respaldo" icon="cloud-download-outline">
        <Button label="Exportar respaldo" icon="share-outline" disabled={saving} onPress={exportBackup} />
        <Button label="Importar un respaldo" icon="download-outline" variant="secondary" disabled={saving} onPress={() => void selectBackup()} />
        {prepared && <View style={styles.review}>
          <Text accessibilityRole="header" style={styles.label}>Revisar respaldo</Text>
          <Text style={styles.hint}>{prepared.incoming.objects.filter((item) => item.archived_at === null).length} objetos activos · {prepared.incoming.objects.filter((item) => item.archived_at !== null).length} archivados · {prepared.incoming.events.length} eventos · {prepared.incoming.files.length} archivos</Text>
          <Text style={styles.hint}>Nuevos: {prepared.plan.newObjects.length} objetos y {prepared.plan.newEvents.length} eventos. Sin cambios: {prepared.plan.unchangedObjects + prepared.plan.unchangedEvents}. Espacio necesario: hasta {formatBytes(prepared.requiredBytes)}.</Text>
          {(prepared.plan.objectConflicts.length + prepared.plan.eventConflicts.length > 0) && <>
            <Text style={styles.warning}>Hay {prepared.plan.objectConflicts.length + prepared.plan.eventConflicts.length} registros distintos en tu teléfono y en el respaldo.{prepared.plan.archiveChanges > 0 ? ` ${prepared.plan.archiveChanges} cambian su estado de archivo.` : ''}</Text>
            {prepared.plan.objectConflicts.slice(0, 5).map(({ incoming }) => <Text key={incoming.id} style={styles.hint}>• Objeto: {incoming.name}</Text>)}
            {prepared.plan.eventConflicts.slice(0, 5).map(({ incoming }) => <Text key={incoming.id} style={styles.hint}>• Evento: {incoming.title}</Text>)}
            <Text style={styles.label}>¿Qué versión conservar?</Text>
            {(['current', 'incoming'] as const).map((choice) => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ checked: conflictChoice === choice }} style={styles.choice} onPress={() => setConflictChoice(choice)}><Ionicons name={conflictChoice === choice ? 'radio-button-on' : 'radio-button-off'} size={22} color={c.primary} /><Text style={styles.rowLabel}>{choice === 'current' ? 'La de este teléfono' : 'La del respaldo'}</Text></Pressable>)}
          </>}
          {prepared.incoming.profile && prepared.plan.profileChanged && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: useProfile }} style={styles.choice} onPress={() => setUseProfile(!useProfile)}><Ionicons name={useProfile ? 'checkbox' : 'square-outline'} size={22} color={c.primary} /><Text style={styles.rowLabel}>Usar el nombre del respaldo</Text></Pressable>}
          <View style={styles.row}><Button label="Importar" icon="checkmark" onPress={confirmImport} style={{ flex: 1 }} /><Button label="Cancelar" variant="ghost" onPress={() => setPrepared(null)} /></View>
        </View>}
      </Section>

      <Section title="Almacenamiento" icon="folder-open-outline">
        {usageError ? <><Text style={styles.hint}>No se pudo consultar el almacenamiento.</Text><Button label="Reintentar" icon="refresh" variant="secondary" onPress={() => void refreshUsage()} /></> : !usage ? <ActivityIndicator color={c.primary} /> : <>
          <Info label="Fotografías" value={formatBytes(usage.photoBytes)} />{usage.documentBytes > 0 && <Info label="Documentos" value={formatBytes(usage.documentBytes)} />}<Info label="Total" value={formatBytes(usage.photoBytes + usage.documentBytes)} strong />
          <Text style={styles.hint}>{usage.active} objetos activos · {usage.archived} archivados · {usage.events} eventos</Text>
          {usage.missing > 0 && <Text style={styles.warning}>{usage.missing} archivos no están disponibles y no se incluyen en el tamaño.</Text>}
        </>}
      </Section>

      <Section title="NFC" icon="radio-outline">
        <View style={styles.row}><Ionicons name={nfc === 'enabled' ? 'checkmark-circle' : nfc === 'disabled' ? 'alert-circle' : 'information-circle'} size={22} color={nfcTone} /><Text style={[styles.rowLabel, { flex: 1 }]}>{nfcMessages[nfc]}</Text></View>
        {Platform.OS === 'android' && nfc === 'disabled' && <Button label="Activar NFC en el teléfono" icon="settings-outline" onPress={() => void openNfcSettings()} />}
        <Button label="Consultar de nuevo" icon="refresh" variant="ghost" onPress={() => void refreshNfc()} />
      </Section>

      <Section title="Acerca de MemoraTag" icon="information-circle-outline">
        <Info label="Versión" value={Constants.expoConfig?.version ?? 'No disponible'} />
        <Text style={styles.hint}>Tus datos están solo en este teléfono. Haz un respaldo de vez en cuando.</Text>
      </Section>
    </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

const themeOptions: { mode: ThemeMode; label: string; detail?: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'Automático', detail: 'Igual que el teléfono', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Oscuro', icon: 'moon-outline' },
];

function Section({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  const { c } = useTheme();
  return <View style={styles.section}>
    <View style={styles.sectionHead}><Ionicons name={icon} size={20} color={c.primary} /><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text></View>
    <View style={styles.card}>{children}</View>
  </View>;
}

/** Help topic: only the title shows; tapping it opens the explanation (progressive disclosure). */
function Help({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  const styles = useStyles(makeStyles);
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} accessibilityHint={open ? 'Oculta la explicación' : 'Muestra la explicación'}
      onPress={() => setOpen((value) => !value)} style={({ pressed }) => [styles.help, pressed && { opacity: 0.7 }]}>
      <View style={styles.helpIcon}><Ionicons name={icon} size={18} color={c.onPrimarySoft} /></View>
      <Text style={[styles.label, { flex: 1 }]}>{title}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={c.muted} />
    </Pressable>
    {open && <Text accessibilityLiveRegion="polite" style={styles.helpText}>{text}</Text>}
  </View>;
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.info}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.xl, marginBottom: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: c.primarySoft },
  progressText: { ...type.secondary, color: c.onPrimarySoft, flex: 1 },
  section: { marginBottom: space.xxl },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  sectionTitle: { ...type.section, color: c.ink },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { ...type.label, color: c.ink },
  hint: { ...type.secondary, color: c.muted },
  warning: { ...type.secondary, color: c.warning },
  review: { gap: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: c.line },
  choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowLabel: { ...type.body, color: c.ink },
  rowValue: { ...type.card, color: c.ink },
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  help: { minHeight: 48, flexDirection: 'row', gap: space.md, alignItems: 'center' },
  helpText: { ...type.secondary, color: c.muted, marginLeft: 34 + space.md, paddingBottom: space.sm },
  themeOption: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  helpIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
} as const);
