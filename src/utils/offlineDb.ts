import type {
  EncryptedEnvelope,
  ExamPackageData,
  ExamSubmission,
  ViolationLog,
} from '../types/exam';
import { decryptPayload, encryptPayload, getExamVaultKey } from './crypto';

const DB_NAME = 'AksaraCBT_OfflineDB';
const DB_VERSION = 1;

const STORES = {
  PACKAGES: 'encryptedPackages',
  PDFS: 'pdfCache',
  ATTEMPTS: 'activeAttempts',
  SUBMISSIONS: 'submissions',
} as const;

export interface CachedPdfEntry {
  fileId: string;
  name: string;
  mimeType: string;
  data: ArrayBuffer;
  cachedAt: string;
}

export interface ActiveAttemptState {
  attemptKey: string;
  participantNumber: string;
  subjectId: string;
  answers: Record<string, string>;
  flaggedIds: string[];
  currentIndex: number;
  remainingSeconds: number;
  violationCount: number;
  violationLogs: ViolationLog[];
  startedAt: string;
  updatedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.PACKAGES)) {
        db.createObjectStore(STORES.PACKAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PDFS)) {
        db.createObjectStore(STORES.PDFS, { keyPath: 'fileId' });
      }
      if (!db.objectStoreNames.contains(STORES.ATTEMPTS)) {
        db.createObjectStore(STORES.ATTEMPTS, { keyPath: 'attemptKey' });
      }
      if (!db.objectStoreNames.contains(STORES.SUBMISSIONS)) {
        db.createObjectStore(STORES.SUBMISSIONS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveEncryptedExamPackage(
  pkg: ExamPackageData
): Promise<EncryptedEnvelope> {
  const key = getExamVaultKey(pkg.spreadsheetId);
  const envelope = await encryptPayload(pkg, key);
  await idbPut(STORES.PACKAGES, {
    id: 'active_exam_package',
    spreadsheetId: pkg.spreadsheetId,
    envelope,
    updatedAt: new Date().toISOString(),
  });
  return envelope;
}

export async function loadEncryptedExamPackage(
  spreadsheetId: string
): Promise<ExamPackageData | null> {
  const record = await idbGet<{
    id: string;
    spreadsheetId: string;
    envelope: EncryptedEnvelope;
  }>(STORES.PACKAGES, 'active_exam_package');
  if (!record) return null;
  try {
    const key = getExamVaultKey(record.spreadsheetId || spreadsheetId);
    return await decryptPayload<ExamPackageData>(record.envelope, key);
  } catch {
    return null;
  }
}

export async function savePdfToOfflineCache(entry: CachedPdfEntry): Promise<void> {
  await idbPut(STORES.PDFS, entry);
}

export async function getPdfFromOfflineCache(
  fileId: string
): Promise<CachedPdfEntry | undefined> {
  return idbGet<CachedPdfEntry>(STORES.PDFS, fileId);
}

export async function listCachedPdfIds(): Promise<string[]> {
  const all = await idbGetAll<CachedPdfEntry>(STORES.PDFS);
  return all.map((p) => p.fileId);
}

export async function saveActiveAttempt(attempt: ActiveAttemptState): Promise<void> {
  await idbPut(STORES.ATTEMPTS, attempt);
}

export async function loadActiveAttempt(
  participantNumber: string,
  subjectId: string
): Promise<ActiveAttemptState | undefined> {
  return idbGet<ActiveAttemptState>(
    STORES.ATTEMPTS,
    `${participantNumber}::${subjectId}`
  );
}

export async function clearActiveAttempt(
  participantNumber: string,
  subjectId: string
): Promise<void> {
  await idbDelete(STORES.ATTEMPTS, `${participantNumber}::${subjectId}`);
}

export async function saveSubmissionOffline(sub: ExamSubmission): Promise<void> {
  await idbPut(STORES.SUBMISSIONS, sub);
}

export async function getAllLocalSubmissions(): Promise<ExamSubmission[]> {
  return idbGetAll<ExamSubmission>(STORES.SUBMISSIONS);
}

export async function clearLocalSubmissions(): Promise<void> {
  const all = await getAllLocalSubmissions();
  for (const s of all) {
    await idbDelete(STORES.SUBMISSIONS, s.id);
  }
}

export async function clearAllActiveAttempts(): Promise<void> {
  const all = await idbGetAll<ActiveAttemptState>(STORES.ATTEMPTS);
  for (const a of all) {
    await idbDelete(STORES.ATTEMPTS, a.attemptKey);
  }
}

export async function clearPdfCache(): Promise<void> {
  const all = await idbGetAll<CachedPdfEntry>(STORES.PDFS);
  for (const p of all) {
    await idbDelete(STORES.PDFS, p.fileId);
  }
}
