import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Camera,
  CameraOff,
  Check,
  Clock,
  Copy,
  KeyRound,
  LockOpen,
  Power,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type {
  ExamSessionSlot,
  ExamSubmission,
  ProctorActionType,
  ProctorSession,
  Student,
  SubjectConfig,
} from '../../types/exam';
import { ConfirmDialog } from '../ConfirmDialog';

interface ProctorControlTabProps {
  subjects: SubjectConfig[];
  students: Student[];
  examSessions: ExamSessionSlot[];
  proctorSessions: ProctorSession[];
  submissions: ExamSubmission[];
  onBroadcastAnnouncement: (subjectId: string, message: string) => Promise<void>;
  onSendProctorAction: (params: {
    action: ProctorActionType;
    participantNumber: string;
    subjectId?: string;
    extraMinutes?: number;
    message?: string;
  }) => Promise<void>;
}

type FilterStatus = 'ALL' | 'Mengerjakan' | 'Terkunci' | 'Selesai' | 'Belum Login';

export const ProctorControlTab: React.FC<ProctorControlTabProps> = ({
  subjects,
  students,
  examSessions,
  proctorSessions,
  submissions,
  onBroadcastAnnouncement,
  onSendProctorAction,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedSession, setSelectedSession] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [copiedToken, setCopiedToken] = useState(false);
  const [roomMessage, setRoomMessage] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forceFinishTarget, setForceFinishTarget] = useState<{
    participantNumber: string;
    name: string;
  } | null>(null);

  const effectiveSubjectId = subjects.some((s) => s.id === selectedSubjectId)
    ? selectedSubjectId
    : subjects[0]?.id || '';

  const activeSubject = subjects.find((s) => s.id === effectiveSubjectId);

  const roomOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...students.map((s) => s.room),
          ...examSessions.map((es) => es.defaultRoom),
        ])
      )
        .filter(Boolean)
        .sort(),
    [students, examSessions]
  );

  const sessionOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...examSessions.map((es) => es.name),
          ...students.map((s) => s.session),
        ])
      )
        .filter(Boolean)
        .sort(),
    [students, examSessions]
  );

  // Merge static roster with live SSE proctor sessions and completed submissions
  const unifiedRows = useMemo(() => {
    const liveMap = new Map<string, ProctorSession>();
    proctorSessions
      .filter((p) => !effectiveSubjectId || p.subjectId === effectiveSubjectId)
      .forEach((p) => liveMap.set(p.participantNumber, p));

    const subMap = new Map<string, ExamSubmission>();
    submissions
      .filter((s) => !effectiveSubjectId || s.subjectId === effectiveSubjectId)
      .forEach((s) => {
        if (!subMap.has(s.participantNumber)) {
          subMap.set(s.participantNumber, s);
        }
      });

    const rosterRows = students.map((st) => {
      const live = liveMap.get(st.participantNumber);
      const sub = subMap.get(st.participantNumber);
      const status: FilterStatus = live
        ? live.status
        : sub
        ? 'Selesai'
        : 'Belum Login';

      return {
        participantNumber: st.participantNumber,
        name: st.name,
        className: st.className,
        room: live?.room || st.room,
        session: live?.session || st.session,
        status,
        cameraStatus: live?.cameraStatus || (status === 'Selesai' ? 'disabled' : undefined),
        answeredCount: live?.answeredCount ?? 0,
        totalQuestions: live?.totalQuestions ?? 0,
        violationCount: live?.violationCount ?? sub?.violationCount ?? 0,
        lastViolation: live?.lastViolation,
        score: sub?.percentage ?? live?.score,
      };
    });

    // Also include any live student not yet in local roster
    const knownNumbers = new Set(students.map((s) => s.participantNumber));
    proctorSessions
      .filter(
        (p) =>
          !knownNumbers.has(p.participantNumber) &&
          (!effectiveSubjectId || p.subjectId === effectiveSubjectId)
      )
      .forEach((live) => {
        rosterRows.push({
          participantNumber: live.participantNumber,
          name: live.studentName,
          className: live.className,
          room: live.room || 'Ruang 01',
          session: live.session || 'Sesi 1',
          status: live.status,
          cameraStatus: live.cameraStatus,
          answeredCount: live.answeredCount,
          totalQuestions: live.totalQuestions,
          violationCount: live.violationCount,
          lastViolation: live.lastViolation,
          score: live.score,
        });
      });

    return rosterRows;
  }, [students, proctorSessions, submissions, effectiveSubjectId]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedRows.filter((row) => {
      if (selectedRoom !== 'ALL' && row.room !== selectedRoom) return false;
      if (selectedSession !== 'ALL' && row.session !== selectedSession)
        return false;
      if (selectedStatus !== 'ALL' && row.status !== selectedStatus)
        return false;
      if (
        q &&
        !row.name.toLowerCase().includes(q) &&
        !row.participantNumber.toLowerCase().includes(q) &&
        !row.className.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [unifiedRows, selectedRoom, selectedSession, selectedStatus, searchQuery]);

  const summary = useMemo(() => {
    const active = unifiedRows.filter((r) => r.status === 'Mengerjakan').length;
    const locked = unifiedRows.filter((r) => r.status === 'Terkunci').length;
    const done = unifiedRows.filter((r) => r.status === 'Selesai').length;
    const camActive = unifiedRows.filter(
      (r) => r.cameraStatus === 'active'
    ).length;
    return { active, locked, done, camActive };
  }, [unifiedRows]);

  const activeSessionMeta = examSessions.find(
    (s) => s.name === selectedSession || s.defaultRoom === selectedRoom
  );

  const handleCopyToken = async () => {
    if (!activeSubject?.token) return;
    try {
      await navigator.clipboard.writeText(activeSubject.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      setErrorMsg('Gagal menyalin token ke clipboard.');
    }
  };

  const runAction = async (
    params: {
      action: ProctorActionType;
      participantNumber: string;
      extraMinutes?: number;
      message?: string;
    },
    successText: string
  ) => {
    setActionBusy(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await onSendProctorAction({
        ...params,
        subjectId: effectiveSubjectId || undefined,
      });
      setFeedbackMsg(successText);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim perintah pengawas ke perangkat peserta.'
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleSendRoomBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomMessage.trim()) {
      setErrorMsg('Tuliskan pesan pengawas terlebih dahulu.');
      return;
    }
    setActionBusy(true);
    setErrorMsg(null);
    try {
      const prefix =
        selectedRoom !== 'ALL' ? `[${selectedRoom}] ` : '[Pengawas Ruang] ';
      await onBroadcastAnnouncement(
        effectiveSubjectId,
        `${prefix}${roomMessage.trim()}`
      );
      setFeedbackMsg('Instruksi pengawas berhasil disiarkan secara real-time.');
      setRoomMessage('');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyiarkan pesan pengawas.'
      );
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            Menu Pengawas & Konsol Proktor Ruang
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pantau kehadiran, izin kamera peserta, pelanggaran anti-tab, buka kunci ujian, dan tambah waktu per siswa secara real-time.
          </p>
        </div>

        {activeSubject && (
          <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
            <div>
              <p className="text-[11px] font-medium text-blue-800 flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                Token Rilis Ujian
              </p>
              <p className="font-mono text-base font-bold tracking-wider text-blue-950">
                {activeSubject.token}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyToken}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
            >
              {copiedToken ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Salin Token
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Aktif Mengerjakan</span>
            <Users className="h-4 w-4 text-blue-700" />
          </dt>
          <dd className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.active}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Kamera Pengawas Aktif</span>
            <Camera className="h-4 w-4 text-emerald-600" />
          </dt>
          <dd className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {summary.camActive}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Terkunci Pelanggaran</span>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </dt>
          <dd className="mt-2 font-mono text-2xl font-bold text-red-700 tabular-nums">
            {summary.locked}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sudah Selesai</span>
            <Check className="h-4 w-4 text-slate-600" />
          </dt>
          <dd className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.done}
          </dd>
        </div>
      </dl>

      {feedbackMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {feedbackMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Room & Session Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={effectiveSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900"
          >
            <option value="ALL">Semua Sesi</option>
            {sessionOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900"
          >
            <option value="ALL">Semua Ruang</option>
            {roomOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as FilterStatus)}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900"
          >
            <option value="ALL">Semua Status</option>
            <option value="Mengerjakan">Sedang Mengerjakan</option>
            <option value="Terkunci">Terkunci Pelanggaran</option>
            <option value="Selesai">Sudah Selesai</option>
            <option value="Belum Login">Belum Login</option>
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama / no. peserta..."
              className="min-h-[40px] w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900"
            />
          </div>
        </div>

        {activeSessionMeta && (
          <p className="text-xs text-slate-500">
            Jadwal Sesi: <strong className="text-slate-700">{activeSessionMeta.name}</strong> ({activeSessionMeta.startTime} – {activeSessionMeta.endTime}) · Pengawas: <strong className="text-slate-700">{activeSessionMeta.proctorName || '-'}</strong>
          </p>
        )}

        {/* Quick Proctor Announcement */}
        <form
          onSubmit={handleSendRoomBroadcast}
          className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 shrink-0">
            <Bell className="h-4 w-4 text-blue-700" />
            <span>Pesan Pengawas:</span>
          </div>
          <input
            type="text"
            value={roomMessage}
            onChange={(e) => setRoomMessage(e.target.value)}
            placeholder="Kirim instruksi langsung ke layar peserta..."
            className="min-h-[40px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm"
          />
          <button
            type="submit"
            disabled={actionBusy}
            className="min-h-[40px] rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            Siarkan ke Peserta
          </button>
        </form>
      </div>

      {/* Proctor Control Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Peserta</th>
                <th className="px-4 py-3">Ruang & Sesi</th>
                <th className="px-4 py-3">Status Sesi</th>
                <th className="px-4 py-3">Kamera</th>
                <th className="px-4 py-3">Progres</th>
                <th className="px-4 py-3 text-right">Tab</th>
                <th className="px-4 py-3 text-right">Kontrol Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.participantNumber} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {row.participantNumber} · {row.className}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <p className="font-medium text-slate-800">{row.room}</p>
                    <p>{row.session}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {row.status === 'Mengerjakan' && (
                      <span className="text-blue-700">Mengerjakan</span>
                    )}
                    {row.status === 'Terkunci' && (
                      <span className="text-red-700">Terkunci Pelanggaran</span>
                    )}
                    {row.status === 'Selesai' && (
                      <span className="text-emerald-700">
                        Selesai{row.score !== undefined ? ` (${row.score})` : ''}
                      </span>
                    )}
                    {row.status === 'Belum Login' && (
                      <span className="text-slate-400">Belum Login</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.cameraStatus === 'active' ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <Camera className="h-3.5 w-3.5" />
                        Aktif
                      </span>
                    ) : row.cameraStatus === 'denied' ? (
                      <span className="inline-flex items-center gap-1 font-medium text-red-700">
                        <CameraOff className="h-3.5 w-3.5" />
                        Ditolak
                      </span>
                    ) : row.cameraStatus === 'requesting' ? (
                      <span className="text-blue-700">Meminta Izin...</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums">
                    {row.totalQuestions > 0
                      ? `${row.answeredCount}/${row.totalQuestions}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                    <span
                      className={
                        row.violationCount > 0
                          ? 'font-bold text-red-700'
                          : 'text-slate-600'
                      }
                      title={row.lastViolation || ''}
                    >
                      {row.violationCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          runAction(
                            {
                              action: 'UNLOCK_STUDENT',
                              participantNumber: row.participantNumber,
                            },
                            `Kunci pelanggaran untuk ${row.name} berhasil dibuka.`
                          )
                        }
                        title="Reset / Buka Kunci Pelanggaran"
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <LockOpen className="h-3 w-3" />
                        Buka Kunci
                      </button>

                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          runAction(
                            {
                              action: 'EXTEND_TIME',
                              participantNumber: row.participantNumber,
                              extraMinutes: 10,
                            },
                            `Waktu ekstra +10 menit ditambahkan untuk ${row.name}.`
                          )
                        }
                        title="Tambah Waktu 10 Menit"
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Clock className="h-3 w-3" />
                        +10m
                      </button>

                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                          runAction(
                            {
                              action: 'WARN_STUDENT',
                              participantNumber: row.participantNumber,
                              message:
                                'Peringatan Pengawas Ruang: harap jaga kamera tetap menghadap wajah dan jangan berpindah tab.',
                            },
                            `Peringatan dikirim ke ${row.name}.`
                          )
                        }
                        title="Kirim Peringatan ke Layar Siswa"
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Tegur
                      </button>

                      <button
                        type="button"
                        disabled={actionBusy || row.status === 'Selesai'}
                        onClick={() =>
                          setForceFinishTarget({
                            participantNumber: row.participantNumber,
                            name: row.name,
                          })
                        }
                        title="Paksa Selesai Ujian Peserta"
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                      >
                        <Power className="h-3 w-3" />
                        Selesaikan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    Tidak ada peserta yang cocok dengan filter ruang/sesi ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(forceFinishTarget)}
        title={`Paksa Selesai Sesi ${forceFinishTarget?.name || ''}?`}
        description="Perangkat peserta akan langsung menghentikan ujian dan mengirim seluruh jawaban yang tersimpan untuk dinilai otomatis."
        confirmLabel="Ya, Selesaikan Sesi Peserta"
        tone="danger"
        loading={actionBusy}
        onConfirm={async () => {
          if (!forceFinishTarget) return;
          const target = forceFinishTarget;
          setForceFinishTarget(null);
          await runAction(
            {
              action: 'FORCE_FINISH_STUDENT',
              participantNumber: target.participantNumber,
            },
            `Perintah paksa selesai telah dikirim ke ${target.name}.`
          );
        }}
        onCancel={() => setForceFinishTarget(null)}
      />
    </div>
  );
};
