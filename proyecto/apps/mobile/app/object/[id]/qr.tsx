import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { objectLink } from '../../../src/qr';
import { shareQrImage } from '../../../src/qr-share';
import { findActiveObject, type MemoryObject } from '../../../src/storage';
import { Button, ErrorMessage, Loading, NavBar, Screen } from '../../../src/ui/components';
import { useFeedback } from '../../../src/ui/feedback/FeedbackProvider';
import { useStyles } from '../../../src/ui/theme';
import { radius, space, type, type Palette } from '../../../src/ui/tokens';

export default function QrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const Alert = useFeedback();
  const s = useStyles(makeStyles);
  const qrRef = useRef<any>(null);
  const [object, setObject] = useState<MemoryObject | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  useEffect(() => { findActiveObject(id).then(setObject).catch(() => setObject(null)); }, [id]);

  async function share() {
    if (!object || sharing) return;
    setSharing(true);
    try { await shareQrImage(qrRef.current, object.name); }
    catch (error) { Alert.error('No se pudo compartir el QR', error instanceof Error && error.message === 'SHARE_UNAVAILABLE' ? 'Este teléfono no permite compartir archivos.' : 'Vuelve a intentarlo.'); }
    finally { setSharing(false); }
  }

  if (object === undefined) return <Screen><NavBar title="Código QR" /><Loading /></Screen>;
  if (!object) return <Screen><NavBar title="Código QR" /><ErrorMessage text="Este objeto ya no está disponible." /></Screen>;

  return <Screen>
    <NavBar title="Código QR" />
    <ScrollView contentContainerStyle={s.content}>
      {/* The QR is always black on white, also in dark mode, so every scanner can read it. */}
      <View style={s.label} accessible accessibilityRole="image" accessibilityLabel={`Código QR de ${object.name}`}>
        <QRCode value={objectLink(object.id)} size={232} quietZone={16} color="#000000" backgroundColor="#FFFFFF" getRef={(ref) => { qrRef.current = ref; }} />
        <Text style={s.labelName} numberOfLines={2}>{object.name}</Text>
        <Text style={s.labelBrand}>MemoraTag</Text>
      </View>

      <View style={s.steps}>
        <Step n={1} icon="print-outline" text="Compártelo para imprimirlo o guardarlo como imagen." />
        <Step n={2} icon="pricetag-outline" text="Pégalo en el objeto, en un lugar visible y plano." />
        <Step n={3} icon="scan-outline" text="Escanéalo con MemoraTag o con la cámara del teléfono para abrir su historia." />
      </View>

      <Button label={sharing ? 'Preparando imagen…' : 'Compartir o imprimir'} icon="share-outline" loading={sharing} onPress={() => void share()} />
      <View style={s.notice}>
        <Ionicons name="lock-closed-outline" size={18} color={s.noticeText.color} />
        <Text style={s.noticeText}>El código solo contiene un enlace. La historia sigue guardada en este teléfono; en otro dispositivo no se podrá abrir.</Text>
      </View>
    </ScrollView>
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
  labelName: { ...type.headline, color: '#172A30', marginTop: space.sm, textAlign: 'center', maxWidth: 250 },
  labelBrand: { ...type.caption, color: '#0E5A6B', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  steps: { gap: space.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepIconText: { color: c.onPrimarySoft },
  stepText: { ...type.body, fontSize: 15, lineHeight: 22, color: c.ink, flex: 1 },
  notice: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  noticeText: { ...type.caption, color: c.muted, flex: 1, lineHeight: 19 },
} as const);
