// This local-only format is provisional; it is not a public web URL.
const prefix = 'memoratag-local:v1:';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function objectQrValue(id: string) {
  return `${prefix}${id}`;
}

export function objectIdFromQr(value: string) {
  if (!value.startsWith(prefix)) return null;
  const id = value.slice(prefix.length);
  return uuid.test(id) ? id.toLowerCase() : null;
}
