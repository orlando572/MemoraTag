import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { dataChanged, isPendingDeletion, useReload } from '../../../src/data/bus';
import { openDocument } from '../../../src/event-document';
import { photoUri } from '../../../src/object-photos';
import { countEvents, effectiveEventFilter, showTypeFilters, typesWithEvents, type EventFilter } from '../../../src/objects/history';
import { objectIcon } from '../../../src/objects/icons';
import { archiveObject, findActiveObject, listEvents, objectState, restoreObject, setIssueResolved, type EventType, type MemoryEvent, type MemoryObject } from '../../../src/storage';
import { Badge, Button, Card, Chip, EmptyState, ErrorMessage, Footer, IconButton, Loading, NavBar, Screen } from '../../../src/ui/components';
import { eventAppearance, eventTypes } from '../../../src/ui/event-types';
import { useFeedback } from '../../../src/ui/feedback/FeedbackProvider';
import { haptic } from '../../../src/ui/feedback/haptics';
import { dayOf, formatDate, monthLabel, relativeDate } from '../../../src/ui/format';
import { useStyles, useTheme } from '../../../src/ui/theme';
import { radius, space, type, type Palette } from '../../../src/ui/tokens';

export default function ObjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const Alert = useFeedback();
  const theme = useTheme();
  const { c } = theme;
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [object, setObject] = useState<MemoryObject | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'archived' | 'missing' | 'error'>('loading');
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useReload(async () => {
    try {
      const found = await findActiveObject(id);
      if (!found) { setObject(null); setState(await objectState(id)); return; }
      setObject(found);
      setEvents((await listEvents(id)).filter((event) => !isPendingDeletion(event.id)));
      setState('ready');
    } catch { setState('error'); }
  });

  const counts = useMemo(() => countEvents(events), [events]);
  // A filter on a type that has no events any more falls back to «Todos», and the choice is forgotten so
  // it does not come back by itself (and hide events) when one is added again.
  const activeFilter = effectiveEventFilter(filter, counts);
  useEffect(() => { if (filter !== activeFilter) setFilter(activeFilter); }, [filter, activeFilter]);
  const groups = useMemo(() => {
    const result: { month: string; items: MemoryEvent[] }[] = [];
    for (const event of events.filter((e) => activeFilter === 'all' || e.type === activeFilter)) {
      const month = monthLabel(event.event_date);
      if (result.at(-1)?.month === month) result.at(-1)!.items.push(event);
      else result.push({ month, items: [event] });
    }
    return result;
  }, [events, activeFilter]);

  if (state === 'loading') return <Screen><NavBar /><Loading /></Screen>;
  if (state === 'error') return <Screen><NavBar /><ErrorMessage text="No se pudo cargar este objeto." onRetry={reload} /></Screen>;
  if (state !== 'ready' || !object) return <Screen><NavBar onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />
    {state === 'archived'
      ? <EmptyState icon="archive-outline" title="Este objeto está archivado" text="Restáuralo para verlo." action={{ label: 'Ver objetos archivados', icon: 'archive-outline', onPress: () => router.replace('/archived') }} />
      : <EmptyState icon="phone-portrait-outline" title="Objeto no disponible" text="Este objeto no está en este teléfono." action={{ label: 'Ir al inicio', icon: 'home-outline', onPress: () => router.replace('/') }} />}
  </Screen>;

  const tone = theme.object(object.color);
  const cover = photoUri(object.cover_image);
  const openIssues = object.open_issues ?? 0;

  async function toggleIssue(event: MemoryEvent) {
    const resolve = !event.resolved_at;
    try {
      const at = await setIssueResolved(event.id, object!.id, resolve);
      setEvents((items) => items.map((item) => item.id === event.id ? { ...item, resolved_at: at } : item));
      setObject((item) => item && { ...item, open_issues: Math.max(0, (item.open_issues ?? 0) + (resolve ? -1 : 1)) });
      dataChanged();
      Alert.toast(resolve ? 'Incidencia resuelta' : 'Incidencia reabierta', { action: { label: 'Deshacer', onPress: () => void toggleIssue({ ...event, resolved_at: at }) } });
    } catch { Alert.error('No se pudo actualizar la incidencia', 'Vuelve a intentarlo.'); }
  }

  // Archiving is reversible, so it acts at once and offers «Deshacer» instead of asking first.
  async function archive() {
    if (busy) return;
    setBusy(true);
    try {
      await archiveObject(object!.id);
      router.back();
      dataChanged();
      Alert.toast(`«${object!.name}» archivado`, { action: { label: 'Deshacer', onPress: () => { void restoreObject(object!.id).then(() => { dataChanged(); Alert.toast('Objeto restaurado'); }).catch(() => Alert.error('No se pudo restaurar', 'Restáuralo desde «Objetos archivados».')); } } });
    } catch { Alert.error('No se pudo archivar', 'Vuelve a intentarlo.'); }
    finally { setBusy(false); }
  }

  function more() {
    Alert.sheet(object!.name, undefined, [
      { text: 'Editar objeto', icon: 'pencil-outline', onPress: () => router.push(`/object/${object!.id}/edit`) },
      { text: 'Archivar objeto', icon: 'archive-outline', style: 'destructive', onPress: () => void archive() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  const nfcLabel = object.nfc_written_at ? `Vinculada ${relativeDate(dayOf(object.nfc_written_at)).toLowerCase()}` : 'Sin vincular';

  return <View style={{ flex: 1, backgroundColor: c.canvas }}>
    <StatusBar style={cover || theme.dark ? 'light' : 'dark'} />
    <Modal visible={fullPhoto !== null} animationType="fade" onRequestClose={() => setFullPhoto(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ alignItems: 'flex-end', padding: space.lg }}><IconButton icon="close" label="Cerrar foto" tone="onDark" onPress={() => setFullPhoto(null)} /></View>
        {fullPhoto && <Image accessibilityLabel="Foto a pantalla completa" source={{ uri: fullPhoto }} style={{ flex: 1 }} resizeMode="contain" />}
      </SafeAreaView>
    </Modal>
    <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl }}>
      <View style={[s.hero, { backgroundColor: tone.bg, paddingTop: insets.top + space.sm }, cover && s.heroPhoto]}>
        {cover && <Pressable accessibilityRole="button" accessibilityLabel="Ver la foto del objeto a pantalla completa" onPress={() => setFullPhoto(cover)} style={StyleSheet.absoluteFill}><Image source={{ uri: cover }} style={StyleSheet.absoluteFill} /><View style={s.shade} /></Pressable>}
        <View style={s.heroBar}>
          <IconButton icon="arrow-back" label="Volver" tone={cover ? 'onPhoto' : 'surface'} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
          <IconButton icon="ellipsis-horizontal" label="Más opciones: editar o archivar" tone={cover ? 'onPhoto' : 'surface'} onPress={more} />
        </View>
        {!cover && <View style={[s.heroIcon, { backgroundColor: c.surface }]}><Ionicons name={objectIcon(object.icon, object.name)} size={40} color={tone.fg} /></View>}
        <View pointerEvents={cover ? 'box-none' : 'none'} style={cover ? s.heroCaption : undefined}>
          <View pointerEvents="none" style={cover ? s.heroText : undefined}>
            <Text accessibilityRole="header" style={[s.name, { color: cover ? '#FFFFFF' : tone.fg }]}>{object.name}</Text>
            {!!object.description && <Text style={[s.description, { color: cover ? '#FFFFFF' : c.ink }]}>{object.description}</Text>}
          </View>
          {/* Tapping the photo also opens it, but only a visible control tells people so (Norman: signifier). */}
          {cover && <IconButton icon="expand-outline" label="Ver la foto a pantalla completa" tone="onDark" onPress={() => setFullPhoto(cover)} />}
        </View>
      </View>

      <View style={s.body}>
        <View style={s.quick}>
          <QuickAction icon="qr-code-outline" title="Código QR" detail="Ver e imprimir" onPress={() => router.push(`/object/${object.id}/qr`)} />
          <QuickAction icon={object.nfc_written_at ? 'checkmark-circle' : 'radio-outline'} title="Etiqueta NFC" detail={nfcLabel} done={!!object.nfc_written_at} onPress={() => router.push(`/object/${object.id}/nfc`)} />
        </View>

        <Card style={s.status}>
          <View style={s.statusRow} accessible accessibilityLabel={openIssues ? `${openIssues} ${openIssues === 1 ? 'incidencia abierta' : 'incidencias abiertas'}` : 'Sin incidencias abiertas'}>
            <Ionicons name={openIssues ? 'alert-circle' : 'checkmark-circle'} size={22} color={openIssues ? c.danger : c.success} />
            <Text style={[s.statusText, { color: openIssues ? c.danger : c.ink }]}>{openIssues ? `${openIssues} ${openIssues === 1 ? 'incidencia abierta' : 'incidencias abiertas'}` : 'Sin incidencias abiertas'}</Text>
          </View>
          <View style={s.statusRow} accessible accessibilityLabel={object.last_maintenance ? `Último mantenimiento: ${formatDate(object.last_maintenance)}` : 'Sin mantenimientos registrados'}>
            <Ionicons name="build-outline" size={20} color={object.last_maintenance ? c.warning : c.muted} />
            <Text style={s.statusText}>{object.last_maintenance ? `Último mantenimiento: ${relativeDate(object.last_maintenance).toLowerCase()}` : 'Sin mantenimientos registrados'}</Text>
          </View>
        </Card>

        <View style={s.historyHead}>
          <Text accessibilityRole="header" style={s.sectionTitle}>Historia</Text>
          <Text style={s.count}>{events.length} {events.length === 1 ? 'evento' : 'eventos'}</Text>
        </View>
        {showTypeFilters(counts) && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} accessibilityLabel="Filtrar por tipo">
          <Chip label="Todos" count={counts.all} selected={activeFilter === 'all'} onPress={() => { haptic.tap(); setFilter('all'); }} />
          {typesWithEvents(counts).map((key) => <Chip key={key} label={eventTypes[key].plural} icon={eventTypes[key].icon} color={eventTypes[key].color(c)} count={counts[key]} selected={activeFilter === key} onPress={() => { haptic.tap(); setFilter(key); }} />)}
        </ScrollView>}

        {events.length === 0 ? <EmptyState icon="time-outline" title="Aquí empieza su historia" text="Registra el primer evento: un recuerdo, una incidencia o un mantenimiento." /> :
          groups.length === 0 ? <EmptyState icon="filter-outline" title={`Sin ${eventTypes[activeFilter as EventType].plural.toLowerCase()}`} text="No hay eventos de este tipo." action={{ label: 'Ver todos', onPress: () => setFilter('all') }} /> :
          groups.map((group) => <View key={group.month}>
            <Text accessibilityRole="header" style={s.month}>{group.month}</Text>
            {group.items.map((event, index) => <EventItem key={event.id} event={event} last={index === group.items.length - 1} onEdit={() => router.push(`/object/${object.id}/event/${event.id}`)} onToggle={() => void toggleIssue(event)} onPhoto={setFullPhoto} onDocument={(file) => openDocument(file).catch(() => Alert.error('No se pudo abrir el documento', 'Comprueba que tengas una aplicación compatible instalada.'))} />)}
          </View>)}
      </View>
    </ScrollView>
    <Footer><Button label="Registrar evento" icon="add" onPress={() => router.push(`/object/${object.id}/event/new`)} style={{ flex: 1 }} /></Footer>
  </View>;
}

