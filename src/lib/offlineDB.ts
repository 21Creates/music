import type { Track, Room } from '@/types';

const DB_NAME = 'vinyl-offline-db';
const DB_VERSION = 1;

const STORE_CATALOG = 'catalog';
const STORE_OFFLINE = 'offline-tracks';

export interface OfflineTrackRecord {
  trackId: string;
  roomId: string;
  title: string;
  artistName: string;
  coverUrl: string | null;
  audioUrl: string;
  sizeBytes: number;
  addedAt: number;
  lastPlayedAt: number | null;
}

export interface CatalogEntry {
  key: string;
  rooms: Room[];
  tracks: Track[];
  syncedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CATALOG)) {
        db.createObjectStore(STORE_CATALOG, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_OFFLINE)) {
        db.createObjectStore(STORE_OFFLINE, { keyPath: 'trackId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function saveCatalog(rooms: Room[], tracks: Track[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATALOG, 'readwrite');
    const store = tx.objectStore(STORE_CATALOG);
    const entry: CatalogEntry = { key: 'main', rooms, tracks, syncedAt: Date.now() };
    store.put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCatalog(): Promise<CatalogEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATALOG, 'readonly');
    const store = tx.objectStore(STORE_CATALOG);
    const req = store.get('main');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineTrack(record: OfflineTrackRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE, 'readwrite');
    tx.objectStore(STORE_OFFLINE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeOfflineTrack(trackId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE, 'readwrite');
    tx.objectStore(STORE_OFFLINE).delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineTrack(trackId: string): Promise<OfflineTrackRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE, 'readonly');
    const req = tx.objectStore(STORE_OFFLINE).get(trackId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllOfflineTracks(): Promise<OfflineTrackRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE, 'readonly');
    const req = tx.objectStore(STORE_OFFLINE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineTrackRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineTrackIds(): Promise<Set<string>> {
  const all = await getAllOfflineTracks();
  return new Set(all.map((r) => r.trackId));
}

export async function clearAllOfflineTracks(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OFFLINE, 'readwrite');
    tx.objectStore(STORE_OFFLINE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateLastPlayed(trackId: string): Promise<void> {
  const rec = await getOfflineTrack(trackId);
  if (!rec) return;
  rec.lastPlayedAt = Date.now();
  await saveOfflineTrack(rec);
}
