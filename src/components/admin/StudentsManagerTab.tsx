import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckSquare,
  Download,
  FileSpreadsheet,
  Layers,
  Search,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import type { ExamRoom, ExamSessionSlot, Student } from '../../types/exam';
import {
  generateStudentCsvTemplate,
  parseStudentsFromDelimited,
} from '../../utils/studentCsv';
import { compressImageFileToDataUrl } from '../../utils/imageHelper';
import { ConfirmDialog } from '../ConfirmDialog';

interface StudentsManagerTabProps {
  students: Student[];
  examSessions: ExamSessionSlot[];
  examRooms?: ExamRoom[];
  onSaveStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateStudentsBatch: (nextStudents: Student[]) => void;
}

export const StudentsManagerTab: React.FC<StudentsManagerTabProps> = ({
  students,
  examSessions,
  examRooms = [],
  onSaveStudent,
  onDeleteStudent,
  onUpdateStudentsBatch,
}) => {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'append_only'>(
    'merge'
  );
  const [importPreview, setImportPreview] = useState<Student[]>([]);
  const [importSkipped, setImportSkipped] = useState<
    { line: number; reason: string }[]
  >([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [studentFeedback, setStudentFeedback] = useState<string | null>(null);

  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSessionValue, setBulkSessionValue] = useState(
    examSessions[0]?.name || 'Sesi 1 (07:30)'
  );
  const [bulkRoomValue, setBulkRoomValue] = useState(
    examSessions[0]?.defaultRoom || 'Ruang 01'
  );
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const classOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students]
  );

  const sessionDropdownOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...examSessions.map((es) => es.name),
          ...students.map((s) => s.session),
        ])
      )
        .filter(Boolean)
        .sort(),
    [examSessions, students]
  );

  const filteredStudents = useMemo(() => {
    const q = searchStudent.trim().toLowerCase();
    return students.filter((st) => {
      if (filterClass !== 'ALL' && st.className !== filterClass) return false;
      if (filterSession !== 'ALL' && st.session !== filterSession) return false;
      if (
        q &&
        !st.name.toLowerCase().includes(q) &&
        !st.participantNumber.toLowerCase().includes(q) &&
        !st.room.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [students, filterClass, filterSession, searchStudent]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedSet.has(s.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredStudents.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([
        ...selectedIds,
        ...filteredStudents.map((s) => s.id),
      ]);
      setSelectedIds(Array.from(merged));
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNewStudent = () => {
    const nextNum = String(students.length + 1).padStart(3, '0');
    setStudentFormError(null);
    setEditingStudent({
      id: `STD-${Date.now()}`,
      participantNumber: `2026-01-${nextNum}`,
      name: '',
      className: 'VI-A',
      room: examRooms[0]?.name || examSessions[0]?.defaultRoom || 'Ruang 01',
      session: examSessions[0]?.name || 'Sesi 1 (07:30)',
      accessPin: String(1000 + students.length + 1),
      photoUrl: '',
    });
  };

  const handleStudentPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingStudent) return;
    setUploadingPhoto(true);
    setStudentFormError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxDimension: 320,
        quality: 0.8,
      });
      setEditingStudent({ ...editingStudent, photoUrl: dataUrl });
    } catch (err) {
      setStudentFormError(
        err instanceof Error ? err.message : 'Gagal memproses foto siswa.'
      );
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDownloadStudentTemplate = () => {
    const csv = generateStudentCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_Peserta_Kolektif.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleParseStudentText = (text: string) => {
    setRawImportText(text);
    setImportError(null);
    if (!text.trim()) {
      setImportPreview([]);
      setImportSkipped([]);
      return;
    }
    const res = parseStudentsFromDelimited(
      text,
      bulkRoomValue || 'Ruang 01',
      bulkSessionValue || 'Sesi 1 (07:30)',
      students.length
    );
    setImportPreview(res.students);
    setImportSkipped(res.skippedRows);
    if (res.students.length === 0) {
      setImportError(
        'Tidak ditemukan baris peserta valid. Pastikan kolom minimal berisi No_Peserta dan Nama_Siswa.'
      );
    }
  };

  const handleStudentCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      handleParseStudentText(String(reader.result || ''));
    };
    reader.onerror = () => {
      setImportError('Gagal membaca file CSV peserta dari perangkat.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCommitCollectiveImport = () => {
    if (importPreview.length === 0) return;

    const byNumber = new Map<string, Student>();
    students.forEach((s) =>
      byNumber.set(s.participantNumber.trim().toUpperCase(), s)
    );

    let added = 0;
    let updated = 0;
    const nextList = [...students];

    for (const item of importPreview) {
      const key = item.participantNumber.trim().toUpperCase();
      const existing = byNumber.get(key);
      if (existing) {
        if (importMode === 'merge') {
          const idx = nextList.findIndex((s) => s.id === existing.id);
          if (idx > -1) {
            nextList[idx] = { ...item, id: existing.id };
            updated += 1;
          }
        }
      } else {
        nextList.push(item);
        byNumber.set(key, item);
        added += 1;
      }
    }

    onUpdateStudentsBatch(nextList);
    setImportOpen(false);
    setRawImportText('');
    setImportPreview([]);
    setImportSkipped([]);
    setStudentFeedback(
      `Import kolektif selesai: ${added} peserta ditambahkan${
        updated > 0 ? `, ${updated} peserta diperbarui` : ''
      }.`
    );
    setTimeout(() => setStudentFeedback(null), 5000);
  };

  const handleApplySelectedPlacement = () => {
    const targets =
      selectedIds.length > 0
        ? new Set(selectedIds)
        : new Set(filteredStudents.map((s) => s.id));
    if (targets.size === 0) return;

    const nextStudents = students.map((st) =>
      targets.has(st.id)
        ? {
            ...st,
            session: bulkSessionValue.trim() || st.session,
            room: bulkRoomValue.trim() || st.room,
          }
        : st
    );
    onUpdateStudentsBatch(nextStudents);
    setStudentFeedback(
      `Penempatan diperbarui untuk ${targets.size} peserta (${bulkRoomValue} · ${bulkSessionValue}).`
    );
    setTimeout(() => setStudentFeedback(null), 5000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Data Peserta Ujian ({students.length} Siswa)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Kelola akun login peserta ujian secara satuan maupun import kolektif dari file CSV/Excel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadStudentTemplate}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Template Peserta CSV
          </button>
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import Peserta Kolektif
          </button>
          <button
            type="button"
            onClick={handleNewStudent}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Peserta
          </button>
        </div>
      </div>

      {studentFeedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {studentFeedback}
        </div>
      )}

      {importOpen && (
        <div className="rounded-xl border border-blue-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Import Data Peserta Kolektif (CSV / Tempel dari Excel)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Urutan kolom:{' '}
                <span className="font-mono">
                  No_Peserta, Nama_Siswa, Kelas, Ruang, Sesi, PIN_Akses
                </span>{' '}
                (PIN &amp; No. Peserta otomatis dibuat bila dikosongkan).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-800"
              aria-label="Tutup panel import"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
              <Upload className="h-3.5 w-3.5" />
              <span>Pilih File CSV Peserta...</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleStudentCsvUpload}
                className="hidden"
              />
            </label>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-700">
                Jika No. Peserta sama:
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
              rows={5}
              value={rawImportText}
              onChange={(e) => handleParseStudentText(e.target.value)}
              placeholder={`2026-01-011\tKartika Sari\tXII-IPA-1\tRuang 01\tSesi 1 (07:30)\t1011\n2026-01-012\tLutfi Hakim\tXII-IPA-1\tRuang 01\tSesi 1 (07:30)\t1012`}
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
                Siap mengimpor {importPreview.length} data peserta valid:
              </p>
              <div className="max-h-44 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2">No. Peserta</th>
                      <th className="px-3 py-2">Nama Siswa</th>
                      <th className="px-3 py-2">Kelas</th>
                      <th className="px-3 py-2">Ruang</th>
                      <th className="px-3 py-2">Sesi</th>
                      <th className="px-3 py-2">PIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.slice(0, 15).map((st) => (
                      <tr key={st.id}>
                        <td className="px-3 py-1.5 font-mono">
                          {st.participantNumber}
                        </td>
                        <td className="px-3 py-1.5 font-medium">{st.name}</td>
                        <td className="px-3 py-1.5">{st.className}</td>
                        <td className="px-3 py-1.5">{st.room}</td>
                        <td className="px-3 py-1.5">{st.session}</td>
                        <td className="px-3 py-1.5 font-mono">{st.accessPin}</td>
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
                  onClick={handleCommitCollectiveImport}
                  className="min-h-[38px] rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Simpan {importPreview.length} Peserta ke Database
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {editingStudent && (
        <div className="rounded-xl border border-blue-200 bg-white p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Data Peserta Ujian
          </h3>
          {studentFormError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800">
              {studentFormError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Nomor Peserta
              </label>
              <input
                type="text"
                value={editingStudent.participantNumber}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    participantNumber: e.target.value,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Nama Lengkap Siswa
              </label>
              <input
                type="text"
                value={editingStudent.name}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    name: e.target.value,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Kelas
              </label>
              <input
                type="text"
                value={editingStudent.className}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    className: e.target.value,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Ruang Ujian
              </label>
              <input
                type="text"
                list="room-suggestions-list"
                value={editingStudent.room}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    room: e.target.value,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {examRooms.length > 0 && (
                <datalist id="room-suggestions-list">
                  {examRooms.map((r) => (
                    <option key={r.id} value={r.name} />
                  ))}
                </datalist>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Sesi
              </label>
              <select
                value={editingStudent.session}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    session: e.target.value,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {sessionDropdownOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {!sessionDropdownOptions.includes(editingStudent.session) && (
                  <option value={editingStudent.session}>
                    {editingStudent.session}
                  </option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                PIN Akses
              </label>
              <input
                type="text"
                value={editingStudent.accessPin}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    accessPin: e.target.value,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>

          {/* Pas Foto 3x4 Peserta (untuk Kartu Nomor Peserta) */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex flex-wrap items-center gap-4">
            <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 text-center">
              {editingStudent.photoUrl ? (
                <img
                  src={editingStudent.photoUrl}
                  alt="Pas foto siswa"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>Foto 3×4</span>
              )}
            </div>
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <p className="text-xs font-semibold text-slate-800">
                Pas Foto Peserta 3×4 (Opsional — Ditampilkan di Kartu Nomor Peserta)
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
                  <Camera className="h-3.5 w-3.5" />
                  <span>{uploadingPhoto ? 'Memproses...' : 'Unggah Foto 3×4'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={handleStudentPhotoUpload}
                    className="hidden"
                  />
                </label>
                {editingStudent.photoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditingStudent({ ...editingStudent, photoUrl: '' })
                    }
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Hapus Foto
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setStudentFormError(null);
                setEditingStudent(null);
              }}
              className="min-h-[40px] rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                if (!editingStudent.participantNumber.trim()) {
                  setStudentFormError('Nomor peserta wajib diisi.');
                  return;
                }
                if (!editingStudent.name.trim()) {
                  setStudentFormError('Nama lengkap siswa wajib diisi.');
                  return;
                }
                setStudentFormError(null);
                onSaveStudent(editingStudent);
                setEditingStudent(null);
              }}
              className="min-h-[40px] rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Simpan Peserta
            </button>
          </div>
        </div>
      )}

      {/* Filter & Quick Selection Actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Cari nomor peserta, nama, atau ruang..."
              className="min-h-[40px] w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm"
            />
          </div>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm"
          >
            <option value="ALL">Semua Kelas</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm"
          >
            <option value="ALL">Semua Sesi</option>
            {sessionDropdownOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-700" />
              Aksi Cepat Peserta Terpilih (
              {selectedIds.length > 0
                ? `${selectedIds.length} peserta dipilih`
                : `${filteredStudents.length} peserta tampil`}
              )
            </p>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-slate-600 underline"
                >
                  Batal Pilih
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Hapus {selectedIds.length} Terpilih
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 items-end">
            <div>
              <label className="block text-[11px] font-medium text-slate-600">
                Ubah Sesi ke
              </label>
              <select
                value={bulkSessionValue}
                onChange={(e) => setBulkSessionValue(e.target.value)}
                className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                {sessionDropdownOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600">
                Ubah Ruang ke
              </label>
              <input
                type="text"
                value={bulkRoomValue}
                onChange={(e) => setBulkRoomValue(e.target.value)}
                placeholder="Contoh: Ruang 01"
                className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>

            <button
              type="button"
              disabled={
                selectedIds.length === 0 && filteredStudents.length === 0
              }
              onClick={handleApplySelectedPlacement}
              className="min-h-[38px] rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-40 whitespace-nowrap"
            >
              Terapkan ke Terpilih
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="w-10 px-4 py-3">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    title="Pilih semua peserta yang tampil"
                    className="inline-flex items-center justify-center text-slate-600 hover:text-blue-700"
                  >
                    <CheckSquare
                      className={`h-4 w-4 ${
                        allFilteredSelected ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    />
                  </button>
                </th>
                <th className="px-3 py-3">No. Peserta</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Ruang &amp; Sesi</th>
                <th className="px-4 py-3">PIN</th>
                <th className="px-4 sm:px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((st) => {
                const checked = selectedSet.has(st.id);
                return (
                  <tr
                    key={st.id}
                    className={
                      checked ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                    }
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleOne(st.id)}
                        aria-label={`Pilih ${st.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-800">
                      {st.participantNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {st.photoUrl && (
                          <img
                            src={st.photoUrl}
                            alt={st.name}
                            className="h-8 w-6 shrink-0 rounded border border-slate-200 object-cover"
                          />
                        )}
                        <span>{st.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {st.className}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {st.room} · {st.session}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {st.accessPin}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setStudentFormError(null);
                            setEditingStudent(st);
                          }}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(st.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    Tidak ada peserta yang sesuai dengan filter saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Hapus ${selectedIds.length} Peserta Terpilih?`}
        description="Peserta yang dihapus tidak akan dapat login ke ruang ujian kecuali diimpor atau didaftarkan kembali."
        confirmLabel="Ya, Hapus Terpilih"
        tone="danger"
        onConfirm={() => {
          const removeSet = new Set(selectedIds);
          onUpdateStudentsBatch(students.filter((s) => !removeSet.has(s.id)));
          setSelectedIds([]);
          setConfirmBulkDelete(false);
        }}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
};
