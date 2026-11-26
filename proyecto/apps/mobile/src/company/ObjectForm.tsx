import { Ionicons } from '@expo/vector-icons';
import type { InventoryStatus } from '@memoratag/contracts';
import { router } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Image, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { pickPhoto } from '../forms/attachments';
import { useUnsavedGuard } from '../forms/useUnsavedGuard';
import { Button, EmptyState, Footer, IconButton, NavBar, Screen, TextField } from '../ui/components';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { haptic } from '../ui/feedback/haptics';
import { useStyles, useTheme } from '../ui/theme';
import { fonts, objectColors, radius, space, type, type Palette } from '../ui/tokens';
import { createCompanyObject, uploadObjectPhoto } from './api';
import { useCompany } from './CompanyProvider';
import { CompanyError, companyMessage, photoUploadMessage, toCompanyError } from './errors';
import { canCreateObjects } from './files';
import { preparePhotoForUpload } from './photo-upload';
import { inventoryStatuses } from './status';

const orNull = (value: string) => value.trim() || null;

/** New company object, only for admins: same fields as the web, plus an optional photo. */
export function CompanyObjectForm() {
  const Alert = useFeedback();
  const { org } = useCompany();
  const theme = useTheme();
  const { c } = theme;
  const s = useStyles(makeStyles);
  const nameInput = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(objectColors[0].key);
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState<InventoryStatus>('in_use');
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = !!(name || description || code || category || location || assignee || photo) || color !== objectColors[0].key || status !== 'in_use';
  const guard = useUnsavedGuard(!saving && dirty);

  if (!org || !canCreateObjects(org.role)) {
    return <Screen>
      <NavBar title="Nuevo objeto" />
      <EmptyState icon="lock-closed-outline" title="Solo para administradores" text="Pide a un administrador de tu empresa que cree el objeto." />
    </Screen>;
  }
  const orgId = org.id;

  async function save() {
    if (!name.trim()) { haptic.error(); setNameError(true); nameInput.current?.focus(); AccessibilityInfo.announceForAccessibility('Falta el nombre del objeto.'); return; }
    if (saving) return;
    setSaving(true);
    try {
      const created = await createCompanyObject(orgId, {
        name: name.trim(), description: description.trim(), color, status,
        internal_code: orNull(code), category: orNull(category), location: orNull(location), assignee: orNull(assignee),
      });
      guard.allowLeave();
      // The object exists from here on; a failed photo upload must not create it twice.
      if (photo && !await upload(created.id)) return;
      finish(created.id);
    } catch (e) {
      Alert.error('No se pudo crear el objeto', companyMessage(toCompanyError(e).kind));
      setSaving(false);
    }
  }

  function finish(id: string) {
    haptic.success();
    router.replace(`/empresa/objeto/${id}`);
    Alert.toast('Objeto creado');
  }

  /** Uploads the photo; on failure offers to retry or to keep the object without it. Returns true when done. */
  async function upload(id: string): Promise<boolean> {
    if (!photo) return true;
    try { await uploadObjectPhoto(id, await preparePhotoForUpload(photo)); return true; }
    catch (e) {
      Alert.error('El objeto se creó, pero la foto no se subió', photoUploadMessage(e instanceof CompanyError ? e.kind : 'invalid'), [
        { text: 'Continuar sin foto', style: 'cancel', onPress: () => finish(id) },
        { text: 'Reintentar', onPress: () => { void upload(id).then((done) => { if (done) finish(id); }); } },
      ]);
      return false;
    }
  }

  const tone = theme.object(color);
  return <Screen>
    <NavBar title="Nuevo objeto" disabled={saving} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Text style={s.context}><Ionicons name="business-outline" size={14} color={c.muted} /> {org.name}</Text>

        <Text style={s.label}>Foto <Text style={s.optional}>· opcional</Text></Text>
        <View style={s.photoRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={photo ? 'Cambiar la foto del objeto' : 'Añadir una foto del objeto'} disabled={saving}
            onPress={async () => { const asset = await pickPhoto(Alert, 'Foto del objeto'); if (asset) setPhoto(asset); }}
            style={({ pressed }) => [s.cover, { backgroundColor: tone.bg }, pressed && { opacity: 0.8 }]}>
            {photo ? <Image source={{ uri: photo.uri }} style={s.coverImage} accessibilityIgnoresInvertColors /> : <Ionicons name="camera-outline" size={34} color={tone.fg} />}
          </Pressable>
          <View style={{ flex: 1, gap: space.sm }}>
            <Text style={s.hint}>{photo ? 'Foto lista. Se reducirá antes de subirla.' : 'Toma una foto o elige una de la galería.'}</Text>
            {photo && <IconButton icon="close" label="Quitar foto" size="sm" onPress={() => setPhoto(null)} />}
          </View>
        </View>

        <TextField ref={nameInput} label="Nombre" value={name} maxLength={200} returnKeyType="next" placeholder="Taladro de columna" error={nameError ? 'Escribe el nombre del objeto.' : undefined}
          onChangeText={(value) => { setName(value); if (value.trim()) setNameError(false); }} />
        <TextField label="Descripción" optional value={description} onChangeText={setDescription} multiline textAlignVertical="top" maxLength={2000} style={{ minHeight: 90, paddingTop: space.md }} />

        <Text style={s.label}>Color</Text>
        <View style={s.colors} accessibilityRole="radiogroup">
          {objectColors.map((option) => {
            const selected = color === option.key;
            const swatch = theme.object(option.key);
            return <Pressable key={option.key} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={option.name} onPress={() => { haptic.tap(); setColor(option.key); }}
              style={({ pressed }) => [s.colorOption, selected && { borderColor: c.primary, backgroundColor: c.primarySoft }, pressed && { opacity: 0.75 }]}>
              <View style={[s.swatch, { backgroundColor: swatch.bg }]}>{selected && <Ionicons name="checkmark" size={20} color={swatch.fg} />}</View>
              <Text numberOfLines={1} style={[s.colorLabel, selected && { color: c.onPrimarySoft, fontFamily: fonts.strong }]}>{option.name}</Text>
            </Pressable>;
          })}
        </View>

        <TextField label="Código interno" optional value={code} onChangeText={setCode} maxLength={200} autoCapitalize="characters" />
        <TextField label="Categoría" optional value={category} onChangeText={setCategory} maxLength={200} />
        <TextField label="Ubicación" optional value={location} onChangeText={setLocation} maxLength={200} />
        <TextField label="Responsable" optional value={assignee} onChangeText={setAssignee} maxLength={200} />

        <Text style={s.label}>Estado</Text>
        <View accessibilityRole="radiogroup" style={s.segments}>
          {(Object.keys(inventoryStatuses) as InventoryStatus[]).map((key) => {
            const item = inventoryStatuses[key];
            const selected = status === key;
            return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={item.label} onPress={() => { haptic.tap(); setStatus(key); }}
              style={({ pressed }) => [s.segment, selected && { backgroundColor: c.primarySoft, borderColor: c.primary, borderWidth: 2 }, pressed && { opacity: 0.75 }]}>
              <Ionicons name={selected ? item.icon : (`${item.icon}-outline` as keyof typeof Ionicons.glyphMap)} size={20} color={selected ? c.onPrimarySoft : c.muted} />
              <Text style={[s.segmentText, selected && { color: c.onPrimarySoft }]} numberOfLines={2}>{item.label}</Text>
            </Pressable>;
          })}
        </View>
      </ScrollView>
      <Footer><Button label={saving ? 'Creando…' : 'Crear objeto'} icon="checkmark" loading={saving} onPress={() => void save()} style={{ flex: 1 }} /></Footer>
    </KeyboardAvoidingView>
  </Screen>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl },
  context: { ...type.secondary, color: c.muted, marginBottom: space.lg },
  label: { ...type.label, color: c.ink, marginBottom: space.sm },
  optional: { color: c.muted },
  hint: { ...type.secondary, color: c.muted },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.xl },
  cover: { width: 96, height: 96, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverImage: { width: 96, height: 96 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl },
  colorOption: { width: '31%', minHeight: 76, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 6, padding: space.sm },
  swatch: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  colorLabel: { ...type.mini, color: c.muted },
  segments: { flexDirection: 'row', gap: space.sm },
  segment: { flex: 1, minHeight: 64, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 4, padding: space.sm },
  segmentText: { ...type.mini, color: c.ink, textAlign: 'center' },
} as const);
