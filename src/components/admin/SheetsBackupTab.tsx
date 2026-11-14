import React, { useState } from 'react';
import {
  Database,
  Download,
  Lock,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type {
  EncryptedEnvelope,
  ExamPackageData,
  ExamSubmission,
} from '../../types/exam';
import { decryptPayload, encryptPayload } from '../../utils/crypto';
import type { SpreadsheetMetadata } from '../../services/sheetsService';
import { GoogleSignInButton } from '../GoogleSignInButton';
import { ConfirmDialog } from '../ConfirmDialog';

interface SheetsBackupTabProps {
  spreadsheetId: string;
  onChangeSpreadsheetId: (id: string) => void;
  accessToken: string | null;
  userEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  sheetMeta: SpreadsheetMetadata | null;
  examPackage: ExamPackageData;
  submissions: ExamSubmission[];
  onPullFromSheets: () => Promise<void>;
  onPushToSheets: () => Promise<void>;
  onPublishEncryptedPackage: () => Promise<void>;
  onRestoreData: (pkg: ExamPackageData, subs: ExamSubmission[]) => void;
}

export const SheetsBackupTab: React.FC<SheetsBackupTabProps> = ({
  spreadsheetId,
  onChangeSpreadsheetId,
  accessToken,
  userEmail,
  onSignIn,
  onSignOut,
  sheetMeta,
  examPackage,
  submissions,
  onPullFromSheets,
  onPushToSheets,
  onPublishEncryptedPackage,
  onRestoreData,
}) => {
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backupPassphrase, setBackupPassphrase] = useState('Aksara2026!');
  const [confirmAction, setConfirmAction] = useState<
    null | 'push_sheets' | 'pull_sheets' | 'restore_backup'
  >(null);
  const [pendingRestoreBundle, setPendingRestoreBundle] = useState<{
    examPackage: ExamPackageData;
    submissions: ExamSubmission[];
  } | null>(null);

  const runAsync = async (fn: () => Promise<void>, successText: string) => {
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await fn();
      setStatusMsg(successText);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Terjadi kesalahan operasi.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadEncryptedBackup = async () => {
    setErrorMsg(null);
    try {
      const bundle = {
        examPackage,
        submissions,
        exportedAt: new Date().toISOString(),
      };
      const envelope = await encryptPayload(
        bundle,
        backupPassphrase || 'Aksara2026!'
      );
      const blob = new Blob([JSON.stringify(envelope, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_Terenkripsi_AksaraCBT_${new Date()
        .toISOString()
        .slice(0, 10)}.cbtenc`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg(
        'Backup terenkripsi AES-256-GCM (.cbtenc) berhasil diunduh.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal mengenkripsi dan mengunduh file backup.'
      );
    }
  };

  const handleDownloadJsonBackup = () => {
    setErrorMsg(null);
    try {
      const bundle = {
        examPackage,
        submissions,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_AksaraCBT_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg('Backup JSON lengkap berhasil diunduh.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal membuat file backup JSON.'
      );
    }
  };

  const handleRestoreFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as
        | EncryptedEnvelope
        | { examPackage: ExamPackageData; submissions: ExamSubmission[] };

      let candidate: {
        examPackage: ExamPackageData;
        submissions: ExamSubmission[];
      };

      if ('algorithm' in parsed && parsed.algorithm === 'AES-256-GCM') {
        candidate = await decryptPayload<{
          examPackage: ExamPackageData;
          submissions: ExamSubmission[];
        }>(parsed, backupPassphrase || 'Aksara2026!');
      } else if ('examPackage' in parsed) {
        candidate = parsed;
      } else {
        throw new Error('Format file backup tidak dikenali (.cbtenc / .json).');
      }

      if (
        !candidate.examPackage ||
        !Array.isArray(candidate.examPackage.questions) ||
        !Array.isArray(candidate.examPackage.subjects)
      ) {
        throw new Error(
          'Struktur paket ujian di dalam file backup tidak lengkap atau rusak.'
        );
      }

      setPendingRestoreBundle(candidate);
      setConfirmAction('restore_backup');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal membaca atau mendekripsi file backup. Periksa passphrase.'
      );
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Database Google Sheets, Enkripsi Vault & Backup/Restore
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Kelola sinkronisasi dua arah ke Google Spreadsheet sekolah, publikasikan paket soal terenkripsi AES-256-GCM untuk mode offline, dan buat cadangan data.
        </p>
      </div>

      {statusMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Google Sheets Database Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Koneksi Google Spreadsheet
              </h3>
              <p className="text-xs text-slate-500">
                {userEmail
                  ? `Terhubung sebagai ${userEmail}`
                  : 'Belum masuk akun Google Workspace'}
              </p>
            </div>
          </div>

          {!accessToken ? (
            <GoogleSignInButton onClick={onSignIn} />
          ) : (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Putuskan Akun Google
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              ID Google Spreadsheet Database
            </label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => onChangeSpreadsheetId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-xs text-slate-900"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
            <p className="font-semibold text-slate-800">
              {sheetMeta ? sheetMeta.title : 'Metadata Spreadsheet'}
            </p>
            <p className="mt-0.5 text-slate-600">
              {sheetMeta
                ? `Tab terdeteksi: ${sheetMeta.sheetNames.join(', ')}`
                : 'Klik Tarik Data atau Sinkronkan untuk memeriksa tab spreadsheet.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            disabled={!accessToken || busy}
            onClick={() => setConfirmAction('pull_sheets')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tarik Data dari Spreadsheet
          </button>

          <button
            type="button"
            disabled={!accessToken || busy}
            onClick={() => setConfirmAction('push_sheets')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            Simpan & Sinkronkan ke Spreadsheet
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runAsync(
                onPublishEncryptedPackage,
                'Paket ujian terenkripsi AES-256-GCM berhasil dipublikasikan ke server & cache offline.'
              )
            }
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Publikasikan Paket Offline Terenkripsi
          </button>
        </div>
      </section>

      {/* Backup & Restore Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Backup & Restore Terenkripsi (AES-256-GCM)
            </h3>
            <p className="text-xs text-slate-500">
              Amankan soal, pengaturan, daftar peserta, dan hasil nilai dengan enkripsi tingkat lanjut sebelum diunduh atau dipulihkan.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Passphrase Enkripsi Backup (.cbtenc)
            </label>
            <input
              type="text"
              value={backupPassphrase}
              onChange={(e) => setBackupPassphrase(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm"
            />
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            <button
              type="button"
              onClick={handleDownloadEncryptedBackup}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Backup Terenkripsi (.cbtenc)
            </button>

            <button
              type="button"
              onClick={handleDownloadJsonBackup}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Backup JSON
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label className="block text-xs font-medium text-slate-700 mb-2">
            Restore Data dari File Backup (.cbtenc atau .json)
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
            <Upload className="h-4 w-4 text-slate-500" />
            <span>Pilih File Backup untuk Dipulihkan...</span>
            <input
              type="file"
              accept=".cbtenc,.json,application/json"
              onChange={handleRestoreFileChange}
              className="hidden"
            />
          </label>
        </div>
      </section>

      {/* Mandatory Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmAction === 'push_sheets'}
        title="Simpan & Timpa Data ke Google Spreadsheet?"
        description={`Tindakan ini akan menginisialisasi tab (Soal, Pengaturan_Ujian, Peserta, Hasil_Ujian) dan memperbarui isi spreadsheet ID ${spreadsheetId} dengan data lokal saat ini.`}
        confirmLabel="Ya, Sinkronkan ke Sheets"
        loading={busy}
        onConfirm={() => {
          setConfirmAction(null);
          runAsync(
            onPushToSheets,
            'Seluruh soal, pengaturan, peserta, dan hasil ujian berhasil disinkronkan ke Google Spreadsheet.'
          );
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'pull_sheets'}
        title="Tarik Data dari Google Spreadsheet?"
        description={`Data soal, pengaturan, peserta, dan nilai di aplikasi akan dimuat ulang dari spreadsheet ID ${spreadsheetId}.`}
        confirmLabel="Ya, Muat dari Sheets"
        loading={busy}
        onConfirm={() => {
          setConfirmAction(null);
          runAsync(
            onPullFromSheets,
            'Data terbaru berhasil ditarik dari Google Spreadsheet dan dienkripsi ke cache offline.'
          );
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'restore_backup'}
        title="Pulihkan Data dari File Backup?"
        description={`File backup berisi ${pendingRestoreBundle?.examPackage.questions.length || 0} soal dan ${pendingRestoreBundle?.submissions.length || 0} hasil ujian. Data aktif saat ini akan digantikan oleh data backup.`}
        confirmLabel="Ya, Pulihkan Data"
        tone="danger"
        onConfirm={() => {
          if (pendingRestoreBundle) {
            onRestoreData(
              pendingRestoreBundle.examPackage,
              pendingRestoreBundle.submissions || []
            );
            setStatusMsg('Data berhasil dipulihkan dari file backup.');
          }
          setPendingRestoreBundle(null);
          setConfirmAction(null);
        }}
        onCancel={() => {
          setPendingRestoreBundle(null);
          setConfirmAction(null);
        }}
      />
    </div>
  );
};
