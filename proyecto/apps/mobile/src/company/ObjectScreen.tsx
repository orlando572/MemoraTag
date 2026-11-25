import type { InventoryObject, InventoryStatus, ObjectEvent } from '@memoratag/contracts';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { dayOf, formatDate, relativeDate } from '../ui/format';
import { Badge, Button, Card, EmptyState, Footer, Loading, NavBar, Screen } from '../ui/components';
import { useFeedback } from '../ui/feedback/FeedbackProvider';
import { useStyles, useTheme } from '../ui/theme';
import { space, type, type Palette } from '../ui/tokens';
import { changeStatus, getObject, listEvents } from './api';
import { EventAttachments } from './Attachments';
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

  function chooseStatus() {
    Alert.sheet('Cambiar estado', undefined, [
      ...(Object.keys(inventoryStatuses) as InventoryStatus[]).map((key) => ({ text: inventoryStatuses[key].label, icon: inventoryStatuses[key].icon, onPress: () => void setStatus(key) })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }

  const fields: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }[] = [
    { icon: 'barcode-outline', label: 'Código', value: object.internal_code },
    { icon: 'pricetags-outline', label: 'Categoría', value: object.category },
    { icon: 'location-outline', label: 'Ubicación', value: object.location },
    { icon: 'person-outline', label: 'Responsable', value: object.assignee },
  ];

  return <Screen>
    <NavBar title="Objeto de la empresa" onBack={back} />
    <ScrollView contentContainerStyle={s.content}>
      <Text accessibilityRole="header" style={s.name}>{object.name}</Text>
      {!!object.description && <Text style={s.description}>{object.description}</Text>}
      <View style={s.badges}>
        <Badge tone={status.tone} icon={status.icon} label={status.label} />
        {archived && <Badge tone="neutral" icon="archive-outline" label="Archivado" />}
      </View>

      <Card style={s.fields}>
        {fields.map((field) => <View key={field.label} style={s.field} accessible accessibilityLabel={`${field.label}: ${field.value || 'sin indicar'}`}>
          <Ionicons name={field.icon} size={20} color={c.muted} />
          <Text style={s.fieldLabel}>{field.label}</Text>
          <Text style={s.fieldValue} numberOfLines={2}>{field.value || '—'}</Text>
        </View>)}
      </Card>

      {canWriteNfc(org?.role) && <Button label="Escribir etiqueta NFC" icon="radio-outline" variant="secondary" style={{ marginBottom: space.xxl }} onPress={() => router.push({ pathname: '/empresa/objeto/[id]/nfc', params: { id: object.id, name: object.name } })} />}

      <Text accessibilityRole="header" style={s.section}>Historia</Text>
      {error && <Text accessibilityLiveRegion="polite" style={s.stale}>{companyMessage(error)}</Text>}
      {events.length === 0 ? <EmptyState icon="time-outline" title="Sin eventos" text="Registra el primer evento de este objeto." /> :
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
    {!archived && <Footer>
      <Button label="Cambiar estado" icon="swap-horizontal" variant="secondary" loading={busy} onPress={chooseStatus} style={{ flex: 1 }} />
      <Button label="Registrar evento" icon="add" onPress={() => router.push({ pathname: '/empresa/objeto/[id]/evento', params: { id: object.id, name: object.name } })} style={{ flex: 1 }} />
    </Footer>}
  </Screen>;
}

const makeStyles = (c: Palette) => ({
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxxl },
  name: { ...type.title, color: c.ink },
  description: { ...type.body, color: c.muted, marginTop: space.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md, marginBottom: space.lg },
  fields: { gap: space.md, marginBottom: space.xxl },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  fieldLabel: { ...type.secondary, color: c.muted, width: 96 },
  fieldValue: { ...type.label, color: c.ink, flex: 1 },
  section: { ...type.section, color: c.ink, marginBottom: space.md },
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
