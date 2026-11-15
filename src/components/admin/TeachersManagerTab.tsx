import React, { useMemo, useState } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GraduationCap,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  AdminSectionId,
  SubjectConfig,
  TeacherAccount,
} from '../../types/exam';
import {
  downloadExcelTeacherTemplate,
  parseTeachersFromDelimited,
  parseTeachersFromExcelBuffer,
} from '../../utils/staffImport';

export const ADMIN_MENU_OPTIONS: { id: AdminSectionId; label: string }[] = [
  { id: 'analytics', label: 'Analitik & Monitor' },
  { id: 'proctor', label: 'Pengawas / Proktor' },
  { id: 'questions', label: 'Bank Soal & AI' },
  { id: 'drive', label: 'PDF Google Drive' },
  { id: 'identity', label: 'Identitas & Waktu' },
  { id: 'subjects', label: 'Mapel & Token' },
  { id: 'sessions', label: 'Sesi Ujian' },
  { id: 'rooms', label: 'Pengaturan Ruang' },
  { id: 'proctor_mapping', label: 'Pemetaan Pengawas' },
  { id: 'schedule', label: 'Jadwal Pelaksanaan' },
  { id: 'berita_acara', label: 'Berita Acara' },
  { id: 'students', label: 'Data Peserta' },
  { id: 'teachers', label: 'Akun Guru' },
  { id: 'print', label: 'Cetak & Preview' },
  { id: 'sheets', label: 'Sheets & Backup' },
  { id: 'reset', label: 'Reset Data' },
];

export const DEFAULT_TEACHER_ALLOWED_MENUS: AdminSectionId[] = [
  'analytics',
  'questions',
  'drive',
  'print',
];

interface TeachersManagerTabProps {
  schoolName?: string;
  teachers: TeacherAccount[];
  subjects: SubjectConfig[];
  onSaveTeacher: (teacher: TeacherAccount) => void;
  onDeleteTeacher: (id: string) => void;
  onUpdateTeachersBatch: (nextTeachers: TeacherAccount[]) => void;
}

