import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { dark, light, objectColor, type Palette } from './tokens';

export type Theme = { c: Palette; dark: boolean; object: (stored: string | null | undefined) => { bg: string; fg: string } };

const lightTheme: Theme = { c: light, dark: false, object: (stored) => objectColor(stored).light };
const darkTheme: Theme = { c: dark, dark: true, object: (stored) => objectColor(stored).dark };

/** Follows the system light/dark setting. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/** Builds a StyleSheet from the current palette, recomputed only when the theme changes. */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: Palette) => T): T {
  const { c } = useTheme();
  return useMemo(() => StyleSheet.create(factory(c)), [c]); // eslint-disable-line react-hooks/exhaustive-deps
}
