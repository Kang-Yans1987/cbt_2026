import React, { useMemo, useState } from 'react';
import { Download, Eye, Printer, X } from 'lucide-react';
import type {
  ExamRoom,
  ExamScheduleItem,
  ExamSubmission,
  ExamTimeSettings,
  ProctorMappingEntry,
  Student,
  SubjectConfig,
} from '../../types/exam';
import { SchoolLogo } from '../SchoolLogo';

type PrintCenterMode = 'cards' | 'recap' | 'schedule' | 'proctor_map' | 'rooms';

interface PrintCenterTabProps {
  schoolName: string;
  schoolLogoUrl: string;
  subjects: SubjectConfig[];
  students: Student[];
  submissions: ExamSubmission[];
  examRooms?: ExamRoom[];
  proctorMappings?: ProctorMappingEntry[];
  examSchedules?: ExamScheduleItem[];
  examTimeSettings?: ExamTimeSettings;
}

export const PrintCenterTab: React.FC<PrintCenterTabProps> = ({
  schoolName,
  schoolLogoUrl,
  subjects,
  students,
  submissions,
  examRooms = [],
  proctorMappings = [],
  examSchedules = [],
  examTimeSettings,
}) => {
  const [mode, setMode] = useState<PrintCenterMode>('cards');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );

  // Preview Sebelum Cetak state & customization options
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showSignatureBlock, setShowSignatureBlock] = useState(true);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(true);
  const [showViolationsCol, setShowViolationsCol] = useState(true);
  const [principalName, setPrincipalName] = useState(
    'Dr. H. Rahmat Hidayat, M.Pd'
  );
  const [proctorTeacherName, setProctorTeacherName] = useState(
    'Pengawas / Panitia Ujian'
  );
  const [cityDate, setCityDate] = useState(
    `Indonesia, ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`
  );

  const tzLabel = examTimeSettings?.timezone || 'WIB';

  const effectiveSubjectId = subjects.some((s) => s.id === selectedSubjectId)
    ? selectedSubjectId
    : subjects[0]?.id || '';

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students]
  );

  const filteredStudents = useMemo(
    () =>
      selectedClass === 'ALL'
        ? students
        : students.filter((s) => s.className === selectedClass),
    [students, selectedClass]
  );

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter(
        (sub) =>
          (selectedClass === 'ALL' || sub.className === selectedClass) &&
          (!effectiveSubjectId || sub.subjectId === effectiveSubjectId)
      ),
    [submissions, selectedClass, effectiveSubjectId]
  );

  const studentLookup = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((st) => map.set(st.participantNumber, st));
    return map;
  }, [students]);

  const selectedSubject =
    subjects.find((s) => s.id === effectiveSubjectId) || subjects[0];

  const stats = useMemo(() => {
    if (filteredSubmissions.length === 0) {
      return { avg: 0, max: 0, min: 0, passCount: 0, passRate: 0 };
    }
    const vals = filteredSubmissions.map((s) => s.percentage);
    const sum = vals.reduce((a, b) => a + b, 0);
    const passCount = filteredSubmissions.filter((s) => s.passedKkm).length;
    return {
      avg: Math.round(sum / vals.length),
      max: Math.max(...vals),
      min: Math.min(...vals),
      passCount,
      passRate: Math.round((passCount / vals.length) * 100),
    };
  }, [filteredSubmissions]);

  const handleExportRecapCsv = () => {
    const header = [
      'No_Peserta',
      'Nama_Siswa',
      'Kelas',
      'Ruang',
      'Sesi',
      'Mata_Pelajaran',
      'Skor_Objektif',
      'Skor_Isian_AI',
      'Nilai_Akhir',
      'Status_KKM',
      'Pelanggaran_Tab',
      'Waktu_Kirim',
    ].join(',');
    const rows = filteredSubmissions.map((s) => {
      const st = studentLookup.get(s.participantNumber);
      return [
        s.participantNumber,
        `"${s.studentName.replaceAll('"', '""')}"`,
        s.className,
        `"${(st?.room || '-').replaceAll('"', '""')}"`,
        `"${(st?.session || '-').replaceAll('"', '""')}"`,
        `"${s.subjectName.replaceAll('"', '""')}"`,
        s.objectiveScore,
        s.aiEssayScore,
        s.percentage,
        s.passedKkm ? 'Tuntas' : 'Belum Tuntas',
        s.violationCount,
        s.submittedAt,
      ].join(',');
    });
    const blob = new Blob(['\uFEFF' + header + '\n' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilai_${selectedClass}_${selectedSubject?.code || 'Ujian'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCardsContent = () => (
    <div className="grid gap-4 sm:grid-cols-2">
      {filteredStudents.map((st) => (
        <div
          key={st.id}
          className="print-break-inside-avoid rounded-xl border border-slate-300 bg-white p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <SchoolLogo
                logoUrl={schoolLogoUrl}
                schoolName={schoolName}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Kartu Nomor Peserta Ujian
                </p>
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {schoolName || selectedSubject?.schoolName || 'Sekolah'}
                </h3>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-blue-700 shrink-0">
              {selectedSubject?.code || 'CBT'}
            </span>
          </div>

          <div className="mt-3.5 flex items-stretch gap-3.5 text-xs">
            {/* Pas Foto 3x4 Slot */}
            <div className="w-[72px] h-[96px] shrink-0 rounded-lg border border-slate-300 bg-slate-50 overflow-hidden flex flex-col items-center justify-center text-center">
              {st.photoUrl ? (
                <img
                  src={st.photoUrl}
                  alt={`Foto ${st.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="px-1.5 text-[10px] font-medium text-slate-400 leading-tight">
                  Pas Foto
                  <br />
                  3 × 4
                </div>
              )}
            </div>

            {/* Detail Peserta */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div>
                  <span className="text-slate-500">No. Peserta: </span>
                  <span className="font-mono font-bold text-slate-900">
                    {st.participantNumber}
                  </span>
                </div>
                <div className="truncate">
                  <span className="text-slate-500">Nama: </span>
                  <span className="font-semibold text-slate-900">{st.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Kelas: </span>
                  <span className="text-slate-900">{st.className}</span>
                </div>
                <div>
                  <span className="text-slate-500">Ruang / Sesi: </span>
                  <span className="text-slate-900">
                    {st.room} · {st.session}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-slate-500">
                  PIN Akses
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {st.accessPin}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
      {filteredStudents.length === 0 && (
        <div className="sm:col-span-2 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Belum ada data peserta pada filter ini untuk dicetak sebagai kartu peserta.
        </div>
      )}
    </div>
  );

  const renderSignatures = () =>
    showSignatureBlock ? (
      <div className="print-break-inside-avoid mt-10 grid grid-cols-2 gap-8 pt-6 text-xs text-slate-700">
        <div>
          <p>Mengetahui,</p>
          <p className="font-semibold text-slate-900">Kepala {schoolName}</p>
          <div className="h-16" />
          <p className="font-semibold underline text-slate-900">
            {principalName}
          </p>
        </div>
        <div className="text-right">
          <p>{cityDate}</p>
          <p className="font-semibold text-slate-900">{proctorTeacherName}</p>
          <div className="h-16" />
          <p className="font-semibold underline text-slate-900">
            ............................................
          </p>
        </div>
      </div>
    ) : null;

  const renderRecapSheet = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
      <div className="border-b-2 border-slate-800 pb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <SchoolLogo
            logoUrl={schoolLogoUrl}
            schoolName={schoolName}
            size="lg"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
              {schoolName || selectedSubject?.schoolName || 'Sekolah'}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Rekapitulasi Nilai Ujian —{' '}
              {selectedClass === 'ALL'
                ? 'Semua Kelas'
                : `Kelas ${selectedClass}`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Mata Pelajaran: {selectedSubject?.name} (KKM:{' '}
              {selectedSubject?.passingGradeKkm})
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right text-xs text-slate-600">
          <p>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
          <p className="font-mono font-semibold text-slate-900">
            Jumlah Peserta: {filteredSubmissions.length}
          </p>
        </div>
      </div>

      <dl className="my-5 grid grid-cols-2 gap-4 sm:grid-cols-4 border-b border-slate-200 pb-5">
        <div>
          <dt className="text-xs text-slate-500">Rata-rata Kelas</dt>
          <dd className="font-mono text-xl font-bold text-slate-900 tabular-nums">
            {stats.avg}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Nilai Tertinggi</dt>
          <dd className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
            {stats.max}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Nilai Terendah</dt>
          <dd className="font-mono text-xl font-bold text-red-700 tabular-nums">
            {stats.min}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Ketuntasan KKM</dt>
          <dd className="font-mono text-xl font-bold text-slate-900 tabular-nums">
            {stats.passRate}% ({stats.passCount})
          </dd>
        </div>
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[660px] text-left text-sm">
          <thead className="border-b border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700">
            <tr>
              <th className="py-2.5 px-2">No</th>
              <th className="py-2.5 px-2">No. Peserta</th>
              <th className="py-2.5 px-2">Nama Siswa</th>
              <th className="py-2.5 px-2">Kelas / Ruang</th>
              {showScoreBreakdown && (
                <>
                  <th className="py-2.5 px-2 text-right">PG/AKM</th>
                  <th className="py-2.5 px-2 text-right">Isian AI</th>
                </>
              )}
              <th className="py-2.5 px-2 text-right">Nilai Akhir</th>
              {showViolationsCol && (
                <th className="py-2.5 px-2 text-right">Tab</th>
              )}
              <th className="py-2.5 px-2 text-right">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSubmissions.map((sub, idx) => {
              const st = studentLookup.get(sub.participantNumber);
              return (
                <tr key={sub.id}>
                  <td className="py-2 px-2 font-mono text-xs text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2 font-mono text-xs text-slate-800">
                    {sub.participantNumber}
                  </td>
                  <td className="py-2 px-2 font-medium text-slate-900">
                    {sub.studentName}
                  </td>
                  <td className="py-2 px-2 text-xs text-slate-600">
                    {sub.className}
                    {st?.room ? ` · ${st.room}` : ''}
                  </td>
                  {showScoreBreakdown && (
                    <>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {sub.objectiveScore}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {sub.aiEssayScore}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {sub.percentage}
                  </td>
                  {showViolationsCol && (
                    <td className="py-2 px-2 text-right font-mono tabular-nums">
                      {sub.violationCount}
                    </td>
                  )}
                  <td
                    className={`py-2 px-2 text-right text-xs font-semibold ${
                      sub.passedKkm ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {sub.passedKkm ? 'Tuntas' : 'Remedial'}
                  </td>
                </tr>
              );
            })}
            {filteredSubmissions.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-sm text-slate-500"
                >
                  Belum ada hasil ujian pada filter kelas & mata pelajaran ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {renderSignatures()}
    </div>
  );

  const renderScheduleSheet = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5">
      <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <SchoolLogo logoUrl={schoolLogoUrl} schoolName={schoolName} size="lg" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
              {schoolName}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Jadwal Pelaksanaan Ujian Berbasis Komputer
            </h3>
            <p className="text-xs text-slate-600">Zona Waktu: {tzLabel}</p>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-300 bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th className="py-2.5 px-3">No</th>
              <th className="py-2.5 px-3">Hari &amp; Tanggal</th>
              <th className="py-2.5 px-3">Waktu ({tzLabel})</th>
              <th className="py-2.5 px-3">Mata Pelajaran</th>
              <th className="py-2.5 px-3">Sesi &amp; Kelas</th>
              <th className="py-2.5 px-3">Ruang</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {examSchedules.map((item, idx) => (
              <tr key={item.id}>
                <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <p className="font-semibold text-slate-900">{item.dayLabel}</p>
                  <p className="font-mono text-xs text-slate-500">{item.date}</p>
                </td>
                <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">
                  {item.startTime} – {item.endTime}
                </td>
                <td className="py-2.5 px-3 font-semibold text-slate-900">
                  {item.subjectName}
                </td>
                <td className="py-2.5 px-3">
                  {item.sessionName} · {item.targetClass}
                </td>
                <td className="py-2.5 px-3">{item.roomSummary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderSignatures()}
    </div>
  );

  const renderProctorMappingSheet = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5">
      <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <SchoolLogo logoUrl={schoolLogoUrl} schoolName={schoolName} size="lg" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
              {schoolName}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Pemetaan Pengawas Ruang Ujian Berbasis Komputer
            </h3>
            <p className="text-xs text-slate-600">
              Total Tugas Pengawas: {proctorMappings.length}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-300 bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th className="py-2.5 px-3">No</th>
              <th className="py-2.5 px-3">Tanggal</th>
              <th className="py-2.5 px-3">Ruang &amp; Sesi</th>
              <th className="py-2.5 px-3">Mata Pelajaran</th>
              <th className="py-2.5 px-3">Nama Pengawas</th>
              <th className="py-2.5 px-3">NIP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proctorMappings.map((item, idx) => (
              <tr key={item.id}>
                <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                <td className="py-2.5 px-3 font-mono text-xs">{item.date}</td>
                <td className="py-2.5 px-3">
                  <span className="font-semibold text-slate-900">
                    {item.roomName}
                  </span>{' '}
                  · {item.sessionName}
                </td>
                <td className="py-2.5 px-3">{item.subjectName}</td>
                <td className="py-2.5 px-3 font-semibold text-slate-900">
                  {item.proctorName}
                </td>
                <td className="py-2.5 px-3 font-mono text-xs">
                  {item.proctorNip || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderSignatures()}
    </div>
  );

  const renderRoomsSheet = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5">
      <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <SchoolLogo logoUrl={schoolLogoUrl} schoolName={schoolName} size="lg" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
              {schoolName}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Daftar Pengaturan Ruang &amp; Kapasitas Peserta
            </h3>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-300 bg-slate-50 font-semibold text-slate-700">
            <tr>
              <th className="py-2.5 px-3">No</th>
              <th className="py-2.5 px-3">Kode</th>
              <th className="py-2.5 px-3">Nama Ruang</th>
              <th className="py-2.5 px-3">Lokasi</th>
              <th className="py-2.5 px-3 text-right">Kapasitas</th>
              <th className="py-2.5 px-3">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {examRooms.map((r, idx) => (
              <tr key={r.id}>
                <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">
                  {r.code}
                </td>
                <td className="py-2.5 px-3 font-semibold text-slate-900">
                  {r.name}
                </td>
                <td className="py-2.5 px-3">{r.location}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  {r.capacity}
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-600">
                  {r.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderSignatures()}
    </div>
  );

  const renderActiveSheet = () => {
    switch (mode) {
      case 'cards':
        return renderCardsContent();
      case 'recap':
        return renderRecapSheet();
      case 'schedule':
        return renderScheduleSheet();
      case 'proctor_map':
        return renderProctorMappingSheet();
      case 'rooms':
        return renderRoomsSheet();
    }
  };

  const modeTitleMap: Record<PrintCenterMode, string> = {
    cards: 'Kartu Nomor Peserta',
    recap: 'Rekap Nilai Kelas',
    schedule: 'Jadwal Pelaksanaan',
    proctor_map: 'Pemetaan Pengawas',
    rooms: 'Daftar Ruang',
  };

  return (
    <div className="space-y-6">
      <div className="no-print space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Pusat Cetak A4: Kartu Peserta, Jadwal, Pengawas, Ruang &amp; Nilai
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Pratinjau tata letak kertas A4 sebelum mencetak kartu peserta berfoto 3×4, jadwal, pemetaan pengawas, atau rekap nilai.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 self-start rounded-lg bg-slate-100 p-1">
          {(
            [
              { id: 'cards', label: 'Kartu Nomor Peserta' },
              { id: 'recap', label: 'Rekap Nilai Kelas' },
              { id: 'schedule', label: 'Jadwal Pelaksanaan' },
              { id: 'proctor_map', label: 'Pemetaan Pengawas' },
              { id: 'rooms', label: 'Daftar Ruang' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`min-h-[36px] rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                mode === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {(mode === 'cards' || mode === 'recap') && (
              <>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>

                <select
                  value={effectiveSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            {mode !== 'cards' && mode !== 'recap' && (
              <p className="text-xs text-slate-600">
                Dokumen aktif siap cetak kertas A4:{' '}
                <strong className="text-slate-900">{modeTitleMap[mode]}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {mode === 'recap' && (
              <button
                type="button"
                onClick={handleExportRecapCsv}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Ekspor CSV
              </button>
            )}
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview Sebelum Cetak
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak {modeTitleMap[mode]}
            </button>
          </div>
        </div>
      </div>

      {/* Inline Printable Output Area (hidden from print when Preview modal is active so pages don't double!) */}
      <div className={previewOpen ? 'no-print' : 'print-page'}>
        {renderActiveSheet()}
      </div>

      {/* Dedicated A4 Print Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/75 overflow-y-auto">
          <div className="no-print sticky top-0 z-10 border-b border-slate-700 bg-slate-900 px-4 sm:px-6 py-3 text-white">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">
                  Pratinjau Cetak Kertas A4 — {modeTitleMap[mode]}
                </p>
                <p className="text-xs text-slate-300">
                  Periksa kelengkapan kop sekolah, foto/kolom, dan tanda tangan sebelum mencetak atau menyimpan sebagai PDF.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <Printer className="h-4 w-4" />
                  Cetak / Simpan PDF Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-600 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                  Tutup Preview
                </button>
              </div>
            </div>

            {mode !== 'cards' && (
              <div className="mx-auto mt-3 flex max-w-5xl flex-wrap items-center gap-4 border-t border-slate-800 pt-3 text-xs text-slate-200">
                {mode === 'recap' && (
                  <>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showScoreBreakdown}
                        onChange={(e) => setShowScoreBreakdown(e.target.checked)}
                      />
                      <span>Tampilkan Rincian PG & AI</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showViolationsCol}
                        onChange={(e) => setShowViolationsCol(e.target.checked)}
                      />
                      <span>Tampilkan Kolom Pelanggaran</span>
                    </label>
                  </>
                )}
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignatureBlock}
                    onChange={(e) => setShowSignatureBlock(e.target.checked)}
                  />
                  <span>Tampilkan Tanda Tangan</span>
                </label>
                {showSignatureBlock && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      placeholder="Nama Kepala Sekolah"
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={proctorTeacherName}
                      onChange={(e) => setProctorTeacherName(e.target.value)}
                      placeholder="Jabatan Pihak Kanan"
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={cityDate}
                      onChange={(e) => setCityDate(e.target.value)}
                      placeholder="Kota, Tanggal"
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Simulated A4 Paper Container */}
          <div className="mx-auto my-6 w-full max-w-[900px] px-3 sm:px-6 print:m-0 print:max-w-none print:p-0">
            <div className="print-page rounded-xl bg-white shadow-2xl p-2 sm:p-4 print:shadow-none print:p-0">
              {renderActiveSheet()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
