import { DOCUMENT_MIME_TYPES, PHOTO_MIME_TYPES } from '@memoratag/contracts';
import type { EventFileKind } from '@memoratag/contracts';

const startsWith = (bytes: Buffer, sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

// Magic bytes per allowed MIME type.
const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/png': (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47]),
  'image/webp': (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  'application/pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) => startsWith(b, [0x50, 0x4b]),
  'application/vnd.ms-excel': (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
};

export function fileKind(mime: string): EventFileKind | null {
  if ((PHOTO_MIME_TYPES as readonly string[]).includes(mime)) return 'photo';
  if ((DOCUMENT_MIME_TYPES as readonly string[]).includes(mime)) return 'document';
  return null;
}

export function matchesSignature(mime: string, bytes: Buffer): boolean {
  return SIGNATURES[mime]?.(bytes) ?? false;
}

/** Display name only: strips path parts and control characters, max 200 chars. */
export function sanitizeName(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? '';
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200);
  return clean || 'file';
}

export function storagePath(orgId: string, objectId: string, eventId: string, fileId: string) {
  return `org/${orgId}/object/${objectId}/event/${eventId}/${fileId}`;
}
