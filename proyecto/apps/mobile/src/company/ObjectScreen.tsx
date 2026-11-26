import type { InventoryObject, InventoryStatus, ObjectEvent } from '@memoratag/contracts';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { dayOf, formatDate, relativeDate } from '../ui/format';
import { Badge, Card, EmptyState, Loading, NavBar, Screen } from '../ui/components';
import { haptic } from '../ui/feedback/haptics';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { useStyles, useTheme } from '../ui/theme';
import { radius, space, type, type Palette } from '../ui/tokens';
import { changeStatus, getObject, listEvents } from './api';
import { EventAttachments } from './Attachments';
import { NfcBadge } from './NfcBadge';
import { CompanyAvatar } from './CompanyHome';
import { useCompany } from './CompanyProvider';
import { canWriteNfc } from './files';
import { companyMessage, toCompanyError, type CompanyErrorKind } from './errors';
import { companyEventLook } from './events';
import { CompanyProblem } from './Problem';
import { inventoryStatuses } from './status';

/** Company object sheet: data, status (icon + text) and history, with the two field actions. */
export function CompanyObjectScreen({ id }: { id: string }) {
  const Alert = useFeedback();
  const { org } = useCompany();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const [object, setObject] = useState<InventoryObject | null>(null);
  const [events, setEvents] = useState<ObjectEvent[]>([]);
  const [error, setError] = useState<CompanyErrorKind | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [found, history] = await Promise.all([getObject(id), listEvents(id)]);
      setObject(found);
      setEvents([...history].sort((a, b) => (b.event_date ?? b.created_at).localeCompare(a.event_date ?? a.created_at)));
    } catch (e) { setError(toCompanyError(e).kind); }
  }, [id]);

  // Reload when coming back from the event form.
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  if (error && !object) return <Screen><NavBar onBack={back} /><CompanyProblem kind={error} onRetry={() => { void load(); }} /></Screen>;
  if (!object) return <Screen><NavBar onBack={back} /><Loading /></Screen>;

  const status = inventoryStatuses[object.status];
  const archived = !!object.archived_at;

  async function setStatus(next: InventoryStatus) {
    if (busy || next === object!.status) return;
    setBusy(true);
    try {
      setObject(await changeStatus(object!.id, next));
      Alert.toast(`Estado: ${inventoryStatuses[next].label}`);
    } catch (e) { Alert.error('No se pudo cambiar el estado', companyMessage(toCompanyError(e).kind)); }
    finally { setBusy(false); }
  }

  const fields: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }[] = [
    { icon: 'pricetags-outline', label: 'Categoría', value: object.category },
    { icon: 'location-outline', label: 'Ubicación', value: object.location },
    { icon: 'person-outline', label: 'Responsable', value: object.assignee },
    { icon: 'calendar-outline', label: 'Fecha de alta', value: formatDate(dayOf(object.created_at)) },
  ];
  const params = { id: object.id, name: object.name };
  const nfcParams = { ...params, nfc: object.nfc_written_at ?? '' };

  return <Screen>
    <NavBar title="Objeto de la empresa" onBack={back} />
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.hero}>
        <CompanyAvatar object={object} size={72} />
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}><Text accessibilityRole="header" style={[s.name, { flex: 1 }]}>{object.name}</Text><NfcBadge writtenAt={object.nfc_written_at} /></View>
          {!!object.internal_code && <View style={s.code} accessible accessibilityLabel={`Código ${object.internal_code}`}><Ionicons name="barcode-outline" size={16} color={c.muted} /><Text style={s.codeText}>{object.internal_code}</Text></View>}
          {archived && <Badge style={{ marginTop: space.sm }} tone="neutral" icon="archive-outline" label="Archivado" />}
        </View>
      </View>
      {!!object.description && <Text style={s.description}>{object.description}</Text>}

      <Text accessibilityRole="header" style={s.label}>Estado</Text>
      <View accessibilityRole="radiogroup" style={s.segments}>
        {(Object.keys(inventoryStatuses) as InventoryStatus[]).map((key) => {
          const item = inventoryStatuses[key];
          const selected = object.status === key;
          return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: archived || busy }} accessibilityLabel={item.label} accessibilityHint={selected ? undefined : 'Cambia el estado del objeto'}
            disabled={archived || busy} onPress={() => { haptic.tap(); void setStatus(key); }} style={({ pressed }) => [s.segment, selected && { backgroundColor: c.primarySoft, borderColor: c.primary, borderWidth: 2 }, pressed && { opacity: 0.75 }]}>
            <Ionicons name={selected ? item.icon : (`${item.icon}-outline` as keyof typeof Ionicons.glyphMap)} size={20} color={selected ? c.onPrimarySoft : c.muted} />
            <Text style={[s.segmentText, selected && { color: c.onPrimarySoft }]} numberOfLines={2}>{item.label}</Text>
          </Pressable>;
        })}
      </View>

      <Card style={s.fields}>
        {fields.map((field) => <View key={field.label} style={s.field} accessible accessibilityLabel={`${field.label}: ${field.value || 'sin indicar'}`}>
          <View style={s.fieldIcon}><Ionicons name={field.icon} size={18} color={c.onPrimarySoft} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.fieldLabel}>{field.label}</Text>
            <Text style={s.fieldValue}>{field.value || '—'}</Text>
          </View>
        </View>)}
      </Card>

      {!archived && <View style={s.actions}>
        <Action icon="add-circle-outline" label="Registrar evento" onPress={() => router.push({ pathname: '/empresa/objeto/[id]/evento', params })} />
        <Action icon="qr-code-outline" label="Ver QR" onPress={() => router.push({ pathname: '/empresa/objeto/[id]/qr', params })} />
        {canWriteNfc(org?.role) && <Action icon="radio-outline" label="Escribir NFC" accessibilityLabel="Escribir etiqueta NFC" onPress={() => router.push({ pathname: '/empresa/objeto/[id]/nfc', params: nfcParams })} />}
      </View>}

      <View style={s.historyHead}>
        <Text accessibilityRole="header" style={s.section}>Historia</Text>
        <Text style={s.count}>{events.length} {events.length === 1 ? 'evento' : 'eventos'}</Text>
      </View>
      {error && <Text accessibilityLiveRegion="polite" style={s.stale}>{companyMessage(error)}</Text>}
      {events.length === 0 ? <EmptyState icon="time-outline" title="Aquí empieza su historia" text="Registra el primer evento de este objeto." /> :
        events.map((event, index) => {
          const look = companyEventLook(event.type, c);
          const day = dayOf(event.event_date ?? event.created_at);
          return <View key={event.id} style={s.event}>
            <View style={s.rail}>
              <View style={[s.dot, { backgroundColor: look.soft }]}><Ionicons name={look.icon} size={20} color={look.color} /></View>
              {index < events.length - 1 && <View style={[s.line, { backgroundColor: c.line }]} />}
            </View>
            <Card style={s.eventCard}>
              <Text style={[s.eventMeta, { color: look.color }]} accessibilityLabel={`${look.label}, ${formatDate(day)}`}>{look.label} · {relativeDate(day)}</Text>
              <Text style={s.eventTitle}>{event.title}</Text>
              {!!event.description && <Text style={s.eventText}>{event.description}</Text>}
              <EventAttachments files={event.files} />
            </Card>
          </View>;
        })}
    </ScrollView>
  </Screen>;
}

