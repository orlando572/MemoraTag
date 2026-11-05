import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { useReload } from '../src/data/bus';
import { useProfile } from '../src/data/profile';
import { countWithOpenIssues, effectiveFilter, filterObjects, type ObjectFilter } from '../src/objects/filter';
import { listObjects, type MemoryObject } from '../src/storage';
import { Badge, Button, Card, Chip, EmptyState, ErrorMessage, Footer, IconButton, Loading, ObjectCover, Screen } from '../src/ui/components';
import { eventAppearance } from '../src/ui/event-types';
import { haptic } from '../src/ui/feedback/haptics';
import { formatDate, relativeDate } from '../src/ui/format';
import { useStyles, useTheme } from '../src/ui/theme';
import { fonts, radius, space, type, type Palette } from '../src/ui/tokens';

export default function Home() {
  const profile = useProfile();
  const { c, dark } = useTheme();
  const s = useStyles(makeStyles);
  const [objects, setObjects] = useState<MemoryObject[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [chosenFilter, setFilter] = useState<ObjectFilter>('all');

  const reload = useReload(async () => {
    try { setObjects(await listObjects()); setError(false); }
    catch { setError(true); }
  });

  const withIssues = objects ? countWithOpenIssues(objects) : 0;
  // The «Con incidencias» filter only exists while there is an open incident to show.
  const filter = effectiveFilter(chosenFilter, withIssues);
  const visible = useMemo(() => objects ? filterObjects(objects, query, filter) : [], [objects, query, filter]);
  // When the last incident is resolved the filter disappears, so forget the choice too. Otherwise it
  // would come back by itself, and hide the other objects, the next time an incident is reopened.
  useEffect(() => { if (objects && withIssues === 0) setFilter('all'); }, [objects, withIssues]);

  if (!profile.onboardingDone) return <Redirect href="/onboarding" />;

  const searching = !!query.trim() || filter === 'issues';
  const clearSearch = () => { setQuery(''); setFilter('all'); };

  const header = <View>
    <View style={s.header}>
      <View style={s.brand}>
        <Image source={dark ? require('../assets/logo-dark.png') : require('../assets/logo.png')} style={s.logo} accessibilityIgnoresInvertColors accessible={false} />
        <View style={s.headerText}>
          <Text style={s.greeting} numberOfLines={1}>Hola, {profile.name}</Text>
          <Text accessibilityRole="header" style={s.title}>Tus objetos</Text>
        </View>
      </View>
      <IconButton icon="settings-outline" label="Ajustes y ayuda" onPress={() => router.push('/settings')} />
    </View>
    {!!objects?.length && <>
      <View style={s.search}>
        <Ionicons name="search" size={20} color={c.muted} />
        <TextInput accessibilityLabel="Buscar objetos" placeholder="Buscar por nombre o descripción" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={s.searchInput} returnKeyType="search" />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={12} onPress={() => setQuery('')}><Ionicons name="close-circle" size={22} color={c.muted} /></Pressable>}
      </View>
      {withIssues > 0 && <View style={s.filters}>
        <Chip label="Todos" count={objects.length} selected={filter === 'all'} onPress={() => { haptic.tap(); setFilter('all'); }} />
        <Chip label="Con incidencias" icon="alert-circle-outline" color={c.danger} count={withIssues} selected={filter === 'issues'} onPress={() => { haptic.tap(); setFilter('issues'); }} />
      </View>}
      {searching && <Text accessibilityLiveRegion="polite" style={s.results}>{visible.length === 1 ? '1 resultado' : `${visible.length} resultados`}</Text>}
    </>}
  </View>;

  const archivedLink = objects !== null && <Pressable accessibilityRole="button" accessibilityLabel="Objetos archivados" accessibilityHint="Abre la lista de objetos archivados" onPress={() => router.push('/archived')}
    style={({ pressed }) => [s.archived, pressed && { opacity: 0.75 }]}>
    <Ionicons name="archive-outline" size={20} color={c.muted} />
    <Text style={s.archivedText}>Objetos archivados</Text>
    <Ionicons name="chevron-forward" size={20} color={c.muted} />
  </Pressable>;

  return <Screen>
    {objects === null && !error ? <Loading /> : error ? <ErrorMessage text="No se pudieron cargar tus objetos." onRetry={() => { setError(false); setObjects(null); reload(); }} /> :
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListFooterComponent={archivedLink || null}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListEmptyComponent={objects?.length
          ? <EmptyState icon="search-outline" title="Sin resultados" text={query.trim() ? `Ningún objeto coincide con «${query.trim()}».` : 'Ningún objeto cumple este filtro.'} action={{ label: query.trim() ? 'Borrar búsqueda' : 'Ver todos', icon: 'close', onPress: clearSearch }} />
          : <EmptyState icon="pricetag-outline" title="Cada objeto tiene una historia" text="Crea tu primer objeto y guarda sus notas, incidencias y mantenimientos. Después podrás pegarle un QR o una etiqueta NFC." action={{ label: 'Crear mi primer objeto', icon: 'add', onPress: () => router.push('/object/new') }} />}
        renderItem={({ item }) => <ObjectCard item={item} />}
      />}
    <Footer>
      <Button label="Escanear" icon="scan-outline" variant="secondary" accessibilityLabel="Escanear código QR o etiqueta NFC" onPress={() => router.push('/scan')} style={{ flex: 1 }} />
      <Button label="Nuevo objeto" icon="add" onPress={() => router.push('/object/new')} style={{ flex: 1 }} />
    </Footer>
  </Screen>;
}

