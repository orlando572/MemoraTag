import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Scanner } from '../src/Scanner';
import { objectQrValue } from '../src/qr';
import { documentFormat, openDocument, removeDocument, saveDocument } from '../src/event-document';
import { photoUri, removePhoto, savePhoto } from '../src/object-photos';
import { archiveObject, createEvent, createObject, listArchivedObjects, listEvents, listObjects, restoreObject, updateEvent, updateObject, type EventType, type MemoryEvent, type MemoryObject } from '../src/storage';

const colors = { ink: '#14213D', muted: '#5B6877', soft: '#7E8A98', canvas: '#F4F7F6', line: '#DDE5E2', green: '#147A63', darkGreen: '#0D5244', pale: '#E1F1EA' };
const eventTypes: Record<EventType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  note: { label: 'Nota', icon: 'document-text-outline', color: '#147A63' },
  issue: { label: 'Incidencia', icon: 'alert-circle-outline', color: '#C54B4D' },
  maintenance: { label: 'Mantenimiento', icon: 'build-outline', color: '#B96439' },
};

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Artwork({ name }: { name: string }) {
  const text = name.toLowerCase();
  const icon = text.includes('bici') ? 'bicycle-outline' : text.includes('cámara') || text.includes('camara') ? 'camera-outline' : text.includes('libro') ? 'book-outline' : text.includes('guitarra') ? 'musical-notes-outline' : text.includes('planta') ? 'leaf-outline' : 'cube-outline';
  return <View style={styles.art}><Ionicons name={icon} size={28} color={colors.darkGreen} /></View>;
}

function BackButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onPress} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>;
}

