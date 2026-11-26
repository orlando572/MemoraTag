import type { InventoryObject, OrganizationSummary } from '@memoratag/contracts';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { objectIcon } from '../objects/icons';
import { Badge, Button, Card, Chip, EmptyState, Footer, IconButton, Loading, Screen } from '../ui/components';
import { haptic } from '../ui/feedback/haptics';
import { useStyles, useTheme } from '../ui/theme';
import { radius, space, type, type Palette } from '../ui/tokens';
import { getSummary, listObjects } from './api';
import { useCompany } from './CompanyProvider';
import { toCompanyError, type CompanyErrorKind } from './errors';
import { activeChips, distinctValues, emptyFilters, type CompanyFilters, type StatusFilter } from './filters';
import { NfcBadge } from './NfcBadge';
import { nfcLabel } from './nfc';
import { CompanyProblem } from './Problem';
import { inventoryStatuses } from './status';

const statusOrder: StatusFilter[] = ['in_use', 'in_repair', 'retired'];

/** Home of the company mode: status counters, search, filters and the inventory list. */
export function CompanyHome() {
  const { org } = useCompany();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const [filters, setFilters] = useState<CompanyFilters>(emptyFilters);
  const [items, setItems] = useState<InventoryObject[] | null>(null);
  const [summary, setSummary] = useState<OrganizationSummary | null>(null);
  const [options, setOptions] = useState<{ locations: string[]; categories: string[] }>({ locations: [], categories: [] });
  const [error, setError] = useState<CompanyErrorKind | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState(false);
  const latest = useRef(0);

  const load = useCallback(async (next: CompanyFilters) => {
    if (!org) return;
    const run = ++latest.current;
    try {
      const [list, sum] = await Promise.all([listObjects(org.id, next), getSummary(org.id).catch(() => null)]);
      if (run !== latest.current) return;
      setItems(list);
      if (sum) setSummary(sum);
      setError(null);
      // Filter options come from a list that was not narrowed by location or category.
      if (!next.location.trim() && !next.category.trim()) setOptions({ locations: distinctValues(list, (o) => o.location), categories: distinctValues(list, (o) => o.category) });
    } catch (e) { if (run === latest.current) setError(toCompanyError(e).kind); }
  }, [org]);

  // Wait for the typing to pause before asking the server.
  useEffect(() => { const timer = setTimeout(() => void load(filters), filters.q ? 350 : 0); return () => clearTimeout(timer); }, [filters, load]);
  // Coming back from an object sheet: its status may have changed.
  useFocusEffect(useCallback(() => { if (items) void load(filters); }, [items, filters, load]));

  const chips = activeChips(filters);
  const retry = () => { setItems(null); setError(null); void load(filters); };
  const refresh = async () => { setRefreshing(true); await load(filters); setRefreshing(false); };
  const counts: Record<'all' | StatusFilter, number | undefined> = { all: summary?.total, in_use: summary?.by_status.in_use ?? 0, in_repair: summary?.by_status.in_repair ?? 0, retired: summary?.by_status.retired ?? 0 };
  const searching = !!filters.q.trim() || !!filters.status || chips.length > 0;

  const header = <View>
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <View style={s.mode} accessible accessibilityLabel="Modo empresa activado"><Ionicons name="business-outline" size={14} color={c.muted} /><Text style={s.modeText}>Modo empresa</Text></View>
        <Text accessibilityRole="header" style={s.title} numberOfLines={2}>{org?.name}</Text>
        {!!org?.role && <Badge style={{ marginTop: space.sm }} tone="primary" icon={org.role === 'admin' ? 'shield-checkmark-outline' : 'person-outline'} label={org.role === 'admin' ? 'Administrador' : 'Miembro'} />}
      </View>
      <IconButton icon="settings-outline" label="Ajustes y ayuda" onPress={() => router.push('/settings')} />
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.counters} accessibilityLabel="Filtrar por estado">
      <Chip label="Todos" count={counts.all} selected={!filters.status} onPress={() => { haptic.tap(); setFilters({ ...filters, status: null }); }} />
      {statusOrder.map((key) => <Chip key={key} label={inventoryStatuses[key].label} icon={inventoryStatuses[key].icon} count={counts[key]} selected={filters.status === key} onPress={() => { haptic.tap(); setFilters({ ...filters, status: filters.status === key ? null : key }); }} />)}
    </ScrollView>

    <View style={s.searchRow}>
      <View style={s.search}>
        <Ionicons name="search" size={20} color={c.muted} />
        <TextInput accessibilityLabel="Buscar objetos de la empresa" placeholder="Buscar por nombre o código" placeholderTextColor={c.muted} value={filters.q} onChangeText={(q) => setFilters({ ...filters, q })} style={s.searchInput} returnKeyType="search" />
        {!!filters.q && <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={12} onPress={() => setFilters({ ...filters, q: '' })}><Ionicons name="close-circle" size={22} color={c.muted} /></Pressable>}
      </View>
      <IconButton icon="options-outline" label={chips.length ? `Filtros, ${chips.length} activos` : 'Filtros'} badge={chips.length > 0} onPress={() => setSheet(true)} />
    </View>
    {chips.length > 0 && <View style={s.chips}>{chips.map((chip) => <Chip key={chip.key} label={chip.label} icon="close" selected onPress={() => setFilters({ ...filters, [chip.key]: '' })} />)}</View>}
    {searching && items && <Text accessibilityLiveRegion="polite" style={s.results}>{items.length === 1 ? '1 resultado' : `${items.length} resultados`}</Text>}
  </View>;

  return <Screen>
    {error && !items ? <CompanyProblem kind={error} onRetry={retry} /> : items === null ? <Loading /> :
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.list}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} colors={[c.primary]} progressBackgroundColor={c.surface} />}
        ListEmptyComponent={searching
          ? <EmptyState icon="search-outline" title="Sin resultados" text="Ningún objeto cumple la búsqueda o los filtros." action={{ label: 'Quitar filtros', icon: 'close', onPress: () => setFilters(emptyFilters) }} />
          : <EmptyState icon="cube-outline" title="Sin objetos" text="Tu empresa aún no tiene objetos. Créalos desde la web." />}
        ListFooterComponent={error ? <View style={{ marginTop: space.lg }}><CompanyProblem kind={error} onRetry={retry} /></View> : null}
        renderItem={({ item }) => <Row item={item} />}
      />}
    <Footer><Button label="Escanear" icon="scan-outline" variant="secondary" accessibilityLabel="Escanear código QR o etiqueta NFC" onPress={() => router.push('/scan')} style={{ flex: 1 }} /></Footer>
    <FilterSheet visible={sheet} filters={filters} options={options} onClose={() => setSheet(false)} onApply={(location, category) => { setFilters({ ...filters, location, category }); setSheet(false); }} />
  </Screen>;
}

