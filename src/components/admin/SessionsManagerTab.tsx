import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Layers, Plus } from 'lucide-react';
import type { ExamSessionSlot, Student } from '../../types/exam';

interface SessionsManagerTabProps {
  examSessions: ExamSessionSlot[];
  students: Student[];
  onSaveExamSessions: (nextSessions: ExamSessionSlot[]) => void;
  onUpdateStudentsBatch: (nextStudents: Student[]) => void;
}

export const SessionsManagerTab: React.FC<SessionsManagerTabProps> = ({
  examSessions,
  students,
  onSaveExamSessions,
  onUpdateStudentsBatch,
}) => {
  const [editingSession, setEditingSession] = useState<ExamSessionSlot | null>(
    null
  );
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [bulkSessionValue, setBulkSessionValue] = useState(
    examSessions[0]?.name || 'Sesi 1 (07:30)'
  );
  const [bulkRoomValue, setBulkRoomValue] = useState(
    examSessions[0]?.defaultRoom || 'Ruang 01'
  );
  const [autoRoomCapacity, setAutoRoomCapacity] = useState(20);
  const [autoRoomPrefix, setAutoRoomPrefix] = useState('Ruang');
  const [placementFeedback, setPlacementFeedback] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (examSessions.length > 0) {
      setBulkSessionValue((prev) => prev || examSessions[0].name);
      setBulkRoomValue((prev) => prev || examSessions[0].defaultRoom);
    }
  }, [examSessions]);

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

  const targetStudents = useMemo(
    () =>
      filterClass === 'ALL'
        ? students
        : students.filter((s) => s.className === filterClass),
    [students, filterClass]
  );

  const handleSaveSessionSlot = () => {
    if (!editingSession) return;
    if (!editingSession.name.trim()) {
      setSessionError('Nama sesi ujian tidak boleh kosong.');
      return;
    }
    setSessionError(null);
    const exists = examSessions.some((s) => s.id === editingSession.id);
    const nextSessions = exists
      ? examSessions.map((s) =>
          s.id === editingSession.id ? editingSession : s
        )
      : [...examSessions, editingSession];
    onSaveExamSessions(nextSessions);
    setEditingSession(null);
  };

  const handleDeleteSessionSlot = (id: string) => {
    onSaveExamSessions(examSessions.filter((s) => s.id !== id));
  };

  const handleApplyBulkPlacement = () => {
    if (targetStudents.length === 0) return;
    const targetIds = new Set(targetStudents.map((s) => s.id));
    const nextStudents = students.map((st) =>
      targetIds.has(st.id)
        ? {
            ...st,
            session: bulkSessionValue.trim() || st.session,
            room: bulkRoomValue.trim() || st.room,
          }
        : st
    );
    onUpdateStudentsBatch(nextStudents);
    setPlacementFeedback(
      `Penempatan masal berhasil diterapkan ke ${targetIds.size} peserta (${bulkRoomValue} · ${bulkSessionValue}).`
    );
    setTimeout(() => setPlacementFeedback(null), 5000);
  };

  const handleAutoDistributeRooms = () => {
    if (targetStudents.length === 0) return;
    const cap = Math.max(1, autoRoomCapacity);
    const roomAssignment = new Map<string, string>();
    targetStudents.forEach((st, idx) => {
      const roomNum = String(Math.floor(idx / cap) + 1).padStart(2, '0');
      roomAssignment.set(
        st.id,
        `${autoRoomPrefix.trim() || 'Ruang'} ${roomNum}`
      );
    });

    const nextStudents = students.map((st) => {
      const newRoom = roomAssignment.get(st.id);
      if (!newRoom) return st;
      return {
        ...st,
        room: newRoom,
        session: bulkSessionValue.trim() || st.session,
      };
    });
    onUpdateStudentsBatch(nextStudents);
    setPlacementFeedback(
      `Alokasi otomatis selesai: ${targetStudents.length} peserta dibagi (maks. ${cap} siswa/ruang) pada ${bulkSessionValue}.`
    );
    setTimeout(() => setPlacementFeedback(null), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Session Schedule Slots */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-700" />
              Pengaturan Sesi &amp; Ruang Ujian
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Kelola jadwal gelombang sesi ujian, jam mulai/selesai, ruang default, dan pengawas ruang.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSessionError(null);
              setEditingSession({
                id: `SESI-${Date.now()}`,
                name: `Sesi ${examSessions.length + 1}`,
                startTime: '07:30',
                endTime: '09:30',
                defaultRoom: `Ruang ${String(examSessions.length + 1).padStart(
                  2,
                  '0'
                )}`,
                proctorName: '',
              });
            }}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Slot Sesi
          </button>
        </div>

        {editingSession && (
          <div className="rounded-xl border border-blue-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Editor Jadwal Sesi Ujian
            </h3>
            {sessionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {sessionError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  Nama Sesi
                </label>
                <input
                  type="text"
                  value={editingSession.name}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      name: e.target.value,
                    })
                  }
                  placeholder="Contoh: Sesi 1 (07:30)"
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={editingSession.startTime}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      startTime: e.target.value,
                    })
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={editingSession.endTime}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      endTime: e.target.value,
                    })
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Ruang Default
                </label>
                <input
                  type="text"
                  value={editingSession.defaultRoom}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      defaultRoom: e.target.value,
                    })
                  }
                  placeholder="Ruang 01"
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-slate-700">
                  Nama Pengawas / Proktor Ruang
                </label>
                <input
                  type="text"
                  value={editingSession.proctorName || ''}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      proctorName: e.target.value,
                    })
                  }
                  placeholder="Nama pengawas ruang..."
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="min-h-[38px] rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSessionSlot}
                className="min-h-[38px] rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Simpan Slot Sesi
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {examSessions.map((sesi) => {
            const countInSession = students.filter(
              (s) => s.session === sesi.name
            ).length;
            return (
              <div
                key={sesi.id}
                className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-blue-700">
                      {sesi.startTime} – {sesi.endTime}
                    </span>
                    <span className="text-xs text-slate-500">
                      {sesi.defaultRoom}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-slate-900">
                    {sesi.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Pengawas: {sesi.proctorName || 'Belum ditentukan'}
                  </p>
                  <p className="mt-1 font-mono text-[11px] font-semibold text-slate-700">
                    {countInSession} peserta terjadwal
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSessionError(null);
                      setEditingSession(sesi);
                    }}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Edit
                  </button>
                  {examSessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSessionSlot(sesi.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bulk Room & Session Placement Tool */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-700" />
              Penempatan Ruang &amp; Sesi Peserta Masal
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Terapkan ruang dan sesi secara serentak berdasarkan kelas atau bagi otomatis per kapasitas ruang.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-700">
            Target: {targetStudents.length} peserta
          </span>
        </div>

        {placementFeedback && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs sm:text-sm text-emerald-800">
            {placementFeedback}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-4 items-end">
          <div>
            <label className="block text-[11px] font-medium text-slate-600">
              Filter Kelas Target
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
            >
              <option value="ALL">Semua Kelas ({students.length})</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600">
              Target Sesi Ujian
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
              Target Ruang Manual
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
            disabled={targetStudents.length === 0}
            onClick={handleApplyBulkPlacement}
            className="min-h-[38px] rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-40 whitespace-nowrap"
          >
            Terapkan Ruang &amp; Sesi
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium text-slate-700">
            Bagi Ruang Otomatis:
          </span>
          <input
            type="text"
            value={autoRoomPrefix}
            onChange={(e) => setAutoRoomPrefix(e.target.value)}
            title="Awalan nama ruang"
            className="w-24 min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
          />
          <input
            type="number"
            min={1}
            max={100}
            value={autoRoomCapacity}
            onChange={(e) =>
              setAutoRoomCapacity(Math.max(1, Number(e.target.value) || 20))
            }
            title="Kapasitas siswa per ruang"
            className="w-16 min-h-[36px] rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
          />
          <span className="text-xs text-slate-500">siswa/ruang</span>
          <button
            type="button"
            disabled={targetStudents.length === 0}
            onClick={handleAutoDistributeRooms}
            className="min-h-[36px] rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40 whitespace-nowrap"
          >
            Bagi Ruang Otomatis Sekarang
          </button>
        </div>
      </section>
    </div>
  );
};
