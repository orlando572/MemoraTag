import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, palette } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  return <SafeAreaView style={styles.page}><KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.brand}><View style={styles.logo}><Text style={styles.logoMark}>M</Text></View><Text style={styles.name}>MemoraTag</Text><Text style={styles.tagline}>Las historias que viven{`\n`}en tus objetos.</Text></View>
    <View style={styles.form}><Text style={styles.label}>Tu correo</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="hola@ejemplo.com" placeholderTextColor="#929890" style={styles.input} /><Text style={styles.label}>Contraseña</Text><TextInput secureTextEntry placeholder="Tu contraseña" placeholderTextColor="#929890" style={styles.input} /><PrimaryButton label="Continuar" onPress={() => router.replace('/home')} icon="arrow-forward" /></View>
    <Text style={styles.legal}>Al continuar aceptas nuestros Términos y Política de privacidad.</Text>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.canvas }, content: { flex: 1, padding: 24, justifyContent: 'space-between' }, brand: { marginTop: 72 }, logo: { width: 57, height: 57, borderRadius: 18, backgroundColor: palette.green, justifyContent: 'center', alignItems: 'center', marginBottom: 22 }, logoMark: { color: 'white', fontSize: 29, fontWeight: '800' }, name: { fontSize: 26, fontWeight: '800', color: palette.ink }, tagline: { marginTop: 10, color: palette.muted, fontSize: 20, lineHeight: 28, fontWeight: '500' }, form: { gap: 12 }, label: { fontSize: 14, fontWeight: '700', color: palette.ink }, input: { height: 54, borderWidth: 1, borderColor: palette.line, borderRadius: 15, backgroundColor: '#fff', paddingHorizontal: 16, fontSize: 16, marginBottom: 5 }, legal: { textAlign: 'center', color: '#929890', fontSize: 12, lineHeight: 18, marginBottom: 8 } });
