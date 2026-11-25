import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { shareQrImage } from './qr-share';
import { Button, Footer, NavBar, Screen } from './ui/components';
import { useFeedback } from './ui/feedback/FeedbackProvider';
import { useStyles } from './ui/theme';
import { radius, space, type, type Palette } from './ui/tokens';

/** QR screen shared by personal and company objects: label, two steps and the share button. */
export function QrScreenView({ name, value }: { name: string; value: string }) {
  const Alert = useFeedback();
  const s = useStyles(makeStyles);
  const qrRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (sharing) return;
    setSharing(true);
    try { await shareQrImage(qrRef.current, name); }
    catch (error) { Alert.error('No se pudo compartir el QR', error instanceof Error && error.message === 'SHARE_UNAVAILABLE' ? 'Este teléfono no permite compartir archivos.' : 'Vuelve a intentarlo.'); }
    finally { setSharing(false); }
  }

  return <Screen>
    <NavBar title="Código QR" />
    <ScrollView contentContainerStyle={s.content}>
      {/* The QR is always black on white, also in dark mode, so every scanner can read it. */}
      <View style={s.label} accessible accessibilityRole="image" accessibilityLabel={`Código QR de ${name}`}>
        <Text style={s.labelBrand}>MemoraTag</Text>
        <QRCode value={value} size={232} quietZone={16} color="#000000" backgroundColor="#FFFFFF" getRef={(ref) => { qrRef.current = ref; }} />
        <Text style={s.labelName} numberOfLines={2}>{name}</Text>
      </View>

      <View style={s.steps}>
        <Step n={1} icon="print-outline" text="Compártelo o imprímelo." />
        <Step n={2} icon="pricetag-outline" text="Pégalo en el objeto." />
      </View>
    </ScrollView>
    <Footer><Button label={sharing ? 'Preparando imagen…' : 'Compartir o imprimir'} icon="share-outline" loading={sharing} onPress={() => void share()} style={{ flex: 1 }} /></Footer>
  </Screen>;
}

function Step({ n, icon, text }: { n: number; icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const s = useStyles(makeStyles);
  return <View style={s.step} accessible accessibilityLabel={`Paso ${n}: ${text}`}>
    <View style={s.stepIcon}><Ionicons name={icon} size={20} color={s.stepIconText.color} /></View>
    <Text style={s.stepText}>{text}</Text>
  </View>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl, gap: space.xl },
  label: { alignSelf: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: radius.xl, paddingTop: space.lg, paddingBottom: space.xl, paddingHorizontal: space.lg, borderWidth: 1, borderColor: c.line },
  labelName: { ...type.card, color: '#1F1B16', marginTop: space.sm, textAlign: 'center', maxWidth: 250 },
  labelBrand: { ...type.mini, color: '#2F4BB8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: space.sm },
  steps: { gap: space.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepIconText: { color: c.onPrimarySoft },
  stepText: { ...type.body, color: c.ink, flex: 1 },
} as const);
