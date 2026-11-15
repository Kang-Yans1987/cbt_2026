import React, { useState } from 'react';
import {
  CalendarDays,
  Eye,
  EyeOff,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type {
  ExamRoom,
  ExamScheduleItem,
  ExamSessionSlot,
  ExamTimeSettings,
  SubjectConfig,
} from '../../types/exam';
import { SchoolLogo } from '../SchoolLogo';

interface ScheduleManagerTabProps {
  schoolName: string;
  schoolLogoUrl: string;
  examTimeSettings: ExamTimeSettings;
  examSchedules: ExamScheduleItem[];
  subjects: SubjectConfig[];
  examSessions: ExamSessionSlot[];
  examRooms: ExamRoom[];
  onSaveExamSchedules: (next: ExamScheduleItem[]) => void;
}

export const ScheduleManagerTab: React.FC<ScheduleManagerTabProps> = ({
  schoolName,
  schoolLogoUrl,
  examTimeSettings,
  examSchedules,
  subjects,
  examSessions,
  examRooms,
  onSaveExamSchedules,
}) => {
  const [editing, setEditing] = useState<ExamScheduleItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const tzLabel = examTimeSettings.timezone || 'WIB';

  const handleNewSchedule = () => {
    const defSubj = subjects[0];
    const defSesi = examSessions[0];
    setFormError(null);
    setEditing({
      id: `SCH-${Date.now()}`,
      dayLabel: `Hari ke-${examSchedules.length + 1}`,
      date: new Date().toISOString().slice(0, 10),
      startTime: defSesi?.startTime || '07:30',
      endTime: defSesi?.endTime || '09:00',
      subjectId: defSubj?.id || '',
      subjectName: defSubj?.name || '',
      sessionName: defSesi?.name || 'Sesi 1 (07:30)',
      targetClass: 'Semua Kelas',
      roomSummary: examRooms.map((r) => r.name).join(', ') || 'Ruang 01',
      notes: 'Hadir 15 menit sebelum ujian dimulai.',
    });
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.subjectName.trim() || !editing.dayLabel.trim()) {
      setFormError('Hari pelaksanaan dan nama mata pelajaran wajib diisi.');
      return;
    }
    const clean: ExamScheduleItem = {
      ...editing,
      dayLabel: editing.dayLabel.trim(),
      subjectName: editing.subjectName.trim(),
      sessionName: editing.sessionName.trim() || 'Sesi 1',
      targetClass: editing.targetClass.trim() || 'Semua Peserta',
      roomSummary: editing.roomSummary.trim() || 'Ruang 01',
      notes: (editing.notes || '').trim(),
    };
    const exists = examSchedules.some((s) => s.id === clean.id);
    const next = exists
      ? examSchedules.map((s) => (s.id === clean.id ? clean : s))
      : [...examSchedules, clean];
    onSaveExamSchedules(next);
    setEditing(null);
    setFormError(null);
  };

  const handleDeleteSchedule = (id: string) => {
    onSaveExamSchedules(examSchedules.filter((s) => s.id !== id));
  };

  const handleSyncFromSubjects = () => {
    if (subjects.length === 0) return;
    const roomsStr =
      examRooms.map((r) => r.name).join(', ') ||
      examSessions[0]?.defaultRoom ||
      'Ruang 01';
    const generated: ExamScheduleItem[] = subjects.map((subj, idx) => {
      const sesi = examSessions[idx % Math.max(1, examSessions.length)];
      const startDate = subj.startTime
        ? subj.startTime.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      return {
        id: `SCH-AUTO-${subj.id}`,
        dayLabel: `Hari ke-${idx + 1}`,
        date: startDate,
        startTime: sesi?.startTime || '07:30',
        endTime: sesi?.endTime || '09:30',
        subjectId: subj.id,
        subjectName: subj.name,
        sessionName: sesi?.name || 'Sesi 1 (07:30)',
        targetClass: 'Seluruh Peserta Terdaftar',
        roomSummary: roomsStr,
        notes: `Durasi ${subj.durationMinutes} menit`,
      };
    });
    onSaveExamSchedules(generated);
    setSyncNotice(
      `${generated.length} jadwal berhasil disusun otomatis dari data Mata Pelajaran, Sesi, dan Ruang.`
    );
    setTimeout(() => setSyncNotice(null), 4500);
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Jadwal Pelaksanaan Ujian ({examSchedules.length} Jadwal)
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Susun jadwal resmi pelaksanaan per hari, tanggal, jam ({tzLabel}), sesi, dan ruang ujian — tampil di Portal Siswa &amp; siap cetak A4.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncFromSubjects}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sinkron dari Mapel &amp; Sesi
          </button>
          <button
            type="button"
            onClick={() => setPrintMode((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            {printMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {printMode ? 'Mode Kelola' : 'Preview Cetak A4'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak Jadwal A4
          </button>
          <button
            type="button"
            onClick={handleNewSchedule}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Jadwal
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="no-print rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          {syncNotice}
        </div>
      )}

      {editing && !printMode && (
        <form
          onSubmit={handleSaveSchedule}
          className="no-print rounded-xl border border-blue-200 bg-white p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900">
            {examSchedules.some((s) => s.id === editing.id)
              ? 'Edit Baris Jadwal Pelaksanaan'
              : 'Tambah Jadwal Pelaksanaan Ujian'}
          </h3>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Hari / Gelombang
              </label>
              <input
                type="text"
                required
                value={editing.dayLabel}
                onChange={(e) =>
                  setEditing({ ...editing, dayLabel: e.target.value })
                }
                placeholder="Hari ke-1 (Senin)"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Tanggal
              </label>
              <input
                type="date"
                value={editing.date}
                onChange={(e) =>
                  setEditing({ ...editing, date: e.target.value })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Jam Mulai ({tzLabel})
              </label>
              <input
                type="time"
                value={editing.startTime}
                onChange={(e) =>
                  setEditing({ ...editing, startTime: e.target.value })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Jam Selesai ({tzLabel})
              </label>
              <input
                type="time"
                value={editing.endTime}
                onChange={(e) =>
                  setEditing({ ...editing, endTime: e.target.value })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Mata Pelajaran
              </label>
              <input
                type="text"
                list="schedule-subjects-list"
                required
                value={editing.subjectName}
                onChange={(e) => {
                  const found = subjects.find((s) => s.name === e.target.value);
                  setEditing({
                    ...editing,
                    subjectId: found?.id || editing.subjectId,
                    subjectName: e.target.value,
                  });
                }}
                placeholder="Nama Mata Pelajaran"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <datalist id="schedule-subjects-list">
                {subjects.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Sesi Ujian
              </label>
              <select
                value={editing.sessionName}
                onChange={(e) =>
                  setEditing({ ...editing, sessionName: e.target.value })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {examSessions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
                {!examSessions.some((s) => s.name === editing.sessionName) && (
                  <option value={editing.sessionName}>{editing.sessionName}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Kelas / Peserta Target
              </label>
              <input
                type="text"
                value={editing.targetClass}
                onChange={(e) =>
                  setEditing({ ...editing, targetClass: e.target.value })
                }
                placeholder="Kelas VI-A & VI-B"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Ruang Pelaksanaan
              </label>
              <input
                type="text"
                value={editing.roomSummary}
                onChange={(e) =>
                  setEditing({ ...editing, roomSummary: e.target.value })
                }
                placeholder="Ruang 01, Ruang 02"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Keterangan / Catatan (Opsional)
              </label>
              <input
                type="text"
                value={editing.notes || ''}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
                placeholder="Hadir 15 menit sebelum dimulai"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="min-h-[38px] rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[38px] rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Simpan Jadwal
            </button>
          </div>
        </form>
      )}

      {/* Printable A4 Schedule */}
      <div className="print-page rounded-xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5">
        <div
          className={`${
            printMode ? 'flex' : 'hidden print:flex'
          } items-start justify-between gap-4 border-b-2 border-slate-800 pb-4`}
        >
          <div className="flex items-start gap-3">
            <SchoolLogo logoUrl={schoolLogoUrl} schoolName={schoolName} size="lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                {schoolName}
              </p>
              <h3 className="text-lg font-bold text-slate-900">
                Jadwal Pelaksanaan Asesmen / Ujian Berbasis Komputer
              </h3>
              <p className="text-xs text-slate-600">
                Zona Waktu: {tzLabel} · Dicetak pada{' '}
                {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-300 bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Hari &amp; Tanggal</th>
                <th className="py-2.5 px-3">Waktu ({tzLabel})</th>
                <th className="py-2.5 px-3">Mata Pelajaran</th>
                <th className="py-2.5 px-3">Sesi &amp; Kelas</th>
                <th className="py-2.5 px-3">Ruang</th>
                <th className="py-2.5 px-3">Keterangan</th>
                {!printMode && (
                  <th className="no-print py-2.5 px-3 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {examSchedules.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900">{item.dayLabel}</p>
                    <p className="font-mono text-xs text-slate-500">{item.date}</p>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
                    {item.startTime} – {item.endTime}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {item.subjectName}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="text-slate-800">{item.sessionName}</p>
                    <p className="text-[11px] text-slate-500">{item.targetClass}</p>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-700">
                    {item.roomSummary}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-600">
                    {item.notes || '-'}
                  </td>
                  {!printMode && (
                    <td className="no-print py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setEditing(item);
                          }}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="text-red-600 hover:text-red-800"
                          aria-label={`Hapus jadwal ${item.subjectName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {examSchedules.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-xs sm:text-sm text-slate-500"
                  >
                    Belum ada jadwal pelaksanaan. Klik &ldquo;Tambah Jadwal&rdquo; atau &ldquo;Sinkron dari Mapel &amp; Sesi&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          className={`${
            printMode ? 'grid' : 'hidden print:grid'
          } print-break-inside-avoid mt-8 grid-cols-2 gap-8 pt-6 text-xs text-slate-700`}
        >
          <div>
            <p>Mengetahui,</p>
            <p className="font-semibold text-slate-900">Kepala {schoolName}</p>
            <div className="h-16" />
            <p className="font-semibold underline text-slate-900">
              ....................................................
            </p>
          </div>
          <div className="text-right">
            <p>Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
            <p className="font-semibold text-slate-900">Panitia Penyelenggara Ujian</p>
            <div className="h-16" />
            <p className="font-semibold underline text-slate-900">
              ....................................................
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