export const TeachersManagerTab: React.FC<TeachersManagerTabProps> = ({
  schoolName = 'SD Negeri 2 Tukangkayu',
  teachers,
  subjects,
  onSaveTeacher,
  onDeleteTeacher,
  onUpdateTeachersBatch,
}) => {
  const [editingTeacher, setEditingTeacher] = useState<TeacherAccount | null>(
    null
  );
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [revealedTeacherPassIds, setRevealedTeacherPassIds] = useState<
    string[]
  >([]);

  const [importOpen, setImportOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'append_only'>('merge');
  const [importPreview, setImportPreview] = useState<TeacherAccount[]>([]);
  const [importSkipped, setImportSkipped] = useState<
    { line: number; reason: string }[]
  >([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q) ||
        t.subjectSpecialty.toLowerCase().includes(q) ||
        (t.nip || '').toLowerCase().includes(q)
    );
  }, [teachers, teacherSearch]);

  const handleNewTeacher = () => {
    setTeacherError(null);
    setEditingTeacher({
      id: `GURU-${Date.now()}`,
      nip: '',
      name: '',
      subjectSpecialty: subjects[0]?.name || 'Umum',
      username: '',
      password: '',
      active: true,
      allowedMenus: [...DEFAULT_TEACHER_ALLOWED_MENUS],
    });
  };

  const toggleMenuPermission = (menuId: AdminSectionId) => {
    if (!editingTeacher) return;
    const current =
      editingTeacher.allowedMenus && editingTeacher.allowedMenus.length > 0
        ? editingTeacher.allowedMenus
        : [...DEFAULT_TEACHER_ALLOWED_MENUS];
    const exists = current.includes(menuId);
    const next = exists
      ? current.filter((m) => m !== menuId)
      : [...current, menuId];
    setEditingTeacher({
      ...editingTeacher,
      allowedMenus: next,
    });
  };

  const handleSaveTeacherForm = () => {
    if (!editingTeacher) return;
    if (!editingTeacher.name.trim()) {
      setTeacherError('Nama lengkap guru wajib diisi.');
      return;
    }
    if (!editingTeacher.username.trim()) {
      setTeacherError('Username akses guru wajib diisi.');
      return;
    }
    if (editingTeacher.password.length < 4) {
      setTeacherError('Password akses guru minimal 4 karakter.');
      return;
    }
    const allowedMenus =
      editingTeacher.allowedMenus && editingTeacher.allowedMenus.length > 0
        ? editingTeacher.allowedMenus
        : [];
    if (allowedMenus.length === 0) {
      setTeacherError(
        'Pilih minimal 1 menu yang dapat diakses oleh akun guru ini.'
      );
      return;
    }
    const duplicate = teachers.some(
      (t) =>
        t.id !== editingTeacher.id &&
        t.username.trim().toLowerCase() ===
          editingTeacher.username.trim().toLowerCase()
    );
    if (duplicate) {
      setTeacherError('Username guru sudah dipakai oleh akun guru lain.');
      return;
    }
    setTeacherError(null);
    onSaveTeacher({
      ...editingTeacher,
      name: editingTeacher.name.trim(),
      nip: (editingTeacher.nip || '').trim(),
      subjectSpecialty: editingTeacher.subjectSpecialty.trim() || 'Umum',
      username: editingTeacher.username.trim(),
      allowedMenus,
    });
    setEditingTeacher(null);
  };

  const menuLabelById = useMemo(
    () => new Map(ADMIN_MENU_OPTIONS.map((m) => [m.id, m.label])),
    []
  );

  const handleDownloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      await downloadExcelTeacherTemplate(
        schoolName,
        subjects[0]?.name || 'Umum'
      );
    } finally {
      setTemplateBusy(false);
    }
  };

  const handleParseTeacherText = (text: string) => {
    setRawImportText(text);
    setImportError(null);
    if (!text.trim()) {
      setImportPreview([]);
      setImportSkipped([]);
      return;
    }
    const res = parseTeachersFromDelimited(
      text,
      subjects[0]?.name || 'Umum',
      teachers.length
    );
    setImportPreview(res.teachers);
    setImportSkipped(res.skippedRows);
    if (res.teachers.length === 0) {
      setImportError(
        'Tidak ditemukan baris guru yang valid. Pastikan kolom Nama_Guru terisi.'
      );
    }
  };

  const handleTeacherFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const res = parseTeachersFromExcelBuffer(
            reader.result as ArrayBuffer,
            subjects[0]?.name || 'Umum',
            teachers.length
          );
          setImportPreview(res.teachers);
          setImportSkipped(res.skippedRows);
          if (res.teachers.length === 0) {
            setImportError(
              'File Excel terbaca, tetapi tidak ditemukan baris data guru dengan Nama_Guru yang terisi.'
            );
          }
        } catch {
          setImportError('Gagal membaca file Excel guru. Pastikan format .xlsx/.xls valid.');
        }
      };
      reader.onerror = () => {
        setImportError('Gagal membaca file Excel dari perangkat.');
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        handleParseTeacherText(String(reader.result || ''));
      };
      reader.onerror = () => {
        setImportError('Gagal membaca file CSV/teks dari perangkat.');
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleCommitTeacherImport = () => {
    if (importPreview.length === 0) return;
    const byUsername = new Map<string, TeacherAccount>();
    teachers.forEach((t) =>
      byUsername.set(t.username.trim().toLowerCase(), t)
    );

    let added = 0;
    let updated = 0;
    const nextList = [...teachers];

    for (const item of importPreview) {
      const key = item.username.trim().toLowerCase();
      const existing = byUsername.get(key);
      if (existing) {
        if (importMode === 'merge') {
          const idx = nextList.findIndex((t) => t.id === existing.id);
          if (idx > -1) {
            nextList[idx] = { ...item, id: existing.id };
            updated += 1;
          }
        }
      } else {
        nextList.push(item);
        byUsername.set(key, item);
        added += 1;
      }
    }

    onUpdateTeachersBatch(nextList);
    setImportOpen(false);
    setRawImportText('');
    setImportPreview([]);
    setImportSkipped([]);
    setImportFeedback(
      `Import data guru selesai: ${added} akun ditambahkan${
        updated > 0 ? `, ${updated} akun diperbarui` : ''
      }.`
    );
    setTimeout(() => setImportFeedback(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Data Guru, Akun Akses &amp; Hak Akses Menu ({teachers.length})
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Kelola profil guru, kredensial login, serta tentukan menu panel apa saja yang boleh diakses masing-masing guru.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={templateBusy}
            onClick={handleDownloadTemplate}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            {templateBusy ? 'Menyiapkan...' : 'Template Excel Guru'}
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import Data Guru
          </button>
          <button
            type="button"
            onClick={handleNewTeacher}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Akun Guru
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-800">
          {importFeedback}
        </div>
      )}

      {importOpen && (
        <div className="rounded-xl border border-blue-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Import Data Guru Kolektif (Excel .xlsx / CSV / Tempel dari Sheets)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Urutan kolom:{' '}
                <span className="font-mono">
                  NIP_Kode, Nama_Guru, Mapel_Diampu, Username, Password, Status_Aktif, Hak_Menu
                </span>
                . Password default <span className="font-mono">guru2026</span> jika dikosongkan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-800"
              aria-label="Tutup panel import guru"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
              <Upload className="h-3.5 w-3.5" />
              <span>Pilih File Excel / CSV Guru...</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleTeacherFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-700">
                Jika Username sama:
              </span>
              <select
                value={importMode}
                onChange={(e) =>
                  setImportMode(e.target.value as 'merge' | 'append_only')
                }
                className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
              >
                <option value="merge">Perbarui data yang sama</option>
                <option value="append_only">Lewati yang sudah ada</option>
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
              onChange={(e) => handleParseTeacherText(e.target.value)}
              placeholder={`198504122010012014\tSiti Rahayu, S.Pd\tMatematika\tguru.siti\tguru2026\tAktif\tanalytics,questions,drive,print`}
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
                Siap mengimpor {importPreview.length} data guru valid:
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">NIP / Kode</th>
                      <th className="px-3 py-2">Nama Guru</th>
                      <th className="px-3 py-2">Mapel</th>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Password</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.slice(0, 20).map((t) => (
                      <tr key={t.id}>
                        <td className="px-3 py-1.5 font-mono text-slate-500">
                          {t.nip || '-'}
                        </td>
                        <td className="px-3 py-1.5 font-medium text-slate-900">
                          {t.name}
                        </td>
                        <td className="px-3 py-1.5 text-slate-700">
                          {t.subjectSpecialty}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-blue-700">
                          {t.username}
                        </td>
                        <td className="px-3 py-1.5 font-mono">{t.password}</td>
                        <td className="px-3 py-1.5">
                          {t.active ? 'Aktif' : 'Nonaktif'}
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
                  onClick={handleCommitTeacherImport}
                  className="min-h-[38px] rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Simpan {importPreview.length} Guru ke Database
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {editingTeacher && (
        <div className="rounded-xl border border-blue-200 bg-white p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            {teachers.some((t) => t.id === editingTeacher.id)
              ? 'Edit Data, Akun & Hak Menu Guru'
              : 'Tambah Data Guru Baru'}
          </h3>
          {teacherError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {teacherError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Nama Lengkap Guru &amp; Gelar
              </label>
              <input
                type="text"
                value={editingTeacher.name}
                onChange={(e) =>
                  setEditingTeacher({
                    ...editingTeacher,
                    name: e.target.value,
                  })
                }
                placeholder="Contoh: Dra. Siti Rahayu, M.Pd"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                NIP / Kode Guru (Opsional)
              </label>
              <input
                type="text"
                value={editingTeacher.nip || ''}
                onChange={(e) =>
                  setEditingTeacher({
                    ...editingTeacher,
                    nip: e.target.value,
                  })
                }
                placeholder="198501..."
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Mata Pelajaran Diampu
              </label>
              <input
                type="text"
                value={editingTeacher.subjectSpecialty}
                onChange={(e) =>
                  setEditingTeacher({
                    ...editingTeacher,
                    subjectSpecialty: e.target.value,
                  })
                }
                placeholder="Matematika / AKM"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Username Login Guru
              </label>
              <input
                type="text"
                value={editingTeacher.username}
                onChange={(e) =>
                  setEditingTeacher({
                    ...editingTeacher,
                    username: e.target.value,
                  })
                }
                placeholder="guru.matematika"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Password Login Guru
              </label>
              <input
                type="text"
                value={editingTeacher.password}
                onChange={(e) =>
                  setEditingTeacher({
                    ...editingTeacher,
                    password: e.target.value,
                  })
                }
                placeholder="Minimal 4 karakter"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>

          {/* Per-teacher allowed menus selector */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Pilihan Menu yang Dapat Diakses Akun Guru Ini
                </p>
                <p className="text-[11px] text-slate-500">
                  Hanya menu yang dicentang yang akan tampil di sidebar saat guru login.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setEditingTeacher({
                      ...editingTeacher,
                      allowedMenus: [...DEFAULT_TEACHER_ALLOWED_MENUS],
                    })
                  }
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Preset Guru Mapel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingTeacher({
                      ...editingTeacher,
                      allowedMenus: ADMIN_MENU_OPTIONS.map((m) => m.id),
                    })
                  }
                  className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 font-medium text-blue-800 hover:bg-blue-100"
                >
                  Pilih Semua
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {ADMIN_MENU_OPTIONS.map((menu) => {
                const activeMenus =
                  editingTeacher.allowedMenus &&
                  editingTeacher.allowedMenus.length > 0
                    ? editingTeacher.allowedMenus
                    : DEFAULT_TEACHER_ALLOWED_MENUS;
                const checked = activeMenus.includes(menu.id);
                return (
                  <label
                    key={menu.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-blue-300 bg-white text-slate-900 font-medium'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMenuPermission(menu.id)}
                    />
                    <span className="truncate">{menu.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={editingTeacher.active}
                onChange={(e) =>
                  setEditingTeacher({
                    ...editingTeacher,
                    active: e.target.checked,
                  })
                }
              />
              Akun Guru Aktif (dapat login ke Panel Guru)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingTeacher(null);
                  setTeacherError(null);
                }}
                className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTeacherForm}
                className="min-h-[38px] rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Simpan Akun Guru
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            placeholder="Cari nama guru, NIP, mapel..."
            className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs"
          />
        </div>
        <span className="text-xs text-slate-500">
          Menampilkan {filteredTeachers.length} dari {teachers.length} akun guru
        </span>
      </div>

      {filteredTeachers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-xs sm:text-sm text-slate-500">
          Belum ada data akun guru yang dibuat. Klik &ldquo;Tambah Akun Guru&rdquo; di atas untuk memberikan akses login dan memilih menu yang boleh diakses guru.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Nama Guru</th>
                <th className="px-4 py-2.5 font-semibold">Mapel &amp; Hak Menu</th>
                <th className="px-4 py-2.5 font-semibold">Username</th>
                <th className="px-4 py-2.5 font-semibold">Password</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((t) => {
                const revealed = revealedTeacherPassIds.includes(t.id);
                const menus =
                  t.allowedMenus && t.allowedMenus.length > 0
                    ? t.allowedMenus
                    : DEFAULT_TEACHER_ALLOWED_MENUS;
                return (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      {t.nip && (
                        <p className="font-mono text-[11px] text-slate-500">
                          NIP/Kode: {t.nip}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p className="font-medium text-slate-800">
                        {t.subjectSpecialty}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 max-w-xs truncate">
                        Akses:{' '}
                        {menus
                          .map((m) => menuLabelById.get(m) || m)
                          .join(', ')}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900">
                      {t.username}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      <div className="inline-flex items-center gap-1.5">
                        <span>{revealed ? t.password : '••••••••'}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedTeacherPassIds((prev) =>
                              prev.includes(t.id)
                                ? prev.filter((id) => id !== t.id)
                                : [...prev, t.id]
                            )
                          }
                          aria-label="Lihat/sembunyikan password guru"
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {revealed ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          t.active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {t.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTeacherError(null);
                            setEditingTeacher({
                              ...t,
                              allowedMenus:
                                t.allowedMenus && t.allowedMenus.length > 0
                                  ? t.allowedMenus
                                  : [...DEFAULT_TEACHER_ALLOWED_MENUS],
                            });
                          }}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTeacher(t.id)}
                          aria-label={`Hapus akun guru ${t.name}`}
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
