import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { EventForm } from '../../../../src/forms/EventForm';
import { findActiveObject, getEvent, type MemoryEvent, type MemoryObject } from '../../../../src/storage';
import { ErrorMessage, Loading, NavBar, Screen } from '../../../../src/ui/components';

export default function EditEvent() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const [data, setData] = useState<{ object: MemoryObject; event: MemoryEvent } | null | undefined>(undefined);
  useEffect(() => {
    Promise.all([findActiveObject(id), getEvent(eventId)])
      .then(([object, event]) => setData(object && event && event.object_id === object.id ? { object, event } : null))
      .catch(() => setData(null));
  }, [id, eventId]);
  if (data === undefined) return <Screen><NavBar title="Editar evento" /><Loading /></Screen>;
  if (!data) return <Screen><NavBar title="Editar evento" /><ErrorMessage text="Este evento ya no está disponible." /></Screen>;
  return <EventForm objectId={data.object.id} objectName={data.object.name} event={data.event} />;
}
