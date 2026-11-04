import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveLocalName } from './storage';
import { useKeyboardScroll } from './useKeyboardScroll';
import { useFeedback } from './ui/feedback/FeedbackProvider';

export function Welcome({ onContinue }: { onContinue: (name: string) => void }) {
  const Alert = useFeedback();
  const insets = useSafeAreaInsets();
  const keyboardScroll = useKeyboardScroll();
  const nameInput = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [accountScreen, setAccountScreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (savingRef.current) return true; if (accountScreen) { setAccountScreen(false); return true; } return false; });
    return () => listener.remove();
  }, [accountScreen]);

  async function continueWithName() {
    const cleanName = name.trim();
    if (!cleanName) { setNameError(true); nameInput.current?.focus(); return; }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try { await saveLocalName(cleanName); onContinue(cleanName); }
    catch { Alert.error('No se pudo guardar tu nombre', 'Vuelve a intentarlo.'); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return <SafeAreaView style={styles.page} edges={['top']}>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={keyboardScroll.scrollRef} onLayout={keyboardScroll.onLayout} onScroll={keyboardScroll.onScroll} onContentSizeChange={keyboardScroll.onContentSizeChange} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + keyboardScroll.extraSpace }]}>
        {accountScreen ? <>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" style={styles.back} onPress={() => setAccountScreen(false)}><Ionicons name="arrow-back" size={22} color="#203934" /></Pressable>
          <View style={styles.accountContent}><View style={styles.mark}><Ionicons name="person-outline" size={27} color="#176B57" /></View><Text style={styles.heading}>Tu cuenta</Text><Text style={styles.copy}>El inicio de sesión y la creación de cuentas aún no están disponibles.</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={[styles.secondary, styles.disabled]}><Text style={styles.secondaryText}>Crear cuenta</Text></Pressable><Pressable accessibilityRole="button" style={styles.accountLink} onPress={() => setAccountScreen(false)}><Text style={styles.accountLinkText}>Continuar con mi nombre</Text></Pressable></View>
        </> : <>
          <View style={styles.brand}><View style={styles.mark}><Ionicons name="bookmark-outline" size={27} color="#176B57" /></View><Text style={styles.brandName}>MemoraTag</Text></View>
          <View style={styles.intro}><Text style={styles.heading}>Cada objeto{ '\n' }tiene una historia.</Text><Text style={styles.copy}>Guarda los momentos y detalles que merecen ser recordados.</Text></View>
          <View style={styles.form}><Text style={styles.label}>¿Cómo te llamas?</Text><TextInput ref={nameInput} onFocus={() => keyboardScroll.focus(nameInput)} onBlur={() => keyboardScroll.blur(nameInput)} editable={!saving} accessibilityLabel="Tu nombre" accessibilityHint={nameError ? 'Escribe tu nombre para continuar' : undefined} value={name} onChangeText={(value) => { setName(value); if (value.trim()) setNameError(false); }} placeholder="Tu nombre" placeholderTextColor="#68736D" style={[styles.input, nameError && styles.invalidInput]} autoCapitalize="words" autoComplete="given-name" maxLength={60} returnKeyType="done" onSubmitEditing={() => void continueWithName()} />{nameError && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>Escribe tu nombre para continuar.</Text>}<Pressable accessibilityRole="button" disabled={saving} style={[styles.primary, saving && styles.disabled]} onPress={() => void continueWithName()}>{saving ? <><ActivityIndicator color="#fff" /><Text style={styles.primaryText}>Guardando…</Text></> : <Text style={styles.primaryText}>Continuar</Text>}</Pressable><Pressable accessibilityRole="button" disabled={saving} style={styles.accountLink} onPress={() => setAccountScreen(true)}><Text style={styles.accountLinkText}>Iniciar sesión</Text><Ionicons name="arrow-forward" size={17} color="#176B57" /></Pressable></View>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F5F8F6' }, fill: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 26 },
  invalidInput: { borderColor: '#A33F43', borderWidth: 2 }, fieldError: { color: '#A33F43', fontSize: 13, marginTop: 7 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 }, mark: { width: 52, height: 52, borderRadius: 17, backgroundColor: '#E1EEE7', alignItems: 'center', justifyContent: 'center' }, brandName: { color: '#203934', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  intro: { flex: 1, justifyContent: 'center', paddingVertical: 60 }, heading: { color: '#203934', fontSize: 36, lineHeight: 43, fontWeight: '700', letterSpacing: -1 }, copy: { color: '#526C65', fontSize: 16, lineHeight: 24, marginTop: 14, maxWidth: 310 },
  form: { paddingBottom: 12 }, label: { color: '#203934', fontSize: 15, fontWeight: '700', marginBottom: 10 }, input: { minHeight: 56, borderWidth: 1, borderColor: '#DBE7E1', borderRadius: 15, backgroundColor: '#fff', paddingHorizontal: 16, color: '#203934', fontSize: 16 }, primary: { minHeight: 56, marginTop: 16, borderRadius: 16, backgroundColor: '#176B57', justifyContent: 'center', alignItems: 'center' }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' }, disabled: { opacity: 0.6 }, accountLink: { minHeight: 52, marginTop: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, accountLinkText: { color: '#176B57', fontSize: 15, fontWeight: '700' },
  back: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#DBE7E1', backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }, accountContent: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', paddingVertical: 48, gap: 16 }, secondary: { marginTop: 10, minHeight: 54, paddingHorizontal: 20, borderWidth: 1, borderColor: '#C6DCD0', borderRadius: 15, justifyContent: 'center' }, secondaryText: { color: '#176B57', fontSize: 15, fontWeight: '700' },
});
