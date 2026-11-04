// Deep link shared by QR codes and NFC tags. It only identifies the object;
// the history stays on the device that created it.
const linkPrefix = 'memoratag://objeto/';
// Format written by earlier versions; still accepted so existing labels keep working.
const legacyPrefix = 'memoratag-local:v1:';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function objectLink(id: string) {
  return `${linkPrefix}${id.toLowerCase()}`;
}

export function isObjectId(value: string) {
  return uuid.test(value);
}

export function objectIdFromQr(value: string) {
  const text = value.trim();
  let id: string | null = null;
  if (text.toLowerCase().startsWith(linkPrefix)) id = text.slice(linkPrefix.length).replace(/\/$/, '');
  else if (text.startsWith(legacyPrefix)) id = text.slice(legacyPrefix.length);
  return id && uuid.test(id) ? id.toLowerCase() : null;
}