function Action({ icon, label, onPress, accessibilityLabel }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; accessibilityLabel?: string }) {
  const { c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress}
    style={({ pressed }) => [{ flex: 1, minHeight: 76, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 6, padding: space.sm }, pressed && { opacity: 0.75 }]}>
    <Ionicons name={icon} size={24} color={c.primary} />
    <Text style={{ ...type.label, color: c.ink, textAlign: 'center' }}>{label}</Text>
  </Pressable>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  name: { ...type.title, color: c.ink },
  code: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  codeText: { ...type.label, color: c.muted },
  description: { ...type.body, color: c.muted, marginTop: space.lg },
  label: { ...type.label, color: c.ink, marginTop: space.xl, marginBottom: space.sm },
  segments: { flexDirection: 'row', gap: space.sm },
  segment: { flex: 1, minHeight: 64, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', gap: 4, padding: space.sm },
  segmentText: { ...type.mini, color: c.ink, textAlign: 'center' },
  fields: { gap: space.lg, marginTop: space.lg },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  fieldIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { ...type.secondary, color: c.muted },
  fieldValue: { ...type.label, color: c.ink },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  historyHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  count: { ...type.secondary, color: c.muted },
  section: { ...type.section, color: c.ink },
  stale: { ...type.secondary, color: c.muted, marginBottom: space.md },
  event: { flexDirection: 'row', gap: space.md },
  rail: { width: 40, alignItems: 'center' },
  dot: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginVertical: 4 },
  eventCard: { flex: 1, marginBottom: space.md },
  eventMeta: { ...type.mini },
  eventTitle: { ...type.card, color: c.ink },
  eventText: { ...type.body, color: c.muted, marginTop: 4 },
} as const);
