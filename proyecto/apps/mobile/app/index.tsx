import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Scanner } from '../src/Scanner';
import { NfcScreen } from '../src/NfcScreen';
import { Settings } from '../src/Settings';
import { Welcome } from '../src/Welcome';
import { Onboarding } from '../src/Onboarding';
import { useKeyboardScroll } from '../src/useKeyboardScroll';
import { useFeedback } from '../src/ui/feedback/FeedbackProvider';
import { haptic } from '../src/ui/feedback/haptics';
import { objectLink } from '../src/qr';
import { shareQrImage } from '../src/qr-share';
import { documentFormat, openDocument, removeDocument, saveDocument } from '../src/event-document';
import { photoUri, removePhoto, savePhoto } from '../src/object-photos';
import { archiveObject, createEvent, createObject, deleteEvent, findActiveObject, getLocalName, getOnboardingDone, objectState, setOnboardingDone, listArchivedObjects, listEvents, listObjects, restoreObject, updateEvent, updateObject, type EventType, type MemoryEvent, type MemoryObject } from '../src/storage';

const colors = { ink: '#203934', muted: '#526C65', soft: '#5C736C', canvas: '#F5F8F6', line: '#DBE7E1', green: '#176B57', darkGreen: '#124A3C', pale: '#E1EEE7' };
const objectColors = [
  { name: 'Verde', hex: '#DCEBE2', accent: '#176B57' },
  { name: 'Azul', hex: '#DCEAF1', accent: '#315E76' },
  { name: 'Lavanda', hex: '#E8E3F1', accent: '#62507E' },
  { name: 'Arena', hex: '#F0E7D6', accent: '#76582E' },
  { name: 'Rosa', hex: '#F2E0DF', accent: '#86504F' },
];
const eventTypes: Record<EventType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  note: { label: 'Nota', icon: 'document-text-outline', color: '#176B57' },
  issue: { label: 'Incidencia', icon: 'alert-circle-outline', color: '#A74449' },
  maintenance: { label: 'Mantenimiento', icon: 'build-outline', color: '#9A5C2A' },
};

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

function paleColor(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#F2F7F4';
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16);
    return Math.round(channel + (255 - channel) * 0.5).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

function Artwork({ name }: { name: string }) {
  const text = name.toLowerCase();
  const icon = text.includes('bici') ? 'bicycle-outline' : text.includes('cámara') || text.includes('camara') ? 'camera-outline' : text.includes('libro') ? 'book-outline' : text.includes('guitarra') ? 'musical-notes-outline' : text.includes('planta') ? 'leaf-outline' : 'cube-outline';
  return <View style={styles.art}><Ionicons name={icon} size={28} color={colors.darkGreen} /></View>;
}

function BackButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Volver" disabled={disabled} onPress={onPress} style={[styles.back, disabled && styles.pressed]}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>;
}

function PrimaryButton({ label, icon, onPress, disabled, loading }: { label: string; icon: 'add' | 'checkmark' | 'arrow-forward' | 'share-outline'; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.pressed]}>{loading ? <ActivityIndicator color="#fff" /> : <Ionicons name={icon} size={21} color="#fff" />}<Text accessibilityLiveRegion="polite" style={styles.buttonText}>{label}</Text></Pressable>;
}

