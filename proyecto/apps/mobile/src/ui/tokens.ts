// MemoraTag design tokens: «petróleo y ámbar».
// Plain data with no React Native imports so scripts/check-contrast.mjs can validate it.

export type Palette = {
  canvas: string; surface: string; surfaceAlt: string;
  ink: string; muted: string;
  line: string; inputBorder: string;
  primary: string; primaryStrong: string; onPrimary: string; primarySoft: string; onPrimarySoft: string;
  accent: string; accentSoft: string; onAccentSoft: string;
  danger: string; dangerSoft: string;
  success: string; successSoft: string;
  warning: string; warningSoft: string;
  toast: string; onToast: string; toastAction: string; scrim: string;
  scanner: string; onScanner: string; scannerMuted: string;
};

export const light: Palette = {
  canvas: '#F7F6F2', surface: '#FFFFFF', surfaceAlt: '#EFF1EE',
  ink: '#172A30', muted: '#4E6168',
  line: '#E2E2DC', inputBorder: '#7F8E93',
  primary: '#0E5A6B', primaryStrong: '#0A4250', onPrimary: '#FFFFFF', primarySoft: '#DCEBEE', onPrimarySoft: '#0A4250',
  accent: '#E3A33B', accentSoft: '#FBEFD9', onAccentSoft: '#6B4708',
  danger: '#B4432F', dangerSoft: '#F7E4DF',
  success: '#376E33', successSoft: '#E3EFDF',
  warning: '#8A5A12', warningSoft: '#F6EBD6',
  toast: '#172A30', onToast: '#FFFFFF', toastAction: '#F0B75A', scrim: 'rgba(10, 26, 30, 0.55)',
  scanner: '#0B2A31', onScanner: '#FFFFFF', scannerMuted: '#BFD6DB',
};

export const dark: Palette = {
  canvas: '#0F1A1D', surface: '#172429', surfaceAlt: '#1E2E34',
  ink: '#EEF3F4', muted: '#A9B8BC',
  line: '#2A3B41', inputBorder: '#6E8389',
  primary: '#5FB3C4', primaryStrong: '#8ACCD9', onPrimary: '#06232A', primarySoft: '#173A43', onPrimarySoft: '#BFE3EA',
  accent: '#F0B75A', accentSoft: '#3A2E17', onAccentSoft: '#F6D59C',
  danger: '#F08A75', dangerSoft: '#3D211B',
  success: '#8CC98A', successSoft: '#1F3320',
  warning: '#E2B062', warningSoft: '#36291A',
  toast: '#EEF3F4', onToast: '#0F1A1D', toastAction: '#0A4250', scrim: 'rgba(0, 0, 0, 0.65)',
  scanner: '#071B20', onScanner: '#FFFFFF', scannerMuted: '#BFD6DB',
};

/** Object colours. `key` is what is stored in objects.color (the light background). */
export const objectColors = [
  { key: '#DCEBEE', name: 'Petróleo', light: { bg: '#DCEBEE', fg: '#0A4250' }, dark: { bg: '#173A43', fg: '#BFE3EA' } },
  { key: '#FBEFD9', name: 'Ámbar', light: { bg: '#FBEFD9', fg: '#6B4708' }, dark: { bg: '#3A2E17', fg: '#F6D59C' } },
  { key: '#E1EDDF', name: 'Salvia', light: { bg: '#E1EDDF', fg: '#2F5A2B' }, dark: { bg: '#1F3320', fg: '#BFE0BC' } },
  { key: '#E8E3F1', name: 'Lavanda', light: { bg: '#E8E3F1', fg: '#4F3F6B' }, dark: { bg: '#2B2438', fg: '#D7CCEB' } },
  { key: '#F7E2DC', name: 'Coral', light: { bg: '#F7E2DC', fg: '#7E3424' }, dark: { bg: '#3D211B', fg: '#F3C2B6' } },
  { key: '#E4E8EA', name: 'Pizarra', light: { bg: '#E4E8EA', fg: '#33464D' }, dark: { bg: '#243238', fg: '#CBD7DB' } },
] as const;

// Colours saved by earlier versions map to their closest new colour.
const legacyColors: Record<string, string> = { '#DCEBE2': '#E1EDDF', '#DCEAF1': '#DCEBEE', '#E8E3F1': '#E8E3F1', '#F0E7D6': '#FBEFD9', '#F2E0DF': '#F7E2DC' };

export function objectColor(stored: string | null | undefined) {
  const key = (stored && legacyColors[stored.toUpperCase()]) ?? stored?.toUpperCase();
  return objectColors.find((item) => item.key === key) ?? objectColors[0];
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;
export const type = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
} as const;

/** Text/background pairs that must meet WCAG AA (4.5:1 text, 3:1 UI boundaries). */
export function contrastPairs(p: Palette): [string, string, string, number][] {
  const text: [string, string, string][] = [
    ['ink/canvas', p.ink, p.canvas], ['ink/surface', p.ink, p.surface], ['ink/surfaceAlt', p.ink, p.surfaceAlt],
    ['muted/canvas', p.muted, p.canvas], ['muted/surface', p.muted, p.surface], ['muted/surfaceAlt', p.muted, p.surfaceAlt],
    ['primary/canvas', p.primary, p.canvas], ['primary/surface', p.primary, p.surface], ['onPrimary/primary', p.onPrimary, p.primary],
    ['onPrimarySoft/primarySoft', p.onPrimarySoft, p.primarySoft], ['onAccentSoft/accentSoft', p.onAccentSoft, p.accentSoft],
    ['danger/surface', p.danger, p.surface], ['danger/dangerSoft', p.danger, p.dangerSoft],
    ['success/surface', p.success, p.surface], ['success/successSoft', p.success, p.successSoft],
    ['warning/surface', p.warning, p.surface], ['warning/warningSoft', p.warning, p.warningSoft],
    ['onToast/toast', p.onToast, p.toast], ['toastAction/toast', p.toastAction, p.toast], ['onScanner/scanner', p.onScanner, p.scanner], ['scannerMuted/scanner', p.scannerMuted, p.scanner],
  ];
  return [
    ...text.map(([name, a, b]) => [name, a, b, 4.5] as [string, string, string, number]),
    ['inputBorder/surface (UI)', p.inputBorder, p.surface, 3],
  ];
}
