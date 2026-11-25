// Deep link read by the mobile app (apps/mobile/src/qr.ts): lowercase UUID only.
export const objectLink = (id: string) => `memoratag://objeto/${id.toLowerCase()}`;
