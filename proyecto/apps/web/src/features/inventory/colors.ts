// Object colours from apps/mobile/src/ui/tokens.ts. `key` is what the backend stores in `color`.
// The light/dark values live in globals.css as --obj-<index>-bg / --obj-<index>-fg.
export const objectColors = [
  { key: '#DCEBEE', name: 'Petróleo' },
  { key: '#FBEFD9', name: 'Ámbar' },
  { key: '#E1EDDF', name: 'Salvia' },
  { key: '#E8E3F1', name: 'Lavanda' },
  { key: '#F7E2DC', name: 'Coral' },
  { key: '#E4E8EA', name: 'Pizarra' },
] as const;

// Colours saved by earlier app versions map to their closest current colour.
const legacy: Record<string, string> = { '#DCEBE2': '#E1EDDF', '#DCEAF1': '#DCEBEE', '#F0E7D6': '#FBEFD9', '#F2E0DF': '#F7E2DC' };

export function objectColorIndex(stored: string | null | undefined) {
  const upper = stored?.toUpperCase() ?? '';
  const key = legacy[upper] ?? upper;
  const index = objectColors.findIndex((item) => item.key === key);
  return index < 0 ? 0 : index;
}
