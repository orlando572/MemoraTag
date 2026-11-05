// MemoraTag design tokens: «Bitácora» (tinta azul sobre papel cálido, idea de diario de registro).
// Plain data with no React Native imports so scripts/check-contrast.mjs can validate it.
//
// Colour roles:
// - `primary` (azul tinta) is the only action colour: main buttons, links, selected items.
// - `danger` (coral), `success` (verde) and `warning` (ámbar) only mean a state: open incident,
//   resolved, and «cuidado no urgente» (maintenance and tips). Never decoration.
// - A state is never shown by colour alone: keep the icon and the text next to it (WCAG 1.4.1).
// - `line` only separates cards; `inputBorder` outlines fields and controls (WCAG 1.4.11).

export type Palette = {
  canvas: string; surface: string; surfaceAlt: string;
  ink: string; muted: string;
  line: string; inputBorder: string;
  primary: string; primaryStrong: string; onPrimary: string; primarySoft: string; onPrimarySoft: string;
  danger: string; dangerSoft: string;
  success: string; successSoft: string;
  warning: string; warningSoft: string;
  toast: string; onToast: string; toastAction: string; scrim: string;
  scanner: string; scannerScrim: string; onScanner: string; scannerMuted: string; scannerAccent: string;
};

export const light: Palette = {
  canvas: '#F7F3EC', surface: '#FFFFFF', surfaceAlt: '#EFE9DF',
  ink: '#1F1B16', muted: '#6B6258',
  line: '#E4DCCF', inputBorder: '#8C8274',
  primary: '#2F4BB8', primaryStrong: '#233A94', onPrimary: '#FFFFFF', primarySoft: '#E6EAF8', onPrimarySoft: '#233A94',
  danger: '#AD3520', dangerSoft: '#FBE6E1',
  success: '#25692F', successSoft: '#E2F1E4',
  warning: '#8A5A00', warningSoft: '#F8EDD7',
  toast: '#2A2520', onToast: '#F7F3EC', toastAction: '#8FA8FF', scrim: 'rgba(0, 0, 0, 0.45)',
  scanner: '#0E0D0B', scannerScrim: 'rgba(0, 0, 0, 0.6)', onScanner: '#FFFFFF', scannerMuted: '#F2ECE3', scannerAccent: '#8FA8FF',
};

export const dark: Palette = {
  canvas: '#1B1916', surface: '#262320', surfaceAlt: '#302B26',
  ink: '#F2ECE3', muted: '#A89E91',
  line: '#3A352F', inputBorder: '#7A7064',
  primary: '#8FA8FF', primaryStrong: '#B3C3FF', onPrimary: '#0F1A3D', primarySoft: '#232A45', onPrimarySoft: '#B3C3FF',
  danger: '#FF8A73', dangerSoft: '#3A221C',
  success: '#7FCB8A', successSoft: '#1F3324',
  warning: '#E8B964', warningSoft: '#3A2E17',
  toast: '#F2ECE3', onToast: '#1B1916', toastAction: '#2F4BB8', scrim: 'rgba(0, 0, 0, 0.6)',
  scanner: '#0E0D0B', scannerScrim: 'rgba(0, 0, 0, 0.6)', onScanner: '#FFFFFF', scannerMuted: '#F2ECE3', scannerAccent: '#8FA8FF',
};

/**
 * Object colours: muted tones used only as the background of the object's icon or avatar, never as
 * text or in status chips. `key` is what is stored in objects.color; it must never change.
 */
export const objectColors = [
  { key: '#DCEBEE', name: 'Petróleo', light: { bg: '#D9E4E6', fg: '#2E5560' }, dark: { bg: '#22323A', fg: '#A9CBD3' } },
  { key: '#FBEFD9', name: 'Ámbar', light: { bg: '#EBE0C8', fg: '#6E5522' }, dark: { bg: '#35301F', fg: '#D8C28A' } },
  { key: '#E1EDDF', name: 'Salvia', light: { bg: '#DCE5D6', fg: '#44603C' }, dark: { bg: '#28332A', fg: '#B5CDAA' } },
  { key: '#E8E3F1', name: 'Lavanda', light: { bg: '#E2DDEA', fg: '#55497A' }, dark: { bg: '#302B3D', fg: '#C9BFE0' } },
  { key: '#F7E2DC', name: 'Coral', light: { bg: '#EBDAD4', fg: '#7A4A3E' }, dark: { bg: '#382B27', fg: '#E0B5A8' } },
  { key: '#E4E8EA', name: 'Pizarra', light: { bg: '#E1E1E0', fg: '#4A4F55' }, dark: { bg: '#2B2D30', fg: '#C3C7CB' } },
] as const;

