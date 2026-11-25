// Pure helpers for event attachments of company objects. No React Native imports.
export type FileLike = { id: string; kind: 'photo' | 'document'; name: string; mime: string; size: number };

const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
const byExtension: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export function splitFiles<T extends FileLike>(files: T[]) {
  return { photos: files.filter((f) => f.kind === 'photo'), documents: files.filter((f) => f.kind === 'document') };
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Icon name (Ionicons) for a document row: spreadsheets and PDFs look different. */
export function documentIcon(file: Pick<FileLike, 'name' | 'mime'>): 'document-text-outline' | 'grid-outline' | 'document-attach-outline' {
  const name = file.name.toLowerCase();
  if (file.mime === 'application/pdf' || name.endsWith('.pdf')) return 'document-text-outline';
  if (/\.xlsx?$/.test(name) || file.mime.includes('spreadsheet') || file.mime.includes('excel')) return 'grid-outline';
  return 'document-attach-outline';
}

/** Upload name and MIME type for a picked photo, or null when the backend would reject the format. */
export function photoUpload(asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
  const ext = (asset.fileName ?? asset.uri).split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const type = asset.mimeType && photoTypes.includes(asset.mimeType) ? asset.mimeType : asset.mimeType ? null : byExtension[ext] ?? null;
  if (!type) return null;
  const extension = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
  return { type, name: asset.fileName && /\.\w+$/.test(asset.fileName) ? asset.fileName : `foto.${extension}` };
}

/** Only company admins may write NFC tags from the phone. */
export function canWriteNfc(role: string | null | undefined) {
  return role === 'admin';
}
