import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Lock,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { Student, SubjectConfig } from '../types/exam';
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
  onStartExam: (student: Student, subject: SubjectConfig) => void;
  onOpenAdmin: () => void;
  onOpenProctor: () => void;
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
  onStartExam,
  onOpenAdmin,
  onOpenProctor,
}) => {
  const activeSubjects = subjects.filter((s) => s.active);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [participantNumber, setParticipantNumber] = useState(
    students[0]?.participantNumber || ''
  );
  const [accessPin, setAccessPin] = useState(students[0]?.accessPin || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    activeSubjects[0]?.id || subjects[0]?.id || ''
  );
  const [tokenInput, setTokenInput] = useState(
    activeSubjects[0]?.token || subjects[0]?.token || ''
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<'peserta' | 'panduan'>(
    'peserta'
  );

  const effectiveThumbSrc = homeThumbnailUrl || defaultBerandaThumbnail;

  const selectedSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  const handleSubjectChange = (id: string) => {
    setSelectedSubjectId(id);
    const found = subjects.find((s) => s.id === id);
    if (found) setTokenInput(found.token);
    setErrorMsg(null);
  };

  const handleQuickFillStudent = (st: Student) => {
    setParticipantNumber(st.participantNumber);
    setAccessPin(st.accessPin);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const matchedStudent = students.find(
      (s) =>
        s.participantNumber.trim().toUpperCase() ===
          participantNumber.trim().toUpperCase() &&
        s.accessPin.trim() === accessPin.trim()
    );

    if (!matchedStudent) {
      setErrorMsg(
        'Nomor peserta atau PIN akses tidak sesuai dengan daftar peserta terdaftar.'
      );
      return;
    }

    if (!selectedSubject || !selectedSubject.active) {
      setErrorMsg('Mata pelajaran yang dipilih belum diaktifkan oleh admin.');
      return;
    }

    if (
      tokenInput.trim().toUpperCase() !==
      selectedSubject.token.trim().toUpperCase()
    ) {
      setErrorMsg(
        'Token ujian tidak cocok. Periksa token pada kartu peserta atau pengawas ruang.'
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5 sm:py-4">
          <a
            href="#portal"
            className="flex items-center gap-2.5 font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <SchoolLogo
              logoUrl={schoolLogoUrl}
              schoolName={schoolName}
              size="sm"
            />
            <span>{appTitle || 'AksaraCBT'}</span>
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
              onClick={() => setActiveInfoTab('panduan')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeInfoTab === 'panduan'
                  ? 'text-blue-700 underline underline-offset-4'
                  : ''
              }`}
            >
              Panduan TKA/AKM
            </button>
            <a
              href="#keamanan"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Enkripsi & Offline
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenProctor}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 sm:px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Pengawas / Proktor
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="min-h-[40px] rounded-lg bg-slate-900 px-3.5 sm:px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Admin & Guru
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-10">
        {/* Compact mobile tab toggle */}
        <div className="mb-4 flex md:hidden items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => setActiveInfoTab('peserta')}
            className={`flex-1 min-h-[40px] rounded-md text-xs font-medium transition-colors ${
              activeInfoTab === 'peserta'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Login Peserta
          </button>
          <button
            type="button"
            onClick={() => setActiveInfoTab('panduan')}
            className={`flex-1 min-h-[40px] rounded-md text-xs font-medium transition-colors ${
              activeInfoTab === 'panduan'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Panduan AKM
          </button>
        </div>

        {activeInfoTab === 'panduan' ? (
          <section className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Panduan Pelaksanaan Ujian TKA & AKM
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Prosedur standar keamanan peserta, model soal bergambar, dan sinkronisasi offline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveInfoTab('peserta')}
                className="min-h-[42px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
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
                  <li>• Isian / Uraian: Dikoreksi otomatis oleh Asisten AI berbasis kata kunci guru.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-slate-900">
                  02. Sistem Anti-Tab & Mode Offline
                </h2>
                <ul className="space-y-2 text-sm text-slate-600 leading-relaxed">
                  <li>• Ujian berjalan dalam layar penuh; berpindah tab atau jendela dicatat sebagai pelanggaran.</li>
                  <li>• Soal dienkripsi AES-256-GCM dan disimpan di perangkat untuk ketahanan saat sinyal terputus.</li>
                  <li>• Lampiran PDF dari Google Drive tetap dapat dibuka dari cache lokal offline.</li>
                  <li>• Pengawas dapat mengakhiri sesi secara real-time dan nilai langsung muncul otomatis.</li>
                </ul>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:gap-8 lg:grid-cols-12 items-stretch">
            {/* Left Column: Student Exam Login Card */}
            <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {schoolName || selectedSubject?.schoolName || 'Sekolah'}
                  </span>
                  <span aria-hidden="true">·</span>
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
                </div>

                <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                  Ruang Ujian Berbasis Komputer
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 max-w-xl">
                  Masukkan Nomor Peserta, PIN Akses, dan Token Ujian dari pengawas untuk memulai pengerjaan soal TKA/AKM secara aman.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Nomor Peserta
                      </label>
                      <input
                        type="text"
                        required
                        value={participantNumber}
                        onChange={(e) => setParticipantNumber(e.target.value)}
                        placeholder="Contoh: 2026-01-001"
                        className="mt-1.5 w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        PIN Akses Peserta
                      </label>
                      <input
                        type="password"
                        required
                        value={accessPin}
                        onChange={(e) => setAccessPin(e.target.value)}
                        placeholder="4 digit PIN"
                        className="mt-1.5 w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
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
                        className="mt-1.5 w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                      >
                        {subjects.map((subj) => (
                          <option key={subj.id} value={subj.id}>
                            {subj.name} ({subj.durationMinutes} menit)
                            {!subj.active ? ' — Nonaktif' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Token Ujian
                      </label>
                      <input
                        type="text"
                        required
                        value={tokenInput}
                        onChange={(e) =>
                          setTokenInput(e.target.value.toUpperCase())
                        }
                        placeholder="AKM2026"
                        className="mt-1.5 w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm uppercase text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3">
                      <PWAInstallButton />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      Mulai Kerjakan Ujian
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Peserta Cepat (Simulasi):</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {students.slice(0, 3).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleQuickFillStudent(st)}
                        className="min-h-[32px] font-mono text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-blue-700 hover:decoration-blue-700"
                      >
                        {st.participantNumber} ({st.name.split(' ')[0]})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Right Column */}
            <aside
              id="keamanan"
              className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-8 flex flex-col justify-between"
            >
              <div>
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 aspect-video">
                  {!thumbFailed ? (
                    <img
                      src={effectiveThumbSrc}
                      alt={`Suasana ruang ujian komputer ${schoolName || 'sekolah'}`}
                      referrerPolicy="no-referrer"
                      onError={() => setThumbFailed(true)}
                      className="h-full w-full object-cover"
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
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-3.5 sm:p-4 text-white">
                    <p className="text-[11px] font-medium text-slate-200">
                      Portal Asesmen Digital TKA &amp; AKM
                    </p>
                    <p className="text-sm font-semibold leading-snug truncate">
                      {schoolName || selectedSubject?.schoolName || 'Sekolah Penyelenggara'}
                    </p>
                  </div>
                </div>

                <h2 className="mt-5 text-lg font-semibold text-slate-900">
                  Kesiapan Paket & Keamanan Sesi
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Ringkasan parameter ujian untuk{' '}
                  {selectedSubject?.name || 'mata pelajaran terpilih'}.
                </p>

                <dl className="mt-4 divide-y divide-slate-100 border-t border-b border-slate-100 text-sm">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-600 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      Jumlah Butir Soal
                    </dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {questionCountBySubject[selectedSubject?.id || ''] || 0} butir
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-600 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-slate-400" />
                      Enkripsi Bank Soal
                    </dt>
                    <dd className="font-mono text-xs font-semibold text-slate-900">
                      AES-256-GCM
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-600 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      Batas Toleransi Pindah Tab
                    </dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      Maks. {selectedSubject?.maxViolations || 3} kali
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-600">Cache PDF Drive Offline</dt>
                    <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                      {cachedPdfCount} dokumen
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-600">Kamera Pengawas</dt>
                    <dd className="font-mono text-xs font-semibold text-slate-900">
                      {selectedSubject?.cameraRequired !== false
                        ? 'Otomatis Diminta'
                        : 'Opsional'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-5 text-xs text-slate-500">
                Nilai pilihan ganda & AKM ditampilkan otomatis setelah selesai, sedangkan soal isian dikoreksi Asisten AI berdasarkan kata kunci guru.
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};
