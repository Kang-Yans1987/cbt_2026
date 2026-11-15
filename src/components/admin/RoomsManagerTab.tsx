import React, { useMemo, useState } from 'react';
import {
  Armchair,
  DoorOpen,
  Eye,
  EyeOff,
  LayoutGrid,
  Plus,
  Printer,
  Trash2,
  User,
} from 'lucide-react';
import type { ExamRoom, Student } from '../../types/exam';
import { SchoolLogo } from '../SchoolLogo';

interface RoomsManagerTabProps {
  schoolName: string;
  schoolLogoUrl: string;
  examRooms: ExamRoom[];
  students: Student[];
  onSaveExamRooms: (nextRooms: ExamRoom[]) => void;
}

export const RoomsManagerTab: React.FC<RoomsManagerTabProps> = ({
  schoolName,
  schoolLogoUrl,
  examRooms,
  students,
  onSaveExamRooms,
}) => {
  const [editing, setEditing] = useState<ExamRoom | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState(false);

  // Desk / seating layout view controls
  const [seatRoomFilter, setSeatRoomFilter] = useState<string>('ALL');
  const [seatSessionFilter, setSeatSessionFilter] = useState<string>('ALL');
  const [seatColumns, setSeatColumns] = useState<4 | 5 | 6>(5);

  const sessionOptions = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.session).filter(Boolean))).sort(),
    [students]
  );

  const studentsByRoom = useMemo(() => {
    const grouped = new Map<string, Student[]>();
    students.forEach((st) => {
      if (seatSessionFilter !== 'ALL' && st.session !== seatSessionFilter) {
        return;
      }
      const key = st.room.trim().toLowerCase();
      const list = grouped.get(key) || [];
      list.push(st);
      grouped.set(key, list);
    });
    // Sort students cleanly by participantNumber inside each room
    grouped.forEach((list) =>
      list.sort((a, b) =>
        a.participantNumber.localeCompare(b.participantNumber, 'id', {
          numeric: true,
        })
      )
    );
    return grouped;
  }, [students, seatSessionFilter]);

  const occupancyByRoom = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((st) => {
      const key = st.room.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [students]);

  const totalCapacity = useMemo(
    () => examRooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0),
    [examRooms]
  );

  const displayedSeatRooms = useMemo(() => {
    if (seatRoomFilter === 'ALL') return examRooms;
    return examRooms.filter((r) => r.id === seatRoomFilter);
  }, [examRooms, seatRoomFilter]);

  const handleNewRoom = () => {
    const nextIdx = examRooms.length + 1;
    setFormError(null);
    setEditing({
      id: `ROOM-${Date.now()}`,
      code: `R-${String(nextIdx).padStart(2, '0')}`,
      name: `Ruang ${String(nextIdx).padStart(2, '0')}`,
      capacity: 20,
      location: 'Gedung Utama Lantai 1',
      notes: '',
    });
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.code.trim() || !editing.name.trim()) {
      setFormError('Kode ruang dan nama ruang wajib diisi.');
      return;
    }
    const cleanRoom: ExamRoom = {
      ...editing,
      code: editing.code.trim(),
      name: editing.name.trim(),
      capacity: Math.max(1, Number(editing.capacity) || 20),
      location: editing.location.trim() || '-',
      notes: (editing.notes || '').trim(),
    };
    const exists = examRooms.some((r) => r.id === cleanRoom.id);
    const next = exists
      ? examRooms.map((r) => (r.id === cleanRoom.id ? cleanRoom : r))
      : [...examRooms, cleanRoom];
    onSaveExamRooms(next);
    setEditing(null);
    setFormError(null);
  };

  const handleDeleteRoom = (id: string) => {
    onSaveExamRooms(examRooms.filter((r) => r.id !== id));
    if (seatRoomFilter === id) {
      setSeatRoomFilter('ALL');
    }
  };

  const gridColsClass =
    seatColumns === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : seatColumns === 6
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Pengaturan Ruang Ujian ({examRooms.length} Ruang · Kapasitas {totalCapacity})
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
              Kelola daftar ruang ujian, kapasitas komputer/kursi, lokasi ruang, serta denah bangku peserta pada setiap ruang.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            Cetak Daftar &amp; Denah
          </button>
          <button
            type="button"
            onClick={handleNewRoom}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Ruang
          </button>
        </div>
      </div>

      {editing && !printMode && (
        <form
          onSubmit={handleSaveRoom}
          className="no-print rounded-xl border border-blue-200 bg-white p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-slate-900">
            {examRooms.some((r) => r.id === editing.id)
              ? 'Edit Ruang Ujian'
              : 'Tambah Ruang Ujian Baru'}
          </h3>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Kode Ruang
              </label>
              <input
                type="text"
                required
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                placeholder="R-01"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Nama Ruang (Sesuai Data Peserta)
              </label>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ruang 01"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Kapasitas Bangku / Peserta
              </label>
              <input
                type="number"
                min={1}
                value={editing.capacity}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    capacity: Math.max(1, Number(e.target.value) || 20),
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Lokasi / Gedung
              </label>
              <input
                type="text"
                value={editing.location}
                onChange={(e) =>
                  setEditing({ ...editing, location: e.target.value })
                }
                placeholder="Gedung Utama Lantai 1"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700">
                Keterangan Perangkat / Fasilitas (Opsional)
              </label>
              <input
                type="text"
                value={editing.notes || ''}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
                placeholder="Contoh: 20 unit Chromebook, proyektor, jaringan Wi-Fi lokal"
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
              Simpan Ruang
            </button>
          </div>
        </form>
      )}

      {/* Printable A4 Sheet + Interactive Table */}
      <div className="print-page rounded-xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5">
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
                Daftar Pengaturan Ruang &amp; Denah Bangku Ujian CBT
              </h3>
              <p className="text-xs text-slate-600">
                Total Ruang: {examRooms.length} · Total Kapasitas: {totalCapacity} bangku
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Dicetak: {new Date().toLocaleDateString('id-ID')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-300 bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Kode</th>
                <th className="py-2.5 px-3">Nama Ruang</th>
                <th className="py-2.5 px-3">Lokasi</th>
                <th className="py-2.5 px-3 text-right">Kapasitas</th>
                <th className="py-2.5 px-3 text-right">Peserta Terisi</th>
                <th className="py-2.5 px-3">Keterangan Fasilitas</th>
                {!printMode && (
                  <th className="no-print py-2.5 px-3 text-right">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {examRooms.map((room, idx) => {
                const filled =
                  occupancyByRoom.get(room.name.trim().toLowerCase()) || 0;
                const over = filled > room.capacity;
                return (
                  <tr key={room.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">
                      {room.code}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {room.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{room.location}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {room.capacity}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold tabular-nums ${
                        over ? 'text-red-700' : 'text-slate-900'
                      }`}
                    >
                      {filled}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      {room.notes || '-'}
                    </td>
                    {!printMode && (
                      <td className="no-print py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSeatRoomFilter(room.id)}
                            className="text-xs font-medium text-slate-600 hover:text-blue-700 hover:underline"
                          >
                            Bangku
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormError(null);
                              setEditing(room);
                            }}
                            className="text-xs font-medium text-blue-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id)}
                            className="text-red-600 hover:text-red-800"
                            aria-label={`Hapus ${room.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {examRooms.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-xs sm:text-sm text-slate-500"
                  >
                    Belum ada data ruang ujian. Klik &ldquo;Tambah Ruang&rdquo; untuk menambahkan ruang ujian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Room Desk / Seat Map Visualization */}
      {examRooms.length > 0 && (
        <section className="space-y-4">
          <div className="no-print flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Denah Bangku Setiap Ruang Ujian
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi susunan meja &amp; bangku peserta berdasarkan kapasitas ruang dan penempatan peserta.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={seatRoomFilter}
                onChange={(e) => setSeatRoomFilter(e.target.value)}
                className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
              >
                <option value="ALL">Semua Ruang ({examRooms.length})</option>
                {examRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>

              <select
                value={seatSessionFilter}
                onChange={(e) => setSeatSessionFilter(e.target.value)}
                className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
              >
                <option value="ALL">Semua Sesi</option>
                {sessionOptions.map((ses) => (
                  <option key={ses} value={ses}>
                    {ses}
                  </option>
                ))}
              </select>

              <select
                value={seatColumns}
                onChange={(e) =>
                  setSeatColumns(Number(e.target.value) as 4 | 5 | 6)
                }
                className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
              >
                <option value={4}>4 Bangku / Baris</option>
                <option value={5}>5 Bangku / Baris</option>
                <option value={6}>6 Bangku / Baris</option>
              </select>
            </div>
          </div>

          <div className="space-y-5">
            {displayedSeatRooms.map((room) => {
              const roomStudents =
                studentsByRoom.get(room.name.trim().toLowerCase()) || [];
              const totalDesks = Math.max(room.capacity, roomStudents.length);
              const desks = Array.from({ length: totalDesks }, (_, idx) => ({
                seatNumber: idx + 1,
                student: roomStudents[idx] || null,
                isOverflow: idx >= room.capacity,
              }));
              const emptySeats = Math.max(0, room.capacity - roomStudents.length);

              return (
                <div
                  key={room.id}
                  className="print-break-inside-avoid rounded-xl border border-slate-200 bg-white p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-800 border border-blue-200">
                        {room.code}
                      </span>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          {room.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {room.location}
                          {room.notes ? ` · ${room.notes}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        Terisi: {roomStudents.length} / {room.capacity} Bangku
                      </span>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-600 tabular-nums">
                        Kosong: {emptySeats}
                      </span>
                      {roomStudents.length > room.capacity && (
                        <span className="font-semibold text-red-700">
                          (+{roomStudents.length - room.capacity} melebihi kapasitas)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Front of classroom: Proctor desk / Whiteboard */}
                  <div className="flex justify-center">
                    <div className="w-full max-w-md rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Depan Ruang · Meja Pengawas &amp; Papan Informasi
                      </p>
                    </div>
                  </div>

                  {/* Desks Grid */}
                  <div className={`grid gap-2.5 ${gridColsClass}`}>
                    {desks.map(({ seatNumber, student, isOverflow }) => {
                      const seatLabel = String(seatNumber).padStart(2, '0');
                      if (student) {
                        return (
                          <div
                            key={`${room.id}-seat-${seatNumber}`}
                            className={`rounded-lg border p-2.5 transition-colors ${
                              isOverflow
                                ? 'border-red-300 bg-red-50/70'
                                : 'border-blue-200 bg-blue-50/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 border-b border-slate-200/80 pb-1.5 mb-1.5">
                              <span
                                className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold ${
                                  isOverflow ? 'text-red-700' : 'text-blue-800'
                                }`}
                              >
                                <Armchair className="h-3.5 w-3.5" />
                                Bangku {seatLabel}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500">
                                {student.className}
                              </span>
                            </div>
                            <div className="flex items-start gap-1.5 min-w-0">
                              <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-900">
                                  {student.name}
                                </p>
                                <p className="truncate font-mono text-[10px] text-slate-600">
                                  {student.participantNumber}
                                </p>
                                {seatSessionFilter === 'ALL' && (
                                  <p className="truncate text-[10px] text-slate-500">
                                    {student.session}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${room.id}-seat-${seatNumber}`}
                          className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-2.5 text-slate-400"
                        >
                          <div className="flex items-center justify-between gap-1 border-b border-slate-200/70 pb-1.5 mb-1.5">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-500">
                              <Armchair className="h-3.5 w-3.5" />
                              Bangku {seatLabel}
                            </span>
                          </div>
                          <p className="text-[11px] italic text-slate-400 py-1">
                            Bangku Kosong
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