function QuickAction({ icon, title, detail, onPress, done }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void; done?: boolean }) {
  const { c } = useTheme();
  return <Card onPress={onPress} accessibilityLabel={`${title}. ${detail}`} style={{ flex: 1, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: done ? c.primarySoft : c.surface, borderColor: done ? c.primarySoft : c.line }}>
    <Ionicons name={icon} size={24} color={done ? c.onPrimarySoft : c.primary} />
    <View style={{ flex: 1 }}>
      <Text style={{ ...type.label, color: done ? c.onPrimarySoft : c.ink }} numberOfLines={1}>{title}</Text>
      <Text style={{ ...type.secondary, color: done ? c.onPrimarySoft : c.muted }} numberOfLines={2}>{detail}</Text>
    </View>
  </Card>;
}

function EventItem({ event, last, onEdit, onToggle, onPhoto, onDocument }: { event: MemoryEvent; last: boolean; onEdit: () => void; onToggle: () => void; onPhoto: (uri: string) => void; onDocument: (file: string) => void }) {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const look = eventAppearance(event, c);
  const photo = photoUri(event.photo);
  const isIssue = event.type === 'issue';
  return <View style={s.event}>
    <View style={s.rail}>
      <View style={[s.dot, { backgroundColor: look.soft }]}><Ionicons name={look.icon} size={20} color={look.color} /></View>
      {!last && <View style={[s.line, { backgroundColor: c.line }]} />}
    </View>
    <Card style={s.eventCard}>
      <View style={s.eventTop}>
        <Text style={[s.eventMeta, { color: look.color }]} accessibilityLabel={`${look.label}, ${formatDate(event.event_date)}`}>{look.label} · {relativeDate(event.event_date)}</Text>
        <IconButton icon="pencil-outline" label={`Editar evento ${event.title}`} onPress={onEdit} />
      </View>
      <Text style={s.eventTitle}>{event.title}</Text>
      {!!event.description && <Text style={s.eventText}>{event.description}</Text>}
      {photo && <Pressable accessibilityRole="button" accessibilityLabel="Ver la foto del evento a pantalla completa" onPress={() => onPhoto(photo)}><Image source={{ uri: photo }} style={s.eventPhoto} /></Pressable>}
      {event.document_file && <Pressable accessibilityRole="button" accessibilityLabel={`Abrir documento ${event.document_name ?? ''}`} onPress={() => onDocument(event.document_file!)} style={({ pressed }) => [s.doc, pressed && { opacity: 0.7 }]}>
        <Ionicons name="document-attach-outline" size={20} color={c.primary} /><Text numberOfLines={2} style={s.docText}>{event.document_name || 'Documento adjunto'}</Text><Ionicons name="open-outline" size={18} color={c.muted} />
      </Pressable>}
      {isIssue && <View style={s.issueRow}>
        <Badge tone={event.resolved_at ? 'success' : 'danger'} icon={event.resolved_at ? 'checkmark-circle' : 'alert-circle'} label={event.resolved_at ? `Resuelta ${relativeDate(dayOf(event.resolved_at)).toLowerCase()}` : 'Abierta'} />
        <Button label={event.resolved_at ? 'Reabrir' : 'Marcar resuelta'} icon={event.resolved_at ? 'refresh' : 'checkmark'} variant="ghost" onPress={onToggle} style={{ minHeight: 44, paddingHorizontal: space.sm }} accessibilityLabel={event.resolved_at ? `Reabrir incidencia ${event.title}` : `Marcar como resuelta la incidencia ${event.title}`} />
      </View>}
    </Card>
  </View>;
}