function PrimaryButton({ label, icon, onPress, disabled }: { label: string; icon: 'add' | 'checkmark' | 'arrow-forward'; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.pressed]}><Ionicons name={icon} size={21} color="#fff" /><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const [objects, setObjects] = useState<MemoryObject[]>([]);
  const [archivedObjects, setArchivedObjects] = useState<MemoryObject[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [selected, setSelected] = useState<MemoryObject | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<'object' | 'edit' | 'event' | 'editEvent' | null>(null);
  const [editingEvent, setEditingEvent] = useState<MemoryEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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
  const [error, setError] = useState('');
  const isEventForm = form === 'event' || form === 'editEvent';

  async function loadObjects() {
    try { setObjects(await listObjects()); setError(''); }
    catch { setError('No se pudieron cargar los objetos. Inténtalo de nuevo.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadObjects(); }, []);
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
      if (scanning) { setScanning(false); return true; }
      if (showQr) { setShowQr(false); return true; }
      if (form) { setForm(null); return true; }
      if (selected) { setSelected(null); setError(''); return true; }
      if (showArchived) { setShowArchived(false); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [form, selected, scanning, showQr, showArchived]);

  async function loadArchived() {
    setArchivedLoading(true);
    try { setArchivedObjects(await listArchivedObjects()); setArchivedError(''); }
    catch { setArchivedError('No se pudieron cargar los objetos archivados.'); }
    finally { setArchivedLoading(false); }
  }

  async function restore(item: MemoryObject) {
    if (restoring) return;
    setRestoring(item.id);
    try {
      await restoreObject(item.id);
      setArchivedObjects((items) => items.filter((object) => object.id !== item.id));
      setObjects((items) => [item, ...items].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      Alert.alert('Objeto restaurado', `${item.name} vuelve a estar en tus memorias.`);
    } catch { Alert.alert('No se pudo restaurar', 'Vuelve a intentarlo.'); }
    finally { setRestoring(null); }
  }

  function openForm(kind: 'object' | 'edit' | 'event') {
    setTitle(kind === 'edit' ? selected?.name ?? '' : '');
    setDescription(kind === 'edit' ? selected?.description ?? '' : '');
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
      if (!documentFormat(asset.name)) { Alert.alert('Formato no admitido', 'Elige un archivo PDF, XLS o XLSX.'); return; }
      if (asset.size != null && asset.size > 5 * 1024 * 1024) { Alert.alert('Archivo demasiado grande', 'Elige un documento de hasta 5 MB.'); return; }
      setDocument(asset);
      setDocumentRemoved(false);
    } catch { Alert.alert('No se pudo seleccionar el archivo', 'Vuelve a intentarlo.'); }
  }
  async function showDocument(file: string) {
    try { await openDocument(file); }
    catch { Alert.alert('No se pudo abrir el documento', 'Comprueba que el archivo siga disponible y tengas una aplicación compatible instalada.'); }
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
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { Alert.alert('Imagen demasiado grande', 'Elige una imagen de hasta 5 MB.'); return; }
        setPhoto(asset);
        setPhotoRemoved(false);
      }
    } catch { Alert.alert('No se pudo abrir la imagen', 'Vuelve a intentarlo.'); }
  }
  function showPhotoOptions() {
    Alert.alert(isEventForm ? 'Foto del evento' : 'Foto del objeto', 'Elige una opción.', [
      { text: 'Tomar foto', onPress: () => void choosePhoto('camera') },
      { text: 'Elegir de la galería', onPress: () => void choosePhoto('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }
  function confirmArchive() {
    if (!selected || saving) return;
    Alert.alert('¿Archivar objeto?', 'El objeto y su historia dejarán de aparecer en la lista principal. Podrás restaurarlos desde Objetos archivados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Archivar', onPress: () => { void (async () => {
        setSaving(true);
        try { await archiveObject(selected.id); setSelected(null); await loadObjects(); }
        catch { Alert.alert('No se pudo archivar', 'Vuelve a intentarlo.'); }
        finally { setSaving(false); }
      })(); } },
    ]);
  }
  async function save() {
    if (!title.trim()) { Alert.alert('Falta un nombre', !isEventForm ? 'Escribe el nombre del objeto.' : 'Escribe el título del evento.'); return; }
    if (saving) return;
    setSaving(true);
    let newPhoto: string | null = null;
    let newDocument: string | null = null;
    let photoSaved = false;
    let stage = 'PHOTO';
    try {
      if (photo) newPhoto = await savePhoto(photo.uri, photo.mimeType, photo.fileName);
      stage = 'DOCUMENT';
      if (isEventForm && document) newDocument = await saveDocument(document.uri, document.name);
      stage = 'DATABASE';
      if (form === 'object') { await createObject(title.trim(), description.trim(), newPhoto); photoSaved = true; await loadObjects(); }
      else if (form === 'edit' && selected) {
        const updated = { ...selected, name: title.trim(), description: description.trim(), cover_image: newPhoto ?? (photoRemoved ? null : selected.cover_image) };
        await updateObject(selected.id, updated.name, updated.description, updated.cover_image);
        photoSaved = true;
        setSelected(updated);
        setObjects((items) => items.map((item) => item.id === updated.id ? updated : item));
        if (selected.cover_image && selected.cover_image !== updated.cover_image) void removePhoto(selected.cover_image).catch(() => {});
      }
      else if (form === 'event' && selected) {
        await createEvent(selected.id, title.trim(), description.trim(), eventType, localDate(eventDate), newPhoto, newDocument, document?.name ?? null);
        photoSaved = true;
        try { setEvents(await listEvents(selected.id)); setError(''); }
        catch { setError('El evento se guardó, pero no se pudo actualizar la historia. Vuelve a abrir el objeto.'); }
      }
      else if (form === 'editEvent' && editingEvent && selected) {
        const updated: MemoryEvent = { ...editingEvent, title: title.trim(), description: description.trim(), type: eventType, event_date: localDate(eventDate), photo: newPhoto ?? (photoRemoved ? null : editingEvent.photo), document_file: newDocument ?? (documentRemoved ? null : editingEvent.document_file), document_name: document ? document.name : documentRemoved ? null : editingEvent.document_name };
        await updateEvent(updated);
        photoSaved = true;
        setEvents((items) => items.map((item) => item.id === updated.id ? updated : item).sort((a, b) => b.event_date.localeCompare(a.event_date) || b.created_at.localeCompare(a.created_at)));
        if (editingEvent.photo && editingEvent.photo !== updated.photo) void removePhoto(editingEvent.photo).catch(() => {});
        if (editingEvent.document_file && editingEvent.document_file !== updated.document_file) void removeDocument(editingEvent.document_file).catch(() => {});
      }
      setForm(null);
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
      Alert.alert('No se pudo guardar', `${messages[reason] ?? fallback} (Código: ${messages[reason] ? reason : stage})`);
    }
    finally { setSaving(false); }
  }

  if (scanning) return <Scanner onBack={() => setScanning(false)} onFound={(object) => { setError(''); setSelected(object); setScanning(false); }} />;

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
        <View style={styles.nav}><BackButton onPress={() => setShowArchived(false)} /><Text style={styles.navTitle}>Objetos archivados</Text><View style={styles.navSpacer} /></View>
        <ScrollView contentContainerStyle={styles.archivedList}><Text style={styles.archivedIntro}>Estos objetos y sus historias siguen guardados en este dispositivo.</Text>
          {archivedLoading ? <ActivityIndicator color={colors.green} /> : archivedError ? <><Text style={styles.error}>{archivedError}</Text><Pressable accessibilityRole="button" onPress={() => void loadArchived()}><Text style={styles.retry}>Reintentar</Text></Pressable></> : archivedObjects.length === 0 ? <View style={styles.emptyHome}><View style={styles.emptyIcon}><Ionicons name="archive-outline" size={30} color={colors.green} /></View><Text style={styles.emptyTitle}>No hay objetos archivados</Text><Text style={styles.emptyText}>Los objetos que archives aparecerán aquí.</Text></View> : archivedObjects.map((item) => <View key={item.id} style={styles.archivedCard}><View style={styles.archivedRow}><View style={styles.cover}>{photoUri(item.cover_image) ? <Image source={{ uri: photoUri(item.cover_image)! }} style={styles.coverImage} /> : <Artwork name={item.name} />}</View><View style={styles.cardCopy}><Text style={styles.cardTitle}>{item.name}</Text><Text numberOfLines={2} style={styles.cardDescription}>{item.description || 'Sin descripción'}</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel={`Restaurar ${item.name}`} disabled={restoring !== null} style={[styles.restoreButton, restoring !== null && styles.pressed]} onPress={() => void restore(item)}><Ionicons name="refresh-outline" size={18} color={colors.green} /><Text style={styles.restoreText}>{restoring === item.id ? 'Restaurando…' : 'Restaurar objeto'}</Text></Pressable></View>)}
        </ScrollView>
      </> : showQr && selected ? <>
        <View style={styles.nav}><BackButton onPress={() => setShowQr(false)} /><Text style={styles.navTitle}>Código QR</Text><View style={styles.navSpacer} /></View>
        <ScrollView contentContainerStyle={styles.qrContent}><View style={styles.qrIcon}><Ionicons name="qr-code-outline" size={25} color={colors.green} /></View><Text style={styles.qrTitle}>El código de {selected.name}</Text><Text style={styles.qrDescription}>Escanea este código con MemoraTag para abrir la historia del objeto en este dispositivo.</Text><View style={styles.qrBox}><QRCode value={objectQrValue(selected.id)} size={220} /></View><Text style={styles.qrNotice}>Código local de prueba. Aún no abre una página web ni permite compartir el objeto con otros dispositivos.</Text></ScrollView>
      </> : form ? <>
        <View style={styles.nav}><BackButton onPress={() => setForm(null)} /><Text style={styles.navTitle}>{form === 'object' ? 'Nuevo objeto' : form === 'edit' ? 'Editar objeto' : form === 'editEvent' ? 'Editar evento' : 'Registrar evento'}</Text><View style={styles.navSpacer} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
          <Text style={styles.formHeading}>{form === 'object' ? 'Dale un lugar\na su historia.' : form === 'edit' ? 'Edita sus detalles.' : '¿Qué pasó?'}</Text>
          <Text style={styles.formIntro}>{form === 'object' ? 'Empieza con lo esencial. Podrás añadir recuerdos cuando quieras.' : form === 'edit' ? 'Actualiza el nombre o la descripción de tu objeto.' : 'Una pequeña nota también hace parte de su historia.'}</Text>
          {!isEventForm && <><Pressable accessibilityRole="button" accessibilityLabel={photo || (form === 'edit' && selected?.cover_image && !photoRemoved) ? 'Cambiar foto del objeto' : 'Añadir foto del objeto'} onPress={showPhotoOptions} style={styles.formArtwork}>
            {photo || (form === 'edit' && selected?.cover_image && !photoRemoved) ? <><Image source={{ uri: photo?.uri ?? photoUri(selected?.cover_image ?? null) ?? undefined }} style={styles.coverImage} /><View style={styles.photoBadge}><Ionicons name="camera-outline" size={18} color="#fff" /><Text style={styles.photoBadgeText}>Cambiar foto</Text></View></> : <><Ionicons name="camera-outline" size={25} color={colors.green} /><Text style={styles.artCaption}>Añadir foto</Text><Text style={styles.photoHint}>Opcional · hasta 5 MB</Text></>}
          </Pressable>{(photo || (form === 'edit' && selected?.cover_image && !photoRemoved)) && <Pressable accessibilityRole="button" onPress={() => { setPhoto(null); setPhotoRemoved(true); }}><Text style={styles.removePhoto}>Quitar foto</Text></Pressable>}</>}
          {isEventForm && <>
            <Text style={styles.label}>Tipo de evento</Text>
            <View style={styles.typeOptions}>{(Object.keys(eventTypes) as EventType[]).map((type) => <Pressable accessibilityRole="button" accessibilityState={{ selected: eventType === type }} key={type} onPress={() => setEventType(type)} style={[styles.typeOption, eventType === type && { borderColor: eventTypes[type].color, backgroundColor: `${eventTypes[type].color}10` }]}><Ionicons name={eventTypes[type].icon} size={18} color={eventTypes[type].color} /><Text style={[styles.typeText, eventType === type && { color: eventTypes[type].color }]}>{eventTypes[type].label}</Text></Pressable>)}</View>
          </>}
          <Text style={styles.label}>{!isEventForm ? 'Nombre del objeto' : 'Título'}</Text>
          <TextInput accessibilityLabel={!isEventForm ? 'Nombre del objeto' : 'Título del evento'} style={styles.input} value={title} onChangeText={setTitle} maxLength={120} placeholder={!isEventForm ? 'Ej. Guitarra, mochila, bici…' : 'Ej. Lo usé por primera vez'} placeholderTextColor="#999F97" />
          <Text style={styles.label}>Descripción <Text style={styles.optional}>opcional</Text></Text>
          <TextInput accessibilityLabel="Descripción" style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholder={!isEventForm ? '¿Qué lo hace especial?' : 'Añade más detalles'} placeholderTextColor="#999F97" />
          {isEventForm && <><Text style={styles.label}>Foto <Text style={styles.optional}>opcional</Text></Text><Pressable accessibilityRole="button" accessibilityLabel={photo || (editingEvent?.photo && !photoRemoved) ? 'Cambiar foto del evento' : 'Añadir foto al evento'} onPress={showPhotoOptions} style={styles.formArtwork}>{photo || (editingEvent?.photo && !photoRemoved) ? <><Image source={{ uri: photo?.uri ?? photoUri(editingEvent?.photo ?? null) ?? undefined }} style={styles.coverImage} /><View style={styles.photoBadge}><Ionicons name="camera-outline" size={18} color="#fff" /><Text style={styles.photoBadgeText}>Cambiar foto</Text></View></> : <><Ionicons name="camera-outline" size={25} color={colors.green} /><Text style={styles.artCaption}>Añadir foto</Text><Text style={styles.photoHint}>Opcional · hasta 5 MB</Text></>}</Pressable>{(photo || (editingEvent?.photo && !photoRemoved)) && <Pressable accessibilityRole="button" onPress={() => { setPhoto(null); setPhotoRemoved(true); }}><Text style={styles.removePhoto}>Quitar foto</Text></Pressable>}</>}
          {isEventForm && <><Text style={styles.label}>Documento <Text style={styles.optional}>opcional · PDF, XLS o XLSX, hasta 5 MB</Text></Text><Pressable accessibilityRole="button" style={styles.documentButton} onPress={() => void chooseDocument()}><Ionicons name="attach-outline" size={21} color={colors.green} /><Text style={styles.documentText} numberOfLines={1}>{document?.name ?? (!documentRemoved ? editingEvent?.document_name : null) ?? 'Seleccionar documento'}</Text></Pressable>{(document || (editingEvent?.document_file && !documentRemoved)) && <Pressable accessibilityRole="button" onPress={() => { setDocument(null); setDocumentRemoved(true); }}><Text style={styles.removeDocument}>Quitar documento</Text></Pressable>}</>}
          {isEventForm && <><Text style={styles.label}>Fecha del evento</Text><Pressable accessibilityRole="button" accessibilityLabel={`Fecha del evento: ${formatDate(localDate(eventDate))}`} style={styles.dateButton} onPress={() => setShowDatePicker(true)}><Ionicons name="calendar-outline" size={20} color={colors.green} /><Text style={styles.dateButtonText}>{formatDate(localDate(eventDate))}</Text></Pressable>
            {showDatePicker && <><DateTimePicker value={eventDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (event.type !== 'dismissed' && date) setEventDate(date); }} />{Platform.OS === 'ios' && <Pressable accessibilityRole="button" onPress={() => setShowDatePicker(false)}><Text style={styles.retry}>Listo</Text></Pressable>}</>}
          </>}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}><PrimaryButton label={saving ? 'Guardando…' : form === 'object' ? 'Crear objeto' : form === 'edit' || form === 'editEvent' ? 'Guardar cambios' : 'Guardar evento'} icon="checkmark" disabled={saving} onPress={() => void save()} /></View>
      </> : selected ? <>
        <ScrollView contentContainerStyle={styles.detailScroll}>
          <View style={styles.hero}>
            <View style={styles.heroTop}><BackButton onPress={() => { setSelected(null); setError(''); }} /><View style={styles.heroActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Editar objeto" style={styles.back} onPress={() => openForm('edit')}><Ionicons name="pencil-outline" size={20} color={colors.ink} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Archivar objeto" disabled={saving} style={styles.back} onPress={confirmArchive}><Ionicons name="archive-outline" size={20} color={colors.ink} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Ver código QR" style={styles.back} onPress={() => setShowQr(true)}><Ionicons name="qr-code-outline" size={20} color={colors.ink} /></Pressable>
            </View></View>
            {photoUri(selected.cover_image) ? <Pressable accessibilityRole="button" accessibilityLabel="Ver foto del objeto a pantalla completa" onPress={() => setFullPhoto(photoUri(selected.cover_image))} style={styles.heroCover}><Image source={{ uri: photoUri(selected.cover_image)! }} style={styles.coverImage} /></Pressable> : <View style={styles.heroCover}><Artwork name={selected.name} /></View>}
            <Text style={styles.objectHeading}>{selected.name}</Text>
            {selected.description ? <Text style={styles.heroDescription}>{selected.description}</Text> : null}
          </View>
          <View style={styles.history}>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Su historia</Text><Text style={styles.count}>{events.length} {events.length === 1 ? 'evento' : 'eventos'}</Text></View>
            {eventsLoading ? <ActivityIndicator color={colors.green} /> : error ? <Text style={styles.error}>{error}</Text> : events.length === 0 ? <View style={styles.emptyHistory}><Ionicons name="time-outline" size={25} color={colors.green} /><Text style={styles.emptyTitle}>Aquí empieza su historia</Text><Text style={styles.emptyText}>Registra un primer evento para guardar un recuerdo o detalle importante.</Text></View> : events.map((event, index) => <View key={event.id} style={styles.event}>
              <View style={styles.timeline}><View style={[styles.eventIcon, { backgroundColor: `${(eventTypes[event.type] ?? eventTypes.note).color}18` }]}><Ionicons name={(eventTypes[event.type] ?? eventTypes.note).icon} size={19} color={(eventTypes[event.type] ?? eventTypes.note).color} /></View>{index < events.length - 1 && <View style={styles.timelineLine} />}</View>
              <View style={styles.eventCopy}><View style={styles.eventHeader}><Text style={styles.date}>{(eventTypes[event.type] ?? eventTypes.note).label} · {formatDate(event.event_date)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Editar evento ${event.title}`} hitSlop={10} onPress={() => editEvent(event)}><Ionicons name="pencil-outline" size={19} color={colors.green} /></Pressable></View><Text style={styles.eventTitle}>{event.title}</Text>{event.description ? <Text style={styles.eventDescription}>{event.description}</Text> : null}{photoUri(event.photo) ? <Pressable accessibilityRole="button" accessibilityLabel="Ver foto del evento a pantalla completa" onPress={() => setFullPhoto(photoUri(event.photo))}><Image source={{ uri: photoUri(event.photo)! }} style={styles.eventPhoto} /></Pressable> : null}{event.document_file && <Pressable accessibilityRole="button" accessibilityLabel={`Abrir documento ${event.document_name ?? ''}`} style={styles.documentButton} onPress={() => void showDocument(event.document_file!)}><Ionicons name="document-attach-outline" size={20} color={colors.green} /><Text numberOfLines={2} style={styles.documentText}>{event.document_name || 'Documento adjunto'}</Text><Ionicons name="open-outline" size={18} color={colors.green} /></Pressable>}</View>
            </View>)}
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}><PrimaryButton label="Registrar evento" icon="add" onPress={() => openForm('event')} /></View>
      </> : <>
        <View style={styles.homeHeader}><View><Text style={styles.greeting}>Tu espacio personal</Text><Text style={styles.homeTitle}>Tus memorias</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Objetos archivados" onPress={() => { setShowArchived(true); void loadArchived(); }} style={styles.headerMark}><Ionicons name="archive-outline" size={23} color={colors.green} /></Pressable></View>
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.sectionHead}><Text style={styles.listLabel}>Objetos que cuidas</Text><Text style={styles.count}>{objects.length} {objects.length === 1 ? 'objeto' : 'objetos'}</Text></View>
          {loading ? <ActivityIndicator color={colors.green} /> : error ? <><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void loadObjects()}><Text style={styles.retry}>Reintentar</Text></Pressable></> : objects.length === 0 ? <View style={styles.emptyHome}><View style={styles.emptyIcon}><Ionicons name="cube-outline" size={30} color={colors.green} /></View><Text style={styles.emptyTitle}>Cada objeto tiene una historia</Text><Text style={styles.emptyText}>Crea tu primer objeto y guarda aquí todo lo que quieras recordar.</Text></View> : objects.map((item) => <Pressable accessibilityRole="button" key={item.id} style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => setSelected(item)}><View style={styles.cover}>{photoUri(item.cover_image) ? <Image source={{ uri: photoUri(item.cover_image)! }} style={styles.coverImage} /> : <Artwork name={item.name} />}</View><View style={styles.cardCopy}><Text style={styles.cardTitle}>{item.name}</Text><Text numberOfLines={2} style={styles.cardDescription}>{item.description || 'Consulta su historia'}</Text></View><Ionicons name="chevron-forward" size={18} color="#9AA39A" /></Pressable>)}
        </ScrollView>
        <View style={[styles.footer, styles.homeFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}><Pressable accessibilityRole="button" onPress={() => setScanning(true)} style={styles.scanButton}><Ionicons name="scan-outline" size={20} color={colors.green} /><Text style={styles.scanText}>Escanear QR</Text></Pressable><View style={styles.createButton}><PrimaryButton label="Nuevo objeto" icon="add" onPress={() => openForm('object')} /></View></View>
      </>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas }, flex: { flex: 1 },
  homeHeader: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, greeting: { color: colors.muted, fontSize: 15, fontWeight: '600' }, homeTitle: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 3 }, headerMark: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E8E4F4', justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }, listLabel: { color: colors.muted, fontSize: 14, fontWeight: '700' }, count: { color: colors.soft, fontSize: 13, fontWeight: '600' },
  card: { minHeight: 104, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E4EAE7', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 12 }, cover: { width: 78, height: 78, borderRadius: 14, backgroundColor: '#D7E5D2', alignItems: 'center', justifyContent: 'center' }, art: { width: 46, height: 46, backgroundColor: '#F4FFFA', borderWidth: 1, borderColor: '#C6E0D4', borderRadius: 13, justifyContent: 'center', alignItems: 'center' }, cardCopy: { flex: 1, gap: 5 }, cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, cardDescription: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  emptyHome: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 70, paddingBottom: 35 }, emptyIcon: { width: 74, height: 74, borderRadius: 24, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' }, emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 }, localNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 28 }, localText: { color: colors.soft, fontSize: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.canvas }, button: { minHeight: 56, borderRadius: 15, backgroundColor: colors.green, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.7 },
  homeFooter: { flexDirection: 'row', gap: 10 }, createButton: { flex: 1 }, scanButton: { flex: 1, minHeight: 56, borderRadius: 15, borderWidth: 1, borderColor: '#BBDCCD', backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, scanText: { color: colors.green, fontWeight: '700', fontSize: 14 },
  archivedList: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }, archivedIntro: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 20 }, archivedCard: { padding: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E4EAE7', marginBottom: 12 }, archivedRow: { flexDirection: 'row', alignItems: 'center', gap: 13 }, restoreButton: { minHeight: 44, marginTop: 12, borderWidth: 1, borderColor: '#BBDCCD', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, restoreText: { color: colors.green, fontWeight: '700', fontSize: 14 },
  qrContent: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }, qrIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.pale, justifyContent: 'center', alignItems: 'center' }, qrTitle: { color: colors.ink, fontSize: 27, fontWeight: '800', textAlign: 'center', marginTop: 20 }, qrDescription: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 12, maxWidth: 320 }, qrBox: { backgroundColor: '#fff', padding: 24, borderRadius: 24, marginTop: 30 }, qrNotice: { color: colors.soft, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 24, maxWidth: 320 },
  nav: { height: 74, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, navTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 }, navSpacer: { width: 44 }, back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  formContent: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 30 }, formHeading: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 }, formIntro: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 22 }, formArtwork: { height: 116, borderRadius: 16, backgroundColor: '#D7E5D2', justifyContent: 'center', alignItems: 'center', gap: 7, marginBottom: 25 }, artCaption: { color: colors.green, fontWeight: '700', fontSize: 13 }, label: { color: colors.ink, fontSize: 14, fontWeight: '800', marginBottom: 9 }, optional: { color: colors.muted, fontWeight: '500' }, input: { minHeight: 55, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingHorizontal: 16, color: colors.ink, fontSize: 16, marginBottom: 23 }, textarea: { minHeight: 106, paddingTop: 15 },
  coverImage: { width: '100%', height: '100%', borderRadius: 14 }, photoHint: { color: colors.muted, fontSize: 12 }, photoBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#14213DCC', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 }, photoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' }, removePhoto: { color: colors.green, fontWeight: '700', marginTop: -12, marginBottom: 20, textAlign: 'right' },
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 24 }, typeOption: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12 }, typeText: { color: colors.muted, fontWeight: '700', fontSize: 13 }, dateButton: { minHeight: 55, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }, dateButtonText: { color: colors.ink, fontSize: 16 },
  eventPhoto: { width: '100%', height: 170, borderRadius: 14, marginTop: 12, backgroundColor: '#D7E5D2' },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  documentButton: { minHeight: 54, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15, marginTop: 8 }, documentText: { color: colors.ink, fontSize: 14, flex: 1 }, removeDocument: { color: colors.green, fontWeight: '700', textAlign: 'right', marginBottom: 18 },
  photoViewer: { flex: 1, backgroundColor: '#101514' }, viewerHeader: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10 }, viewerClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#34413E' }, viewerImage: { flex: 1, width: '100%' },
  detailScroll: { paddingBottom: 30 }, hero: { backgroundColor: '#E8F1EE', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 29 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroActions: { flexDirection: 'row', gap: 10 }, heroCover: { width: 82, height: 82, borderRadius: 18, backgroundColor: '#D7E5D2', justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 15 }, objectHeading: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 }, heroDescription: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 }, history: { paddingHorizontal: 24, paddingTop: 28 }, sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink }, emptyHistory: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 24, alignItems: 'center', marginTop: 10 },
  event: { flexDirection: 'row', gap: 14, minHeight: 94 }, timeline: { width: 38, alignItems: 'center' }, eventIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }, timelineLine: { width: 2, backgroundColor: '#D4E0DA', flex: 1, marginVertical: 5 }, eventCopy: { flex: 1, paddingBottom: 25 }, date: { color: colors.soft, fontSize: 12, fontWeight: '600', marginBottom: 5 }, eventTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 }, eventDescription: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5 }, error: { color: '#A33030', fontSize: 15, lineHeight: 22, marginVertical: 12 }, retry: { color: colors.green, fontWeight: '700', marginVertical: 10 },
});
