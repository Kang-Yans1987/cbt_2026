import React, { useEffect, useState } from 'react';
import {
  Building2,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  KeyRound,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import type { AccessCredentials, ExamTimeSettings } from '../../types/exam';
import { DEFAULT_PROCTOR_CREDENTIALS } from '../../data/defaultExamData';
import { compressImageFileToDataUrl } from '../../utils/imageHelper';
import { SchoolLogo } from '../SchoolLogo';
import defaultBerandaThumbnail from '../../assets/images/beranda_cbt_thumbnail_1794628073884.jpg';

interface IdentitySettingsTabProps {
  appTitle: string;
  schoolName: string;
  schoolLogoUrl: string;
  homeThumbnailUrl: string;
  adminCredentials: AccessCredentials;
  proctorCredentials: AccessCredentials;
  examTimeSettings: ExamTimeSettings;
  onUpdateBranding: (branding: {
    appTitle: string;
    schoolName: string;
    schoolLogoUrl: string;
    homeThumbnailUrl: string;
  }) => void;
  onUpdateAccessCredentials: (next: {
    adminCredentials: AccessCredentials;
    proctorCredentials: AccessCredentials;
  }) => void;
  onUpdateExamTimeSettings: (next: ExamTimeSettings) => void;
}

export const IdentitySettingsTab: React.FC<IdentitySettingsTabProps> = ({
  appTitle,
  schoolName,
  schoolLogoUrl,
  homeThumbnailUrl,
  adminCredentials,
  proctorCredentials,
  examTimeSettings,
  onUpdateBranding,
  onUpdateAccessCredentials,
  onUpdateExamTimeSettings,
}) => {
  const [draftTitle, setDraftTitle] = useState(appTitle);
  const [draftSchool, setDraftSchool] = useState(schoolName);
  const [draftLogo, setDraftLogo] = useState(schoolLogoUrl);
  const [draftThumb, setDraftThumb] = useState(homeThumbnailUrl);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingSaved, setBrandingSaved] = useState(false);

  const [draftAdminUser, setDraftAdminUser] = useState(
    adminCredentials.username
  );
  const [draftAdminPass, setDraftAdminPass] = useState(
    adminCredentials.password
  );
  const [draftProctorUser, setDraftProctorUser] = useState(
    proctorCredentials.username
  );
  const [draftProctorPass, setDraftProctorPass] = useState(
    proctorCredentials.password
  );
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showProctorPass, setShowProctorPass] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);
  const [credSaved, setCredSaved] = useState<string | null>(null);

  const [draftTimeSettings, setDraftTimeSettings] =
    useState<ExamTimeSettings>(examTimeSettings);
  const [timeSaved, setTimeSaved] = useState(false);
  const [liveClock, setLiveClock] = useState(() => new Date());

  useEffect(() => {
    setDraftTitle(appTitle);
    setDraftSchool(schoolName);
    setDraftLogo(schoolLogoUrl);
    setDraftThumb(homeThumbnailUrl);
  }, [appTitle, schoolName, schoolLogoUrl, homeThumbnailUrl]);

  useEffect(() => {
    setDraftAdminUser(adminCredentials.username);
    setDraftAdminPass(adminCredentials.password);
    setDraftProctorUser(proctorCredentials.username);
    setDraftProctorPass(proctorCredentials.password);
  }, [adminCredentials, proctorCredentials]);

  useEffect(() => {
    setDraftTimeSettings(examTimeSettings);
  }, [examTimeSettings]);

  useEffect(() => {
    const id = window.setInterval(() => setLiveClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrandingError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxDimension: 256,
        quality: 0.9,
        preserveTransparency: true,
      });
      setDraftLogo(dataUrl);
      setBrandingSaved(false);
    } catch (err) {
      setBrandingError(
        err instanceof Error ? err.message : 'Gagal memproses file logo.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrandingError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxDimension: 960,
        quality: 0.84,
      });
      setDraftThumb(dataUrl);
      setBrandingSaved(false);
    } catch (err) {
      setBrandingError(
        err instanceof Error
          ? err.message
          : 'Gagal memproses gambar thumbnail beranda.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftSchool.trim()) {
      setBrandingError('Nama aplikasi dan nama sekolah tidak boleh kosong.');
      return;
    }
    setBrandingError(null);
    onUpdateBranding({
      appTitle: draftTitle.trim(),
      schoolName: draftSchool.trim(),
      schoolLogoUrl: draftLogo.trim(),
      homeThumbnailUrl: draftThumb.trim(),
    });
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 3000);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);

    if (!draftAdminUser.trim() || !draftProctorUser.trim()) {
      setCredError('Username Admin dan Pengawas tidak boleh kosong.');
      return;
    }
    if (draftAdminPass.length < 4 || draftProctorPass.length < 4) {
      setCredError('Password Admin dan Pengawas minimal 4 karakter.');
      return;
    }

    onUpdateAccessCredentials({
      adminCredentials: {
        username: draftAdminUser.trim(),
        password: draftAdminPass,
      },
      proctorCredentials: {
        username: draftProctorUser.trim(),
        password: draftProctorPass,
      },
    });
    setCredSaved('Username dan password Admin serta Pengawas berhasil diperbarui.');
    setTimeout(() => setCredSaved(null), 4000);
  };

  const applyProctorPasswordChange = (newPassword: string, label: string) => {
    setCredError(null);
    const nextProctor: AccessCredentials = {
      username: draftProctorUser.trim() || DEFAULT_PROCTOR_CREDENTIALS.username,
      password: newPassword,
    };
    setDraftProctorUser(nextProctor.username);
    setDraftProctorPass(nextProctor.password);
    setShowProctorPass(true);
    onUpdateAccessCredentials({
      adminCredentials: {
        username: draftAdminUser.trim() || adminCredentials.username,
        password: draftAdminPass || adminCredentials.password,
      },
      proctorCredentials: nextProctor,
    });
    setCredSaved(label);
    setTimeout(() => setCredSaved(null), 5000);
  };

  const handleResetProctorToDefault = () => {
    applyProctorPasswordChange(
      DEFAULT_PROCTOR_CREDENTIALS.password,
      `Password Pengawas (${draftProctorUser.trim() || 'pengawas'}) berhasil direset ke default: "${DEFAULT_PROCTOR_CREDENTIALS.password}".`
    );
  };

  const handleRandomProctorPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const nextPass = `PKT-${code}`;
    applyProctorPasswordChange(
      nextPass,
      `Password baru Pengawas berhasil dibuat & diterapkan: "${nextPass}".`
    );
  };

  const handleSaveTimeSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateExamTimeSettings({
      ...draftTimeSettings,
      minSubmitMinutes: Math.max(
        0,
        Number(draftTimeSettings.minSubmitMinutes) || 0
      ),
      warningMinutesBeforeEnd: Math.max(
        1,
        Number(draftTimeSettings.warningMinutesBeforeEnd) || 5
      ),
      showScoreImmediately: draftTimeSettings.showScoreImmediately !== false,
      examInfoNotes: draftTimeSettings.examInfoNotes || '',
    });
    setTimeSaved(true);
    setTimeout(() => setTimeSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* School Identity & Logo Settings */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Pengaturan Logo Sekolah, Thumbnail &amp; Identitas Aplikasi
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
                Logo, judul portal, dan nama instansi ditampilkan pada beranda peserta, kartu ujian, serta rekap nilai kelas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <SchoolLogo
              logoUrl={draftLogo}
              schoolName={draftSchool}
              size="md"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-900">
                {draftTitle || 'DutawangiCBT'}
              </p>
              <p className="text-slate-500 truncate max-w-[160px]">
                {draftSchool}
              </p>
            </div>
          </div>
        </div>

        {brandingError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
            {brandingError}
          </div>
        )}
        {brandingSaved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
            Logo sekolah dan identitas aplikasi berhasil disimpan.
          </div>
        )}

        <form onSubmit={handleSaveBranding} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Nama Aplikasi / Portal Ujian
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                placeholder="DutawangiCBT"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Nama Sekolah / Lembaga
              </label>
              <input
                type="text"
                value={draftSchool}
                onChange={(e) => setDraftSchool(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                placeholder="SD Negeri 2 Tukangkayu"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Unggah Logo Sekolah (PNG/JPG/SVG, disimpan offline)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Pilih File Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {draftLogo && (
                  <button
                    type="button"
                    onClick={() => setDraftLogo('')}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset Logo Bawaan
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Atau URL Logo Eksternal (Opsional)
              </label>
              <input
                type="url"
                value={draftLogo.startsWith('data:') ? '' : draftLogo}
                onChange={(e) => setDraftLogo(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid gap-4 sm:grid-cols-2 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Thumbnail Foto Beranda (Opsional — Ganti Gambar Ruang Ujian)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Unggah Thumbnail Beranda</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                </label>
                {draftThumb && (
                  <button
                    type="button"
                    onClick={() => setDraftThumb('')}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Gunakan Foto Bawaan
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={draftThumb || defaultBerandaThumbnail}
                alt="Pratinjau thumbnail beranda"
                className="h-16 w-28 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-100"
              />
              <span className="text-xs text-slate-500">
                {draftThumb
                  ? 'Menggunakan thumbnail kustom sekolah.'
                  : 'Menggunakan thumbnail foto ruang CBT bawaan.'}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Simpan Logo, Thumbnail &amp; Identitas
            </button>
          </div>
        </form>
      </section>

      {/* Global Exam Time, Score Visibility & Portal Info Settings */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Pengaturan Waktu, Tampilan Nilai &amp; Informasi Ujian
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
                Atur zona waktu, apakah nilai langsung muncul setelah siswa selesai, serta catatan tata tertib &amp; informasi pada menu Jadwal &amp; Informasi.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-right shrink-0">
            <p className="text-[11px] text-slate-500">Jam Sistem Sekolah</p>
            <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
              {liveClock.toLocaleTimeString('id-ID')} {draftTimeSettings.timezone}
            </p>
          </div>
        </div>

        {timeSaved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
            Pengaturan waktu, tampilan nilai, dan informasi ujian berhasil disimpan.
          </div>
        )}

        <form onSubmit={handleSaveTimeSettings} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Zona Waktu Pelaksanaan
              </label>
              <select
                value={draftTimeSettings.timezone}
                onChange={(e) => {
                  setDraftTimeSettings({
                    ...draftTimeSettings,
                    timezone: e.target.value as ExamTimeSettings['timezone'],
                  });
                  setTimeSaved(false);
                }}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="WIB">WIB (UTC+7 — Waktu Indonesia Barat)</option>
                <option value="WITA">WITA (UTC+8 — Waktu Indonesia Tengah)</option>
                <option value="WIT">WIT (UTC+9 — Waktu Indonesia Timur)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Minimal Waktu Sebelum Selesai (Menit)
              </label>
              <input
                type="number"
                min={0}
                value={draftTimeSettings.minSubmitMinutes}
                onChange={(e) => {
                  setDraftTimeSettings({
                    ...draftTimeSettings,
                    minSubmitMinutes: Math.max(0, Number(e.target.value) || 0),
                  });
                  setTimeSaved(false);
                }}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Isi 0 jika peserta bebas menekan Selesai kapan saja.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Peringatan Waktu Hampir Habis (Menit)
              </label>
              <input
                type="number"
                min={1}
                value={draftTimeSettings.warningMinutesBeforeEnd}
                onChange={(e) => {
                  setDraftTimeSettings({
                    ...draftTimeSettings,
                    warningMinutesBeforeEnd: Math.max(
                      1,
                      Number(e.target.value) || 5
                    ),
                  });
                  setTimeSaved(false);
                }}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Timer berubah merah ketika sisa waktu mencapai batas ini.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs sm:text-sm text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={draftTimeSettings.showScoreImmediately !== false}
                onChange={(e) => {
                  setDraftTimeSettings({
                    ...draftTimeSettings,
                    showScoreImmediately: e.target.checked,
                  });
                  setTimeSaved(false);
                }}
                className="mt-0.5"
              />
              <span>
                <strong className="block text-slate-900">
                  Munculkan Nilai Langsung Setelah Selesai
                </strong>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  Jika dinonaktifkan, siswa hanya melihat konfirmasi jawaban terkirim tanpa angka nilai, sementara nilai tetap terekap di Admin &amp; Sheets.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs sm:text-sm text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={draftTimeSettings.enforceScheduleWindow}
                onChange={(e) => {
                  setDraftTimeSettings({
                    ...draftTimeSettings,
                    enforceScheduleWindow: e.target.checked,
                  });
                  setTimeSaved(false);
                }}
                className="mt-0.5"
              />
              <span>
                <strong className="block text-slate-900">
                  Kunci Login di Luar Jadwal Mata Pelajaran
                </strong>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  Peserta hanya bisa masuk jika waktu sistem berada di antara Waktu Buka &amp; Waktu Tutup ujian.
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1">
              <FileText className="h-3.5 w-3.5 text-blue-700" />
              Informasi &amp; Tata Tertib Ujian (Ditampilkan pada Menu Jadwal &amp; Informasi)
            </label>
            <textarea
              rows={3}
              value={draftTimeSettings.examInfoNotes || ''}
              onChange={(e) => {
                setDraftTimeSettings({
                  ...draftTimeSettings,
                  examInfoNotes: e.target.value,
                });
                setTimeSaved(false);
              }}
              placeholder="Contoh: Peserta wajib hadir 15 menit sebelum sesi dimulai, dilarang membuka tab lain, dan siapkan token dari pengawas."
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs sm:text-sm text-slate-900"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              Simpan Pengaturan Waktu &amp; Tampilan
            </button>
          </div>
        </form>
      </section>

      {/* Admin & Proctor Credentials Settings */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Keamanan Akses Admin &amp; Pengawas (Username &amp; Password)
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Atur kredensial masuk untuk Administrator utama serta akun khusus Ruang Pengawas / Proktor.
            </p>
          </div>
        </div>

        {credError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
            {credError}
          </div>
        )}
        {credSaved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
            {credSaved}
          </div>
        )}

        <form onSubmit={handleSaveCredentials} className="space-y-4">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <KeyRound className="h-4 w-4 text-slate-700" />
                Akun Administrator Utama
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Username Admin
                </label>
                <input
                  type="text"
                  required
                  value={draftAdminUser}
                  onChange={(e) => {
                    setDraftAdminUser(e.target.value);
                    setCredSaved(null);
                  }}
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Password Admin
                </label>
                <div className="relative mt-1">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={draftAdminPass}
                    onChange={(e) => {
                      setDraftAdminPass(e.target.value);
                      setCredSaved(null);
                    }}
                    className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 font-mono text-sm"
                    placeholder="Minimal 4 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass((prev) => !prev)}
                    aria-label={
                      showAdminPass
                        ? 'Sembunyikan password admin'
                        : 'Lihat password admin'
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
                  >
                    {showAdminPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-blue-700" />
                  Akun Akses Pengawas / Proktor
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  Default: {DEFAULT_PROCTOR_CREDENTIALS.password}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Username Pengawas
                </label>
                <input
                  type="text"
                  required
                  value={draftProctorUser}
                  onChange={(e) => {
                    setDraftProctorUser(e.target.value);
                    setCredSaved(null);
                  }}
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                  placeholder="pengawas"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Password Pengawas
                </label>
                <div className="relative mt-1">
                  <input
                    type={showProctorPass ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={draftProctorPass}
                    onChange={(e) => {
                      setDraftProctorPass(e.target.value);
                      setCredSaved(null);
                    }}
                    className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 font-mono text-sm"
                    placeholder="Minimal 4 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProctorPass((prev) => !prev)}
                    aria-label={
                      showProctorPass
                        ? 'Sembunyikan password pengawas'
                        : 'Lihat password pengawas'
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
                  >
                    {showProctorPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRandomProctorPassword}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Buat Password Baru Acak
                </button>
                <button
                  type="button"
                  onClick={handleResetProctorToDefault}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset ke Default ({DEFAULT_PROCTOR_CREDENTIALS.password})
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Simpan User &amp; Password Akses
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
