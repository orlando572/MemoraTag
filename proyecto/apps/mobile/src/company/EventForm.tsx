import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { EventType } from '@memoratag/contracts';
import { router } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { pickPhoto } from '../forms/attachments';
import { useUnsavedGuard } from '../forms/useUnsavedGuard';
import { Button, Footer, IconButton, NavBar, Screen, TextField } from '../ui/components';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { haptic } from '../ui/feedback/haptics';
import { formatDate, localDate, relativeDate } from '../ui/format';
import { useStyles, useTheme } from '../ui/theme';
import { radius, space, type, type Palette } from '../ui/tokens';
import { addEvent, uploadEventFile } from './api';
import { CompanyError, companyMessage, photoUploadMessage, toCompanyError } from './errors';
import { companyEventLook, registrableTypes } from './events';
import { preparePhotoForUpload } from './photo-upload';

/** Small form to register an event on a company object (no photo or document in this phase). */
export function CompanyEventForm({ objectId, objectName }: { objectId: string; objectName: string }) {
  const Alert = useFeedback();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const titleInput = useRef<TextInput>(null);
  const [kind, setKind] = useState<EventType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [saving, setSaving] = useState(false);
  const guard = useUnsavedGuard(!saving && (!!title || !!description || kind !== 'note' || !!date || !!photo));

  async function save() {
    if (!title.trim()) { haptic.error(); setTitleError(true); titleInput.current?.focus(); AccessibilityInfo.announceForAccessibility('Falta el título del evento.'); return; }
    if (saving) return;
    setSaving(true);
    try {
      // Noon avoids shifting the day when the server converts time zones (same as the web form).
      const event_date = date ? new Date(`${localDate(date)}T12:00:00`).toISOString() : null;
      const created = await addEvent(objectId, { type: kind, title: title.trim(), description: description.trim(), event_date });
      guard.allowLeave();
      // The event exists from here on; a failed photo upload must not create it twice.
      if (photo && !await upload(created.id)) return;
      finish();
    } catch (e) {
      const error = toCompanyError(e).kind;
      Alert.error('No se pudo guardar el evento', companyMessage(error));
      setSaving(false);
    }
  }

  function finish() {
    router.back();
    Alert.toast(`${companyEventLook(kind, c).label} registrado`);
  }

  /** Uploads the photo; on failure offers to retry or to keep the event without it. Returns true when done. */
  async function upload(eventId: string): Promise<boolean> {
    if (!photo) return true;
    try { await uploadEventFile(eventId, await preparePhotoForUpload(photo)); return true; }
    catch (e) {
      Alert.error('El evento se guardó, pero la foto no se subió', photoUploadMessage(e instanceof CompanyError ? e.kind : 'invalid'), [
        { text: 'Continuar sin foto', style: 'cancel', onPress: finish },
        { text: 'Reintentar', onPress: () => { void upload(eventId).then((done) => { if (done) finish(); }); } },
      ]);
      return false;
    }
  }

  const shown = localDate(date ?? new Date());
  return <Screen>
    <NavBar title="Registrar evento" disabled={saving} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Text style={s.context}><Ionicons name="business-outline" size={14} color={c.muted} /> {objectName}</Text>
        <Text style={s.label}>¿Qué tipo de evento es?</Text>
        <View style={s.types} accessibilityRole="radiogroup">
          {registrableTypes.map((key) => {
            const look = companyEventLook(key, c);
            const selected = kind === key;
            return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={look.label} accessibilityHint={look.hint} onPress={() => { haptic.tap(); setKind(key); }}
              style={({ pressed }) => [s.type, selected && { borderColor: look.color, borderWidth: 2, backgroundColor: look.soft }, pressed && { opacity: 0.75 }]}>
              <Ionicons name={look.icon} size={24} color={look.color} />
              <Text style={s.typeText}>{look.label}</Text>
              <View style={[s.radio, selected && { borderColor: look.color }]}>{selected && <View style={[s.radioDot, { backgroundColor: look.color }]} />}</View>
            </Pressable>;
          })}
        </View>

        <TextField ref={titleInput} label="Título" value={title} maxLength={120} returnKeyType="next" error={titleError ? 'Escribe el título del evento.' : undefined}
          onChangeText={(value) => { setTitle(value); if (value.trim()) setTitleError(false); }} />
        <TextField label="Detalles" optional value={description} onChangeText={setDescription} multiline textAlignVertical="top" maxLength={4000} style={{ minHeight: 100, paddingTop: space.md }} />

        <Text style={s.label}>Fecha <Text style={s.optional}>· opcional</Text></Text>
        <View style={s.dateRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Fecha del evento: ${date ? formatDate(shown) : 'hoy'}. Toca para cambiarla`} onPress={() => setShowPicker(true)} style={({ pressed }) => [s.field, pressed && { opacity: 0.7 }]}>
            <Ionicons name="calendar-outline" size={20} color={c.primary} />
            <Text style={s.fieldText}>{date ? formatDate(shown) : 'Hoy'}</Text>
            {!!date && <Text style={s.fieldDetail}>{relativeDate(shown)}</Text>}
          </Pressable>
          {!!date && <IconButton icon="close" label="Quitar la fecha y usar hoy" onPress={() => setDate(null)} />}
        </View>
        {showPicker && <DateTimePicker value={date ?? new Date()} mode="date" maximumDate={new Date()} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e, value) => { if (Platform.OS !== 'ios') setShowPicker(false); if (e.type !== 'dismissed' && value) setDate(value); }} />}
        {showPicker && Platform.OS === 'ios' && <Button label="Listo" variant="ghost" onPress={() => setShowPicker(false)} />}

        <Text style={[s.label, { marginTop: space.xl }]}>Foto <Text style={s.optional}>· opcional</Text></Text>
        {photo ? <View style={s.attachment}>
          <Image source={{ uri: photo.uri }} style={s.thumb} accessibilityLabel="Vista previa de la foto adjunta" />
          <Text style={[s.fieldText, { flex: 1 }]}>Foto lista para subir</Text>
          <IconButton icon="close" label="Quitar foto" onPress={() => setPhoto(null)} />
        </View> : <Button label="Añadir foto" icon="camera-outline" variant="secondary" disabled={saving} onPress={async () => { const asset = await pickPhoto(Alert, 'Foto del evento'); if (asset) setPhoto(asset); }} />}
      </ScrollView>
      <Footer><Button label={saving ? 'Guardando…' : 'Guardar evento'} icon="checkmark" loading={saving} onPress={() => void save()} style={{ flex: 1 }} /></Footer>
    </KeyboardAvoidingView>
  </Screen>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl },
  context: { ...type.secondary, color: c.muted, marginBottom: space.lg },
  label: { ...type.label, color: c.ink, marginBottom: space.sm },
  optional: { color: c.muted },
  types: { gap: space.sm, marginBottom: space.xl },
  type: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  typeText: { ...type.label, color: c.ink, flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.inputBorder, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  field: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.inputBorder, borderRadius: radius.md, paddingHorizontal: space.lg },
  fieldText: { ...type.body, color: c.ink, flexShrink: 1 },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  fieldDetail: { ...type.secondary, color: c.muted, marginLeft: 'auto' },
} as const);