/** Avatar with the object's colour and icon (same palette as personal objects). */
export function CompanyAvatar({ object, size = 56 }: { object: Pick<InventoryObject, 'name' | 'color'>; size?: number }) {
  const { object: tone } = useTheme();
  const look = tone(object.color);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={objectIcon(null, object.name)} size={size * 0.46} color={look.fg} />
  </View>;
}

function Row({ item }: { item: InventoryObject }) {
  const { c } = useTheme();
  const status = inventoryStatuses[item.status];
  const place = [item.location, item.category].filter(Boolean);
  const label = [item.name, item.internal_code ? `Código ${item.internal_code}` : null, item.location ? `Ubicación ${item.location}` : null, item.category ? `Categoría ${item.category}` : null, item.assignee ? `Responsable ${item.assignee}` : null, status.label, nfcLabel(item.nfc_written_at)].filter(Boolean).join('. ');
  return <Card onPress={() => router.push(`/empresa/objeto/${item.id}`)} accessibilityLabel={label} accessibilityHint="Abre la ficha del objeto" style={{ padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
    <CompanyAvatar object={item} size={60} />
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ ...type.card, color: c.ink }} numberOfLines={2}>{item.name}</Text>
      {!!item.internal_code && <Meta icon="barcode-outline" text={item.internal_code} />}
      {place.length > 0 && <Meta icon="location-outline" text={place.join(' · ')} />}
      {!!item.assignee && <Meta icon="person-outline" text={item.assignee} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 3 }}><Badge tone={status.tone} icon={status.icon} label={status.label} /><NfcBadge writtenAt={item.nfc_written_at} size="sm" announce={false} /></View>
    </View>
    <Ionicons name="chevron-forward" size={20} color={c.muted} />
  </Card>;
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { c } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name={icon} size={14} color={c.muted} /><Text style={{ ...type.secondary, color: c.muted, flex: 1 }} numberOfLines={1}>{text}</Text></View>;
}

