import type { InventoryObject } from '@memoratag/contracts';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Badge, Card, EmptyState, Loading, NavBar, Screen } from '../ui/components';
import { useStyles, useTheme } from '../ui/theme';
import { radius, space, type, type Palette } from '../ui/tokens';
import { listObjects } from './api';
import { useCompany } from './CompanyProvider';
import { toCompanyError, type CompanyErrorKind } from './errors';
import { CompanyProblem } from './Problem';
import { inventoryStatuses } from './status';

/** Company inventory: one list with a search box. Management (filters, summary, members) stays on the web. */
export function ObjectsScreen() {
  const { org } = useCompany();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<InventoryObject[] | null>(null);
  const [error, setError] = useState<CompanyErrorKind | null>(null);
  const latest = useRef(0);

  const load = useCallback(async (text: string) => {
    if (!org) return;
    const run = ++latest.current;
    setError(null);
    try {
      const result = await listObjects(org.id, text);
      if (run === latest.current) setItems(result);
    } catch (e) { if (run === latest.current) setError(toCompanyError(e).kind); }
  }, [org]);

  // Wait for the typing to pause before asking the server.
  useEffect(() => { const timer = setTimeout(() => void load(query), query ? 350 : 0); return () => clearTimeout(timer); }, [query, load]);

  const retry = () => { setItems(null); void load(query); };

  return <Screen>
    <NavBar title={org?.name ?? 'Empresa'} />
    {error ? <CompanyProblem kind={error} onRetry={retry} /> : items === null ? <Loading /> :
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListHeaderComponent={<View style={s.search}>
          <Ionicons name="search" size={20} color={c.muted} />
          <TextInput accessibilityLabel="Buscar objetos de la empresa" placeholder="Buscar por nombre o código" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={s.searchInput} returnKeyType="search" />
          {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={12} onPress={() => setQuery('')}><Ionicons name="close-circle" size={22} color={c.muted} /></Pressable>}
        </View>}
        ListEmptyComponent={<EmptyState icon="search-outline" title={query.trim() ? 'Sin resultados' : 'Sin objetos'} text={query.trim() ? `Ningún objeto coincide con «${query.trim()}».` : 'Tu empresa aún no tiene objetos. Créalos desde la web.'} />}
        renderItem={({ item }) => <Row item={item} />}
      />}
  </Screen>;
}

function Row({ item }: { item: InventoryObject }) {
  const { c } = useTheme();
  const status = inventoryStatuses[item.status];
  const detail = [item.internal_code, item.location].filter(Boolean).join(' · ');
  return <Card onPress={() => router.push(`/empresa/objeto/${item.id}`)} accessibilityLabel={[item.name, detail, status.label].filter(Boolean).join('. ')} accessibilityHint="Abre la ficha del objeto" style={{ padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ ...type.card, color: c.ink }} numberOfLines={2}>{item.name}</Text>
      {!!detail && <Text style={{ ...type.secondary, color: c.muted }} numberOfLines={1}>{detail}</Text>}
      <Badge style={{ alignSelf: 'flex-start' }} tone={status.tone} icon={status.icon} label={status.label} />
    </View>
    <Ionicons name="chevron-forward" size={20} color={c.muted} />
  </Card>;
}

const makeStyles = (c: Palette) => ({
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, flexGrow: 1 },
  search: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.inputBorder, paddingHorizontal: space.md, marginBottom: space.lg },
  searchInput: { flex: 1, ...type.body, color: c.ink, paddingVertical: space.sm },
} as const);
