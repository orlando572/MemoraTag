import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { dataChanged, useReload } from '../src/data/bus';
import { deleteArchivedObject, listArchivedObjects, restoreObject, type MemoryObject } from '../src/storage';
import { Button, Card, EmptyState, ErrorMessage, Loading, NavBar, ObjectCover, Screen } from '../src/ui/components';
import { useFeedback } from '../src/ui/feedback/FeedbackProvider';
import { useTheme } from '../src/ui/theme';
import { space, type } from '../src/ui/tokens';

export default function Archived() {
  const Alert = useFeedback();
  const { c } = useTheme();
  const [items, setItems] = useState<MemoryObject[] | null>(null);
  const [error, setError] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const reload = useReload(async () => {
    try { setItems(await listArchivedObjects()); setError(false); }
    catch { setError(true); }
  });

  async function restore(item: MemoryObject) {
    if (restoring) return;
    setRestoring(item.id);
    try {
      await restoreObject(item.id);
      dataChanged();
      Alert.toast(`«${item.name}» restaurado`, { action: { label: 'Abrir', onPress: () => router.push(`/object/${item.id}`) } });
    } catch { Alert.error('No se pudo restaurar', 'Vuelve a intentarlo.'); }
    finally { setRestoring(null); }
  }

  function confirmDelete(item: MemoryObject) {
    Alert.alert(`¿Eliminar «${item.name}»?`, 'Se borrarán el objeto y toda su historia. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar para siempre', style: 'destructive', onPress: () => void (async () => {
        try {
          await deleteArchivedObject(item.id);
          dataChanged();
          Alert.toast(`«${item.name}» eliminado`);
        } catch { Alert.error('No se pudo eliminar', 'Vuelve a intentarlo.'); }
      })() },
    ]);
  }

  return <Screen>
    <NavBar title="Objetos archivados" />
    {items === null && !error ? <Loading /> : error ? <ErrorMessage text="No se pudieron cargar los objetos archivados." onRetry={reload} /> :
      <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxxl, flexGrow: 1 }}
        ListHeaderComponent={items?.length ? <Text style={{ ...type.body, color: c.muted, marginBottom: space.lg }}>Conservan toda su historia.</Text> : null}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListEmptyComponent={<EmptyState icon="archive-outline" title="No hay objetos archivados" text="Aquí aparecerán los objetos que archives." />}
        renderItem={({ item }) => <Card style={{ gap: space.md, padding: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <ObjectCover object={item} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.card, color: c.ink }} numberOfLines={2}>{item.name}</Text>
              {!!item.description && <Text style={{ ...type.secondary, color: c.muted }} numberOfLines={1}>{item.description}</Text>}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button label={restoring === item.id ? 'Restaurando…' : 'Restaurar'} icon="refresh" variant="secondary" loading={restoring === item.id} disabled={!!restoring} accessibilityLabel={`Restaurar ${item.name}`} onPress={() => void restore(item)} style={{ flex: 1, minHeight: 48 }} />
            <Button label="Eliminar" icon="trash-outline" variant="secondary" disabled={!!restoring} accessibilityLabel={`Eliminar ${item.name} para siempre`} onPress={() => confirmDelete(item)} style={{ flex: 1, minHeight: 48 }} />
          </View>
        </Card>} />}
  </Screen>;
}
