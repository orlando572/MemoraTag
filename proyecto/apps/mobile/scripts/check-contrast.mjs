// Validates the design tokens against WCAG 2.2 AA contrast. Run: node --experimental-strip-types scripts/check-contrast.mjs
import { contrastPairs, dark, light, objectColors } from '../src/ui/tokens.ts';

function luminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
export function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

let failures = 0;
const rows = [];
for (const [themeName, palette] of [['claro', light], ['oscuro', dark]]) {
  const pairs = [...contrastPairs(palette), ...objectColors.map((item) => [`objeto ${item.name}`, item[themeName === 'claro' ? 'light' : 'dark'].fg, item[themeName === 'claro' ? 'light' : 'dark'].bg, 4.5])];
  for (const [name, fg, bg, min] of pairs) {
    const value = ratio(fg, bg);
    const ok = value >= min;
    if (!ok) failures++;
    rows.push(`${ok ? '✔' : '✖'} ${themeName.padEnd(6)} ${value.toFixed(2).padStart(5)} (mín. ${min}) ${name}`);
  }
}
console.log(rows.join('\n'));
console.log(failures ? `\n${failures} combinaciones no cumplen WCAG AA.` : '\nTodas las combinaciones cumplen WCAG AA.');
process.exit(failures ? 1 : 0);
