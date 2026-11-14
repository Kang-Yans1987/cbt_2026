import React, { useState } from 'react';
import {
  CheckCircle2,
  CloudDownload,
  Eye,
  FileText,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import type { DrivePdfFile } from '../../types/exam';
import {
  downloadAndCacheDrivePdf,
  getPdfObjectUrlForPreview,
  listDrivePdfs,
} from '../../services/driveService';
import { GoogleSignInButton } from '../GoogleSignInButton';

interface DrivePdfManagerTabProps {
  folderId: string;
  onChangeFolderId: (id: string) => void;
  accessToken: string | null;
  onSignIn: () => void;
  drivePdfs: DrivePdfFile[];
  onUpdateDrivePdfs: (files: DrivePdfFile[]) => void;
}

export const DrivePdfManagerTab: React.FC<DrivePdfManagerTabProps> = ({
  folderId,
  onChangeFolderId,
  accessToken,
  onSignIn,
  drivePdfs,
  onUpdateDrivePdfs,
}) => {
  const [loadingList, setLoadingList] = useState(false);
  const [cachingAll, setCachingAll] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFetchFolder = async () => {
    if (!accessToken) {
      setErrorMsg('Masuk dengan Google terlebih dahulu untuk mengakses folder Drive.');
      return;
    }
    setLoadingList(true);
    setErrorMsg(null);
    try {
      const files = await listDrivePdfs(folderId, accessToken);
      onUpdateDrivePdfs(files);
      setStatusMessage(
        `Ditemukan ${files.length} file PDF di folder Google Drive.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal membaca folder Google Drive.'
      );
    } finally {
      setLoadingList(false);
    }
  };

  const handleCachePdf = async (file: DrivePdfFile) => {
    if (!accessToken) return;
    setErrorMsg(null);
    try {
      await downloadAndCacheDrivePdf(file, accessToken);
      onUpdateDrivePdfs(
        drivePdfs.map((f) =>
          f.id === file.id
            ? { ...f, cachedOffline: true, cachedOnServer: true }
            : f
        )
      );
      setStatusMessage(`PDF "${file.name}" berhasil disimpan ke cache offline & server.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal mengunduh PDF untuk offline.'
      );
    }
  };

  const handleCacheAll = async () => {
    if (!accessToken || drivePdfs.length === 0) return;
    setCachingAll(true);
    setErrorMsg(null);
    let count = 0;
    try {
      for (const file of drivePdfs) {
        await downloadAndCacheDrivePdf(file, accessToken);
        count += 1;
      }
      onUpdateDrivePdfs(
        drivePdfs.map((f) => ({
          ...f,
          cachedOffline: true,
          cachedOnServer: true,
        }))
      );
      setStatusMessage(
        `${count} file PDF berhasil di-cache untuk akses offline peserta di daerah jaringan tidak stabil.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Sebagian PDF gagal di-cache.'
      );
    } finally {
      setCachingAll(false);
    }
  };

  const handlePreview = async (file: DrivePdfFile) => {
    setErrorMsg(null);
    try {
      const res = await getPdfObjectUrlForPreview(file.id, accessToken);
      setPreviewUrl(res.url);
      setPreviewTitle(file.name);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal membuka pratinjau PDF.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Preview Soal PDF Google Drive & Cache Offline
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Terhubung ke folder Google Drive soal ujian agar PDF dapat dipratinjau dan diunduh ke cache offline perangkat.
          </p>
        </div>

        {!accessToken && <GoogleSignInButton onClick={onSignIn} />}
      </div>

      {/* Folder Config */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700">
            ID Folder Google Drive Sumber Soal PDF
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={folderId}
              onChange={(e) => onChangeFolderId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleFetchFolder}
            disabled={loadingList || !accessToken}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`}
            />
            Muat Daftar PDF Drive
          </button>

          <button
            type="button"
            onClick={handleCacheAll}
            disabled={cachingAll || drivePdfs.length === 0 || !accessToken}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <CloudDownload className="h-3.5 w-3.5" />
            {cachingAll ? 'Menyimpan...' : 'Cache Semua untuk Offline'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMessage}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Split View: File List & Embedded PDF Preview */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          <div className="px-5 py-3.5 bg-slate-50 rounded-t-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              Dokumen PDF di Folder ({drivePdfs.length})
            </h3>
          </div>

          {drivePdfs.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              {accessToken
                ? 'Klik "Muat Daftar PDF Drive" untuk mengambil file PDF dari folder.'
                : 'Masuk dengan Google untuk melihat daftar PDF dari Google Drive Anda.'}
            </div>
          ) : (
            drivePdfs.map((file) => (
              <div
                key={file.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-600 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-mono">
                      {file.size
                        ? `${Math.round(Number(file.size) / 1024)} KB`
                        : 'PDF'}
                    </span>
                    <span aria-hidden="true">·</span>
                    {file.cachedOffline ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Tersedia Offline
                      </span>
                    ) : (
                      <span>Hanya Online</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePreview(file)}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  {accessToken && (
                    <button
                      type="button"
                      onClick={() => handleCachePdf(file)}
                      className="min-h-[36px] rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
                    >
                      Cache
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4">
          {previewUrl ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  Preview: {previewTitle}
                </p>
                <span className="text-xs text-slate-500">
                  Mode Proteksi Pratinjau
                </span>
              </div>
              <iframe
                title={previewTitle}
                src={`${previewUrl}#toolbar=0&navpanes=0`}
                className="h-[380px] sm:h-[520px] w-full rounded-lg border border-slate-200"
              />
            </div>
          ) : (
            <div className="flex h-[320px] sm:h-[520px] flex-col items-center justify-center text-center text-sm text-slate-500 px-4">
              <FileText className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">
                Belum ada PDF dipilih untuk pratinjau
              </p>
              <p className="mt-1 max-w-sm text-xs">
                Pilih salah satu file PDF dari folder Google Drive di sebelah kiri untuk mempratinjau dan menyimpannya ke cache offline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