const makeStyles = (c: Palette) => ({
  hero: { paddingHorizontal: space.xl, paddingBottom: space.xxl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden' },
  heroPhoto: { minHeight: 220 },
  shade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.xl },
  heroIcon: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  heroCaption: { marginTop: 'auto', marginHorizontal: -space.xl, marginBottom: -space.xxl, paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.xxl, backgroundColor: 'rgba(0,0,0,0.62)', flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  heroText: { flex: 1 },
  name: { ...type.title },
  description: { ...type.body, marginTop: space.sm, opacity: 0.92 },
  body: { paddingHorizontal: space.xl, paddingTop: space.xl },
  quick: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  status: { gap: space.md, marginBottom: space.xxl },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  statusText: { ...type.label, color: c.ink, flex: 1 },
  historyHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.md },
  sectionTitle: { ...type.section, color: c.ink },
  count: { ...type.secondary, color: c.muted },
  filters: { gap: space.sm, paddingBottom: space.lg },
  month: { ...type.mini, color: c.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: space.sm, marginBottom: space.md },
  event: { flexDirection: 'row', gap: space.md },
  rail: { width: 40, alignItems: 'center' },
  dot: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginVertical: 4 },
  eventCard: { flex: 1, marginBottom: space.md, paddingTop: space.sm },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginRight: -space.sm },
  eventMeta: { ...type.mini, flex: 1 },
  eventTitle: { ...type.card, color: c.ink },
  eventText: { ...type.body, color: c.muted, marginTop: 4 },
  eventPhoto: { width: '100%', height: 180, borderRadius: radius.md, marginTop: space.md, backgroundColor: c.surfaceAlt },
  doc: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: c.surfaceAlt },
  docText: { ...type.label, color: c.ink, flex: 1 },
  issueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md, gap: space.sm, flexWrap: 'wrap' },
} as const);
