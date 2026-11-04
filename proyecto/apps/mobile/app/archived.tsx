import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { dataChanged, useReload } from '../src/data/bus';
import { listArchivedObjects, restoreObject, type MemoryObject } from '../src/storage';
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

  return <Screen>
    <NavBar title="Objetos archivados" />
    {items === null && !error ? <Loading /> : error ? <ErrorMessage text="No se pudieron cargar los objetos archivados." onRetry={reload} /> :
      <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.xxxl, flexGrow: 1 }}
        ListHeaderComponent={items?.length ? <Text style={{ ...type.body, color: c.muted, marginBottom: space.lg }}>Los objetos archivados no aparecen en tu lista, pero conservan toda su historia. Restáuralos cuando quieras.</Text> : null}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListEmptyComponent={<EmptyState icon="archive-outline" title="No hay objetos archivados" text="Cuando archives un objeto aparecerá aquí, con toda su historia intacta." />}
        renderItem={({ item }) => <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <ObjectCover object={item} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...type.headline, color: c.ink }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ ...type.caption, color: c.muted }} numberOfLines={2}>{item.description || 'Sin descripción'}</Text>
            </View>
          </View>
          <Button label={restoring === item.id ? 'Restaurando…' : 'Restaurar'} icon="refresh" variant="secondary" loading={restoring === item.id} disabled={!!restoring} accessibilityLabel={`Restaurar ${item.name}`} onPress={() => void restore(item)} />
        </Card>} />}
  </Screen>;
}
