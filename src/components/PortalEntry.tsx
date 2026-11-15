import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Clock,
  Info,
  Lock,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type {
  ExamScheduleItem,
  ExamSessionSlot,
  ExamTimeSettings,
  Student,
  SubjectConfig,
} from '../types/exam';
import { isSubjectTokenValid } from '../utils/tokenGenerator';
import { PWAInstallButton } from './PWAControls';
import { SchoolLogo } from './SchoolLogo';
import defaultBerandaThumbnail from '../assets/images/beranda_cbt_thumbnail_1794628073884.jpg';

interface PortalEntryProps {
  appTitle: string;
  schoolName: string;
  schoolLogoUrl: string;
  homeThumbnailUrl?: string;
  subjects: SubjectConfig[];
  students: Student[];
  questionCountBySubject: Record<string, number>;
  cachedPdfCount: number;
  isOnline: boolean;
  hasEncryptedCache: boolean;
  examTimeSettings?: ExamTimeSettings;
  examSessions?: ExamSessionSlot[];
  examSchedules?: ExamScheduleItem[];
  onStartExam: (student: Student, subject: SubjectConfig) => void;
  onOpenAdmin: () => void;
  onOpenProctor: () => void;
}

function formatScheduleLabel(start?: string, end?: string, tz = 'WIB'): string {
  const fmt = (val?: string) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e} ${tz}`;
  if (s) return `Mulai ${s} ${tz}`;
  if (e) return `Selesai ${e} ${tz}`;
  return `Fleksibel (${tz})`;
}

export const PortalEntry: React.FC<PortalEntryProps> = ({
  appTitle,
  schoolName,
  schoolLogoUrl,
  homeThumbnailUrl,
  subjects,
  students,
  questionCountBySubject,
  cachedPdfCount,
  isOnline,
  hasEncryptedCache,
  examTimeSettings,
  examSessions = [],
  examSchedules = [],
  onStartExam,
  onOpenAdmin,
  onOpenProctor,
}) => {
  const activeSubjects = subjects.filter((s) => s.active);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [participantNumber, setParticipantNumber] = useState('');
  const [accessPin, setAccessPin] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    activeSubjects[0]?.id || subjects[0]?.id || ''
  );
  const [tokenInput, setTokenInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<
    'peserta' | 'jadwal' | 'panduan'
  >('peserta');

  const effectiveThumbSrc = homeThumbnailUrl || defaultBerandaThumbnail;

  const selectedSubject =
    subjects.find((s) => s.id === selectedSubjectId) ||
    activeSubjects[0] ||
    subjects[0];

  const selectedQuestionCount = selectedSubject
    ? questionCountBySubject[selectedSubject.id] || 0
    : 0;

  const tzLabel = examTimeSettings?.timezone || 'WIB';
  const examNotes =
    examTimeSettings?.examInfoNotes ||
    'Peserta wajib hadir 15 menit sebelum sesi dimulai, menyiapkan kartu nomor peserta, menjaga koneksi/kamera aktif, dan mengisi seluruh butir soal sebelum waktu berakhir.';

  const handleSubjectChange = (id: string) => {
    setSelectedSubjectId(id);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (students.length === 0) {
      setErrorMsg(
        'Belum ada akun peserta yang terdaftar. Silakan hubungi Admin/Guru untuk membuat atau mengimpor akun peserta.'
      );
      return;
    }

    const matchedStudent = students.find(
      (s) =>
        s.participantNumber.trim().toUpperCase() ===
          participantNumber.trim().toUpperCase() &&
        s.accessPin.trim() === accessPin.trim()
    );

    if (!matchedStudent) {
      setErrorMsg(
        'Nomor peserta atau PIN akses tidak sesuai dengan akun peserta yang terdaftar.'
      );
      return;
    }

    if (!selectedSubject || !selectedSubject.active) {
      setErrorMsg('Mata pelajaran yang dipilih belum diaktifkan oleh admin.');
      return;
    }

    if (examTimeSettings?.enforceScheduleWindow) {
      const now = Date.now();
      const startMs = selectedSubject.startTime
        ? new Date(selectedSubject.startTime).getTime()
        : NaN;
      const endMs = selectedSubject.endTime
        ? new Date(selectedSubject.endTime).getTime()
        : NaN;
      if (!Number.isNaN(startMs) && now < startMs) {
        setErrorMsg(
          `Ujian belum dibuka sesuai pengaturan waktu Admin (${formatScheduleLabel(
            selectedSubject.startTime,
            selectedSubject.endTime,
            tzLabel
          )}).`
        );
        return;
      }
      if (!Number.isNaN(endMs) && now > endMs) {
        setErrorMsg(
          `Waktu pelaksanaan ujian untuk paket ini telah berakhir (${formatScheduleLabel(
            selectedSubject.startTime,
            selectedSubject.endTime,
            tzLabel
          )}).`
        );
        return;
      }
    }

    if (!isSubjectTokenValid(selectedSubject, tokenInput)) {
      setErrorMsg(
        selectedSubject.tokenMode === 'auto_15m'
          ? 'Token ujian tidak cocok atau sudah berganti (otomatis tiap 15 menit). Minta token terbaru kepada pengawas ruang.'
          : 'Token ujian tidak cocok. Periksa token yang dibagikan oleh pengawas ruang.'
      );
      return;
    }

    const qCount = questionCountBySubject[selectedSubject.id] || 0;
    if (qCount === 0) {
      setErrorMsg('Belum ada soal yang tersedia pada mata pelajaran ini.');
      return;
    }

    onStartExam(matchedStudent, selectedSubject);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/70 via-slate-50 to-white text-slate-900 flex flex-col">
      {/* Modern Sticky Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5">
          <a
            href="#portal"
            className="flex items-center gap-2.5 font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <SchoolLogo
              logoUrl={schoolLogoUrl}
              schoolName={schoolName}
              size="sm"
            />
            <span>{appTitle || 'DutawangiCBT'}</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveInfoTab('peserta')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeInfoTab === 'peserta'
                  ? 'text-blue-700 underline underline-offset-4'
                  : ''
              }`}
            >
              Portal Peserta
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab('jadwal')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeInfoTab === 'jadwal'
                  ? 'text-blue-700 underline underline-offset-4'
                  : ''
              }`}
            >
              Jadwal &amp; Informasi
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoTab('panduan')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeInfoTab === 'panduan'
                  ? 'text-blue-700 underline underline-offset-4'
                  : ''
              }`}
            >
              Panduan TKA/AKM
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenProctor}
              className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 sm:px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
            >
              Pengawas / Proktor
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="min-h-[40px] rounded-xl bg-slate-900 px-3.5 sm:px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 shadow-xs transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
            >
              Admin &amp; Guru
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {/* Compact mobile tab toggle */}
        <div className="mb-4 flex md:hidden items-center gap-1 rounded-xl bg-slate-200/75 p-1">
          <button
            type="button"
            onClick={() => setActiveInfoTab('peserta')}
            className={`flex-1 min-h-[40px] rounded-lg text-xs font-medium transition-all ${
              activeInfoTab === 'peserta'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Login Peserta
          </button>
          <button
            type="button"
            onClick={() => setActiveInfoTab('jadwal')}
            className={`flex-1 min-h-[40px] rounded-lg text-xs font-medium transition-all ${
              activeInfoTab === 'jadwal'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Jadwal &amp; Info
          </button>
          <button
            type="button"
            onClick={() => setActiveInfoTab('panduan')}
            className={`flex-1 min-h-[40px] rounded-lg text-xs font-medium transition-all ${
              activeInfoTab === 'panduan'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Panduan AKM
          </button>
        </div>

        {activeInfoTab === 'jadwal' ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Jadwal Pelaksanaan, Tata Tertib &amp; Informasi Ujian
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {schoolName || 'SD Negeri 2 Tukangkayu'} · Zona Waktu{' '}
                  {tzLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveInfoTab('peserta')}
                className="min-h-[42px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Kembali ke Login Ujian
              </button>
            </div>

            {/* Tata Tertib & Informasi Lainnya */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5 space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-700" />
                Tata Tertib &amp; Informasi Ujian
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {examNotes}
              </p>
            </div>

            {/* Jadwal Pelaksanaan Resmi */}
            {examSchedules.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-700" />
                  Jadwal Pelaksanaan Ujian ({tzLabel})
                </h2>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[540px] text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                      <tr>
                        <th className="px-3.5 py-2.5">Hari / Tanggal</th>
                        <th className="px-3.5 py-2.5">Waktu</th>
                        <th className="px-3.5 py-2.5">Mata Pelajaran</th>
                        <th className="px-3.5 py-2.5">Sesi &amp; Ruang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {examSchedules.map((sch) => (
                        <tr key={sch.id}>
                          <td className="px-3.5 py-2.5">
                            <p className="font-semibold text-slate-900">
                              {sch.dayLabel}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {sch.date}
                            </p>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-blue-700 whitespace-nowrap">
                            {sch.startTime} – {sch.endTime}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-slate-900">
                            {sch.subjectName}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs text-slate-600">
                            {sch.sessionName} · {sch.roomSummary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Jadwal Mata Pelajaran */}
            <div className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-700" />
                Daftar Paket &amp; Mata Pelajaran Ujian ({tzLabel})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {subjects.map((subj) => (
                  <div
                    key={subj.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-blue-700">
                        {subj.code}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          subj.active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {subj.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {subj.name}
                    </h3>
                    <p className="font-mono text-xs text-slate-600">
                      {formatScheduleLabel(subj.startTime, subj.endTime, tzLabel)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {questionCountBySubject[subj.id] || 0} butir soal · Durasi{' '}
                      {subj.durationMinutes} menit
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Jadwal Sesi & Ruang */}
            {examSessions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-700" />
                  Pembagian Sesi &amp; Ruang Ujian
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {examSessions.map((sesi) => (
                    <div
                      key={sesi.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1"
                    >
                      <p className="font-mono text-xs font-semibold text-blue-700">
                        {sesi.startTime} – {sesi.endTime} {tzLabel}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {sesi.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        {sesi.defaultRoom}
                      </p>
                      {sesi.proctorName && (
                        <p className="text-[11px] text-slate-500">
                          Pengawas: {sesi.proctorName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Informasi Teknis Lainnya */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                Informasi Lainnya
              </h2>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600">
                <li>
                  • Token ujian dimasukkan secara manual oleh peserta pada aplikasi setelah diinformasikan oleh Pengawas Ruang.
                </li>
                <li>
                  • Jawaban tersimpan otomatis di perangkat secara terenkripsi apabila koneksi internet sempat terganggu.
                </li>
                <li>
                  • Pastikan izin kamera dan mode layar penuh diaktifkan bila diwajibkan pada mata pelajaran ujian.
                </li>
              </ul>
            </div>
          </motion.section>
        ) : activeInfoTab === 'panduan' ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Panduan Pelaksanaan Ujian TKA &amp; AKM
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Prosedur standar pengerjaan ujian, model soal bergambar, dan sinkronisasi offline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveInfoTab('peserta')}
                className="min-h-[42px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Kembali ke Login Ujian
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-slate-900">
                  01. Lima Model Soal TKA / AKM
                </h2>
                <ul className="space-y-2 text-sm text-slate-600 leading-relaxed">
                  <li>• Pilihan Ganda (PG): Memilih satu jawaban paling tepat (mendukung gambar/diagram).</li>
                  <li>• Pilihan Ganda Kompleks: Memilih lebih dari satu pernyataan benar.</li>
                  <li>• Benar / Salah Majemuk: Menilai kebenaran setiap pernyataan.</li>
                  <li>• Menjodohkan: Menghubungkan premis dengan pasangan jawaban.</li>
                  <li>• Isian / Uraian: Dikoreksi sesuai kata kunci yang disiapkan oleh guru.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-slate-900">
                  02. Keamanan Ujian &amp; Mode Offline
                </h2>
                <ul className="space-y-2 text-sm text-slate-600 leading-relaxed">
                  <li>• Ujian berjalan dalam layar penuh dan tetap menjaga integritas pengerjaan peserta.</li>
                  <li>• Soal dienkripsi AES-256-GCM dan disimpan di perangkat untuk ketahanan saat sinyal terputus.</li>
                  <li>• Lampiran PDF dari Google Drive tetap dapat dibuka dari cache lokal offline.</li>
                  <li>• Pengawas dapat memantau kamera, memberi perpanjangan waktu, atau mengakhiri sesi real-time.</li>
                </ul>
              </div>
            </div>
          </motion.section>
        ) : (
          <div className="space-y-6">
            {/* TOP SECTION: Thumbnail & Keterangan Ujian */}
            <motion.section
              id="informasi-ujian"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
            >
              <div className="grid md:grid-cols-12 items-stretch">
                {/* Left / Top Thumbnail */}
                <div className="relative md:col-span-5 bg-slate-100 aspect-video md:aspect-auto md:min-h-[250px] overflow-hidden group">
                  {!thumbFailed ? (
                    <img
                      key={effectiveThumbSrc}
                      src={effectiveThumbSrc}
                      alt={`Suasana ruang ujian komputer ${schoolName || 'sekolah'}`}
                      referrerPolicy="no-referrer"
                      onError={() => setThumbFailed(true)}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 360 202"
                      className="h-full w-full"
                      aria-hidden="true"
                    >
                      <rect width="360" height="202" fill="#F1F5F9" />
                      <rect
                        x="20"
                        y="20"
                        width="320"
                        height="162"
                        rx="10"
                        fill="#FFFFFF"
                        stroke="#CBD5E1"
                      />
                      <rect x="40" y="42" width="130" height="12" rx="6" fill="#1E293B" />
                      <rect x="40" y="62" width="190" height="8" rx="4" fill="#94A3B8" />
                      <rect x="40" y="88" width="135" height="72" rx="8" fill="#EFF6FF" />
                      <rect x="188" y="88" width="132" height="72" rx="8" fill="#ECFDF5" />
                    </svg>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-4 text-white">
                    <p className="text-[11px] font-medium text-slate-200">
                      Portal Asesmen Digital TKA &amp; AKM
                    </p>
                    <p className="text-sm font-semibold leading-snug truncate">
                      {schoolName || selectedSubject?.schoolName || 'Sekolah Penyelenggara'}
                    </p>
                  </div>
                </div>

                {/* Right / Top Exam Description */}
                <div className="md:col-span-7 p-5 sm:p-7 flex flex-col justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        {isOnline ? (
                          <>
                            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                            Terhubung Jaringan
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                            Mode Offline Siap
                          </>
                        )}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {hasEncryptedCache ? 'Brankas AES-256 Aktif' : 'Memuat Paket'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Cache PDF Drive: {cachedPdfCount} dokumen</span>
                    </div>

                    <p className="mt-3 text-xs font-medium text-blue-700">
                      Informasi Paket Ujian Aktif
                    </p>
                    <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 text-balance">
                      {selectedSubject
                        ? selectedSubject.name
                        : 'Belum Ada Paket Ujian Tersedia'}
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-600 flex flex-wrap items-center gap-2">
                      {selectedSubject ? (
                        <>
                          <span>Kode: {selectedSubject.code}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                            {formatScheduleLabel(
                              selectedSubject.startTime,
                              selectedSubject.endTime,
                              tzLabel
                            )}
                          </span>
                        </>
                      ) : (
                        'Silakan masuk ke panel Admin untuk menambahkan paket ujian dan butir soal.'
                      )}
                    </p>
                  </div>

                  {/* Key Exam Specs */}
                  <dl className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                        Jumlah Soal
                      </dt>
                      <dd className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                        {selectedQuestionCount} butir
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Durasi Waktu
                      </dt>
                      <dd className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
                        {selectedSubject?.durationMinutes || 0} menit
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        Kamera Pengawas
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedSubject?.cameraRequired !== false
                          ? 'Otomatis Aktif'
                          : 'Opsional'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </motion.section>

            {/* BOTTOM SECTION: Student Login Form (Strictly using created student accounts) */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-8 shadow-xs"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    Login Peserta Ujian
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Masukkan Nomor Peserta, PIN Akses, dan Token Ujian sesuai akun peserta yang telah dibuat.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 shrink-0">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="font-mono tabular-nums">
                    {students.length} akun peserta terdaftar
                  </span>
                </div>
              </div>

              {students.length === 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs sm:text-sm text-amber-900">
                  Belum ada akun peserta yang dibuat. Silakan login sebagai{' '}
                  <strong>Admin &amp; Guru</strong> untuk menambahkan peserta atau mengimpor daftar peserta secara kolektif.
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Nomor Peserta
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={participantNumber}
                      onChange={(e) => setParticipantNumber(e.target.value)}
                      placeholder="Masukkan Nomor Peserta Anda"
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      PIN Akses Peserta
                    </label>
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      value={accessPin}
                      onChange={(e) => setAccessPin(e.target.value)}
                      placeholder="Masukkan PIN Akses"
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Mata Pelajaran / Paket Ujian
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                    >
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.name} ({questionCountBySubject[subj.id] || 0} soal ·{' '}
                          {subj.durationMinutes} menit)
                          {!subj.active ? ' — Nonaktif' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Token Ujian (Masukkan Manual)
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={tokenInput}
                      onChange={(e) =>
                        setTokenInput(e.target.value.toUpperCase())
                      }
                      placeholder="Masukkan Token"
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <PWAInstallButton />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 shadow-xs transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
                  >
                    Mulai Kerjakan Ujian
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </motion.section>
          </div>
        )}
      </main>
    </div>
  );
};
