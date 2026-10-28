import { Ionicons } from '@expo/vector-icons';
import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { MemoryEvent, MemoryObject, EventType } from './types';

const initialObjects: MemoryObject[] = [
  { id: 'bike-01', name: 'Bicicleta', description: 'Mi compañera de rutas urbanas.', color: '#D7E5D2', qrToken: 'memora:bicycle-7Qx2L', createdAt: '2026-08-12' },
  { id: 'camera-01', name: 'Cámara analógica', description: 'Canon AE-1 heredada de mi abuelo.', color: '#E7D8C3', qrToken: 'memora:camera-8Km4P', createdAt: '2026-07-01' }
];

const initialEvents: MemoryEvent[] = [
  { id: 'event-1', objectId: 'bike-01', type: 'maintenance', title: 'Ajusté el freno delantero', description: 'Quedó mucho más firme.', eventDate: '2026-10-04' },
  { id: 'event-2', objectId: 'bike-01', type: 'issue', title: 'La cadena hace ruido', description: 'Se escucha al cambiar de marcha.', eventDate: '2026-09-22' },
  { id: 'event-3', objectId: 'bike-01', type: 'photo', title: 'Cambio de pastillas', description: 'Pastillas nuevas para la ruta.', eventDate: '2026-08-03' },
  { id: 'event-4', objectId: 'camera-01', type: 'note', title: 'Primera salida con rollo nuevo', description: 'Kodak Gold 200, 36 exposiciones.', eventDate: '2026-09-28' }
];

type Store = {
  objects: MemoryObject[];
  events: MemoryEvent[];
  addObject: (input: Pick<MemoryObject, 'name' | 'description' | 'color' | 'coverImageUri'>) => MemoryObject;
  updateObject: (id: string, input: Pick<MemoryObject, 'name' | 'description' | 'color' | 'coverImageUri'>) => void;
  deleteObject: (id: string) => void;
  addEvent: (input: Omit<MemoryEvent, 'id'>) => void;
  findByToken: (token: string) => MemoryObject | undefined;
};

const MemoryContext = createContext<Store | null>(null);

export function MemoryProvider({ children }: PropsWithChildren) {
  const [objects, setObjects] = useState(initialObjects);
  const [events, setEvents] = useState(initialEvents);
  const value = useMemo<Store>(() => ({
    objects,
    events,
    addObject(input) {
      const id = `object-${Date.now()}`;
      const object = { ...input, id, qrToken: `memora:${Math.random().toString(36).slice(2, 10)}`, createdAt: new Date().toISOString() };
      setObjects((current) => [object, ...current]);
      return object;
    },
    updateObject(id, input) { setObjects((current) => current.map((object) => object.id === id ? { ...object, ...input } : object)); },
    deleteObject(id) { setObjects((current) => current.filter((object) => object.id !== id)); setEvents((current) => current.filter((event) => event.objectId !== id)); },
    addEvent(input) { setEvents((current) => [{ ...input, id: `event-${Date.now()}` }, ...current]); },
    findByToken(token) { return objects.find((item) => item.qrToken === token); }
  }), [objects, events]);
  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

export function useMemories() {
  const context = useContext(MemoryContext);
  if (!context) throw new Error('useMemories must be used within MemoryProvider');
  return context;
}

export const eventPresentation: Record<EventType, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  note: { icon: 'document-text-outline', color: '#625BC6', label: 'Nota' },
  issue: { icon: 'alert-circle-outline', color: '#C54835', label: 'Problema' },
  maintenance: { icon: 'construct-outline', color: '#317050', label: 'Mantenimiento' },
  photo: { icon: 'image-outline', color: '#A25939', label: 'Foto' }
};
