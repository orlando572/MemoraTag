import { objectIdFromQr, objectLink } from '../src/qr';

// QR codes and NFC tags contain memoratag://objeto/<id>. Android opens the app with
// that link (system camera, tag tap with the app closed) and Expo Router hands it here.
// The object is opened by the home screen, so it is redirected there with ?open=<id>.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const match = /objeto\/([0-9a-f-]{36})/i.exec(path);
    const id = match ? objectIdFromQr(objectLink(match[1])) : null;
    // The nonce lets the same tag reopen its object after the user navigated away.
    return id ? `/?open=${id}&at=${Date.now()}` : path;
  } catch {
    return '/';
  }
}
