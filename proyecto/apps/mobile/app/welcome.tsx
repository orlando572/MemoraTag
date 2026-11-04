import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useProfile } from '../src/data/profile';
import { saveLocalName } from '../src/storage';
import { Button, Screen, TextField } from '../src/ui/components';
import { useFeedback } from '../src/ui/feedback/FeedbackProvider';
import { haptic } from '../src/ui/feedback/haptics';
import { useStyles, useTheme } from '../src/ui/theme';
import { space, type, type Palette } from '../src/ui/tokens';

export default function Welcome() {
  const Alert = useFeedback();
  const profile = useProfile();
  const { c, dark } = useTheme();
  const s = useStyles(makeStyles);
  const input = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function start() {
    const clean = name.trim();
    if (!clean) { haptic.error(); setError(true); input.current?.focus(); AccessibilityInfo.announceForAccessibility('Escribe tu nombre para continuar.'); return; }
    if (saving) return;
    setSaving(true);
    try { await saveLocalName(clean); profile.setName(clean); }
    catch { Alert.error('No se pudo guardar tu nombre', 'Vuelve a intentarlo.'); setSaving(false); }
  }

  return <Screen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <View style={s.brand}>
          <Image source={dark ? require('../assets/logo-dark.png') : require('../assets/logo.png')} style={s.logo} accessibilityIgnoresInvertColors accessible={false} />
          <Text style={s.brandName}>MemoraTag</Text>
        </View>
        <View style={s.intro}>
          <Text accessibilityRole="header" style={s.heading}>La memoria de tus objetos, a un toque.</Text>
          <Text style={s.copy}>Guarda la historia de lo que cuidas —notas, incidencias, mantenimientos y documentos— y ábrela al escanear su QR o acercar su etiqueta NFC.</Text>
          <View style={s.points}>
            <Point icon="time-outline" text="Una línea de tiempo por objeto" />
            <Point icon="scan-outline" text="Acceso con QR y NFC" />
            <Point icon="lock-closed-outline" text="Sin cuenta: todo se queda en tu teléfono" />
          </View>
        </View>
        <TextField ref={input} label="¿Cómo te llamas?" value={name} maxLength={60} placeholder="Tu nombre" autoCapitalize="words" autoComplete="given-name" returnKeyType="done" editable={!saving}
          hint="Solo lo usamos para saludarte." error={error ? 'Escribe tu nombre para continuar.' : undefined}
          onChangeText={(value) => { setName(value); if (value.trim()) setError(false); }} onSubmitEditing={() => void start()} />
        <Button label={saving ? 'Guardando…' : 'Empezar'} icon="arrow-forward" loading={saving} onPress={() => void start()} />
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;

  function Point({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
    return <View style={s.point}><View style={s.pointIcon}><Ionicons name={icon} size={18} color={c.onPrimarySoft} /></View><Text style={s.pointText}>{text}</Text></View>;
  }
}

const makeStyles = (c: Palette) => ({
  content: { flexGrow: 1, paddingHorizontal: space.xxl, paddingTop: space.xl, paddingBottom: space.xxl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 56, height: 56 },
  brandName: { ...type.headline, fontSize: 21, color: c.primary, letterSpacing: -0.3 },
  intro: { flex: 1, justifyContent: 'center', paddingVertical: space.xxxl },
  heading: { ...type.display, fontSize: 34, lineHeight: 41, color: c.ink, letterSpacing: -0.8 },
  copy: { ...type.body, color: c.muted, marginTop: space.lg },
  points: { gap: space.md, marginTop: space.xxl },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pointIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pointText: { ...type.label, color: c.ink, flex: 1 },
} as const);
