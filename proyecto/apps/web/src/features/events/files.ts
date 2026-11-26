import { ALLOWED_FILE_MIME_TYPES, MAX_FILE_BYTES, PHOTO_MIME_TYPES } from '@memoratag/contracts';

export const ACCEPT = ALLOWED_FILE_MIME_TYPES.join(',');

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Client-side check; the backend validates again (type, size and file signature). */
export function validateFile(file: File): string | null {
  if (!(ALLOWED_FILE_MIME_TYPES as readonly string[]).includes(file.type)) return 'tipo no permitido (solo JPG, PNG, WEBP, PDF y Excel)';
  if (file.size === 0) return 'el archivo está vacío';
  if (file.size > MAX_FILE_BYTES) return `supera el máximo de ${formatBytes(MAX_FILE_BYTES)} (pesa ${formatBytes(file.size)})`;
  return null;
}

export const isPhoto = (mime: string) => (PHOTO_MIME_TYPES as readonly string[]).includes(mime);

export const PHOTO_ACCEPT = PHOTO_MIME_TYPES.join(',');

/** Same as validateFile, but only photos (object picture). */
export function validatePhoto(file: File): string | null {
  if (!isPhoto(file.type)) return 'tipo no permitido (solo JPG, PNG y WEBP)';
  return validateFile(file);
}
