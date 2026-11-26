import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Clipboard, Switch, Text, View } from 'react-native';
import { Badge, Button, PasswordField, TextField } from '../ui/components';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { useStyles, useTheme } from '../ui/theme';
import { space, type, type Palette } from '../ui/tokens';
import { useCompany } from './CompanyProvider';
import { showJoinHelp } from './nfc';

/** Content of the «Cuenta de empresa» section in Ajustes: sign in / sign out. Sign-up happens on the web. */
export function AccountSection() {
  const Alert = useFeedback();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const company = useCompany();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (company.state === 'loading') return <View style={s.row}><ActivityIndicator color={c.primary} /><Text style={s.hint}>Comprobando la sesión…</Text></View>;

  if (company.state === 'signedIn') {
    return <>
      <View style={s.row}><Ionicons name="checkmark-circle" size={22} color={c.success} /><Text style={s.label}>Sesión iniciada</Text></View>
      {!!company.email && <Text style={s.hint}>{company.email}</Text>}
      {company.org
        ? <View style={s.row}>
            <Ionicons name="business-outline" size={22} color={c.ink} />
            <Text style={[s.label, { flex: 1 }]} numberOfLines={2}>{company.org.name}</Text>
            {!!company.org.role && <Badge tone="primary" label={company.org.role === 'admin' ? 'Administrador' : 'Miembro'} />}
          </View>
        : company.orgLoading ? <View style={s.row}><ActivityIndicator color={c.primary} /><Text style={s.hint}>Cargando tu empresa…</Text></View>
        : showJoinHelp(company.state, !!company.org, company.orgLoading) ? <>
            <Text style={s.hint}>Aún no perteneces a una empresa. Dale este correo a tu administrador:</Text>
            <View style={s.row}>
              <Text selectable accessibilityLabel={`Tu correo: ${company.email ?? ''}`} style={[s.label, { flex: 1 }]}>{company.email}</Text>
              {!!company.email && <Button label="Copiar" icon="copy-outline" variant="secondary" onPress={() => { Clipboard.setString(company.email!); Alert.toast('Correo copiado'); }} />}
            </View>
            <Button label="Ya me añadieron" icon="refresh" variant="ghost" onPress={() => void company.reloadOrg()} />
          </> : null}
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Modo empresa</Text>
          <Text style={s.hint}>{company.org ? 'Muestra el inventario de la empresa al abrir la app. Tus objetos personales no se tocan.' : 'Disponible cuando tu cuenta pertenezca a una empresa.'}</Text>
        </View>
        <Switch accessibilityLabel="Modo empresa" accessibilityState={{ checked: company.companyMode, disabled: !company.org }} disabled={!company.org} value={company.companyMode} onValueChange={company.setCompanyMode}
          trackColor={{ false: c.inputBorder, true: c.primary }} thumbColor="#FFFFFF" />
      </View>
      <Button label="Cerrar sesión" icon="log-out-outline" variant="secondary" onPress={() => Alert.alert('¿Cerrar la sesión de empresa?', 'Tus objetos personales no se tocan. Podrás volver a iniciar sesión cuando quieras.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => void company.signOut() },
      ])} />
    </>;
  }

  async function submit() {
    if (busy) return;
    if (!email.trim() || !password) { setError('Escribe tu correo y tu contraseña.'); return; }
    setBusy(true); setError(null);
    const failure = await company.signIn(email, password);
    setBusy(false);
    if (failure) setError(failure);
    else { setPassword(''); Alert.toast('Sesión iniciada'); }
  }

  return <>
    <Text style={s.hint}>Con una cuenta de empresa consultas el inventario compartido. Tus objetos personales siguen funcionando sin cuenta.</Text>
    <TextField label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" editable={!busy} flush />
    <PasswordField label="Contraseña" value={password} onChangeText={setPassword} autoCapitalize="none" textContentType="password" autoComplete="password" editable={!busy} returnKeyType="done" onSubmitEditing={() => void submit()} error={error ?? undefined} flush />
    <Button label={busy ? 'Entrando…' : 'Iniciar sesión'} icon="log-in-outline" loading={busy} onPress={() => void submit()} />
    <Text style={s.hint}>Crea tu cuenta en la web.</Text>
  </>;
}

const makeStyles = (c: Palette) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { ...type.label, color: c.ink },
  hint: { ...type.secondary, color: c.muted },
} as const);
