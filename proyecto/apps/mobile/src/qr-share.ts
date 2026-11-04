import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type SvgRef = { toDataURL: (callback: (base64: string) => void, options?: { width?: number; height?: number }) => void };

function safeName(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'objeto';
}

/** Exports the rendered QR as a PNG and opens the share sheet (print, save, send). */
export async function shareQrImage(svg: SvgRef | null, objectName: string) {
  if (!svg) throw new Error('QR_NOT_READY');
  if (!await Sharing.isAvailableAsync()) throw new Error('SHARE_UNAVAILABLE');
  const base64 = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('QR_EXPORT')), 5000);
    svg.toDataURL((data) => { clearTimeout(timer); resolve(data); }, { width: 1024, height: 1024 });
  });
  const uri = `${FileSystem.cacheDirectory}memoratag-qr-${safeName(objectName)}.png`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `QR de ${objectName}`, UTI: 'public.png' });
}
