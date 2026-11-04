import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ObjectForm } from '../../../src/forms/ObjectForm';
import { findActiveObject, type MemoryObject } from '../../../src/storage';
import { ErrorMessage, Loading, NavBar, Screen } from '../../../src/ui/components';

export default function EditObject() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [object, setObject] = useState<MemoryObject | null | undefined>(undefined);
  useEffect(() => { findActiveObject(id).then(setObject).catch(() => setObject(null)); }, [id]);
  if (object === undefined) return <Screen><NavBar title="Editar objeto" /><Loading /></Screen>;
  if (!object) return <Screen><NavBar title="Editar objeto" /><ErrorMessage text="Este objeto ya no está disponible." /></Screen>;
  return <ObjectForm object={object} />;
}
