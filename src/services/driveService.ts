import type { DrivePdfFile } from '../types/exam';
import {
  getPdfFromOfflineCache,
  listCachedPdfIds,
  savePdfToOfflineCache,
} from '../utils/offlineDb';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3/files';

function formatDriveError(status: number, rawBody: string): string {
  let detail = '';
  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string } };
    detail = parsed?.error?.message || '';
  } catch {
    detail = rawBody.slice(0, 140);
  }
  if (status === 401) {
    return 'Sesi Google berakhir. Silakan Sign in with Google kembali.';
  }
  if (status === 403) {
    return `Akses Google Drive ditolak (403). Pastikan akun Google Anda memiliki izin baca folder tersebut.${detail ? ` (${detail})` : ''}`;
  }
  if (status === 404) {
    return 'Folder atau file Google Drive tidak ditemukan (404). Periksa ID Folder Drive.';
  }
  return `Google Drive API (${status})${detail ? `: ${detail}` : '.'}`;
}

export async function listDrivePdfs(
  folderId: string,
  accessToken: string
): Promise<DrivePdfFile[]> {
  const query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/pdf' or name contains '.pdf')`;
  const url = `${DRIVE_BASE}?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&orderBy=name`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new Error(
      'Tidak dapat menghubungi Google Drive. Periksa koneksi jaringan Anda.'
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(formatDriveError(res.status, errText));
  }

  const data = (await res.json()) as { files?: DrivePdfFile[] };
  const cachedIds = new Set(await listCachedPdfIds());

  return (data.files || []).map((file) => ({
    ...file,
    cachedOffline: cachedIds.has(file.id),
  }));
}

export async function downloadAndCacheDrivePdf(
  file: DrivePdfFile,
  accessToken: string
): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(`${DRIVE_BASE}/${encodeURIComponent(file.id)}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new Error(
      'Koneksi terputus saat mengunduh PDF dari Google Drive.'
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(formatDriveError(res.status, errText));
  }

  const arrayBuffer = await res.arrayBuffer();

  // Save to local IndexedDB for offline access
  await savePdfToOfflineCache({
    fileId: file.id,
    name: file.name,
    mimeType: 'application/pdf',
    data: arrayBuffer,
    cachedAt: new Date().toISOString(),
  });

  // Also upload to server runtime cache so students without Drive auth can preview it
  try {
    const base64 = arrayBufferToBase64(arrayBuffer);
    await fetch('/api/drive/cache-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: file.id,
        name: file.name,
        mimeType: 'application/pdf',
        base64,
      }),
    });
  } catch {
    // Non-blocking if server cache upload fails
  }

  return arrayBuffer;
}

export async function getPdfObjectUrlForPreview(
  fileId: string,
  accessToken?: string | null
): Promise<{ url: string; source: 'offline_cache' | 'server_cache' | 'google_drive' }> {
  // 1. Check IndexedDB offline cache first (fastest & works in remote offline areas)
  const offlineEntry = await getPdfFromOfflineCache(fileId);
  if (offlineEntry) {
    const blob = new Blob([offlineEntry.data], { type: 'application/pdf' });
    return { url: URL.createObjectURL(blob), source: 'offline_cache' };
  }

  // 2. Check server runtime cache (populated by admin/teacher)
  try {
    const serverRes = await fetch(`/api/drive/pdf/${encodeURIComponent(fileId)}`);
    if (serverRes.ok) {
      const buf = await serverRes.arrayBuffer();
      await savePdfToOfflineCache({
        fileId,
        name: `${fileId}.pdf`,
        mimeType: 'application/pdf',
        data: buf,
        cachedAt: new Date().toISOString(),
      });
      const blob = new Blob([buf], { type: 'application/pdf' });
      return { url: URL.createObjectURL(blob), source: 'server_cache' };
    }
  } catch {
    // Fall through to Google Drive direct fetch if token exists
  }

  // 3. Direct fetch from Google Drive if teacher/admin token is present
  if (accessToken) {
    const res = await fetch(
      `${DRIVE_BASE}/${encodeURIComponent(fileId)}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (res.ok) {
      const buf = await res.arrayBuffer();
      await savePdfToOfflineCache({
        fileId,
        name: `${fileId}.pdf`,
        mimeType: 'application/pdf',
        data: buf,
        cachedAt: new Date().toISOString(),
      });
      const blob = new Blob([buf], { type: 'application/pdf' });
      return { url: URL.createObjectURL(blob), source: 'google_drive' };
    }
  }

  throw new Error(
    'File PDF belum tersedia di cache offline. Minta guru mengunduh cache PDF dari Google Drive terlebih dahulu.'
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
