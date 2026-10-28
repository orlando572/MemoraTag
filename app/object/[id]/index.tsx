import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BackButton, ObjectArtwork, palette } from "@/components/ui";
import {
  eventPresentation,
  useMemories,
} from "@/features/memories/memory-store";

function eventDateLabel(date: string) {
  const dateValue = new Date(date);
  const days = Math.max(
    0,
    Math.round((Date.now() - dateValue.getTime()) / 86400000),
  );
  const relative =
    days === 0 ? "Hoy" : days === 1 ? "Ayer" : `Hace ${days} días`;
  const exact = dateValue
    .toLocaleDateString("es-PE", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    })
    .replace(".", "");
  return `${relative} · ${exact}`;
}
export default function ObjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { objects, events, deleteObject } = useMemories();
  const insets = useSafeAreaInsets();
  const object = objects.find((item) => item.id === id);
  if (!object) return null;
  const objectEvents = events
    .filter((event) => event.objectId === id)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const activeIssue = objectEvents.find((event) => event.type === "issue");
  const confirmDelete = () =>
    Alert.alert(
      "¿Eliminar objeto?",
      `También se eliminarán los ${objectEvents.length} eventos de ${object.name}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            deleteObject(id);
            router.replace("/home");
          },
        },
      ],
    );
  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 16) + 92 },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.top}>
            <BackButton onPress={() => router.back()} />
            <View style={styles.topActions}>
              <Pressable
                accessibilityLabel="Editar objeto"
                onPress={() => router.push(`/object/${id}/edit`)}
                style={styles.qrBtn}
              >
                <Ionicons name="pencil-outline" size={20} color={palette.ink} />
              </Pressable>
              <Pressable
                accessibilityLabel="Eliminar objeto"
                onPress={confirmDelete}
                style={styles.deleteBtn}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={palette.danger}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Ver código QR"
                onPress={() => router.push(`/object/${id}/qr`)}
                style={styles.qrBtn}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={21}
                  color={palette.ink}
                />
              </Pressable>
            </View>
          </View>
          <View style={[styles.cover, { backgroundColor: object.color }]}>
            {object.coverImageUri ? (
              <Image
                source={{ uri: object.coverImageUri }}
                style={styles.coverImage}
              />
            ) : (
              <ObjectArtwork name={object.name} />
            )}
          </View>
          <Text style={styles.name}>{object.name}</Text>
          {object.description && (
            <Text style={styles.description}>{object.description}</Text>
          )}
        </View>
        {activeIssue && (
          <View style={styles.issue}>
            <View style={styles.issueIcon}>
              <Ionicons name="alert-outline" size={18} color="#fff" />
            </View>
            <View style={styles.issueCopy}>
              <Text style={styles.issueTitle}>Problema activo</Text>
              <Text numberOfLines={1} style={styles.issueDescription}>
                {activeIssue.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.danger} />
          </View>
        )}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Su historia</Text>
            <Text style={styles.eventCount}>{objectEvents.length} eventos</Text>
          </View>
          {objectEvents.map((event, index) => {
            const p = eventPresentation[event.type];
            return (
              <View key={event.id} style={styles.event}>
                <View
                  style={[
                    styles.eventIcon,
                    { backgroundColor: `${p.color}18` },
                  ]}
                >
                  <Ionicons name={p.icon} size={18} color={p.color} />
                </View>
                <View style={styles.eventCopy}>
                  <Text style={styles.date}>
                    {eventDateLabel(event.eventDate)}
                  </Text>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  {event.description && (
                    <Text style={styles.eventDesc}>{event.description}</Text>
                  )}
                  {event.imageUri && (
                    <Image
                      source={{ uri: event.imageUri }}
                      style={styles.eventPhoto}
                    />
                  )}
                </View>
                {index !== objectEvents.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 10 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/object/${id}/event`)}
          style={styles.add}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addText}>Registrar evento</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  scroll: { paddingBottom: 102 },
  hero: { backgroundColor: "#E8F1EE", padding: 20, paddingBottom: 29 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topActions: { flexDirection: "row", gap: 8 },
  qrBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#C8DED5",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF7F6",
    borderWidth: 1,
    borderColor: "#F1D1D1",
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    width: 76,
    height: 76,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 15,
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: "100%", resizeMode: "cover" },
  name: {
    fontSize: 31,
    fontWeight: "800",
    color: palette.ink,
    letterSpacing: -0.6,
  },
  description: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
    maxWidth: 320,
  },
  issue: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.dangerSurface,
    padding: 15,
    margin: 20,
    marginBottom: 2,
    borderRadius: 16,
    gap: 11,
  },
  issueIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: palette.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  issueCopy: { flex: 1 },
  issueTitle: { color: "#87353A", fontSize: 13, fontWeight: "800" },
  issueDescription: {
    color: "#87353A",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  section: { padding: 24, paddingTop: 22 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 21,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  eventCount: { color: palette.softMuted, fontSize: 13, fontWeight: "600" },
  event: { flexDirection: "row", minHeight: 98, gap: 12, position: "relative" },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  eventCopy: { flex: 1, paddingBottom: 23 },
  date: {
    color: palette.softMuted,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  eventDesc: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  eventPhoto: {
    width: "100%",
    height: 164,
    borderRadius: 14,
    marginTop: 10,
    backgroundColor: palette.paleGreen,
  },
  timelineLine: {
    position: "absolute",
    width: 1,
    backgroundColor: "#D4E0DA",
    left: 18.5,
    top: 42,
    bottom: 0,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#F4F7F6F7",
    borderTopWidth: 1,
    borderTopColor: "#E0E8E4",
  },
  add: {
    height: 56,
    borderRadius: 15,
    backgroundColor: palette.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: "#0D5244",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 7,
    elevation: 2,
  },
  addText: { fontWeight: "800", color: "#fff", fontSize: 16 },
});
