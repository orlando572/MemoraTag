import type { EventFile } from '@memoratag/contracts';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '../ui/components';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { useTheme } from '../ui/theme';
import { radius, space, type } from '../ui/tokens';
import { fileUrl } from './api';
import { companyMessage, toCompanyError } from './errors';
import { documentIcon, formatSize, splitFiles } from './files';

/** Signed URLs last about 5 minutes: fetch on mount and fetch a new one if the image fails to load. */
function useSignedUrl(fileId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => { setFailed(false); fileUrl(fileId).then(setUrl).catch(() => setFailed(true)); }, [fileId]);
  useEffect(load, [load]);
  return { url, failed, refresh: load };
}

function Thumb({ file, onOpen }: { file: EventFile; onOpen: (fileId: string) => void }) {
  const { c } = useTheme();
  const { url, failed, refresh } = useSignedUrl(file.id);
  const [retried, setRetried] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={failed ? `No se pudo cargar la foto ${file.name}. Toca para reintentar` : `Ver la foto ${file.name} a pantalla completa`}
    onPress={() => failed ? refresh() : onOpen(file.id)} style={{ width: 88, height: 88, borderRadius: radius.md, backgroundColor: c.surfaceAlt, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    {url && !failed ? <Image source={{ uri: url }} accessibilityIgnoresInvertColors style={{ width: 88, height: 88 }}
      onError={() => { if (!retried) { setRetried(true); refresh(); } else refresh(); }} /> : <Ionicons name={failed ? 'refresh' : 'image-outline'} size={26} color={c.muted} />}
  </Pressable>;
}

/** Photos as thumbnails (full screen on tap) and documents as rows that open in the system. */
export function EventAttachments({ files }: { files: EventFile[] }) {
  const Alert = useFeedback();
  const { c } = useTheme();
  const { photos, documents } = splitFiles(files);
  const [full, setFull] = useState<string | null>(null);
  const viewer = useSignedUrl(full ?? '');
  if (files.length === 0) return null;

  async function openDocument(file: EventFile) {
    try { await Linking.openURL(await fileUrl(file.id)); }
    catch (e) { Alert.error('No se pudo abrir el documento', toCompanyError(e).kind === 'server' ? 'Comprueba que tengas una aplicación compatible o un navegador.' : companyMessage(toCompanyError(e).kind)); }
  }

  return <View style={{ marginTop: space.md, gap: space.sm }}>
    {photos.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{photos.map((file) => <Thumb key={file.id} file={file} onOpen={setFull} />)}</View>}
    {documents.map((file) => <Pressable key={file.id} accessibilityRole="button" accessibilityLabel={`Abrir documento ${file.name}, ${formatSize(file.size)}`} onPress={() => void openDocument(file)}
      style={({ pressed }) => [{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: c.surfaceAlt }, pressed && { opacity: 0.7 }]}>
      <Ionicons name={documentIcon(file)} size={20} color={c.primary} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={{ ...type.label, color: c.ink }}>{file.name}</Text>
        <Text style={{ ...type.secondary, color: c.muted }}>{formatSize(file.size)}</Text>
      </View>
      <Text style={{ ...type.label, color: c.primary }}>Abrir</Text>
      <Ionicons name="open-outline" size={18} color={c.muted} />
    </Pressable>)}
    <Modal visible={full !== null} animationType="fade" onRequestClose={() => setFull(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ alignItems: 'flex-end', padding: space.lg }}><IconButton icon="close" label="Cerrar foto" tone="onDark" onPress={() => setFull(null)} /></View>
        {viewer.url && !viewer.failed
          ? <Image accessibilityLabel="Foto a pantalla completa" source={{ uri: viewer.url }} style={{ flex: 1 }} resizeMode="contain" onError={viewer.refresh} />
          : <Text style={{ ...type.body, color: '#fff', textAlign: 'center', marginTop: space.xl }}>{viewer.failed ? 'No se pudo cargar la foto.' : 'Cargando…'}</Text>}
      </SafeAreaView>
    </Modal>
  </View>;
}