export default function Home() {
  const Alert = useFeedback();
  const insets = useSafeAreaInsets();
  const keyboardScroll = useKeyboardScroll();
  const titleInput = useRef<TextInput>(null);
  const descriptionInput = useRef<TextInput>(null);
  const [objects, setObjects] = useState<MemoryObject[]>([]);
  const [localName, setLocalName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [archivedObjects, setArchivedObjects] = useState<MemoryObject[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [selected, setSelected] = useState<MemoryObject | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const qrRef = useRef<any>(null);
  const [sharingQr, setSharingQr] = useState(false);
  const [showNfc, setShowNfc] = useState(false);
  const [readingNfc, setReadingNfc] = useState(false);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<'object' | 'edit' | 'event' | 'editEvent' | null>(null);
  const [editingEvent, setEditingEvent] = useState<MemoryEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objectColor, setObjectColor] = useState(objectColors[0].hex);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [document, setDocument] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [documentRemoved, setDocumentRemoved] = useState(false);
  const [eventType, setEventType] = useState<EventType>('note');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const deletingRef = useRef(false);
  const restoringRef = useRef(false);
  const [titleError, setTitleError] = useState(false);
  const [error, setError] = useState('');
  const isEventForm = form === 'event' || form === 'editEvent';

  async function loadObjects() {
    try { setObjects(await listObjects()); setError(''); return true; }
    catch { setError('No se pudieron cargar los objetos. Inténtalo de nuevo.'); return false; }
    finally { setLoading(false); }
  }
  async function loadProfile() {
    setProfileLoading(true);
    try { const name = await getLocalName(); setShowTutorial(!!name && !await getOnboardingDone()); setLocalName(name); setProfileError(false); }
    catch { setProfileError(true); }
    finally { setProfileLoading(false); }
  }
  function updateEventSummary(objectId: string, items: MemoryEvent[]) {
    const latest = items[0];
    setObjects((current) => current.map((item) => item.id === objectId ? { ...item, latest_event_title: latest?.title ?? null, latest_event_date: latest?.event_date ?? null, latest_event_type: latest?.type ?? null } : item));
  }
  async function reloadSelectedEvents() {
    if (!selected) return;
    setEventsLoading(true);
    try { const items = await listEvents(selected.id); setEvents(items); updateEventSummary(selected.id, items); setError(''); }
    catch { setError('No se pudo cargar la historia. Vuelve a intentarlo.'); }
    finally { setEventsLoading(false); }
  }
  // Objects opened from outside the app: QR read by the system camera or an NFC tag tap.
  const { open: openParam, at: openAt } = useLocalSearchParams<{ open?: string; at?: string }>();
  useEffect(() => {
    if (!openParam || profileLoading || !localName) return;
    let active = true;
    findActiveObject(openParam).then(async (found) => {
      if (!active) return;
      if (found) {
        setScanning(false); setReadingNfc(false); setShowQr(false); setShowNfc(false); setShowSettings(false); setShowArchived(false);
        if (!savingRef.current) setForm(null);
        setError('');
        haptic.success();
        setSelected(found);
      } else {
        const state = await objectState(openParam).catch(() => 'missing' as const);
        if (!active) return;
        if (state === 'archived') Alert.alert('Objeto archivado', 'Restáuralo para ver su historia.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Ver archivados', onPress: () => { setSelected(null); setShowArchived(true); void loadArchived(); } }]);
        else Alert.error('Objeto no disponible', 'Este objeto no está guardado en este teléfono. Puede haberse creado en otro dispositivo.');
      }
    }).catch(() => { if (active) Alert.error('No se pudo abrir el objeto', 'Vuelve a intentarlo.'); })
      .finally(() => { if (active) router.setParams({ open: undefined, at: undefined }); });
    return () => { active = false; };
  }, [openParam, openAt, profileLoading, localName]);
  useEffect(() => { void loadObjects(); }, []);
  useEffect(() => { void loadProfile(); }, []);
  useEffect(() => {
    if (!selected) { setEvents([]); return; }
    let active = true;
    setEventsLoading(true);
    listEvents(selected.id).then((items) => { if (active) { setEvents(items); setError(''); } })
      .catch(() => { if (active) setError('No se pudo cargar la historia. Vuelve a intentarlo.'); })
      .finally(() => { if (active) setEventsLoading(false); });
    return () => { active = false; };
  }, [selected]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (savingRef.current || deletingRef.current) return true;
      if (scanning) { setScanning(false); return true; }
      if (showQr) { setShowQr(false); return true; }
      if (showNfc) { setShowNfc(false); return true; }
      if (form) { setForm(null); return true; }
      if (selected) { setSelected(null); setError(''); return true; }
      if (showArchived) { setShowArchived(false); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [form, selected, scanning, showQr, showNfc, showArchived]);

  function confirmDeleteEvent(event: MemoryEvent) {
    if (deletingRef.current || savingRef.current || !selected) return;
    const objectId = selected.id;
    Alert.alert('¿Eliminar este evento?', 'Se eliminará de la historia de este objeto. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void (async () => {
        if (deletingRef.current || savingRef.current) return;
        deletingRef.current = true;
        setDeletingEvent(event.id);
        try {
          await deleteEvent(event.id, objectId);
          setForm(null);
          try {
            const items = await listEvents(objectId);
            setEvents(items);
            updateEventSummary(objectId, items);
            setError('');
            Alert.toast('Evento eliminado');
          } catch {
            const remaining = events.filter((item) => item.id !== event.id);
            setEvents(remaining);
            updateEventSummary(objectId, remaining);
            setError('El evento se eliminó, pero no se pudo actualizar la historia.');
          }
        } catch {
          Alert.error('No se pudo eliminar el evento', 'Vuelve a intentarlo.');
        } finally {
          deletingRef.current = false;
          setDeletingEvent(null);
        }
      })(); } },
    ]);
  }

  async function loadArchived() {
    setArchivedLoading(true);
    try { setArchivedObjects(await listArchivedObjects()); setArchivedError(''); }
    catch { setArchivedError('No se pudieron cargar los objetos archivados.'); }
    finally { setArchivedLoading(false); }
  }

  async function restore(item: MemoryObject) {
    if (restoringRef.current) return;
    restoringRef.current = true;
    setRestoring(item.id);
    try {
      await restoreObject(item.id);
      setArchivedObjects((items) => items.filter((object) => object.id !== item.id));
      setObjects((items) => [item, ...items].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      Alert.toast('Objeto restaurado');
    } catch { Alert.error('No se pudo restaurar', 'Vuelve a intentarlo.'); }
    finally { restoringRef.current = false; setRestoring(null); }
  }

  async function shareQr() {
    if (!selected || sharingQr) return;
    setSharingQr(true);
    try { await shareQrImage(qrRef.current, selected.name); }
    catch (error) {
      const code = error instanceof Error ? error.message : '';
      Alert.error('No se pudo compartir el QR', code === 'SHARE_UNAVAILABLE' ? 'Este dispositivo no permite compartir archivos.' : 'Vuelve a intentarlo.');
    } finally { setSharingQr(false); }
  }
  function openForm(kind: 'object' | 'edit' | 'event') {
    keyboardScroll.reset();
    setTitleError(false);
    setTitle(kind === 'edit' ? selected?.name ?? '' : '');
    setDescription(kind === 'edit' ? selected?.description ?? '' : '');
    setObjectColor(kind === 'edit' ? selected?.color ?? objectColors[0].hex : objectColors[0].hex);
    setPhoto(null);
    setDocument(null);
    setEditingEvent(null);
    setDocumentRemoved(false);
    setPhotoRemoved(false);
    setEventType('note');
    setEventDate(new Date());
    setShowDatePicker(false);
    setForm(kind);
  }
  function editEvent(event: MemoryEvent) {
    keyboardScroll.reset();
    setTitleError(false);
    const [year, month, day] = event.event_date.split('-').map(Number);
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setEventType(event.type);
    setEventDate(new Date(year, month - 1, day));
    setPhoto(null);
    setDocument(null);
    setPhotoRemoved(false);
    setDocumentRemoved(false);
    setShowDatePicker(false);
    setForm('editEvent');
  }
  async function chooseDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], copyToCacheDirectory: Platform.OS !== 'android', multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!documentFormat(asset.name)) { Alert.error('Formato no admitido', 'Elige un archivo PDF, XLS o XLSX.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Elegir otro archivo', onPress: () => void chooseDocument() }]); return; }
      if (asset.size != null && asset.size > 5 * 1024 * 1024) { Alert.error('Archivo demasiado grande', 'Elige un documento de hasta 5 MB.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Elegir otro archivo', onPress: () => void chooseDocument() }]); return; }
      setDocument(asset);
      setDocumentRemoved(false);
    } catch { Alert.error('No se pudo seleccionar el archivo', 'Vuelve a intentarlo.'); }
  }
  async function showDocument(file: string) {
    try { await openDocument(file); }
    catch { Alert.error('No se pudo abrir el documento', 'Comprueba que el archivo siga disponible y tengas una aplicación compatible instalada.'); }
  }
  async function choosePhoto(source: 'camera' | 'gallery') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Acceso a la cámara', permission.canAskAgain ? 'Permite el acceso a la cámara para tomar una foto.' : 'Activa el permiso de cámara en los ajustes del dispositivo.', permission.canAskAgain ? [{ text: 'Entendido' }] : [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() }]);
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { Alert.error('Imagen demasiado grande', 'Elige una imagen de hasta 5 MB.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Elegir otra imagen', onPress: () => void choosePhoto(source) }]); return; }
        setPhoto(asset);
        setPhotoRemoved(false);
      }
    } catch { Alert.error('No se pudo abrir la imagen', 'Vuelve a intentarlo.'); }
  }
  function showPhotoOptions() {
    Alert.sheet(isEventForm ? 'Foto del evento' : 'Foto del objeto', 'Elige una opción.', [
      { text: 'Tomar foto', onPress: () => void choosePhoto('camera') },
      { text: 'Elegir de la galería', onPress: () => void choosePhoto('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }
  function confirmArchive() {
    if (!selected || savingRef.current) return;
    Alert.alert('¿Archivar objeto?', 'El objeto y su historia dejarán de aparecer en la lista principal. Podrás restaurarlos desde Objetos archivados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Archivar', onPress: () => { void (async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        try { await archiveObject(selected.id); setSelected(null); if (await loadObjects()) Alert.toast('Objeto archivado'); else setError('El objeto se archivó, pero no se pudo actualizar la lista.'); }
        catch { Alert.error('No se pudo archivar', 'Vuelve a intentarlo.'); }
        finally { savingRef.current = false; setSaving(false); }
      })(); } },
    ]);
  }
  async function save() {
    if (!title.trim()) { haptic.error(); setTitleError(true); titleInput.current?.focus(); AccessibilityInfo.announceForAccessibility(!isEventForm ? 'Falta el nombre del objeto.' : 'Falta el título del evento.'); return; }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    let newPhoto: string | null = null;
    let newDocument: string | null = null;
    let photoSaved = false;
    let stage = 'PHOTO';
    let successMessage: string | null = null;
    try {
      if (photo) newPhoto = await savePhoto(photo.uri, photo.mimeType, photo.fileName);
      stage = 'DOCUMENT';
      if (isEventForm && document) newDocument = await saveDocument(document.uri, document.name);
      stage = 'DATABASE';
      if (form === 'object') { await createObject(title.trim(), description.trim(), newPhoto, objectColor); photoSaved = true; if (await loadObjects()) successMessage = 'Objeto creado'; else setError('El objeto se guardó, pero no se pudo actualizar la lista.'); }
      else if (form === 'edit' && selected) {
        const updated = { ...selected, name: title.trim(), description: description.trim(), cover_image: newPhoto ?? (photoRemoved ? null : selected.cover_image), color: objectColor };
        await updateObject(selected.id, updated.name, updated.description, updated.cover_image, updated.color);
        photoSaved = true;
        setSelected(updated);
        setObjects((items) => items.map((item) => item.id === updated.id ? { ...item, name: updated.name, description: updated.description, cover_image: updated.cover_image, color: updated.color } : item));
        if (selected.cover_image && selected.cover_image !== updated.cover_image) void removePhoto(selected.cover_image).catch(() => {});
        successMessage = 'Cambios guardados';
      }
      else if (form === 'event' && selected) {
        await createEvent(selected.id, title.trim(), description.trim(), eventType, localDate(eventDate), newPhoto, newDocument, document?.name ?? null);
        photoSaved = true;
        try { const items = await listEvents(selected.id); setEvents(items); updateEventSummary(selected.id, items); setError(''); successMessage = 'Evento guardado'; }
        catch { setError('El evento se guardó, pero no se pudo actualizar la historia. Vuelve a abrir el objeto.'); }
      }
      else if (form === 'editEvent' && editingEvent && selected) {
        const updated: MemoryEvent = { ...editingEvent, title: title.trim(), description: description.trim(), type: eventType, event_date: localDate(eventDate), photo: newPhoto ?? (photoRemoved ? null : editingEvent.photo), document_file: newDocument ?? (documentRemoved ? null : editingEvent.document_file), document_name: document ? document.name : documentRemoved ? null : editingEvent.document_name };
        await updateEvent(updated);
        photoSaved = true;
        const items = events.map((item) => item.id === updated.id ? updated : item).sort((a, b) => b.event_date.localeCompare(a.event_date) || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
        setEvents(items);
        updateEventSummary(selected.id, items);
        if (editingEvent.photo && editingEvent.photo !== updated.photo) void removePhoto(editingEvent.photo).catch(() => {});
        if (editingEvent.document_file && editingEvent.document_file !== updated.document_file) void removeDocument(editingEvent.document_file).catch(() => {});
        successMessage = 'Cambios guardados';
      }
      setForm(null);
      if (successMessage) Alert.toast(successMessage);
    } catch (error) {
      if (newPhoto && !photoSaved) await removePhoto(newPhoto).catch(() => {});
      if (newDocument && !photoSaved) await removeDocument(newDocument).catch(() => {});
      const reason = error instanceof Error ? error.message : '';
      const messages: Record<string, string> = {
        SIZE: 'Elige una imagen de hasta 5 MB.', FORMAT: 'Elige una imagen JPEG, PNG, WebP o HEIC.',
        DOCUMENT_SIZE: 'Elige un documento de hasta 5 MB.', DOCUMENT_FORMAT: 'Elige un archivo PDF, XLS o XLSX.',
        DOCUMENT_READ: 'No se puede leer el documento seleccionado. Vuelve a seleccionarlo desde el dispositivo.',
        DOCUMENT_SOURCE_INFO: 'No se puede consultar el documento seleccionado. Vuelve a seleccionarlo.',
        DOCUMENT_SOURCE_COPY: 'No se puede acceder al documento seleccionado para copiarlo. Vuelve a seleccionarlo.',
        DOCUMENT_DIRECTORY: 'No se puede preparar la carpeta local para documentos.',
        DOCUMENT_WRITE: 'No se puede escribir el documento en el almacenamiento local.',
        DOCUMENT_VERIFY: 'No se pudo verificar la copia del documento. Vuelve a seleccionarlo.',
      };
      const fallback = stage === 'DATABASE' ? 'No se pudo registrar el evento en la base de datos local.' : stage === 'DOCUMENT' ? 'No se pudo preparar el documento seleccionado.' : 'No se pudo guardar la imagen seleccionada.';
      const canChooseDocument = stage === 'DOCUMENT' && !!document;
      const canChoosePhoto = stage === 'PHOTO' && !!photo;
      Alert.error('No se pudo guardar', messages[reason] ?? fallback, canChooseDocument ? [{ text: 'Cancelar', style: 'cancel' }, { text: 'Elegir otro archivo', onPress: () => void chooseDocument() }] : canChoosePhoto ? [{ text: 'Cancelar', style: 'cancel' }, { text: 'Elegir otra imagen', onPress: showPhotoOptions }] : undefined);
    }
    finally { savingRef.current = false; setSaving(false); }
  }

  if (profileLoading) return <SafeAreaView style={[styles.page, styles.profileLoading]}><ActivityIndicator color={colors.green} /></SafeAreaView>;
  if (profileError) return <SafeAreaView style={[styles.page, styles.profileLoading]}><Text style={styles.profileError}>No se pudo cargar tu información.</Text><Pressable accessibilityRole="button" hitSlop={12} onPress={() => void loadProfile()}><Text style={styles.retry}>Reintentar</Text></Pressable></SafeAreaView>;
  if (!localName) return <Welcome onContinue={(name) => { setLocalName(name); setShowTutorial(true); }} />;
  if (showTutorial) return <Onboarding onDone={() => { setShowTutorial(false); void setOnboardingDone().catch(() => {}); }} />;
  if (showSettings) return <Settings name={localName} onNameChange={setLocalName} onImported={async (name) => { if (name) setLocalName(name); return loadObjects(); }} onBack={() => setShowSettings(false)} onShowTutorial={() => { setShowSettings(false); setShowTutorial(true); }} />;
  if (readingNfc) return <NfcScreen onBack={() => setReadingNfc(false)} onFound={(object) => { setError(''); setSelected(object); setReadingNfc(false); }} />;
  if (showNfc && selected) return <NfcScreen object={selected} onBack={() => setShowNfc(false)} onFound={() => {}} onWritten={(at) => { setSelected((item) => item && { ...item, nfc_written_at: at }); setObjects((items) => items.map((item) => item.id === selected.id ? { ...item, nfc_written_at: at } : item)); }} />;
  if (scanning) return <Scanner onBack={() => setScanning(false)} onFound={(object) => { setError(''); setSelected(object); setScanning(false); }} onReadNfc={() => { setScanning(false); setReadingNfc(true); }} onShowArchived={() => { setScanning(false); setShowArchived(true); void loadArchived(); }} />;

  const eventAccent = objectColors.find((option) => option.hex === selected?.color)?.accent ?? colors.green;

  return <SafeAreaView style={styles.page} edges={['top']}>
    <StatusBar style="dark" />
    <Modal visible={fullPhoto !== null} animationType="fade" onRequestClose={() => setFullPhoto(null)}>
      <SafeAreaView style={styles.photoViewer}>
        <StatusBar style="light" />
        <View style={styles.viewerHeader}><Pressable accessibilityRole="button" accessibilityLabel="Cerrar foto" onPress={() => setFullPhoto(null)} style={styles.viewerClose}><Ionicons name="close" size={26} color="#fff" /></Pressable></View>
        {fullPhoto && <Image accessibilityLabel="Foto a pantalla completa" source={{ uri: fullPhoto }} style={styles.viewerImage} resizeMode="contain" />}
      </SafeAreaView>
    </Modal>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {showArchived ? <>
        <View style={styles.nav}><BackButton onPress={() => setShowArchived(false)} /><Text accessibilityRole="header" style={styles.navTitle}>Objetos archivados</Text><View style={styles.navSpacer} /></View>
        <ScrollView contentContainerStyle={styles.archivedList}><Text style={styles.archivedIntro}>Restaura un objeto para verlo de nuevo en tus memorias.</Text>
          {archivedLoading ? <ActivityIndicator color={colors.green} /> : archivedError ? <><Text style={styles.error}>{archivedError}</Text><Pressable accessibilityRole="button" hitSlop={12} onPress={() => void loadArchived()}><Text style={styles.retry}>Reintentar</Text></Pressable></> : archivedObjects.length === 0 ? <View style={styles.emptyHome}><View style={styles.emptyIcon}><Ionicons name="archive-outline" size={30} color={colors.green} /></View><Text style={styles.emptyTitle}>No hay objetos archivados</Text><Text style={styles.emptyText}>Los objetos que archives aparecerán aquí.</Text></View> : archivedObjects.map((item) => <View key={item.id} style={styles.archivedCard}><View style={styles.archivedRow}><View style={[styles.cover, { backgroundColor: item.color }]}>{photoUri(item.cover_image) ? <Image source={{ uri: photoUri(item.cover_image)! }} style={styles.coverImage} /> : <Artwork name={item.name} />}</View><View style={styles.cardCopy}><Text style={styles.cardTitle}>{item.name}</Text><Text numberOfLines={2} style={styles.cardDescription}>{item.description || 'Sin descripción'}</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel={`Restaurar ${item.name}`} disabled={restoring !== null} style={[styles.restoreButton, restoring !== null && styles.pressed]} onPress={() => void restore(item)}><Ionicons name="refresh-outline" size={18} color={colors.green} /><Text style={styles.restoreText}>{restoring === item.id ? 'Restaurando…' : 'Restaurar objeto'}</Text></Pressable></View>)}
        </ScrollView>
      </> : showQr && selected ? <>
        <View style={styles.nav}><BackButton onPress={() => setShowQr(false)} /><Text accessibilityRole="header" style={styles.navTitle}>Código QR</Text><View style={styles.navSpacer} /></View>
        <ScrollView contentContainerStyle={styles.qrContent}><View style={styles.qrIcon}><Ionicons name="qr-code-outline" size={25} color={colors.green} /></View><Text accessibilityRole="header" style={styles.qrTitle}>El código de {selected.name}</Text><Text style={styles.qrDescription}>Escanéalo con la cámara del teléfono o desde MemoraTag para abrir su historia. Imprímelo y pégalo en el objeto.</Text><View accessible accessibilityRole="image" accessibilityLabel={`Código QR de ${selected.name}`} style={styles.qrBox}><QRCode value={objectLink(selected.id)} size={220} quietZone={16} backgroundColor="#FFFFFF" getRef={(ref) => { qrRef.current = ref; }} /></View>
          <View style={styles.qrShare}><PrimaryButton label={sharingQr ? 'Preparando imagen…' : 'Compartir o imprimir QR'} icon="share-outline" disabled={sharingQr} loading={sharingQr} onPress={() => void shareQr()} /></View>
          <Text style={styles.qrNotice}>El código solo contiene un identificador. La historia sigue guardada en este teléfono: en otro dispositivo no se podrá abrir.</Text></ScrollView>
      </> : form ? <>
        <View style={styles.nav}><BackButton disabled={saving || !!deletingEvent} onPress={() => setForm(null)} /><Text accessibilityRole="header" style={styles.navTitle}>{form === 'object' ? 'Nuevo objeto' : form === 'edit' ? 'Editar objeto' : form === 'editEvent' ? 'Editar evento' : 'Registrar evento'}</Text>{form === 'editEvent' && editingEvent ? <Pressable accessibilityRole="button" accessibilityLabel="Eliminar evento" disabled={saving || !!deletingEvent} onPress={() => confirmDeleteEvent(editingEvent)} style={styles.back}><Ionicons name="trash-outline" size={20} color="#A33F43" /></Pressable> : <View style={styles.navSpacer} />}</View>
        <ScrollView pointerEvents={saving || deletingEvent ? 'none' : 'auto'} accessibilityElementsHidden={saving || !!deletingEvent} importantForAccessibility={saving || deletingEvent ? 'no-hide-descendants' : 'auto'} ref={keyboardScroll.scrollRef} onLayout={keyboardScroll.onLayout} onScroll={keyboardScroll.onScroll} onContentSizeChange={keyboardScroll.onContentSizeChange} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.formContent, { paddingBottom: 30 + keyboardScroll.extraSpace }]}>
          <Text accessibilityRole="header" style={styles.formHeading}>{form === 'object' ? 'Dale un lugar\na su historia.' : form === 'edit' ? 'Edita sus detalles.' : form === 'editEvent' ? 'Edita este momento.' : '¿Qué pasó?'}</Text>
          <Text style={styles.formIntro}>{form === 'object' ? 'Empieza con lo esencial. Podrás añadir recuerdos cuando quieras.' : form === 'edit' ? 'Actualiza los detalles de tu objeto.' : form === 'editEvent' ? 'Actualiza la información de este evento.' : 'Guarda un momento en su historia.'}</Text>
          {!isEventForm && <><Pressable accessibilityRole="button" accessibilityLabel={photo || (form === 'edit' && selected?.cover_image && !photoRemoved) ? 'Cambiar foto del objeto' : 'Añadir foto del objeto'} onPress={showPhotoOptions} style={[styles.formArtwork, { backgroundColor: objectColor }]}>
            {photo || (form === 'edit' && selected?.cover_image && !photoRemoved) ? <><Image source={{ uri: photo?.uri ?? photoUri(selected?.cover_image ?? null) ?? undefined }} style={styles.coverImage} /><View style={styles.photoBadge}><Ionicons name="camera-outline" size={18} color="#fff" /><Text style={styles.photoBadgeText}>Cambiar foto</Text></View></> : <><Ionicons name="camera-outline" size={25} color={colors.green} /><Text style={styles.artCaption}>Añadir foto</Text><Text style={styles.photoHint}>Opcional · hasta 5 MB</Text></>}
          </Pressable>{(photo || (form === 'edit' && selected?.cover_image && !photoRemoved)) && <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { setPhoto(null); setPhotoRemoved(true); }}><Text style={styles.removePhoto}>Quitar foto</Text></Pressable>}</>}
          {isEventForm && <>
            <Text style={styles.label}>Tipo de evento</Text>
            <View style={styles.typeOptions}>{(Object.keys(eventTypes) as EventType[]).map((type) => <Pressable accessibilityRole="button" accessibilityState={{ selected: eventType === type }} key={type} onPress={() => setEventType(type)} style={[styles.typeOption, eventType === type && { borderColor: eventTypes[type].color, backgroundColor: `${eventTypes[type].color}10` }]}><Ionicons name={eventTypes[type].icon} size={18} color={eventTypes[type].color} /><Text style={[styles.typeText, eventType === type && { color: eventTypes[type].color }]}>{eventTypes[type].label}</Text></Pressable>)}</View>
          </>}
          <Text style={styles.label}>{!isEventForm ? 'Nombre del objeto' : 'Título'}</Text>
          <TextInput ref={titleInput} onFocus={() => keyboardScroll.focus(titleInput)} onBlur={() => keyboardScroll.blur(titleInput)} accessibilityLabel={!isEventForm ? 'Nombre del objeto' : 'Título del evento'} accessibilityHint={titleError ? (!isEventForm ? 'Escribe el nombre del objeto' : 'Escribe el título del evento') : undefined} style={[styles.input, titleError && styles.invalidInput]} value={title} onChangeText={(value) => { setTitle(value); if (value.trim()) setTitleError(false); }} maxLength={120} placeholder={!isEventForm ? 'Ej. Guitarra, mochila, bici…' : 'Ej. Lo usé por primera vez'} placeholderTextColor="#68736D" />
          {titleError && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{!isEventForm ? 'Escribe el nombre del objeto.' : 'Escribe el título del evento.'}</Text>}
          <Text style={styles.label}>Descripción <Text style={styles.optional}>opcional</Text></Text>
          <TextInput ref={descriptionInput} onFocus={() => keyboardScroll.focus(descriptionInput)} onBlur={() => keyboardScroll.blur(descriptionInput)} onSelectionChange={keyboardScroll.reveal} onContentSizeChange={keyboardScroll.reveal} accessibilityLabel="Descripción" style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} multiline scrollEnabled textAlignVertical="top" placeholder={!isEventForm ? '¿Qué lo hace especial?' : 'Añade más detalles'} placeholderTextColor="#68736D" />
          {!isEventForm && <><Text style={styles.label}>Color del objeto</Text><View style={styles.colorOptions}>{objectColors.map((option) => <Pressable key={option.hex} accessibilityRole="button" accessibilityLabel={option.name} accessibilityState={{ selected: objectColor === option.hex }} onPress={() => setObjectColor(option.hex)} style={[styles.colorChoice, { backgroundColor: option.hex }, objectColor === option.hex && styles.colorSelected]}>{objectColor === option.hex && <Ionicons name="checkmark" size={22} color={colors.darkGreen} />}</Pressable>)}</View></>}
          {isEventForm && <><Text style={styles.label}>Foto <Text style={styles.optional}>opcional</Text></Text><Pressable accessibilityRole="button" accessibilityLabel={photo || (editingEvent?.photo && !photoRemoved) ? 'Cambiar foto del evento' : 'Añadir foto al evento'} onPress={showPhotoOptions} style={styles.formArtwork}>{photo || (editingEvent?.photo && !photoRemoved) ? <><Image source={{ uri: photo?.uri ?? photoUri(editingEvent?.photo ?? null) ?? undefined }} style={styles.coverImage} /><View style={styles.photoBadge}><Ionicons name="camera-outline" size={18} color="#fff" /><Text style={styles.photoBadgeText}>Cambiar foto</Text></View></> : <><Ionicons name="camera-outline" size={25} color={colors.green} /><Text style={styles.artCaption}>Añadir foto</Text><Text style={styles.photoHint}>Opcional · hasta 5 MB</Text></>}</Pressable>{(photo || (editingEvent?.photo && !photoRemoved)) && <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { setPhoto(null); setPhotoRemoved(true); }}><Text style={styles.removePhoto}>Quitar foto</Text></Pressable>}</>}
          {isEventForm && <><Text style={styles.label}>Documento <Text style={styles.optional}>opcional · PDF, XLS o XLSX, hasta 5 MB</Text></Text><Pressable accessibilityRole="button" style={styles.documentButton} onPress={() => void chooseDocument()}><Ionicons name="attach-outline" size={21} color={colors.green} /><Text style={styles.documentText} numberOfLines={1}>{document?.name ?? (!documentRemoved ? editingEvent?.document_name : null) ?? 'Seleccionar documento'}</Text></Pressable>{(document || (editingEvent?.document_file && !documentRemoved)) && <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { setDocument(null); setDocumentRemoved(true); }}><Text style={styles.removeDocument}>Quitar documento</Text></Pressable>}</>}
          {isEventForm && <><Text style={styles.label}>Fecha del evento</Text><Pressable accessibilityRole="button" accessibilityLabel={`Fecha del evento: ${formatDate(localDate(eventDate))}`} style={styles.dateButton} onPress={() => setShowDatePicker(true)}><Ionicons name="calendar-outline" size={20} color={colors.green} /><Text style={styles.dateButtonText}>{formatDate(localDate(eventDate))}</Text></Pressable>
            {showDatePicker && <><DateTimePicker value={eventDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (event.type !== 'dismissed' && date) setEventDate(date); }} />{Platform.OS === 'ios' && <Pressable accessibilityRole="button" hitSlop={12} onPress={() => setShowDatePicker(false)}><Text style={styles.retry}>Listo</Text></Pressable>}</>}
          </>}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{deletingEvent ? <View accessibilityLiveRegion="polite" style={styles.deleting}><ActivityIndicator color={colors.green} /><Text>Eliminando…</Text></View> : <PrimaryButton label={saving ? 'Guardando…' : form === 'object' ? 'Crear objeto' : form === 'edit' || form === 'editEvent' ? 'Guardar cambios' : 'Guardar evento'} icon="checkmark" disabled={saving} loading={saving} onPress={() => void save()} />}</View>
      </> : selected ? <>
        <ScrollView pointerEvents={deletingEvent ? 'none' : 'auto'} accessibilityElementsHidden={!!deletingEvent} importantForAccessibility={deletingEvent ? 'no-hide-descendants' : 'auto'} contentContainerStyle={styles.detailScroll}>
          <View style={[styles.hero, { backgroundColor: selected.color, borderBottomColor: selected.color }, !!photoUri(selected.cover_image) && styles.heroWithPhoto]}>
            {photoUri(selected.cover_image) && <Pressable accessibilityRole="button" accessibilityLabel="Ver foto del objeto a pantalla completa" onPress={() => setFullPhoto(photoUri(selected.cover_image))} style={StyleSheet.absoluteFill}><Image source={{ uri: photoUri(selected.cover_image)! }} style={styles.heroImage} /><View pointerEvents="none" style={styles.heroOverlay} /></Pressable>}
            <View style={styles.heroTop}><BackButton onPress={() => { setSelected(null); setError(''); }} /><View style={styles.heroActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Editar objeto" style={styles.back} onPress={() => openForm('edit')}><Ionicons name="pencil-outline" size={20} color={colors.ink} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Archivar objeto" disabled={saving} style={styles.back} onPress={confirmArchive}><Ionicons name="archive-outline" size={20} color={colors.ink} /></Pressable>
            </View></View>
            {!photoUri(selected.cover_image) && <View style={styles.heroCover}><Artwork name={selected.name} /></View>}
            <View pointerEvents="none" style={photoUri(selected.cover_image) ? styles.heroTextOnPhoto : undefined}><Text accessibilityRole="header" style={[styles.objectHeading, !!photoUri(selected.cover_image) && styles.heroTextLight]}>{selected.name}</Text>
            {selected.description ? <Text style={[styles.heroDescription, !!photoUri(selected.cover_image) && styles.heroTextLight]}>{selected.description}</Text> : null}</View>
          </View>
          <View style={styles.history}>
            <View style={styles.links}>
              <Pressable accessibilityRole="button" accessibilityLabel="Ver, compartir o imprimir su código QR" onPress={() => setShowQr(true)} style={({ pressed }) => [styles.linkChip, pressed && styles.pressed]}><Ionicons name="qr-code-outline" size={18} color={colors.green} /><Text style={styles.linkText}>Código QR</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={selected.nfc_written_at ? `Etiqueta NFC vinculada el ${formatDate(localDate(new Date(selected.nfc_written_at)))}. Toca para volver a escribirla` : 'Sin etiqueta NFC. Toca para vincular una'} onPress={() => setShowNfc(true)} style={({ pressed }) => [styles.linkChip, selected.nfc_written_at ? styles.linkChipDone : styles.linkChipPending, pressed && styles.pressed]}><Ionicons name={selected.nfc_written_at ? 'checkmark-circle' : 'radio-outline'} size={18} color={colors.green} /><Text style={styles.linkText} numberOfLines={2}>{selected.nfc_written_at ? `NFC vinculada · ${formatDate(localDate(new Date(selected.nfc_written_at)))}` : 'Vincular NFC'}</Text></Pressable>
            </View>
            <View style={styles.sectionHead}><Text accessibilityRole="header" style={styles.sectionTitle}>Su historia</Text><Text style={styles.count}>{events.length} {events.length === 1 ? 'evento' : 'eventos'}</Text></View>
            {eventsLoading ? <ActivityIndicator color={colors.green} /> : error ? <><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" hitSlop={12} onPress={() => void reloadSelectedEvents()}><Text style={styles.retry}>Actualizar</Text></Pressable></> : events.length === 0 ? <View style={styles.emptyHistory}><Ionicons name="time-outline" size={25} color={colors.green} /><Text style={styles.emptyTitle}>Aquí empieza su historia</Text><Text style={styles.emptyText}>Registra un primer evento para guardar un recuerdo o detalle importante.</Text></View> : events.map((event, index) => <View key={event.id} style={styles.event}>
              <View style={styles.timeline}><View style={[styles.eventIcon, { backgroundColor: selected.color }]}><Ionicons name={(eventTypes[event.type] ?? eventTypes.note).icon} size={19} color={eventAccent} /></View>{index < events.length - 1 && <View style={[styles.timelineLine, { backgroundColor: selected.color }]} />}</View>
              <View style={styles.eventCopy}><View style={styles.eventHeader}><Text style={[styles.date, { color: eventAccent }]}>{(eventTypes[event.type] ?? eventTypes.note).label} · {formatDate(event.event_date)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Editar evento ${event.title}`} hitSlop={15} onPress={() => editEvent(event)}><Ionicons name="pencil-outline" size={19} color={eventAccent} /></Pressable></View><Text style={[styles.eventTitle, { color: eventAccent }]}>{event.title}</Text>{event.description ? <Text style={styles.eventDescription}>{event.description}</Text> : null}{photoUri(event.photo) ? <Pressable accessibilityRole="button" accessibilityLabel="Ver foto del evento a pantalla completa" onPress={() => setFullPhoto(photoUri(event.photo))}><Image source={{ uri: photoUri(event.photo)! }} style={styles.eventPhoto} /></Pressable> : null}{event.document_file && <Pressable accessibilityRole="button" accessibilityLabel={`Abrir documento ${event.document_name ?? ''}`} style={styles.documentButton} onPress={() => void showDocument(event.document_file!)}><Ionicons name="document-attach-outline" size={20} color={eventAccent} /><Text numberOfLines={2} style={[styles.documentText, { color: eventAccent }]}>{event.document_name || 'Documento adjunto'}</Text><Ionicons name="open-outline" size={18} color={eventAccent} /></Pressable>}</View>
            </View>)}
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{deletingEvent ? <View accessibilityLiveRegion="polite" style={styles.deleting}><ActivityIndicator color={colors.green} /><Text>Eliminando…</Text></View> : <PrimaryButton label="Registrar evento" icon="add" onPress={() => openForm('event')} />}</View>
      </> : <>
        <View style={styles.homeHeader}><View style={styles.homeHeaderText}><Text style={styles.greeting} numberOfLines={1}>Hola, {localName}</Text><Text accessibilityRole="header" style={styles.homeTitle}>Tus memorias</Text></View><View style={styles.homeActions}><Pressable accessibilityRole="button" accessibilityLabel="Objetos archivados" onPress={() => { setShowArchived(true); void loadArchived(); }} style={styles.headerMark}><Ionicons name="archive-outline" size={23} color={colors.green} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Ajustes" onPress={() => setShowSettings(true)} style={styles.headerMark}><Ionicons name="settings-outline" size={23} color={colors.green} /></Pressable></View></View>
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.sectionHead}><Text accessibilityRole="header" style={styles.listLabel}>Objetos que cuidas</Text><Text style={styles.count}>{objects.length} {objects.length === 1 ? 'objeto' : 'objetos'}</Text></View>
          {loading ? <ActivityIndicator color={colors.green} /> : error ? <><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" hitSlop={12} onPress={() => void loadObjects()}><Text style={styles.retry}>Reintentar</Text></Pressable></> : objects.length === 0 ? <View style={styles.emptyHome}><View style={styles.emptyIcon}><Ionicons name="cube-outline" size={30} color={colors.green} /></View><Text style={styles.emptyTitle}>Cada objeto tiene una historia</Text><Text style={styles.emptyText}>Crea tu primer objeto y guarda aquí todo lo que quieras recordar. Después podrás pegarle un QR o una etiqueta NFC.</Text><Pressable accessibilityRole="button" onPress={() => openForm('object')} style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}><Ionicons name="add" size={20} color={colors.green} /><Text style={styles.emptyActionText}>Crear mi primer objeto</Text></Pressable></View> : objects.map((item) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}. ${item.latest_event_title ? `Último evento: ${item.latest_event_title}${item.latest_event_date ? `, ${formatDate(item.latest_event_date)}` : ''}` : 'Aún no tiene eventos'}`} accessibilityHint="Abre su historia" key={item.id} style={({ pressed }) => [styles.card, { backgroundColor: paleColor(item.color) }, pressed && styles.pressed]} onPress={() => setSelected(item)}><View style={[styles.cover, { backgroundColor: item.color }]}>{photoUri(item.cover_image) ? <Image source={{ uri: photoUri(item.cover_image)! }} style={styles.coverImage} /> : <Artwork name={item.name} />}</View><View style={styles.cardCopy}><Text style={styles.cardTitle}>{item.name}</Text><View style={styles.cardEvent}>{item.latest_event_title && <Ionicons name={(item.latest_event_type && eventTypes[item.latest_event_type] || eventTypes.note).icon} size={15} color={(item.latest_event_type && eventTypes[item.latest_event_type] || eventTypes.note).color} />}<Text numberOfLines={1} style={[styles.cardDescription, styles.cardEventText]}>{item.latest_event_title || 'Aún no tiene eventos'}</Text></View>{item.latest_event_date && <Text style={styles.cardDate}>{formatDate(item.latest_event_date)}</Text>}</View><Ionicons name="chevron-forward" size={18} color="#5C736C" /></Pressable>)}
        </ScrollView>
        <View style={[styles.footer, styles.homeFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}><Pressable accessibilityRole="button" accessibilityLabel="Escanear código QR o etiqueta NFC" onPress={() => setScanning(true)} style={styles.scanButton}><Ionicons name="scan-outline" size={20} color={colors.green} /><Text style={styles.scanText}>Escanear</Text></Pressable><View style={styles.createButton}><PrimaryButton label="Nuevo objeto" icon="add" onPress={() => openForm('object')} /></View></View>
      </>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  deleting: { minHeight: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  page: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 },
  profileLoading: { justifyContent: 'center', alignItems: 'center', padding: 24 }, profileError: { color: colors.ink, textAlign: 'center', fontSize: 16 }, homeHeaderText: { flex: 1, marginRight: 12 }, homeActions: { flexDirection: 'row', gap: 8 },
  invalidInput: { borderColor: '#A33F43', borderWidth: 2 }, fieldError: { color: '#A33F43', fontSize: 13, marginTop: -15, marginBottom: 18 },
  homeHeader: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, greeting: { color: colors.green, fontSize: 14, fontWeight: '700', letterSpacing: 0.2 }, homeTitle: { color: colors.ink, fontSize: 32, fontWeight: '700', letterSpacing: -0.9, marginTop: 7 }, headerMark: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, listLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' }, count: { color: colors.soft, fontSize: 13, fontWeight: '600' },
  card: { minHeight: 104, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }, cover: { width: 78, height: 78, borderRadius: 13, backgroundColor: '#DCEBE2', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, art: { width: 46, height: 46, backgroundColor: '#F4FAF6', borderWidth: 1, borderColor: '#C5DDCE', borderRadius: 14, justifyContent: 'center', alignItems: 'center' }, cardCopy: { flex: 1, gap: 5 }, cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' }, cardDescription: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  cardDate: { color: colors.soft, fontSize: 12, fontWeight: '600' }, cardEvent: { flexDirection: 'row', alignItems: 'center', gap: 5 }, cardEventText: { flex: 1 },
  emptyHome: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 70, paddingBottom: 35 }, emptyIcon: { width: 74, height: 74, borderRadius: 24, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' }, emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 }, localNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 28 }, localText: { color: colors.soft, fontSize: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.canvas }, button: { minHeight: 56, borderRadius: 16, backgroundColor: colors.green, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.7 },
  homeFooter: { flexDirection: 'row', gap: 10 }, createButton: { flex: 1 }, scanButton: { flex: 1, minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: '#C6DCD0', backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, scanText: { color: colors.green, fontWeight: '700', fontSize: 14 },
  archivedList: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }, archivedIntro: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 20 }, archivedCard: { padding: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E4EAE7', marginBottom: 12 }, archivedRow: { flexDirection: 'row', alignItems: 'center', gap: 13 }, restoreButton: { minHeight: 44, marginTop: 12, borderWidth: 1, borderColor: '#BBDCCD', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, restoreText: { color: colors.green, fontWeight: '700', fontSize: 14 },
  qrContent: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }, qrIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center' }, qrTitle: { color: colors.ink, fontSize: 27, fontWeight: '800', textAlign: 'center', marginTop: 20 }, qrDescription: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 12, maxWidth: 320 }, qrBox: { backgroundColor: '#fff', padding: 24, borderRadius: 24, marginTop: 30 }, qrShare: { width: '100%', marginTop: 28 }, emptyAction: { minHeight: 48, marginTop: 18, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8 }, emptyActionText: { color: colors.green, fontSize: 15, fontWeight: '700' }, links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 }, linkChip: { minHeight: 48, flexGrow: 1, flexBasis: 140, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' }, linkChipDone: { backgroundColor: colors.pale, borderColor: colors.pale }, linkChipPending: { borderStyle: 'dashed', borderColor: '#6F8C80' }, linkText: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '700' }, qrNotice: { color: colors.soft, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 24, maxWidth: 320 },
  nfcContent: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 44, paddingBottom: 40 }, nfcIllustration: { width: 150, height: 150, borderRadius: 48, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }, nfcInner: { width: 86, height: 86, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, nfcTitle: { color: colors.ink, fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 28 }, nfcDescription: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 12, maxWidth: 300 }, nfcNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#E1EEE7', padding: 16, borderRadius: 15, marginTop: 28, width: '100%' }, nfcNoticeText: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20 }, nfcDisabled: { width: '100%', marginTop: 20, opacity: 0.5 },
  nav: { minHeight: 74, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, navTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 }, navSpacer: { width: 48 }, back: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  formContent: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 30 }, formHeading: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 }, formIntro: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 22 }, formArtwork: { height: 116, borderRadius: 16, backgroundColor: '#D7E5D2', justifyContent: 'center', alignItems: 'center', gap: 7, marginBottom: 25 }, artCaption: { color: colors.green, fontWeight: '700', fontSize: 13 }, label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 9 }, optional: { color: colors.muted, fontWeight: '500' }, input: { minHeight: 55, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingHorizontal: 16, color: colors.ink, fontSize: 16, marginBottom: 23 }, textarea: { minHeight: 106, paddingTop: 15 },
  coverImage: { width: '100%', height: '100%', borderRadius: 14 }, photoHint: { color: colors.muted, fontSize: 12 }, photoBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#14213DCC', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 }, photoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' }, removePhoto: { color: colors.green, fontWeight: '700', marginTop: -12, marginBottom: 20, textAlign: 'right' },
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 24 }, typeOption: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12 }, typeText: { color: colors.muted, fontWeight: '700', fontSize: 13 }, dateButton: { minHeight: 55, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }, dateButtonText: { color: colors.ink, fontSize: 16 },
  colorOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }, colorChoice: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, colorSelected: { borderWidth: 2, borderColor: colors.green },
  eventPhoto: { width: '100%', height: 170, borderRadius: 14, marginTop: 12, backgroundColor: '#D7E5D2' },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  documentButton: { minHeight: 54, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15, marginTop: 8 }, documentText: { color: colors.ink, fontSize: 14, flex: 1 }, removeDocument: { color: colors.green, fontWeight: '700', textAlign: 'right', marginBottom: 18 },
  photoViewer: { flex: 1, backgroundColor: '#101514' }, viewerHeader: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10 }, viewerClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#34413E' }, viewerImage: { flex: 1, width: '100%' },
  detailScroll: { paddingBottom: 30 }, hero: { backgroundColor: '#E7F1EB', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' }, heroWithPhoto: { minHeight: 300, borderBottomWidth: 10 }, heroImage: { width: '100%', height: '100%', resizeMode: 'cover' }, heroOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.18)' }, heroTextOnPhoto: { marginTop: 'auto', marginHorizontal: -20, marginBottom: -32, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, backgroundColor: 'rgba(0, 0, 0, 0.65)' }, heroTextLight: { color: '#FFFFFF' }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroActions: { flexDirection: 'row', gap: 10 }, heroCover: { width: 96, height: 96, borderRadius: 20, backgroundColor: '#FFFFFF70', justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 16, overflow: 'hidden' }, objectHeading: { fontSize: 30, fontWeight: '700', color: colors.ink, letterSpacing: -0.7 }, heroDescription: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 }, history: { paddingHorizontal: 24, paddingTop: 30 }, sectionTitle: { fontSize: 21, fontWeight: '700', color: colors.ink }, emptyHistory: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 24, alignItems: 'center', marginTop: 10 },
  event: { flexDirection: 'row', gap: 14, minHeight: 94 }, timeline: { width: 38, alignItems: 'center' }, eventIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }, timelineLine: { width: 2, backgroundColor: '#D4E0DA', flex: 1, marginVertical: 5 }, eventCopy: { flex: 1, paddingBottom: 25 }, date: { color: colors.soft, fontSize: 12, fontWeight: '600', marginBottom: 5 }, eventTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 }, eventDescription: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5 }, error: { color: '#A33030', fontSize: 15, lineHeight: 22, marginVertical: 12 }, retry: { color: colors.green, fontWeight: '700', marginVertical: 10 },
});