/** Bottom sheet with location and category (one value each, taken from the loaded list). */
function FilterSheet({ visible, filters, options, onClose, onApply }: { visible: boolean; filters: CompanyFilters; options: { locations: string[]; categories: string[] }; onClose: () => void; onApply: (location: string, category: string) => void }) {
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(filters.location);
  const [category, setCategory] = useState(filters.category);
  useEffect(() => { if (visible) { setLocation(filters.location); setCategory(filters.category); } }, [visible, filters.location, filters.category]);
  const group = (title: string, values: string[], current: string, set: (value: string) => void) => <View style={{ marginBottom: space.xl }}>
    <Text accessibilityRole="header" style={s.sheetLabel}>{title}</Text>
    {values.length === 0 ? <Text style={s.empty}>No hay valores en la lista cargada.</Text> : <View style={s.chips}>
      {values.map((value) => <Chip key={value} label={value} selected={current.toLowerCase() === value.toLowerCase()} onPress={() => set(current.toLowerCase() === value.toLowerCase() ? '' : value)} />)}
    </View>}
  </View>;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable accessibilityRole="button" accessibilityLabel="Cerrar filtros" style={s.backdrop} onPress={onClose} />
    <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) + space.md }]}>
      <View style={s.sheetHead}><Text accessibilityRole="header" style={s.sheetTitle}>Filtros</Text><IconButton icon="close" label="Cerrar filtros" size="sm" onPress={onClose} /></View>
      <ScrollView style={{ maxHeight: 420 }}>
        {group('Ubicación', options.locations, location, setLocation)}
        {group('Categoría', options.categories, category, setCategory)}
      </ScrollView>
      <View style={s.sheetActions}>
        <Button label="Limpiar" variant="ghost" onPress={() => { setLocation(''); setCategory(''); }} />
        <Button label="Aplicar" icon="checkmark" onPress={() => onApply(location, category)} style={{ flex: 1 }} />
      </View>
    </View>
  </Modal>;
}

const makeStyles = (c: Palette) => ({
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingTop: space.lg, paddingBottom: space.lg },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  modeText: { ...type.mini, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { ...type.title, color: c.ink },
  counters: { gap: space.sm, paddingBottom: space.lg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  search: { flex: 1, minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.inputBorder, paddingHorizontal: space.md },
  searchInput: { flex: 1, ...type.body, color: c.ink, paddingVertical: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  results: { ...type.secondary, color: c.muted, marginBottom: space.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space.xl, paddingTop: space.lg },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.lg },
  sheetTitle: { ...type.section, color: c.ink },
  sheetLabel: { ...type.label, color: c.ink, marginBottom: space.sm },
  empty: { ...type.secondary, color: c.muted },
  sheetActions: { flexDirection: 'row', gap: space.md, marginTop: space.md },
} as const);
