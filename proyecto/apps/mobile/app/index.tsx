import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { useReload } from '../src/data/bus';
import { useProfile } from '../src/data/profile';
import { listObjects, type MemoryObject } from '../src/storage';
import { Badge, Button, Card, EmptyState, ErrorMessage, Footer, IconButton, Loading, ObjectCover, Screen } from '../src/ui/components';
import { eventTypeInfo } from '../src/ui/event-types';
import { formatDate, relativeDate } from '../src/ui/format';
import { useStyles, useTheme } from '../src/ui/theme';
import { radius, space, type, type Palette } from '../src/ui/tokens';

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function Home() {
  const profile = useProfile();
  const { c, dark } = useTheme();
  const s = useStyles(makeStyles);
  const [objects, setObjects] = useState<MemoryObject[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  const reload = useReload(async () => {
    try { setObjects(await listObjects()); setError(false); }
    catch { setError(true); }
  });

  const visible = useMemo(() => {
    if (!objects) return [];
    const q = normalize(query.trim());
    return q ? objects.filter((item) => normalize(`${item.name} ${item.description}`).includes(q)) : objects;
  }, [objects, query]);

  if (!profile.onboardingDone) return <Redirect href="/onboarding" />;

  const openIssues = objects?.reduce((sum, item) => sum + (item.open_issues ?? 0), 0) ?? 0;
  const linked = objects?.filter((item) => item.nfc_written_at).length ?? 0;

  const header = <View>
    <View style={s.header}>
      <View style={s.brand}>
        <Image source={dark ? require('../assets/logo-dark.png') : require('../assets/logo.png')} style={s.logo} accessibilityIgnoresInvertColors accessible={false} />
        <View style={s.headerText}>
          <Text style={s.greeting} numberOfLines={1}>Hola, {profile.name}</Text>
          <Text accessibilityRole="header" style={s.title}>Tus objetos</Text>
        </View>
      </View>
      <View style={s.headerActions}>
        <IconButton icon="archive-outline" label="Objetos archivados" onPress={() => router.push('/archived')} />
        <IconButton icon="settings-outline" label="Ajustes y ayuda" onPress={() => router.push('/settings')} />
      </View>
    </View>
    {!!objects?.length && <>
      <View style={s.summary} accessible accessibilityLabel={`${objects.length} ${objects.length === 1 ? 'objeto' : 'objetos'}, ${openIssues} ${openIssues === 1 ? 'incidencia abierta' : 'incidencias abiertas'}, ${linked} con etiqueta NFC`}>
        <Stat value={objects.length} label={objects.length === 1 ? 'objeto' : 'objetos'} icon="cube-outline" />
        <Stat value={openIssues} label={openIssues === 1 ? 'incidencia' : 'incidencias'} icon="alert-circle-outline" tone={openIssues ? 'danger' : undefined} />
        <Stat value={linked} label="con NFC" icon="radio-outline" />
      </View>
      <View style={s.search}>
        <Ionicons name="search" size={20} color={c.muted} />
        <TextInput accessibilityLabel="Buscar objetos" placeholder="Buscar por nombre o descripción" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={s.searchInput} returnKeyType="search" />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={12} onPress={() => setQuery('')}><Ionicons name="close-circle" size={22} color={c.muted} /></Pressable>}
      </View>
      {!!query && <Text accessibilityLiveRegion="polite" style={s.results}>{visible.length === 1 ? '1 resultado' : `${visible.length} resultados`}</Text>}
    </>}
  </View>;

  return <Screen>
    {objects === null && !error ? <Loading /> : error ? <ErrorMessage text="No se pudieron cargar tus objetos." onRetry={() => { setError(false); setObjects(null); reload(); }} /> :
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListEmptyComponent={objects?.length
          ? <EmptyState icon="search-outline" title="Sin resultados" text={`Ningún objeto coincide con «${query.trim()}».`} action={{ label: 'Borrar búsqueda', icon: 'close', onPress: () => setQuery('') }} />
          : <EmptyState icon="pricetag-outline" title="Cada objeto tiene una historia" text="Crea tu primer objeto y guarda sus notas, incidencias y mantenimientos. Después podrás pegarle un QR o una etiqueta NFC." action={{ label: 'Crear mi primer objeto', icon: 'add', onPress: () => router.push('/object/new') }} />}
        renderItem={({ item }) => <ObjectCard item={item} />}
      />}
    <Footer>
      <Button label="Escanear" icon="scan-outline" variant="secondary" accessibilityLabel="Escanear código QR o etiqueta NFC" onPress={() => router.push('/scan')} style={{ flex: 1 }} />
      <Button label="Nuevo objeto" icon="add" onPress={() => router.push('/object/new')} style={{ flex: 1 }} />
    </Footer>
  </Screen>;
}

function Stat({ value, label, icon, tone }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap; tone?: 'danger' }) {
  const { c } = useTheme();
  const color = tone === 'danger' ? c.danger : c.primary;
  return <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }} importantForAccessibility="no-hide-descendants">
    <Ionicons name={icon} size={18} color={color} />
    <Text style={{ ...type.headline, color: tone === 'danger' && value ? c.danger : c.ink }}>{value}</Text>
    <Text style={{ ...type.caption, color: c.muted, flexShrink: 1 }} numberOfLines={1}>{label}</Text>
  </View>;
}

function ObjectCard({ item }: { item: MemoryObject }) {
  const { c } = useTheme();
  const latest = item.latest_event_type ? eventTypeInfo(item.latest_event_type) : null;
  const when = item.latest_event_date ? relativeDate(item.latest_event_date) : null;
  const label = [item.name,
    item.latest_event_title ? `Último evento: ${item.latest_event_title}, ${formatDate(item.latest_event_date!)}` : 'Aún no tiene eventos',
    item.open_issues ? `${item.open_issues} ${item.open_issues === 1 ? 'incidencia abierta' : 'incidencias abiertas'}` : null,
    item.nfc_written_at ? 'Etiqueta NFC vinculada' : null].filter(Boolean).join('. ');
  return <Card onPress={() => router.push(`/object/${item.id}`)} accessibilityLabel={label} accessibilityHint="Abre su historia" style={{ padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
    <ObjectCover object={item} size={68} />
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ ...type.headline, color: c.ink }} numberOfLines={1}>{item.name}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {latest && <Ionicons name={latest.icon} size={15} color={latest.color(c)} />}
        <Text numberOfLines={1} style={{ ...type.caption, fontSize: 14, color: c.muted, flex: 1 }}>{item.latest_event_title ? `${item.latest_event_title}${when ? ` · ${when}` : ''}` : 'Aún no tiene eventos'}</Text>
      </View>
      {(!!item.open_issues || !!item.nfc_written_at) && <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
        {!!item.open_issues && <Badge tone="danger" icon="alert-circle" label={item.open_issues === 1 ? '1 abierta' : `${item.open_issues} abiertas`} />}
        {!!item.nfc_written_at && <Badge tone="primary" icon="radio-outline" label="NFC" />}
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
  greeting: { ...type.caption, color: c.primary, fontWeight: '700' },
  title: { ...type.title, color: c.ink },
  headerActions: { flexDirection: 'row', gap: space.sm },
  summary: { flexDirection: 'row', gap: space.sm, backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, paddingVertical: space.md, paddingHorizontal: space.lg, marginBottom: space.md },
  search: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.inputBorder, paddingHorizontal: space.md, marginBottom: space.lg },
  searchInput: { flex: 1, ...type.body, color: c.ink, paddingVertical: space.sm },
  results: { ...type.caption, color: c.muted, marginTop: -space.sm, marginBottom: space.md },
} as const);
