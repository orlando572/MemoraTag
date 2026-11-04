import * as FileSystem from 'expo-file-system/legacy';
import { documentUri } from './event-document';
import { photoUri } from './object-photos';
import { openDatabase } from './storage';

export async function getStorageUsage() {
  const db = await openDatabase();
  const [counts, photos, documents] = await Promise.all([
    db.getFirstAsync<{ active: number; archived: number; events: number }>(`SELECT
      (SELECT count(*) FROM objects WHERE archived_at IS NULL) AS active,
      (SELECT count(*) FROM objects WHERE archived_at IS NOT NULL) AS archived,
      (SELECT count(*) FROM events) AS events`),
    db.getAllAsync<{ name: string }>('SELECT cover_image AS name FROM objects WHERE cover_image IS NOT NULL UNION SELECT photo AS name FROM events WHERE photo IS NOT NULL'),
    db.getAllAsync<{ name: string }>('SELECT DISTINCT document_file AS name FROM events WHERE document_file IS NOT NULL'),
  ]);
  let missing = 0;
  async function sum(names: { name: string }[], uriFor: (name: string) => string | null) {
    let total = 0;
    for (const { name } of names) {
      const uri = uriFor(name);
      if (!uri) { missing++; continue; }
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || info.isDirectory || typeof info.size !== 'number') { missing++; continue; }
        total += info.size;
      } catch { missing++; }
    }
    return total;
  }
  const photoBytes = await sum(photos, photoUri);
  const documentBytes = await sum(documents, documentUri);
  return { active: counts?.active ?? 0, archived: counts?.archived ?? 0, events: counts?.events ?? 0, photoBytes, documentBytes, missing };
}