// Colours saved by earlier versions map to their closest current colour.
const legacyColors: Record<string, string> = { '#DCEBE2': '#E1EDDF', '#DCEAF1': '#DCEBEE', '#E8E3F1': '#E8E3F1', '#F0E7D6': '#FBEFD9', '#F2E0DF': '#F7E2DC' };

export function objectColor(stored: string | null | undefined) {
  const key = (stored && legacyColors[stored.toUpperCase()]) ?? stored?.toUpperCase();
  return objectColors.find((item) => item.key === key) ?? objectColors[0];
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

/**
 * Typefaces. On Android every weight is a separate font file, so the weight is chosen with the
 * family name and `fontWeight` must not be set on top of it.
 */
export const fonts = {
  heading: 'Fraunces_600SemiBold',
  body: 'DMSans_400Regular',
  strong: 'DMSans_600SemiBold',
} as const;

/**
 * Type scale (size / line height). Sizes are scalable: React Native applies the system font size.
 * Avoid fixed heights on text and buttons (use minHeight and padding) so large text never clips.
 */
export const type = {
  display: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34 },   // onboarding and welcome titles
  title: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 30 },     // «Tus objetos», object name
  brand: { fontFamily: fonts.heading, fontSize: 21, lineHeight: 26 },     // «MemoraTag» wordmark (documented exception)
  section: { fontFamily: fonts.heading, fontSize: 19, lineHeight: 26 },   // «Historia», dialog and bar titles
  card: { fontFamily: fonts.strong, fontSize: 16, lineHeight: 22 },       // card and event titles
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  secondary: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.strong, fontSize: 14, lineHeight: 20 },      // buttons, chips, fields
  mini: { fontFamily: fonts.strong, fontSize: 12, lineHeight: 16 },       // month headings, «Paso 1 de 4»
} as const;

/** Worst case for text over the camera: a pure white scene under the 60 % black scanner layer. */
export const scannerWorstCase = '#666666';

/** Text/background pairs that must meet WCAG AA (4.5:1 text, 3:1 UI boundaries). */
export function contrastPairs(p: Palette): [string, string, string, number][] {
  const text: [string, string, string][] = [
    ['ink/canvas', p.ink, p.canvas], ['ink/surface', p.ink, p.surface], ['ink/surfaceAlt', p.ink, p.surfaceAlt],
    ['muted/canvas', p.muted, p.canvas], ['muted/surface', p.muted, p.surface], ['muted/surfaceAlt', p.muted, p.surfaceAlt],
    ['primary/canvas', p.primary, p.canvas], ['primary/surface', p.primary, p.surface], ['primary/primarySoft', p.primary, p.primarySoft],
    ['onPrimary/primary', p.onPrimary, p.primary], ['onPrimary/primaryStrong', p.onPrimary, p.primaryStrong],
    ['onPrimarySoft/primarySoft', p.onPrimarySoft, p.primarySoft],
    ['danger/surface', p.danger, p.surface], ['danger/dangerSoft', p.danger, p.dangerSoft],
    ['success/surface', p.success, p.surface], ['success/successSoft', p.success, p.successSoft],
    ['warning/surface', p.warning, p.surface], ['warning/warningSoft', p.warning, p.warningSoft],
    ['onToast/toast', p.onToast, p.toast], ['toastAction/toast', p.toastAction, p.toast],
    ['onScanner/camera worst case', p.onScanner, scannerWorstCase], ['scannerMuted/camera worst case', p.scannerMuted, scannerWorstCase],
    ['scannerMuted/scanner', p.scannerMuted, p.scanner],
  ];
  return [
    ...text.map(([name, a, b]) => [name, a, b, 4.5] as [string, string, string, number]),
    ['inputBorder/surface (UI)', p.inputBorder, p.surface, 3],
    ['inputBorder/canvas (UI)', p.inputBorder, p.canvas, 3],
    ['onScanner frame/camera worst case (UI)', p.onScanner, scannerWorstCase, 3],
  ];
}

/** Brand colours (logo, icon, splash). Must stay in sync with scripts/generate-icons.py and app.json. */
export const brand = {
  paper: '#F7F3EC', ink: '#1B1916', blue: '#2F4BB8', blueDark: '#233A94', blueLight: '#8FA8FF',
} as const;

/** Brand pairs that must meet 3:1 (logo and icon shapes are non-text graphics). */
export function brandPairs(): [string, string, string, number][] {
  const b = brand;
  return [
    ['icon: tag over blue background', b.paper, b.blue, 3], ['icon: eyelet ring over tag', b.blueDark, b.paper, 3],
    ['splash light: logo over paper', b.blue, b.paper, 3], ['splash dark: logo over ink', b.blueLight, b.ink, 3],
    ['logo light: eyelet over body', b.blueLight, b.blue, 3], ['logo dark: eyelet over body', b.blue, b.blueLight, 3],
  ];
}
