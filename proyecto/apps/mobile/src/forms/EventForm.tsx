import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { cancelEventDeletion, commitEventDeletion, dataChanged, hideEventForDeletion } from '../data/bus';
import { removeDocument, saveDocument } from '../event-document';
import { photoUri, removePhoto, savePhoto } from '../object-photos';
import { createEvent, updateEvent, type EventType, type MemoryEvent } from '../storage';
import { Button, Footer, IconButton, NavBar, Screen, TextField } from '../ui/components';
import { eventTypes } from '../ui/event-types';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { haptic } from '../ui/feedback/haptics';
import { formatDate, localDate, relativeDate } from '../ui/format';
import { useStyles, useTheme } from '../ui/theme';
import { radius, space, type, type Palette } from '../ui/tokens';
import { pickDocument, pickPhoto, saveErrors } from './attachments';
import { useUnsavedGuard } from './useUnsavedGuard';

function parseDay(day: string) { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); }

/** Register (no `event`) or edit an event of the object `objectId`. */
export function EventForm({ objectId, objectName, event }: { objectId: string; objectName: string; event?: MemoryEvent }) {
  const Alert = useFeedback();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const titleInput = useRef<TextInput>(null);
  const [kind, setKind] = useState<EventType>(event?.type ?? 'note');
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [date, setDate] = useState(event ? parseDay(event.event_date) : new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [document, setDocument] = useState<DocumentPickerAsset | null>(null);
  const [documentRemoved, setDocumentRemoved] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = !saving && (kind !== (event?.type ?? 'note') || title !== (event?.title ?? '') || description !== (event?.description ?? '') || localDate(date) !== (event?.event_date ?? localDate(new Date())) || !!photo || photoRemoved || !!document || documentRemoved);
  const guard = useUnsavedGuard(dirty);

  const currentPhoto = photo?.uri ?? (!photoRemoved ? photoUri(event?.photo ?? null) : null);
  const currentDocument = document?.name ?? (!documentRemoved ? event?.document_name ?? null : null);
  const day = localDate(date);

  async function save() {
    if (!title.trim()) { haptic.error(); setTitleError(true); titleInput.current?.focus(); AccessibilityInfo.announceForAccessibility('Falta el título del evento.'); return; }
    if (saving) return;
    setSaving(true);
    let newPhoto: string | null = null;
    let newDocument: string | null = null;
    let stored = false;
    let stage: 'PHOTO' | 'DOCUMENT' | 'DATABASE' = 'PHOTO';
    try {
      if (photo) newPhoto = await savePhoto(photo.uri, photo.mimeType, photo.fileName);
      stage = 'DOCUMENT';
      if (document) newDocument = await saveDocument(document.uri, document.name);
      stage = 'DATABASE';
      if (event) {
        const updated: MemoryEvent = { ...event, title: title.trim(), description: description.trim(), type: kind, event_date: day, photo: newPhoto ?? (photoRemoved ? null : event.photo), document_file: newDocument ?? (documentRemoved ? null : event.document_file), document_name: document ? document.name : documentRemoved ? null : event.document_name };
        await updateEvent(updated);
        stored = true;
        if (event.photo && event.photo !== updated.photo) void removePhoto(event.photo).catch(() => {});
        if (event.document_file && event.document_file !== updated.document_file) void removeDocument(event.document_file).catch(() => {});
        Alert.toast('Cambios guardados');
      } else {
        await createEvent(objectId, title.trim(), description.trim(), kind, day, newPhoto, newDocument, document?.name ?? null);
        stored = true;
        Alert.toast(kind === 'maintenance' ? 'Mantenimiento guardado' : `${eventTypes[kind].label} guardada`);
      }
      guard.allowLeave(); dataChanged(); router.back();
    } catch (error) {
      if (newPhoto && !stored) await removePhoto(newPhoto).catch(() => {});
      if (newDocument && !stored) await removeDocument(newDocument).catch(() => {});
      const reason = error instanceof Error ? error.message : '';
      const fallback = stage === 'DATABASE' ? 'No se pudo guardar el evento en el teléfono.' : stage === 'DOCUMENT' ? 'No se pudo preparar el documento seleccionado.' : 'No se pudo guardar la imagen seleccionada.';
      Alert.error('No se pudo guardar', saveErrors[reason] ?? fallback);
      setSaving(false);
    }
  }

  // Deleting hides the event at once and offers «Deshacer»; it is removed when the toast closes.
  function remove() {
    if (!event) return;
    guard.allowLeave();
    hideEventForDeletion(event.id);
    router.back();
    Alert.toast('Evento eliminado', {
      action: { label: 'Deshacer', onPress: () => { cancelEventDeletion(event.id); Alert.toast('Evento recuperado', { tone: 'info' }); } },
      onExpire: () => { void commitEventDeletion(event.id, objectId).catch(() => Alert.error('No se pudo eliminar el evento', 'Sigue en la historia. Vuelve a intentarlo.')); },
    });
  }

  return <Screen>
    <NavBar title={event ? 'Editar evento' : 'Registrar evento'} disabled={saving} right={event ? <IconButton icon="trash-outline" label="Eliminar evento" onPress={remove} disabled={saving} /> : undefined} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Text style={s.context}><Ionicons name="pricetag-outline" size={14} color={c.muted} /> {objectName}</Text>
        <Text style={s.label}>¿Qué tipo de evento es?</Text>
        <View style={s.types} accessibilityRole="radiogroup">
          {(Object.keys(eventTypes) as EventType[]).map((key) => {
            const info = eventTypes[key];
            const selected = kind === key;
            const color = info.color(c);
            return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={info.label} accessibilityHint={info.hint} onPress={() => { haptic.tap(); setKind(key); }}
              style={({ pressed }) => [s.type, selected && { borderColor: color, borderWidth: 2, backgroundColor: info.soft(c) }, pressed && { opacity: 0.75 }]}>
              <Ionicons name={info.icon} size={24} color={color} />
              <Text style={[s.typeText, selected && { color: c.ink, fontWeight: '700' }]}>{info.label}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={s.typeHint}>{eventTypes[kind].hint}</Text>

        <TextField ref={titleInput} label="Título" value={title} maxLength={120} placeholder={kind === 'issue' ? 'Ej. La rueda trasera pierde aire' : kind === 'maintenance' ? 'Ej. Cambio de cadena' : 'Ej. Primer viaje a la playa'}
          error={titleError ? 'Escribe el título del evento.' : undefined} onChangeText={(value) => { setTitle(value); if (value.trim()) setTitleError(false); }} />
        <TextField label="Detalles" optional value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholder="Añade lo que quieras recordar" style={{ minHeight: 100, paddingTop: space.md }} />

        <Text style={s.label}>Fecha</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Fecha del evento: ${formatDate(day)}. Toca para cambiarla`} onPress={() => setShowPicker(true)} style={({ pressed }) => [s.field, pressed && { opacity: 0.7 }]}>
          <Ionicons name="calendar-outline" size={20} color={c.primary} />
          <Text style={s.fieldText}>{formatDate(day)}</Text>
          <Text style={s.fieldDetail}>{relativeDate(day)}</Text>
        </Pressable>
        {showPicker && <DateTimePicker value={date} mode="date" maximumDate={new Date()} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e, value) => { if (Platform.OS !== 'ios') setShowPicker(false); if (e.type !== 'dismissed' && value) setDate(value); }} />}
        {showPicker && Platform.OS === 'ios' && <Button label="Listo" variant="ghost" onPress={() => setShowPicker(false)} />}

        <Text style={[s.label, { marginTop: space.xl }]}>Adjuntos <Text style={s.optional}>· opcional</Text></Text>
        {currentPhoto ? <View style={s.attachment}>
          <Image source={{ uri: currentPhoto }} style={s.thumb} accessibilityLabel="Foto adjunta" />
          <View style={{ flex: 1 }}><Text style={s.fieldText}>Foto</Text><Text style={s.attachmentDetail}>Se mostrará en la historia</Text></View>
          <IconButton icon="close" label="Quitar foto" onPress={() => { setPhoto(null); setPhotoRemoved(true); }} />
        </View> : <Button label="Añadir foto" icon="camera-outline" variant="secondary" onPress={async () => { const asset = await pickPhoto(Alert, 'Foto del evento'); if (asset) { setPhoto(asset); setPhotoRemoved(false); } }} style={{ marginBottom: space.md }} />}
        {currentDocument ? <View style={s.attachment}>
          <View style={[s.thumb, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }]}><Ionicons name="document-attach-outline" size={24} color={c.onPrimarySoft} /></View>
          <View style={{ flex: 1 }}><Text style={s.fieldText} numberOfLines={2}>{currentDocument}</Text><Text style={s.attachmentDetail}>Documento</Text></View>
          <IconButton icon="close" label="Quitar documento" onPress={() => { setDocument(null); setDocumentRemoved(true); }} />
        </View> : <Button label="Adjuntar documento (PDF, XLS)" icon="attach-outline" variant="secondary" onPress={async () => { const asset = await pickDocument(Alert); if (asset) { setDocument(asset); setDocumentRemoved(false); } }} />}
        <Text style={[s.typeHint, { marginBottom: 0 }]}>Hasta 5 MB por archivo. Se guardan solo en este teléfono.</Text>
      </ScrollView>
      <Footer><Button label={saving ? 'Guardando…' : event ? 'Guardar cambios' : 'Guardar evento'} icon="checkmark" loading={saving} onPress={() => void save()} style={{ flex: 1 }} /></Footer>
    </KeyboardAvoidingView>
  </Screen>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl },
  context: { ...type.caption, color: c.muted, marginBottom: space.lg },
  label: { ...type.label, color: c.ink, marginBottom: space.sm },
  optional: { color: c.muted, fontWeight: '400' },
  types: { flexDirection: 'row', gap: space.sm },
  type: { flex: 1, minHeight: 76, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 4 },
  typeText: { ...type.caption, color: c.muted, textAlign: 'center' },
  typeHint: { ...type.caption, color: c.muted, marginTop: space.sm, marginBottom: space.xl },
  field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.inputBorder, borderRadius: radius.md, paddingHorizontal: space.lg },
  fieldText: { ...type.body, color: c.ink, flexShrink: 1 },
  fieldDetail: { ...type.caption, color: c.muted, marginLeft: 'auto' },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingLeft: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, marginBottom: space.md },
  attachmentDetail: { ...type.caption, color: c.muted },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
} as const);
