import { Ionicons } from '@expo/vector-icons';
import type { ImagePickerAsset } from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { dataChanged } from '../data/bus';
import { photoUri, removePhoto, savePhoto } from '../object-photos';
import { guessIcon, objectIcons } from '../objects/icons';
import { createObject, updateObject, type MemoryObject } from '../storage';
import { Button, Footer, NavBar, Screen, TextField } from '../ui/components';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { haptic } from '../ui/feedback/haptics';
import { useStyles, useTheme } from '../ui/theme';
import { objectColors, radius, space, type, type Palette } from '../ui/tokens';
import { pickPhoto, saveErrors } from './attachments';
import { useUnsavedGuard } from './useUnsavedGuard';

/** Create (no `object`) or edit an object. */
export function ObjectForm({ object }: { object?: MemoryObject }) {
  const Alert = useFeedback();
  const theme = useTheme();
  const { c } = theme;
  const s = useStyles(makeStyles);
  const nameInput = useRef<TextInput>(null);
  const initial = { name: object?.name ?? '', description: object?.description ?? '', color: object ? (objectColors.find((o) => o.key === object.color.toUpperCase())?.key ?? object.color) : objectColors[0].key, icon: object?.icon ?? null };
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [color, setColor] = useState<string>(initial.color);
  const [icon, setIcon] = useState<string | null>(initial.icon);
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = !saving && (name !== initial.name || description !== initial.description || color !== initial.color || icon !== initial.icon || !!photo || photoRemoved);
  const guard = useUnsavedGuard(dirty);

  const currentPhoto = photo?.uri ?? (!photoRemoved ? photoUri(object?.cover_image ?? null) : null);
  const effectiveIcon = icon ?? guessIcon(name);
  const tone = theme.object(color);

  async function save() {
    if (!name.trim()) { haptic.error(); setNameError(true); nameInput.current?.focus(); AccessibilityInfo.announceForAccessibility('Falta el nombre del objeto.'); return; }
    if (saving) return;
    setSaving(true);
    let newPhoto: string | null = null;
    let stored = false;
    try {
      if (photo) newPhoto = await savePhoto(photo.uri, photo.mimeType, photo.fileName);
      const cover = newPhoto ?? (photoRemoved ? null : object?.cover_image ?? null);
      if (object) {
        await updateObject(object.id, name.trim(), description.trim(), cover, color, icon);
        stored = true;
        if (object.cover_image && object.cover_image !== cover) void removePhoto(object.cover_image).catch(() => {});
        guard.allowLeave(); dataChanged(); router.back();
        Alert.toast('Cambios guardados');
      } else {
        const id = await createObject(name.trim(), description.trim(), cover, color, icon);
        stored = true;
        guard.allowLeave(); dataChanged();
        // Open the new object so the next steps (QR, NFC, first event) are in view.
        router.replace(`/object/${id}`);
        Alert.toast('Objeto creado');
      }
    } catch (error) {
      if (newPhoto && !stored) await removePhoto(newPhoto).catch(() => {});
      const reason = error instanceof Error ? error.message : '';
      Alert.error('No se pudo guardar', saveErrors[reason] ?? (newPhoto || !photo ? 'No se pudo guardar el objeto en el teléfono.' : 'No se pudo guardar la imagen seleccionada.'));
      setSaving(false);
    }
  }

  return <Screen>
    <NavBar title={object ? 'Editar objeto' : 'Nuevo objeto'} disabled={saving} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Text style={s.intro}>{object ? 'Actualiza sus datos. Su historia no cambia.' : 'Empieza con lo esencial: el nombre. Lo demás es opcional.'}</Text>

        <TextField ref={nameInput} label="Nombre" value={name} maxLength={120} placeholder="Ej. Bicicleta, guitarra, caldera…" autoCapitalize="sentences"
          error={nameError ? 'Escribe el nombre del objeto.' : undefined} onChangeText={(value) => { setName(value); if (value.trim()) setNameError(false); }} />
        <TextField label="Descripción" optional value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholder="¿Qué lo hace especial? Marca, modelo, dónde está…" style={{ minHeight: 100, paddingTop: space.md }} />

        <Text style={s.label}>Apariencia</Text>
        <Text style={s.hint}>Ayuda a reconocerlo de un vistazo en tu lista.</Text>
        <View style={s.preview}>
          <Pressable accessibilityRole="button" accessibilityLabel={currentPhoto ? 'Cambiar la foto del objeto' : 'Añadir una foto del objeto'} onPress={async () => { const asset = await pickPhoto(Alert, 'Foto del objeto'); if (asset) { setPhoto(asset); setPhotoRemoved(false); } }}
            style={({ pressed }) => [s.cover, { backgroundColor: tone.bg }, pressed && { opacity: 0.8 }]}>
            {currentPhoto ? <Image source={{ uri: currentPhoto }} style={s.coverImage} /> : <Ionicons name={objectIcons.find((o) => o.key === effectiveIcon)?.icon ?? 'cube-outline'} size={42} color={tone.fg} />}
            <View style={s.coverBadge}><Ionicons name="camera" size={16} color="#fff" /></View>
          </Pressable>
          <View style={{ flex: 1, gap: space.sm }}>
            <Button label={currentPhoto ? 'Cambiar foto' : 'Añadir foto'} icon="camera-outline" variant="secondary" onPress={async () => { const asset = await pickPhoto(Alert, 'Foto del objeto'); if (asset) { setPhoto(asset); setPhotoRemoved(false); } }} />
            {currentPhoto && <Button label="Quitar foto" icon="trash-outline" variant="ghost" onPress={() => { setPhoto(null); setPhotoRemoved(true); }} />}
            {!currentPhoto && <Text style={s.hint}>Opcional · hasta 5 MB. Sin foto se muestra el icono.</Text>}
          </View>
        </View>

        <Text style={s.label}>Icono</Text>
        <View style={s.grid} accessibilityRole="radiogroup">
          {objectIcons.map((option) => {
            const selected = effectiveIcon === option.key;
            return <Pressable key={option.key} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: selected }} onPress={() => { haptic.tap(); setIcon(option.key); }}
              style={({ pressed }) => [s.iconChoice, selected && { borderColor: c.primary, borderWidth: 2, backgroundColor: c.primarySoft }, pressed && { opacity: 0.7 }]}>
              <Ionicons name={option.icon} size={24} color={selected ? c.onPrimarySoft : c.ink} />
              <Text numberOfLines={1} style={[s.iconLabel, selected && { color: c.onPrimarySoft, fontWeight: '700' }]}>{option.label}</Text>
            </Pressable>;
          })}
        </View>

        <Text style={s.label}>Color</Text>
        <View style={s.colors} accessibilityRole="radiogroup">
          {objectColors.map((option) => {
            const selected = color === option.key;
            const swatch = theme.dark ? option.dark : option.light;
            return <Pressable key={option.key} accessibilityRole="radio" accessibilityLabel={option.name} accessibilityState={{ checked: selected }} onPress={() => { haptic.tap(); setColor(option.key); }}
              style={[s.swatch, { backgroundColor: swatch.bg }, selected && { borderColor: c.primary, borderWidth: 3 }]}>
              {selected && <Ionicons name="checkmark" size={22} color={swatch.fg} />}
            </Pressable>;
          })}
        </View>
      </ScrollView>
      <Footer><Button label={saving ? 'Guardando…' : object ? 'Guardar cambios' : 'Crear objeto'} icon="checkmark" loading={saving} onPress={() => void save()} style={{ flex: 1 }} /></Footer>
    </KeyboardAvoidingView>
  </Screen>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl },
  intro: { ...type.body, color: c.muted, marginBottom: space.xl },
  label: { ...type.label, color: c.ink, marginBottom: space.xs },
  hint: { ...type.caption, color: c.muted, marginBottom: space.md },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.xxl },
  cover: { width: 104, height: 104, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', right: 6, bottom: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xxl, marginTop: space.sm },
  iconChoice: { width: '23%', flexGrow: 1, minHeight: 72, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  iconLabel: { ...type.caption, fontSize: 12, color: c.muted },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.sm },
  swatch: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
} as const);
