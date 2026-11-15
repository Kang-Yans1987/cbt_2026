import React, { useMemo, useState } from 'react';
import {
  FileCheck2,
  Printer,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import type {
  BeritaAcaraRecord,
  ExamRoom,
  ExamSessionSlot,
  ExamSubmission,
  ExamTimeSettings,
  ProctorSession,
  Student,
  SubjectConfig,
} from '../../types/exam';
import { SchoolLogo } from '../SchoolLogo';

interface BeritaAcaraTabProps {
  schoolName: string;
  schoolLogoUrl: string;
  examTimeSettings: ExamTimeSettings;
  subjects: SubjectConfig[];
  examSessions: ExamSessionSlot[];
  examRooms: ExamRoom[];
  students: Student[];
  submissions: ExamSubmission[];
  proctorSessions: ProctorSession[];
  beritaAcaraList: BeritaAcaraRecord[];
  onSaveBeritaAcaraList: (next: BeritaAcaraRecord[]) => void;
}

const ID_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export const BeritaAcaraTab: React.FC<BeritaAcaraTabProps> = ({
  schoolName,
  schoolLogoUrl,
  examTimeSettings,
  subjects,
  examSessions,
  examRooms,
  students,
  submissions,
  proctorSessions,
  beritaAcaraList,
  onSaveBeritaAcaraList,
}) => {
  const tzLabel = examTimeSettings.timezone || 'WIB';
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDayName = ID_DAYS[new Date().getDay()] || 'Senin';

  const [draft, setDraft] = useState<BeritaAcaraRecord>(() => {
    const firstRoom = examRooms[0]?.name || 'Ruang 01';
    const firstSesi = examSessions[0];
    const firstSubj = subjects[0];
    const expected = students.filter(
      (s) => s.room === firstRoom && (!firstSesi || s.session === firstSesi.name)
    ).length;

    return {
      id: `BA-${Date.now()}`,
      documentNumber: `BA/CBT/${new Date().getFullYear()}/001`,
      date: todayStr,
      dayName: todayDayName,
      startTime: firstSesi?.startTime || '07:30',
      endTime: firstSesi?.endTime || '09:30',
      subjectName: firstSubj?.name || 'Asesmen Kompetensi Minimum',
      sessionName: firstSesi?.name || 'Sesi 1 (07:30)',
      roomName: firstRoom,
      expectedCount: expected || students.length,
      presentCount: 0,
      absentCount: expected || 0,
      absentParticipantNumbers: '',
      incidentNotes:
        'Pelaksanaan ujian berjalan tertib, aman, dan lancar tanpa kendala berarti.',
      proctorName: firstSesi?.proctorName || 'Pengawas Ruang',
      proctorNip: '',
      principalName: 'Kepala Sekolah',
      principalNip: '',
      city: 'Banyuwangi',
      createdAt: new Date().toISOString(),
    };
  });

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const computedStats = useMemo(() => {
    const roomStudents = students.filter(
      (s) =>
        (!draft.roomName ||
          s.room.trim().toLowerCase() === draft.roomName.trim().toLowerCase()) &&
        (!draft.sessionName ||
          s.session.trim().toLowerCase() ===
            draft.sessionName.trim().toLowerCase())
    );
    const subj = subjects.find((s) => s.name === draft.subjectName);
    const studentNumSet = new Set(
      roomStudents.map((s) => s.participantNumber.trim().toUpperCase())
    );

    const presentNumbers = new Set<string>();
    submissions.forEach((sub) => {
      const pNum = sub.participantNumber.trim().toUpperCase();
      if (
        (studentNumSet.size === 0 || studentNumSet.has(pNum)) &&
        (!subj || sub.subjectId === subj.id)
      ) {
        presentNumbers.add(pNum);
      }
    });
    proctorSessions.forEach((ps) => {
      const pNum = ps.participantNumber.trim().toUpperCase();
      if (
        (studentNumSet.size === 0 || studentNumSet.has(pNum)) &&
        (!subj || ps.subjectId === subj.id)
      ) {
        presentNumbers.add(pNum);
      }
    });

    const absentList = roomStudents
      .filter((s) => !presentNumbers.has(s.participantNumber.trim().toUpperCase()))
      .map((s) => `${s.participantNumber} (${s.name})`);

    return {
      expected: roomStudents.length,
      present: presentNumbers.size,
      absent: Math.max(0, roomStudents.length - presentNumbers.size),
      absentStr: absentList.join(', '),
    };
  }, [
    students,
    submissions,
    proctorSessions,
    subjects,
    draft.roomName,
    draft.sessionName,
    draft.subjectName,
  ]);

  const handleAutoFillAttendance = () => {
    setDraft((prev) => ({
      ...prev,
      expectedCount: computedStats.expected,
      presentCount: computedStats.present,
      absentCount: computedStats.absent,
      absentParticipantNumbers: computedStats.absentStr || '-',
    }));
  };

  const handleSaveToArchive = () => {
    const clean: BeritaAcaraRecord = {
      ...draft,
      id: draft.id || `BA-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const exists = beritaAcaraList.some((b) => b.id === clean.id);
    const next = exists
      ? beritaAcaraList.map((b) => (b.id === clean.id ? clean : b))
      : [clean, ...beritaAcaraList];
    onSaveBeritaAcaraList(next);
    setSavedNotice(`Berita Acara "${clean.documentNumber}" tersimpan di arsip.`);
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const formattedDateIndo = useMemo(() => {
    const d = new Date(draft.date);
    if (Number.isNaN(d.getTime())) return draft.date;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [draft.date]);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Berita Acara Pelaksanaan Ujian
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Buat, hitung kehadiran otomatis dari data peserta/hasil, simpan arsip, dan cetak Berita Acara resmi kertas A4.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutoFillAttendance}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Hitung Kehadiran Otomatis
          </button>
          <button
            type="button"
            onClick={handleSaveToArchive}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap shrink-0"
          >
            <Save className="h-3.5 w-3.5" />
            Simpan Arsip
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak Berita Acara (A4)
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="no-print rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          {savedNotice}
        </div>
      )}

      {/* Form Input (Hidden on Print) */}
      <section className="no-print rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          Data Isian Berita Acara Pelaksanaan
        </h3>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Nomor Berita Acara
            </label>
            <input
              type="text"
              value={draft.documentNumber}
              onChange={(e) =>
                setDraft({ ...draft, documentNumber: e.target.value })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Hari
            </label>
            <input
              type="text"
              value={draft.dayName}
              onChange={(e) => setDraft({ ...draft, dayName: e.target.value })}
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Tanggal Pelaksanaan
            </label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => {
                const val = e.target.value;
                const d = new Date(val);
                const day = !Number.isNaN(d.getTime())
                  ? ID_DAYS[d.getDay()] || draft.dayName
                  : draft.dayName;
                setDraft({ ...draft, date: val, dayName: day });
              }}
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Jam Mulai
              </label>
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) =>
                  setDraft({ ...draft, startTime: e.target.value })
                }
                className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Jam Selesai
              </label>
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) =>
                  setDraft({ ...draft, endTime: e.target.value })
                }
                className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Mata Pelajaran
            </label>
            <select
              value={draft.subjectName}
              onChange={(e) =>
                setDraft({ ...draft, subjectName: e.target.value })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Sesi Ujian
            </label>
            <select
              value={draft.sessionName}
              onChange={(e) =>
                setDraft({ ...draft, sessionName: e.target.value })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm"
            >
              {examSessions.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Ruang Ujian
            </label>
            <select
              value={draft.roomName}
              onChange={(e) => setDraft({ ...draft, roomName: e.target.value })}
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm"
            >
              {examRooms.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Peserta Seharusnya
            </label>
            <input
              type="number"
              min={0}
              value={draft.expectedCount}
              onChange={(e) => {
                const expected = Math.max(0, Number(e.target.value) || 0);
                setDraft({
                  ...draft,
                  expectedCount: expected,
                  absentCount: Math.max(0, expected - draft.presentCount),
                });
              }}
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Peserta Hadir
            </label>
            <input
              type="number"
              min={0}
              value={draft.presentCount}
              onChange={(e) => {
                const present = Math.max(0, Number(e.target.value) || 0);
                setDraft({
                  ...draft,
                  presentCount: present,
                  absentCount: Math.max(0, draft.expectedCount - present),
                });
              }}
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Tidak Hadir
            </label>
            <input
              type="number"
              min={0}
              value={draft.absentCount}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  absentCount: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Kota Penetapan
            </label>
            <input
              type="text"
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Nomor Peserta yang Tidak Hadir
            </label>
            <input
              type="text"
              value={draft.absentParticipantNumbers}
              onChange={(e) =>
                setDraft({ ...draft, absentParticipantNumbers: e.target.value })
              }
              placeholder="Kosongkan / isi '-' jika hadir semua"
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">
              Catatan Kejadian Selama Ujian
            </label>
            <input
              type="text"
              value={draft.incidentNotes}
              onChange={(e) =>
                setDraft({ ...draft, incidentNotes: e.target.value })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Nama Pengawas Ruang
            </label>
            <input
              type="text"
              value={draft.proctorName}
              onChange={(e) =>
                setDraft({ ...draft, proctorName: e.target.value })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              NIP Pengawas (Opsional)
            </label>
            <input
              type="text"
              value={draft.proctorNip || ''}
              onChange={(e) =>
                setDraft({ ...draft, proctorNip: e.target.value })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Nama Kepala Sekolah
            </label>
            <input
              type="text"
              value={draft.principalName}
              onChange={(e) =>
                setDraft({ ...draft, principalName: e.target.value })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              NIP Kepala Sekolah (Opsional)
            </label>
            <input
              type="text"
              value={draft.principalNip || ''}
              onChange={(e) =>
                setDraft({ ...draft, principalNip: e.target.value })
              }
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* Official A4 Berita Acara Document */}
      <article className="print-page rounded-xl border border-slate-200 bg-white p-6 sm:p-10 text-slate-900 space-y-5">
        <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-4">
          <SchoolLogo logoUrl={schoolLogoUrl} schoolName={schoolName} size="lg" />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              PANITIA PENYELENGGARA ASESMEN / UJIAN SEKOLAH
            </p>
            <h3 className="text-lg sm:text-xl font-bold uppercase text-slate-900">
              {schoolName}
            </h3>
            <p className="text-xs text-slate-600">
              BERITA ACARA PELAKSANAAN UJIAN BERBASIS KOMPUTER (DUTAWANGICBT)
            </p>
          </div>
          <div className="hidden sm:block text-right font-mono text-xs text-slate-600">
            <p>Nomor:</p>
            <p className="font-bold text-slate-900">{draft.documentNumber}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-justify">
          Pada hari ini <strong>{draft.dayName}</strong> tanggal{' '}
          <strong>{formattedDateIndo}</strong>, bertempat di{' '}
          <strong>{schoolName}</strong> ({draft.roomName}), telah diselenggarakan
          kegiatan ujian berbasis komputer dari pukul{' '}
          <strong className="font-mono">{draft.startTime}</strong> sampai dengan pukul{' '}
          <strong className="font-mono">
            {draft.endTime} {tzLabel}
          </strong>{' '}
          dengan rincian sebagai berikut:
        </p>

        <table className="w-full text-sm border-collapse border border-slate-300">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-56 bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-r border-slate-200">
                Nomor Berita Acara
              </td>
              <td className="px-3.5 py-2 font-mono font-semibold">
                {draft.documentNumber}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-r border-slate-200">
                Mata Pelajaran / Paket
              </td>
              <td className="px-3.5 py-2 font-semibold">{draft.subjectName}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-r border-slate-200">
                Ruang &amp; Sesi Pelaksanaan
              </td>
              <td className="px-3.5 py-2">
                {draft.roomName} · {draft.sessionName}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-r border-slate-200">
                Jumlah Peserta Seharusnya
              </td>
              <td className="px-3.5 py-2 font-mono font-bold tabular-nums">
                {draft.expectedCount} orang
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-r border-slate-200">
                Jumlah Peserta Hadir
              </td>
              <td className="px-3.5 py-2 font-mono font-bold text-emerald-700 tabular-nums">
                {draft.presentCount} orang
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-r border-slate-200">
                Jumlah Peserta Tidak Hadir
              </td>
              <td className="px-3.5 py-2 font-mono font-bold text-red-700 tabular-nums">
                {draft.absentCount} orang
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-r border-slate-200">
                No. Peserta Tidak Hadir
              </td>
              <td className="px-3.5 py-2 text-xs">
                {draft.absentParticipantNumbers || '-'}
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 px-3.5 py-2 font-medium text-slate-700 border-r border-slate-200">
                Catatan Kejadian Ujian
              </td>
              <td className="px-3.5 py-2 text-xs leading-relaxed">
                {draft.incidentNotes || '-'}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm leading-relaxed">
          Demikian berita acara pelaksanaan ujian ini dibuat dengan sesungguhnya
          untuk dapat dipergunakan sebagaimana mestinya.
        </p>

        <div className="print-break-inside-avoid grid grid-cols-2 gap-8 pt-6 text-xs sm:text-sm">
          <div>
            <p>Mengetahui,</p>
            <p className="font-semibold">Kepala {schoolName}</p>
            <div className="h-16" />
            <p className="font-bold underline">{draft.principalName}</p>
            {draft.principalNip && (
              <p className="font-mono text-xs text-slate-600">
                NIP. {draft.principalNip}
              </p>
            )}
          </div>
          <div className="text-right">
            <p>
              {draft.city}, {formattedDateIndo}
            </p>
            <p className="font-semibold">Pengawas Ruang / Proktor</p>
            <div className="h-16" />
            <p className="font-bold underline">{draft.proctorName}</p>
            {draft.proctorNip && (
              <p className="font-mono text-xs text-slate-600">
                NIP. {draft.proctorNip}
              </p>
            )}
          </div>
        </div>
      </article>

      {/* Saved Berita Acara Archive (Hidden on Print) */}
      {beritaAcaraList.length > 0 && (
        <section className="no-print rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Arsip Berita Acara Tersimpan ({beritaAcaraList.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {beritaAcaraList.map((rec) => (
              <div
                key={rec.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    <span className="font-mono text-blue-700 mr-2">
                      {rec.documentNumber}
                    </span>
                    {rec.subjectName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rec.dayName}, {rec.date} · {rec.roomName} ({rec.sessionName}) · Hadir{' '}
                    {rec.presentCount}/{rec.expectedCount}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(rec)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Muat ke Dokumen
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSaveBeritaAcaraList(
                        beritaAcaraList.filter((item) => item.id !== rec.id)
                      )
                    }
                    className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                    aria-label="Hapus arsip berita acara"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
