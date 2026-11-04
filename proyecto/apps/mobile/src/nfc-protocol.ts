// Version 1 stores only an ASCII local identifier in one NDEF text record.
// This is not a public URL and must not be used for permanent labels.
const identifier = /^memoratag-local:v1:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NfcRecord = { tnf: number; type: number[] | string; payload: number[] };

export function encodeNfcIdentifier(value: string): number[] {
  if (!identifier.test(value)) throw new Error('INVALID_IDENTIFIER');
  const payload = [2, 101, 110, ...Array.from(value, (character) => character.charCodeAt(0))];
  return [0xd1, 1, payload.length, 0x54, ...payload];
}

export function decodeNfcIdentifier(records: NfcRecord[]): string | null {
  if (records.length !== 1) return null;
  const record = records[0];
  if (record.tnf !== 1 || !Array.isArray(record.type) || record.type.length !== 1 || record.type[0] !== 0x54 || !Array.isArray(record.payload)) return null;
  const [status, ...payload] = record.payload;
  if (status === undefined || (status & 0x80) !== 0 || (status & 0x40) !== 0) return null;
  const languageLength = status & 0x3f;
  if (payload.length < languageLength || payload.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 127)) return null;
  const value = String.fromCharCode(...payload.slice(languageLength));
  return identifier.test(value) ? value.toLowerCase() : null;
}
