import { objectIdFromQr, objectLink } from '../src/qr';

// QR codes and NFC tags contain memoratag://objeto/<id>. Android opens the app with that link
// (system camera, tag tap with the app closed) and Expo Router hands it here. The object screen
// itself explains when the object is archived or not stored on this device.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const match = /objeto\/([0-9a-f-]{36})/i.exec(path);
    const id = match ? objectIdFromQr(objectLink(match[1])) : null;
    return id ? `/object/${id}` : path;
  } catch {
    return '/';
  }
}
