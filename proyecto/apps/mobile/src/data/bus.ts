import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { deleteEvent } from '../storage';

// Screens read SQLite directly. This tiny bus tells mounted screens that data changed
// (for example after "Deshacer" from a toast), so they reload without global state.
type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export function dataChanged() {
  version++;
  listeners.forEach((listener) => listener());
}

/** Runs `load` when the screen gains focus and whenever data changes while it is mounted. */
export function useReload(load: () => void | Promise<void>) {
  const latest = useRef(load);
  latest.current = load;
  const [, setTick] = useState(version);
  useEffect(() => {
    const listener = () => { setTick(version); void latest.current(); };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  useFocusEffect(useCallback(() => { void latest.current(); }, []));
  return useCallback(() => { void latest.current(); }, []);
}

// Deferred deletion: an event disappears immediately and is deleted for real only when the
// "Deshacer" toast expires (its duration follows the accessibility timeout setting). If the app
// is closed first, the event is simply kept.
const pending = new Set<string>();

export function isPendingDeletion(id: string) {
  return pending.has(id);
}

export function hideEventForDeletion(id: string) {
  pending.add(id);
  dataChanged();
}

export async function commitEventDeletion(id: string, objectId: string) {
  if (!pending.has(id)) return;
  try { await deleteEvent(id, objectId); }
  finally { pending.delete(id); dataChanged(); }
}

export function cancelEventDeletion(id: string) {
  if (!pending.delete(id)) return false;
  dataChanged();
  return true;
}
