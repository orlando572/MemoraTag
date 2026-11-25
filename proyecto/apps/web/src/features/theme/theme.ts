'use client';

import { useSyncExternalStore } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_KEY = 'memoratag-theme';

// Runs before first paint (inlined in <head>) to avoid a flash of the wrong theme.
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

const listeners = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage may be unavailable; the choice still applies for this page view.
  }
  if (choice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(subscribe, read, () => 'system');
}
