import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

/** Icons the user can choose for an object (stored in objects.icon). */
export const objectIcons: { key: string; label: string; icon: IconName }[] = [
  { key: 'cube', label: 'General', icon: 'cube-outline' },
  { key: 'pet', label: 'Mascota', icon: 'paw-outline' },
  { key: 'car', label: 'Vehículo', icon: 'car-sport-outline' },
  { key: 'music', label: 'Instrumento', icon: 'musical-notes-outline' },
  { key: 'camera', label: 'Cámara', icon: 'camera-outline' },
  { key: 'laptop', label: 'Electrónica', icon: 'laptop-outline' },
  { key: 'home', label: 'Hogar', icon: 'home-outline' },
  { key: 'tools', label: 'Herramienta', icon: 'construct-outline' },
  { key: 'book', label: 'Libro', icon: 'book-outline' },
  { key: 'plant', label: 'Planta', icon: 'leaf-outline' },
  { key: 'shirt', label: 'Ropa', icon: 'shirt-outline' },
  { key: 'gift', label: 'Recuerdo', icon: 'gift-outline' },
];

/** Icons no longer offered in the picker but still saved in older objects, so they keep their look. */
const legacyIcons: Record<string, IconName> = { bicycle: 'bicycle-outline' };

/** Earlier versions guessed the icon from the name; kept as the default when none was chosen. */
export function guessIcon(name: string) {
  const text = name.toLowerCase();
  if (text.includes('bici')) return 'bicycle';
  if (/(coche|auto|carro|moto)/.test(text)) return 'car';
  if (/(guitarra|piano|violín|violin|ukelele)/.test(text)) return 'music';
  if (/(cámara|camara)/.test(text)) return 'camera';
  if (/(laptop|portátil|portatil|computador|ordenador|móvil|movil|tablet)/.test(text)) return 'laptop';
  if (/(libro|cuaderno)/.test(text)) return 'book';
  if (/(planta|árbol|arbol)/.test(text)) return 'plant';
  if (/(caldera|lavadora|nevera|refri|mueble|sofá|sofa)/.test(text)) return 'home';
  return 'cube';
}

export function objectIcon(icon: string | null | undefined, name: string): IconName {
  const key = icon ?? guessIcon(name);
  return objectIcons.find((item) => item.key === key)?.icon ?? legacyIcons[key] ?? objectIcons[0].icon;
}
