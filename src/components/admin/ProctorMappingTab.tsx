import React, { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  KeyRound,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  AccessCredentials,
  ExamRoom,
  ExamSessionSlot,
  ProctorMappingEntry,
  SubjectConfig,
} from '../../types/exam';
import { DEFAULT_PROCTOR_CREDENTIALS } from '../../data/defaultExamData';
import {
  downloadExcelProctorTemplate,
  parseProctorMappingsFromDelimited,
  parseProctorMappingsFromExcelBuffer,
} from '../../utils/staffImport';
import { SchoolLogo } from '../SchoolLogo';

interface ProctorMappingTabProps {
  schoolName: string;
  schoolLogoUrl: string;
  proctorMappings: ProctorMappingEntry[];
  examSessions: ExamSessionSlot[];
  examRooms: ExamRoom[];
  subjects: SubjectConfig[];
  proctorCredentials: AccessCredentials;
  onSaveProctorMappings: (next: ProctorMappingEntry[]) => void;
  onUpdateProctorCredentials: (next: AccessCredentials) => void;
}

export const ProctorMappingTab: React.FC<ProctorMappingTabProps> = ({
  schoolName,
  schoolLogoUrl,
  proctorMappings,
  examSessions,
  examRooms,
  subjects,
  proctorCredentials,
  onSaveProctorMappings,
  onUpdateProctorCredentials,
}) => {
  const [editing, setEditing] = useState<ProctorMappingEntry | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterSession, setFilterSession] = useState('ALL');
  const [printMode, setPrintMode] = useState(false);

  // Quick Proctor account management inside Pemetaan Pengawas Ruang
  const [draftUser, setDraftUser] = useState(proctorCredentials.username);
  const [draftPass, setDraftPass] = useState(proctorCredentials.password);
  const [showPass, setShowPass] = useState(false);
  const [credNotice, setCredNotice] = useState<string | null>(null);

  // Bulk Proctor Mapping Import state
  const [importOpen, setImportOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge_slot' | 'append'>(
    'merge_slot'
  );
  const [importPreview, setImportPreview] = useState<ProctorMappingEntry[]>([]);
  const [importSkipped, setImportSkipped] = useState<
    { line: number; reason: string }[]
  >([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);

  const filteredMappings = useMemo(() => {
    if (filterSession === 'ALL') return proctorMappings;
    return proctorMappings.filter((m) => m.sessionName === filterSession);
  }, [proctorMappings, filterSession]);

  const handleNewMapping = () => {
    const defSesi = examSessions[0];
    const defRoom = examRooms[0];
    const defSubj = subjects[0];
    setFormError(null);
    setEditing({
      id: `MAP-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      sessionId: defSesi?.id || '',
      sessionName: defSesi?.name || 'Sesi 1 (07:30)',
      roomId: defRoom?.id || '',
      roomName: defRoom?.name || 'Ruang 01',
      subjectId: defSubj?.id || '',
      subjectName: defSubj?.name || 'Mata Pelajaran',
      proctorName: defSesi?.proctorName || '',
      proctorNip: '',
      proctorUsername: proctorCredentials.username || 'pengawas',
      notes: '',
    });
  };

  const handleSaveMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.proctorName.trim()) {
      setFormError('Nama pengawas ruang wajib diisi.');
      return;
    }
    const clean: ProctorMappingEntry = {
      ...editing,
      proctorName: editing.proctorName.trim(),
      proctorNip: (editing.proctorNip || '').trim(),
      proctorUsername: (editing.proctorUsername || '').trim(),
      notes: (editing.notes || '').trim(),
    };
    const exists = proctorMappings.some((m) => m.id === clean.id);
    const next = exists
      ? proctorMappings.map((m) => (m.id === clean.id ? clean : m))
      : [...proctorMappings, clean];
    onSaveProctorMappings(next);
    setEditing(null);
    setFormError(null);
  };

  const handleDeleteMapping = (id: string) => {
    onSaveProctorMappings(proctorMappings.filter((m) => m.id !== id));
  };

  const handleSaveProctorCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftUser.trim() || draftPass.length < 4) {
      setCredNotice('Username wajib diisi dan password minimal 4 karakter.');
      return;
    }
    onUpdateProctorCredentials({
      username: draftUser.trim(),
      password: draftPass,
    });
    setCredNotice('Username & password akun Pengawas berhasil diperbarui.');
    setTimeout(() => setCredNotice(null), 4000);
  };

  const handleResetProctorPassword = () => {
    const cleanUser = draftUser.trim() || DEFAULT_PROCTOR_CREDENTIALS.username;
    setDraftUser(cleanUser);
    setDraftPass(DEFAULT_PROCTOR_CREDENTIALS.password);
    setShowPass(true);
    onUpdateProctorCredentials({
      username: cleanUser,
      password: DEFAULT_PROCTOR_CREDENTIALS.password,
    });
    setCredNotice(
      `Password Pengawas berhasil direset ke default: "${DEFAULT_PROCTOR_CREDENTIALS.password}".`
    );
    setTimeout(() => setCredNotice(null), 5000);
  };

  const handleGenerateRandomPass = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const nextPass = `PKT-${code}`;
    const cleanUser = draftUser.trim() || DEFAULT_PROCTOR_CREDENTIALS.username;
    setDraftUser(cleanUser);
    setDraftPass(nextPass);
    setShowPass(true);
    onUpdateProctorCredentials({
      username: cleanUser,
      password: nextPass,
    });
    setCredNotice(`Password acak baru Pengawas aktif: "${nextPass}".`);
    setTimeout(() => setCredNotice(null), 5000);
  };

  const handleDownloadProctorTemplate = async () => {
    setTemplateBusy(true);
    try {
      await downloadExcelProctorTemplate(
        schoolName,
        examSessions,
        examRooms,
        subjects,
        proctorCredentials.username || 'pengawas'
      );
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleParseProctorText = (text: string) => {
    setRawImportText(text);
    setImportError(null);
    if (!text.trim()) {
      setImportPreview([]);
      setImportSkipped([]);
      return;
    }
    const res = parseProctorMappingsFromDelimited(
      text,
      examSessions,
      examRooms,
      subjects,
      proctorCredentials.username || 'pengawas'
    );
    setImportPreview(res.mappings);
    setImportSkipped(res.skippedRows);
    if (res.mappings.length === 0) {
      setImportError(
        'Tidak ditemukan baris pengawas valid. Pastikan kolom Nama_Pengawas terisi.'
      );
    }
  };

  const handleProctorFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const res = parseProctorMappingsFromExcelBuffer(
            reader.result as ArrayBuffer,
            examSessions,
            examRooms,
            subjects,
            proctorCredentials.username || 'pengawas'
          );
          setImportPreview(res.mappings);
          setImportSkipped(res.skippedRows);
          if (res.mappings.length === 0) {
            setImportError(
              'File Excel terbaca, tetapi tidak ditemukan baris pengawas dengan Nama_Pengawas yang terisi.'
            );
          }
        } catch {
          setImportError(
            'Gagal membaca file Excel pengawas. Pastikan format .xlsx/.xls valid.'
          );
        }
      };
      reader.onerror = () => {
        setImportError('Gagal membaca file Excel dari perangkat.');
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        handleParseProctorText(String(reader.result || ''));
      };
      reader.onerror = () => {
        setImportError('Gagal membaca file CSV/teks dari perangkat.');
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleCommitProctorImport = () => {
    if (importPreview.length === 0) return;

    const slotKey = (m: ProctorMappingEntry) =>
      `${m.date.trim()}|${m.sessionName.trim().toLowerCase()}|${m.roomName
        .trim()
        .toLowerCase()}`;

    const nextList = [...proctorMappings];
    let added = 0;
    let updated = 0;

    for (const item of importPreview) {
      if (importMode === 'merge_slot') {
        const key = slotKey(item);
        const existingIdx = nextList.findIndex((m) => slotKey(m) === key);
        if (existingIdx > -1) {
          nextList[existingIdx] = { ...item, id: nextList[existingIdx].id };
          updated += 1;
          continue;
        }
      }
      nextList.push(item);
      added += 1;
    }

    onSaveProctorMappings(nextList);
    setImportOpen(false);
    setRawImportText('');
    setImportPreview([]);
    setImportSkipped([]);
    setImportFeedback(
      `Import data pengawas selesai: ${added} jadwal ditambahkan${
        updated > 0 ? `, ${updated} jadwal ruang diperbarui` : ''
      }.`
    );
    setTimeout(() => setImportFeedback(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Pemetaan Pengawas Ruang &amp; Akun Pengawas ({proctorMappings.length})
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Tetapkan tugas pengawas per ruang dan sesi ujian, atur/reset password akun Pengawas, serta cetak daftar pemetaan resmi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={templateBusy}
            onClick={handleDownloadProctorTemplate}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            {templateBusy ? 'Menyiapkan...' : 'Template Excel Pengawas'}
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import Data Pengawas
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
            Cetak Pemetaan A4
          </button>
          <button
            type="button"
            onClick={handleNewMapping}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Pemetaan
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="no-print rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-800">
          {importFeedback}
        </div>
      )}

      {importOpen && !printMode && (
        <div className="no-print rounded-xl border border-blue-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Import Data Pengawas Ruang (Excel .xlsx / CSV / Tempel dari Sheets)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Urutan kolom:{' '}
                <span className="font-mono">
                  Tanggal, Sesi_Ujian, Ruang_Ujian, Mata_Pelajaran, Nama_Pengawas, NIP_Kode, Username_Akun, Catatan
                </span>
                .
              </p>
            </div>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-800"
              aria-label="Tutup panel import pengawas"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
              <Upload className="h-3.5 w-3.5" />
              <span>Pilih File Excel / CSV Pengawas...</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleProctorFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-700">
                Jika Tanggal + Sesi + Ruang sama:
              </span>
              <select
                value={importMode}
                onChange={(e) =>
                  setImportMode(e.target.value as 'merge_slot' | 'append')
                }
                className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
              >
                <option value="merge_slot">Perbarui pengawas di slot tersebut</option>
                <option value="append">Tambahkan sebagai entri baru</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Atau Tempel Data Langsung dari Excel / Google Sheets:
            </label>
            <textarea
              rows={4}
              value={rawImportText}
              onChange={(e) => handleParseProctorText(e.target.value)}
              placeholder={`2026-11-16\tSesi 1 (07:30)\tRuang 01\tLiterasi & Numerasi\tDrs. Hendra Wijaya, M.Pd\t197804152005011008\tpengawas\tPengawas Utama`}
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-800"
            />
          </div>

          {importError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              {importError}
            </div>
          )}

          {importSkipped.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              {importSkipped.length} baris dilewati:{' '}
              {importSkipped
                .map((s) => s.reason)
                .slice(0, 3)
                .join('; ')}
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-emerald-700">
                Siap mengimpor {importPreview.length} jadwal pengawas valid:
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">Sesi &amp; Ruang</th>
                      <th className="px-3 py-2">Mata Pelajaran</th>
                      <th className="px-3 py-2">Nama Pengawas</th>
                      <th className="px-3 py-2">NIP / Username</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.slice(0, 20).map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-1.5 font-mono">{m.date}</td>
                        <td className="px-3 py-1.5">
                          {m.roomName} · {m.sessionName}
                        </td>
                        <td className="px-3 py-1.5">{m.subjectName}</td>
                        <td className="px-3 py-1.5 font-medium text-slate-900">
                          {m.proctorName}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-600">
                          {m.proctorNip || '-'} ({m.proctorUsername || 'pengawas'})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRawImportText('');
                    setImportPreview([]);
                    setImportSkipped([]);
                    setImportOpen(false);
                  }}
                  className="min-h-[38px] rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCommitProctorImport}
                  className="min-h-[38px] rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Simpan {importPreview.length} Data Pengawas
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Proctor Login Account Management Card */}
      {!printMode && (
        <section className="no-print rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <KeyRound className="h-4 w-4 text-blue-700" />
              Pengaturan Cepat Akun Login Pengawas / Proktor
            </div>
            <span className="font-mono text-xs text-slate-500">
              Password default: {DEFAULT_PROCTOR_CREDENTIALS.password}
            </span>
          </div>

          {credNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800">
              {credNotice}
            </div>
          )}

          <form
            onSubmit={handleSaveProctorCreds}
            className="grid gap-3 sm:grid-cols-12 items-end"
          >
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700">
                Username Pengawas
              </label>
              <input
                type="text"
                value={draftUser}
                onChange={(e) => setDraftUser(e.target.value)}
                className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700">
                Password Pengawas
              </label>
              <div className="relative mt-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={draftPass}
                  onChange={(e) => setDraftPass(e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-slate-300 py-1.5 pl-3 pr-9 font-mono text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label="Lihat atau sembunyikan password"
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-6 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="min-h-[38px] rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                Simpan Perubahan
              </button>
              <button
                type="button"
                onClick={handleGenerateRandomPass}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 whitespace-nowrap"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Acak Password Baru
              </button>
              <button
                type="button"
                onClick={handleResetProctorPassword}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Password Default
              </button>
            </div>
          </form>
        </section>
      )}

      {editing && !printMode && (
        <form
          onSubmit={handleSaveMapping}
          className="no-print rounded-xl border border-blue-200 bg-white p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900">
            {proctorMappings.some((m) => m.id === editing.id)
              ? 'Edit Pemetaan Pengawas Ruang'
              : 'Tambah Pemetaan Pengawas Ruang'}
          </h3>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Sesi Ujian
              </label>
              <select
                value={editing.sessionName}
                onChange={(e) => {
                  const found = examSessions.find(
                    (s) => s.name === e.target.value
                  );
                  setEditing({
                    ...editing,
                    sessionId: found?.id || '',
                    sessionName: e.target.value,
                  });
                }}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {examSessions.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.startTime}–{s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Ruang Ujian
              </label>
              <select
                value={editing.roomName}
                onChange={(e) => {
                  const found = examRooms.find((r) => r.name === e.target.value);
                  setEditing({
                    ...editing,
                    roomId: found?.id || '',
                    roomName: e.target.value,
                  });
                }}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {examRooms.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Mata Pelajaran / Paket Ujian
              </label>
              <select
                value={editing.subjectName}
                onChange={(e) => {
                  const found = subjects.find((s) => s.name === e.target.value);
                  setEditing({
                    ...editing,
                    subjectId: found?.id || '',
                    subjectName: e.target.value,
                  });
                }}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                Nama Pengawas Ruang
              </label>
              <input
                type="text"
                required
                value={editing.proctorName}
                onChange={(e) =>
                  setEditing({ ...editing, proctorName: e.target.value })
                }
                placeholder="Contoh: Drs. Hendra Wijaya, M.Pd"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                NIP / Kode Pengawas (Opsional)
              </label>
              <input
                type="text"
                value={editing.proctorNip || ''}
                onChange={(e) =>
                  setEditing({ ...editing, proctorNip: e.target.value })
                }
                placeholder="197804..."
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Username Login Digunakan
              </label>
              <input
                type="text"
                value={editing.proctorUsername || ''}
                onChange={(e) =>
                  setEditing({ ...editing, proctorUsername: e.target.value })
                }
                placeholder={proctorCredentials.username}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Catatan Tugas (Opsional)
              </label>
              <input
                type="text"
                value={editing.notes || ''}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
                placeholder="Pengawas utama ruang"
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
              Simpan Pemetaan
            </button>
          </div>
        </form>
      )}

      {/* Printable A4 Table */}
      <div className="print-page rounded-xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-700">
            Menampilkan {filteredMappings.length} dari {proctorMappings.length} jadwal pengawas
          </span>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
          >
            <option value="ALL">Semua Sesi</option>
            {examSessions.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

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
                Daftar Pemetaan Pengawas Ruang Ujian Berbasis Komputer
              </h3>
              <p className="text-xs text-slate-600">
                Filter Sesi: {filterSession === 'ALL' ? 'Semua Sesi' : filterSession}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Dicetak: {new Date().toLocaleDateString('id-ID')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-300 bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Sesi &amp; Ruang</th>
                <th className="py-2.5 px-3">Mata Pelajaran</th>
                <th className="py-2.5 px-3">Nama Pengawas</th>
                <th className="py-2.5 px-3">NIP / Akun</th>
                <th className="py-2.5 px-3">Catatan</th>
                {!printMode && (
                  <th className="no-print py-2.5 px-3 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMappings.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                    {item.date}
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900">{item.roomName}</p>
                    <p className="text-[11px] text-slate-500">{item.sessionName}</p>
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">{item.subjectName}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {item.proctorName}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                    <p>{item.proctorNip || '-'}</p>
                    {item.proctorUsername && (
                      <p className="text-[11px] text-blue-700">
                        User: {item.proctorUsername}
                      </p>
                    )}
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
                          onClick={() => handleDeleteMapping(item.id)}
                          className="text-red-600 hover:text-red-800"
                          aria-label={`Hapus pemetaan ${item.proctorName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredMappings.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-xs sm:text-sm text-slate-500"
                  >
                    Belum ada pemetaan pengawas ruang pada filter ini.
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
            <p className="font-semibold text-slate-900">Ketua Panitia Ujian</p>
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