function ObjectCard({ item }: { item: MemoryObject }) {
  const { c } = useTheme();
  const latest = item.latest_event_type ? eventAppearance({ type: item.latest_event_type, resolved_at: item.latest_event_resolved_at ?? null }, c) : null;
  const resolved = item.latest_event_type === 'issue' && !!item.latest_event_resolved_at;
  const when = item.latest_event_date ? relativeDate(item.latest_event_date) : null;
  const label = [item.name,
    item.latest_event_title ? `Último evento: ${item.latest_event_title}${resolved ? ' (incidencia resuelta)' : ''}, ${formatDate(item.latest_event_date!)}` : 'Aún no tiene eventos',
    item.open_issues ? `${item.open_issues} ${item.open_issues === 1 ? 'incidencia abierta' : 'incidencias abiertas'}` : null,
    item.nfc_written_at ? 'Etiqueta NFC vinculada' : null].filter(Boolean).join('. ');
  return <Card onPress={() => router.push(`/object/${item.id}`)} accessibilityLabel={label} accessibilityHint="Abre su historia" style={{ padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
    <ObjectCover object={item} size={68} />
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ ...type.card, color: c.ink }} numberOfLines={2}>{item.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {latest && <Ionicons name={latest.icon} size={15} color={latest.color} />}
        {/* The date goes first so that, when the title is long, the title is what gets cut and never the date. */}
        <Text numberOfLines={1} style={{ ...type.secondary, color: c.muted, flex: 1 }}>
          {!!when && <Text style={{ fontFamily: fonts.strong, color: c.ink }}>{when} · </Text>}
          {item.latest_event_title ?? 'Aún no tiene eventos'}
        </Text>
      </View>
      {(!!item.open_issues || !!item.nfc_written_at) && <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
        {!!item.open_issues && <Badge tone="danger" icon="alert-circle" label={item.open_issues === 1 ? '1 abierta' : `${item.open_issues} abiertas`} />}
        {!!item.nfc_written_at && <Badge tone="neutral" icon="radio-outline" label="NFC" />}
      </View>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={c.muted} />
  </Card>;
}

const makeStyles = (c: Palette) => ({
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.lg, paddingBottom: space.xl, gap: space.md },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 },
  logo: { width: 46, height: 46 },
  headerText: { flex: 1 },
  // Blue means action (design system), so the greeting is plain secondary text.
  greeting: { ...type.label, color: c.muted },
  title: { ...type.title, color: c.ink },
  search: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.inputBorder, paddingHorizontal: space.md, marginBottom: space.lg },
  searchInput: { flex: 1, ...type.body, color: c.ink, paddingVertical: space.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  results: { ...type.secondary, color: c.muted, marginTop: -space.sm, marginBottom: space.md },
  archived: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, marginTop: space.xl },
  archivedText: { ...type.label, color: c.muted, flex: 1 },
} as const);
