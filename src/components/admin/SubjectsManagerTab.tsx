import React, { useEffect, useState } from 'react';
import { KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { ExamTimeSettings, SubjectConfig } from '../../types/exam';
import {
  formatTokenCountdown,
  getActiveSubjectToken,
  getTokenSecondsRemaining,
} from '../../utils/tokenGenerator';

interface SubjectsManagerTabProps {
  schoolName: string;
  examTimeSettings: ExamTimeSettings;
  subjects: SubjectConfig[];
  onSaveSubject: (subject: SubjectConfig) => void;
  onDeleteSubject: (id: string) => void;
}

export const SubjectsManagerTab: React.FC<SubjectsManagerTabProps> = ({
  schoolName,
  examTimeSettings,
  subjects,
  onSaveSubject,
  onDeleteSubject,
}) => {
  const [editingSubject, setEditingSubject] = useState<SubjectConfig | null>(
    null
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  const hasAutoToken =
    editingSubject?.tokenMode === 'auto_15m' ||
    subjects.some((s) => s.tokenMode === 'auto_15m');

  useEffect(() => {
    if (!hasAutoToken) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasAutoToken]);

  const handleNewSubject = () => {
    setEditingSubject({
      id: `SUBJ-${Date.now()}`,
      code: 'MAPEL-BARU',
      name: 'Mata Pelajaran Baru',
      token: Math.random().toString(36).slice(2, 8).toUpperCase(),
      tokenMode: 'manual',
      tokenSeed: `SEED-${Date.now()}`,
      durationMinutes: 60,
      maxViolations: 3,
      passingGradeKkm: 75,
      shuffleQuestions: true,
      shuffleOptions: false,
      cameraRequired: true,
      active: true,
      startTime: '2026-11-13T07:30',
      endTime: '2026-11-13T17:00',
      schoolName: schoolName || 'SD Negeri 2 Tukangkayu',
    });
  };

  const countdownLabel = formatTokenCountdown(getTokenSecondsRemaining(nowMs));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Pengaturan Mata Pelajaran, Jadwal &amp; Token Ujian
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Atur durasi pengerjaan, jadwal buka/tutup, KKM, izin kamera otomatis, serta pilihan Token Manual atau Token Otomatis berubah setiap 15 menit.
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewSubject}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tambah Mata Pelajaran
        </button>
      </div>

      {editingSubject && (
        <div className="rounded-xl border border-blue-200 bg-white p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Kustomisasi Paket Mata Pelajaran
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">
                Nama Mata Pelajaran / Ujian
              </label>
              <input
                type="text"
                value={editingSubject.name}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, name: e.target.value })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Kode Paket
              </label>
              <input
                type="text"
                value={editingSubject.code}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, code: e.target.value })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            {/* Token Mode & Value */}
            <div className="sm:col-span-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 grid gap-3 sm:grid-cols-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Mode Pengaturan Token
                </label>
                <select
                  value={editingSubject.tokenMode || 'manual'}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      tokenMode: e.target.value as 'manual' | 'auto_15m',
                      tokenSeed:
                        editingSubject.tokenSeed ||
                        `${editingSubject.id}-SEED-1`,
                    })
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm"
                >
                  <option value="manual">Manual (Tetap / Diatur Admin)</option>
                  <option value="auto_15m">
                    Otomatis Berubah Tiap 15 Menit
                  </option>
                </select>
              </div>

              {editingSubject.tokenMode === 'auto_15m' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Token Aktif Sekarang (Sisa {countdownLabel})
                    </label>
                    <div className="mt-1 flex min-h-[40px] items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-mono text-sm font-bold tracking-wider text-blue-900">
                      <span>
                        {getActiveSubjectToken(editingSubject, nowMs)}
                      </span>
                      <KeyRound className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingSubject({
                          ...editingSubject,
                          tokenSeed: `SEED-${Date.now()}`,
                        })
                      }
                      className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Acak Ulang Token Sekarang
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Token Ujian Manual
                  </label>
                  <input
                    type="text"
                    value={editingSubject.token}
                    onChange={(e) =>
                      setEditingSubject({
                        ...editingSubject,
                        token: e.target.value.toUpperCase(),
                      })
                    }
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Durasi Waktu (Menit)
              </label>
              <input
                type="number"
                value={editingSubject.durationMinutes}
                onChange={(e) =>
                  setEditingSubject({
                    ...editingSubject,
                    durationMinutes: Math.max(5, Number(e.target.value) || 60),
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                KKM Ketuntasan (0-100)
              </label>
              <input
                type="number"
                value={editingSubject.passingGradeKkm}
                onChange={(e) =>
                  setEditingSubject({
                    ...editingSubject,
                    passingGradeKkm: Number(e.target.value) || 75,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Batas Pelanggaran Tab
              </label>
              <input
                type="number"
                value={editingSubject.maxViolations}
                onChange={(e) =>
                  setEditingSubject({
                    ...editingSubject,
                    maxViolations: Math.max(1, Number(e.target.value) || 3),
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Waktu Buka Ujian ({examTimeSettings.timezone})
              </label>
              <input
                type="datetime-local"
                value={editingSubject.startTime || ''}
                onChange={(e) =>
                  setEditingSubject({
                    ...editingSubject,
                    startTime: e.target.value,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Waktu Tutup Ujian ({examTimeSettings.timezone})
              </label>
              <input
                type="datetime-local"
                value={editingSubject.endTime || ''}
                onChange={(e) =>
                  setEditingSubject({
                    ...editingSubject,
                    endTime: e.target.value,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Tampilan Hasil Ujian Peserta
              </label>
              <select
                value={
                  editingSubject.showScoreImmediately === true
                    ? 'show'
                    : editingSubject.showScoreImmediately === false
                    ? 'hide'
                    : 'inherit'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingSubject({
                    ...editingSubject,
                    showScoreImmediately:
                      val === 'show' ? true : val === 'hide' ? false : undefined,
                  });
                }}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm"
              >
                <option value="inherit">
                  Ikuti Pengaturan Umum (
                  {examTimeSettings.showScoreImmediately !== false
                    ? 'Langsung Tampil'
                    : 'Tidak Ditampilkan'}
                  )
                </option>
                <option value="show">Langsung Ditampilkan Setelah Selesai</option>
                <option value="hide">Tidak Ditampilkan ke Peserta</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2 sm:col-span-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={editingSubject.active}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      active: e.target.checked,
                    })
                  }
                />
                Aktifkan Ujian
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={editingSubject.shuffleQuestions}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      shuffleQuestions: e.target.checked,
                    })
                  }
                />
                Acak Urutan Soal
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={editingSubject.cameraRequired !== false}
                  onChange={(e) =>
                    setEditingSubject({
                      ...editingSubject,
                      cameraRequired: e.target.checked,
                    })
                  }
                />
                Otomatis Minta Izin Kamera Pengawas
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingSubject(null)}
              className="min-h-[40px] rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveSubject({
                  ...editingSubject,
                  schoolName: schoolName || editingSubject.schoolName,
                });
                setEditingSubject(null);
              }}
              className="min-h-[40px] rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Simpan Pengaturan Mapel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="w-12 px-4 py-3">No</th>
                <th className="px-4 py-3">Mata Pelajaran &amp; Aturan</th>
                <th className="px-4 py-3">
                  Jadwal ({examTimeSettings.timezone})
                </th>
                <th className="px-4 py-3 whitespace-nowrap">Durasi</th>
                <th className="px-4 py-3">Token Ujian</th>
                <th className="px-4 sm:px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((subj, idx) => {
                const liveToken = getActiveSubjectToken(subj, nowMs);
                const isAuto = subj.tokenMode === 'auto_15m';
                const startText = subj.startTime
                  ? subj.startTime.replace('T', ' ')
                  : '-';
                const endText = subj.endTime
                  ? subj.endTime.replace('T', ' ')
                  : '-';

                return (
                  <tr
                    key={subj.id}
                    className="hover:bg-slate-50/80 transition-colors align-middle"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 tabular-nums">
                      {idx + 1}
                    </td>

                    <td className="px-4 py-3.5 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-blue-700">
                          {subj.code}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            subj.active ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {subj.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <p className="mt-0.5 font-semibold text-slate-900 leading-snug">
                        {subj.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        KKM {subj.passingGradeKkm} ·{' '}
                        {subj.cameraRequired !== false
                          ? 'Kamera Otomatis'
                          : 'Tanpa Kamera'}
                        {subj.shuffleQuestions ? ' · Acak Soal' : ''} ·{' '}
                        {(
                          subj.showScoreImmediately !== undefined
                            ? subj.showScoreImmediately
                            : examTimeSettings.showScoreImmediately !== false
                        )
                          ? 'Hasil Langsung Tampil'
                          : 'Hasil Disembunyikan'}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                      <p className="text-slate-800">{startText}</p>
                      <p className="text-[11px] text-slate-500">
                        s.d. {endText}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                      {subj.durationMinutes} Menit
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold tracking-wider text-slate-900">
                          {liveToken}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            isAuto ? 'text-blue-700 font-mono' : 'text-slate-500'
                          }`}
                        >
                          {isAuto ? `Auto 15m (${countdownLabel})` : 'Manual'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 sm:px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onSaveSubject({
                              ...subj,
                              tokenMode: isAuto ? 'manual' : 'auto_15m',
                              tokenSeed:
                                subj.tokenSeed ||
                                `${subj.id}-SEED-${Date.now()}`,
                            })
                          }
                          className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                            isAuto
                              ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isAuto ? 'Ganti Manual' : 'Auto 15 Menit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSubject(subj)}
                          className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Atur
                        </button>
                        {subjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteSubject(subj.id)}
                            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                            aria-label={`Hapus ${subj.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {subjects.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    Belum ada paket mata pelajaran. Klik &ldquo;Tambah Mata Pelajaran&rdquo; untuk membuat paket ujian baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
