import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { EventForm } from '../../../../src/forms/EventForm';
import { findActiveObject, type MemoryObject } from '../../../../src/storage';
import { ErrorMessage, Loading, NavBar, Screen } from '../../../../src/ui/components';

export default function NewEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [object, setObject] = useState<MemoryObject | null | undefined>(undefined);
  useEffect(() => { findActiveObject(id).then(setObject).catch(() => setObject(null)); }, [id]);
  if (object === undefined) return <Screen><NavBar title="Registrar evento" /><Loading /></Screen>;
  if (!object) return <Screen><NavBar title="Registrar evento" /><ErrorMessage text="Este objeto ya no está disponible." /></Screen>;
  return <EventForm objectId={object.id} objectName={object.name} />;
}
