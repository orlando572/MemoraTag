import { objectIdFromQr } from './qr.ts';

// Tags store one NDEF URI record with the object's deep link (memoratag://objeto/<id>),
// so Android can open the app even when it is closed. Text records written by
// version 1 (memoratag-local:v1:<id>) are still read.
export type NfcRecord = { tnf: number; type: number[] | string; payload: number[] };

const TNF_WELL_KNOWN = 1;
const RTD_TEXT = 0x54; // 'T'
const RTD_URI = 0x55; // 'U'

function isAscii(bytes: number[]) {
  return bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 127);
}

export function encodeNfcIdentifier(value: string): number[] {
  if (!value.startsWith('memoratag://objeto/') || !objectIdFromQr(value)) throw new Error('INVALID_IDENTIFIER');
  // URI identifier code 0x00: no abbreviation, the full URI follows.
  const payload = [0x00, ...Array.from(value, (character) => character.charCodeAt(0))];
  return [0xd1, 1, payload.length, RTD_URI, ...payload];
}

function recordType(record: NfcRecord) {
  if (typeof record.type === 'string') return record.type.length === 1 ? record.type.charCodeAt(0) : null;
  return Array.isArray(record.type) && record.type.length === 1 ? record.type[0] : null;
}

/** Returns the object id stored in the tag, or null when it is not a MemoraTag tag. */
export function decodeNfcIdentifier(records: NfcRecord[]): string | null {
  if (records.length !== 1) return null;
  const record = records[0];
  const type = recordType(record);
  if (record.tnf !== TNF_WELL_KNOWN || !Array.isArray(record.payload)) return null;
  if (type === RTD_URI) {
    const [code, ...rest] = record.payload;
    if (code !== 0x00 || !isAscii(rest)) return null;
    return objectIdFromQr(String.fromCharCode(...rest));
  }
  if (type === RTD_TEXT) {
    const [status, ...payload] = record.payload;
    if (status === undefined || (status & 0x80) !== 0 || (status & 0x40) !== 0) return null;
    const languageLength = status & 0x3f;
    if (payload.length < languageLength || !isAscii(payload)) return null;
    const value = String.fromCharCode(...payload.slice(languageLength));
    return value.startsWith('memoratag-local:v1:') ? objectIdFromQr(value) : null;
  }
  return null;
}
