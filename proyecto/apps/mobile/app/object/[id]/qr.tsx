import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { QrScreenView } from '../../../src/QrCard';
import { objectLink } from '../../../src/qr';
import { findActiveObject, type MemoryObject } from '../../../src/storage';
import { ErrorMessage, Loading, NavBar, Screen } from '../../../src/ui/components';

export default function QrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [object, setObject] = useState<MemoryObject | null | undefined>(undefined);
  useEffect(() => { findActiveObject(id).then(setObject).catch(() => setObject(null)); }, [id]);

  if (object === undefined) return <Screen><NavBar title="Código QR" /><Loading /></Screen>;
  if (!object) return <Screen><NavBar title="Código QR" /><ErrorMessage text="Este objeto ya no está disponible." /></Screen>;
  return <QrScreenView name={object.name} value={objectLink(object.id)} />;
}
