import React, { useState } from 'react';
import {
  AlertTriangle,
  DatabaseBackup,
  Eraser,
  RotateCcw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

interface ResetDataTabProps {
  questionCount: number;
  studentCount: number;
  submissionCount: number;
  proctorSessionCount: number;
  cachedPdfCount: number;
  onResetSubmissions: () => Promise<void>;
  onResetProctorSessions: () => Promise<void>;
  onResetStudentsToDefault: () => Promise<void>;
  onFactoryReset: () => Promise<void>;
}

type ResetActionType =
  | null
  | 'submissions'
  | 'proctor'
  | 'students'
  | 'factory';

export const ResetDataTab: React.FC<ResetDataTabProps> = ({
  questionCount,
  studentCount,
  submissionCount,
  proctorSessionCount,
  cachedPdfCount,
  onResetSubmissions,
  onResetProctorSessions,
  onResetStudentsToDefault,
  onFactoryReset,
}) => {
  const [confirmType, setConfirmType] = useState<ResetActionType>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const executeReset = async () => {
    if (!confirmType) return;
    const action = confirmType;
    setConfirmType(null);
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      if (action === 'submissions') {
        await onResetSubmissions();
        setStatusMsg(
          'Seluruh data hasil ujian & nilai siswa berhasil dibersihkan.'
        );
      } else if (action === 'proctor') {
        await onResetProctorSessions();
        setStatusMsg(
          'Seluruh sesi pengawasan aktif & log pelanggaran berhasil direset.'
        );
      } else if (action === 'students') {
        await onResetStudentsToDefault();
        setStatusMsg(
          'Daftar peserta dikembalikan ke data awal bawaan aplikasi.'
        );
      } else if (action === 'factory') {
        await onFactoryReset();
        setStatusMsg(
          'Reset total selesai. Seluruh bank soal (termasuk contoh soal bergambar), logo, sesi, peserta, dan cache telah dikembalikan ke pengaturan awal.'
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menjalankan reset data.'
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmConfig: Record<
    Exclude<ResetActionType, null>,
    { title: string; description: string; label: string }
  > = {
    submissions: {
      title: 'Hapus Semua Data Hasil & Nilai Ujian?',
      description: `Sebanyak ${submissionCount} rekaman nilai siswa di aplikasi dan server akan dihapus bersih. Bank soal, mata pelajaran, dan daftar peserta tetap aman.`,
      label: 'Ya, Hapus Hasil Ujian',
    },
    proctor: {
      title: 'Reset Sesi Aktif & Catatan Pelanggaran?',
      description: `Sebanyak ${proctorSessionCount} sesi pengawas aktif dan cache pengerjaan sementara di perangkat akan dibersihkan agar peserta dapat memulai sesi bersih.`,
      label: 'Ya, Reset Sesi Aktif',
    },
    students: {
      title: 'Kembalikan Daftar Peserta ke Awal?',
      description: `Daftar ${studentCount} peserta saat ini akan diganti kembali dengan daftar peserta simulasi awal. Pastikan Anda sudah mencadangkan data jika diperlukan.`,
      label: 'Ya, Reset Daftar Peserta',
    },
    factory: {
      title: 'Reset Total ke Pengaturan Awal Aplikasi?',
      description:
        'Semua perubahan lokal (soal, logo sekolah, sesi, peserta, hasil ujian, dan cache PDF offline) akan dikembalikan ke data awal bawaan termasuk contoh soal bergambar. Data di Google Spreadsheet Anda tidak dihapus kecuali Anda menyinkronkan ulang.',
      label: 'Ya, Reset Total Sekarang',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-red-600" />
          Menu Reset & Pembersihan Data Ujian
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Bersihkan data hasil uji coba, reset sesi pengawas aktif, atau kembalikan seluruh aplikasi ke pengaturan awal sebelum pelaksanaan ujian resmi.
        </p>
      </div>

      {/* Current Data Summary */}
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs text-slate-500">Total Butir Soal</dt>
          <dd className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {questionCount}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs text-slate-500">Peserta Terdaftar</dt>
          <dd className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {studentCount}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs text-slate-500">Hasil Nilai Tersimpan</dt>
          <dd className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {submissionCount}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs text-slate-500">Cache PDF Offline</dt>
          <dd className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {cachedPdfCount}
          </dd>
        </div>
      </dl>

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

      <div className="grid gap-4 md:grid-cols-2">
        {/* Reset 1: Submissions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Eraser className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Reset Hasil & Nilai Ujian
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Menghapus seluruh riwayat jawaban & nilai siswa (lokal maupun server runtime). Bank soal, pengaturan mapel, logo, dan daftar peserta tetap dipertahankan.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmType('submissions')}
            className="min-h-[40px] w-full sm:w-auto self-start rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Hapus Data Hasil Ujian ({submissionCount})
          </button>
        </div>

        {/* Reset 2: Proctor Sessions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Reset Sesi Aktif & Pengawasan
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Membersihkan daftar peserta aktif di monitor pengawas serta sisa draf pengerjaan sementara di perangkat lokal sebelum sesi ujian baru dimulai.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmType('proctor')}
            className="min-h-[40px] w-full sm:w-auto self-start rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100 disabled:opacity-50"
          >
            Reset Sesi Pengawas ({proctorSessionCount})
          </button>
        </div>

        {/* Reset 3: Student Roster */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Reset Daftar Peserta ke Bawaan
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Mengembalikan daftar peserta ke 6 data peserta bawaan aplikasi. Berguna apabila Anda ingin mengulang proses import kolektif peserta.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmType('students')}
            className="min-h-[40px] w-full sm:w-auto self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Reset Daftar Peserta ({studentCount})
          </button>
        </div>

        {/* Reset 4: Factory Reset */}
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <DatabaseBackup className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-red-950">
                Reset Total (Factory Reset)
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-red-900/80">
              Mengembalikan seluruh aplikasi (bank soal + contoh soal bergambar, mapel, logo, jadwal sesi, peserta, nilai, dan cache offline) ke kondisi awal. Data Google Sheets tidak ikut terhapus.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmType('factory')}
            className="inline-flex min-h-[40px] w-full sm:w-auto self-start items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Reset Total Pengaturan Awal
          </button>
        </div>
      </div>

      {confirmType && (
        <ConfirmDialog
          open={Boolean(confirmType)}
          title={confirmConfig[confirmType].title}
          description={confirmConfig[confirmType].description}
          confirmLabel={confirmConfig[confirmType].label}
          tone="danger"
          loading={busy}
          onConfirm={executeReset}
          onCancel={() => setConfirmType(null)}
        />
      )}
    </div>
  );
};
