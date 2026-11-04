import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { NfcScreen } from '../../../src/NfcScreen';
import { dataChanged } from '../../../src/data/bus';
import { findActiveObject, type MemoryObject } from '../../../src/storage';
import { ErrorMessage, Loading, NavBar, Screen } from '../../../src/ui/components';

export default function WriteNfc() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [object, setObject] = useState<MemoryObject | null | undefined>(undefined);
  useEffect(() => { findActiveObject(id).then(setObject).catch(() => setObject(null)); }, [id]);
  if (object === undefined) return <Screen><NavBar title="Etiqueta NFC" /><Loading /></Screen>;
  if (!object) return <Screen><NavBar title="Etiqueta NFC" /><ErrorMessage text="Este objeto ya no está disponible." /></Screen>;
  return <NfcScreen object={object} onWritten={dataChanged} />;
}
