import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle2,
  Power,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type {
  ExamSubmission,
  ProctorSession,
  Question,
  Student,
  SubjectConfig,
} from '../../types/exam';
import { gradeObjectiveQuestion } from '../../utils/gradingEngine';
import { ConfirmDialog } from '../ConfirmDialog';

interface AnalyticsMonitorTabProps {
  subjects: SubjectConfig[];
  questions: Question[];
  students: Student[];
  submissions: ExamSubmission[];
  proctorSessions: ProctorSession[];
  onBroadcastExamEnd: (subjectId: string, message: string) => Promise<void>;
  onBroadcastAnnouncement: (subjectId: string, message: string) => Promise<void>;
}

export const AnalyticsMonitorTab: React.FC<AnalyticsMonitorTabProps> = ({
  subjects,
  questions,
  students,
  submissions,
  proctorSessions,
  onBroadcastExamEnd,
  onBroadcastAnnouncement,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [announcementText, setAnnouncementText] = useState('');
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(
    null
  );
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const filteredSubmissions = useMemo(
    () =>
      selectedSubjectId
        ? submissions.filter((s) => s.subjectId === selectedSubjectId)
        : submissions,
    [submissions, selectedSubjectId]
  );

  const activeSessions = useMemo(
    () =>
      proctorSessions.filter(
        (p) =>
          p.status === 'Mengerjakan' &&
          (!selectedSubjectId || p.subjectId === selectedSubjectId)
      ),
    [proctorSessions, selectedSubjectId]
  );

  const avgScore = useMemo(() => {
    if (filteredSubmissions.length === 0) return 0;
    const sum = filteredSubmissions.reduce((acc, s) => acc + s.percentage, 0);
    return Math.round(sum / filteredSubmissions.length);
  }, [filteredSubmissions]);

  const totalViolations = useMemo(() => {
    const fromSubs = filteredSubmissions.reduce(
      (acc, s) => acc + s.violationCount,
      0
    );
    const fromActive = activeSessions.reduce(
      (acc, s) => acc + s.violationCount,
      0
    );
    return fromSubs + fromActive;
  }, [filteredSubmissions, activeSessions]);

  // Item analysis per question for selected subject
  const itemAnalysis = useMemo(() => {
    const subjQuestions = questions
      .filter((q) => !selectedSubjectId || q.subjectId === selectedSubjectId)
      .sort((a, b) => a.number - b.number);

    return subjQuestions.map((q) => {
      let attemptCount = 0;
      let earnedSum = 0;

      for (const sub of filteredSubmissions) {
        const ans = sub.answers[q.id];
        if (ans !== undefined && ans.trim() !== '') {
          attemptCount += 1;
          if (q.type === 'ISIAN') {
            const ev = sub.aiEvaluations.find((e) => e.questionId === q.id);
            earnedSum += ev ? ev.score : 0;
          } else {
            earnedSum += gradeObjectiveQuestion(q, ans);
          }
        }
      }

      const avgAccuracy =
        attemptCount > 0 && q.weight > 0
          ? Math.round((earnedSum / (attemptCount * q.weight)) * 100)
          : 0;

      const difficulty =
        attemptCount === 0
          ? 'Belum Ada Data'
          : avgAccuracy >= 75
          ? 'Mudah'
          : avgAccuracy >= 45
          ? 'Sedang'
          : 'Sukar';

      return {
        question: q,
        attemptCount,
        avgAccuracy,
        difficulty,
      };
    });
  }, [questions, filteredSubmissions, selectedSubjectId]);

  // Class performance breakdown
  const classPerformance = useMemo(() => {
    const groups = new Map<string, ExamSubmission[]>();
    for (const s of filteredSubmissions) {
      const list = groups.get(s.className) || [];
      list.push(s);
      groups.set(s.className, list);
    }
    return Array.from(groups.entries()).map(([className, list]) => {
      const avg = Math.round(
        list.reduce((a, b) => a + b.percentage, 0) / list.length
      );
      const passed = list.filter((s) => s.passedKkm).length;
      return {
        className,
        count: list.length,
        avg,
        passRate: Math.round((passed / list.length) * 100),
      };
    });
  }, [filteredSubmissions]);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) {
      setBroadcastError('Isi pesan pengumuman terlebih dahulu sebelum mengirim.');
      return;
    }
    setBroadcasting(true);
    setBroadcastError(null);
    setBroadcastFeedback(null);
    try {
      await onBroadcastAnnouncement(selectedSubjectId, announcementText.trim());
      setBroadcastFeedback('Pengumuman real-time dikirim ke seluruh peserta aktif.');
      setAnnouncementText('');
      setTimeout(() => setBroadcastFeedback(null), 4000);
    } catch (err) {
      setBroadcastError(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim pengumuman real-time.'
      );
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Dashboard Analitik & Monitor Real-Time
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pantau progres pengerjaan, pelanggaran tab, dan analisis butir soal AKM/TKA.
          </p>
        </div>

        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2.5 sm:gap-3">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="min-h-[42px] w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
          >
            <option value="">Semua Mata Pelajaran</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={broadcasting}
            onClick={() => setConfirmEndOpen(true)}
            className="inline-flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Power className="h-4 w-4" />
            Akhiri Ujian Real-Time
          </button>
        </div>
      </div>

      {broadcastFeedback && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {broadcastFeedback}
        </div>
      )}

      {broadcastError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {broadcastError}
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sedang Mengerjakan</span>
            <Activity className="h-4 w-4 text-blue-700" />
          </dt>
          <dd className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {activeSessions.length}
          </dd>
          <p className="mt-1 text-xs text-slate-500">
            Dari {students.length} peserta terdaftar
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sudah Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </dt>
          <dd className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {filteredSubmissions.length}
          </dd>
          <p className="mt-1 text-xs text-slate-500">Submisi terekam</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Rata-Rata Nilai</span>
            <BarChart3 className="h-4 w-4 text-slate-600" />
          </dt>
          <dd className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {avgScore}
          </dd>
          <p className="mt-1 text-xs text-slate-500">Skala 0 – 100</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Pelanggaran Anti-Tab</span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </dt>
          <dd className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {totalViolations}
          </dd>
          <p className="mt-1 text-xs text-slate-500">Total insiden tercatat</p>
        </div>
      </dl>

      {/* Real-time Broadcast Announcement Bar */}
      <form
        onSubmit={handleSendAnnouncement}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
          <Bell className="h-4 w-4 text-blue-700" />
          <span>Pengumuman Real-Time ke Ruang Ujian:</span>
        </div>
        <input
          type="text"
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          placeholder="Contoh: Sisa waktu 10 menit lagi, periksa kembali jawaban isian Anda."
          className="min-h-[42px] flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
        />
        <button
          type="submit"
          disabled={broadcasting}
          className="min-h-[42px] rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {broadcasting ? 'Mengirim...' : 'Kirim Notifikasi'}
        </button>
      </form>

      {/* Live Proctoring Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Pemantauan Progres Peserta Real-Time
          </h3>
          <span className="text-xs text-slate-500">
            Sinkronisasi langsung via Server-Sent Events
          </span>
        </div>

        {proctorSessions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Belum ada peserta yang aktif mengerjakan saat ini. Saat siswa login dan mulai ujian, progres mereka tampil otomatis di sini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">No. Peserta</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Progres Soal</th>
                  <th className="px-4 py-3 text-right">Pelanggaran Tab</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proctorSessions.map((session) => {
                  const pct =
                    session.totalQuestions > 0
                      ? Math.round(
                          (session.answeredCount / session.totalQuestions) * 100
                        )
                      : 0;
                  return (
                    <tr
                      key={`${session.participantNumber}-${session.subjectId}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-700">
                        {session.participantNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {session.studentName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {session.className}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full bg-blue-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-slate-600 tabular-nums">
                            {session.answeredCount}/{session.totalQuestions}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <span
                          className={
                            session.violationCount > 0
                              ? 'font-semibold text-red-700'
                              : 'text-slate-600'
                          }
                        >
                          {session.violationCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {session.status === 'Selesai'
                          ? `Selesai (Nilai ${session.score ?? '-'})`
                          : session.status === 'Terkunci'
                          ? 'Terkunci Pelanggaran'
                          : 'Sedang Mengerjakan'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Two-Column Analytics: Per-Class Summary & Item Analysis */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Performa Per Kelas
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Rata-rata nilai dan tingkat ketuntasan KKM per rombongan belajar.
          </p>

          {classPerformance.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Belum ada data nilai masuk.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {classPerformance.map((cp) => (
                <div key={cp.className} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">
                      {cp.className} ({cp.count} siswa)
                    </span>
                    <span className="font-mono text-xs text-slate-700 tabular-nums">
                      Rata-rata {cp.avg} · Tuntas {cp.passRate}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-blue-700 transition-all"
                      style={{ width: `${cp.avg}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Analisis Butir Soal (Tingkat Kesukaran)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Persentase ketepatan jawaban siswa per butir soal untuk evaluasi kualitas instrumen.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="py-2 pr-3">No</th>
                  <th className="py-2 pr-3">Model & Domain</th>
                  <th className="py-2 pr-3 text-right">Ketepatan</th>
                  <th className="py-2 text-right">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemAnalysis.map((item) => (
                  <tr key={item.question.id}>
                    <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-slate-700">
                      #{item.question.number}
                    </td>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-slate-900 line-clamp-1">
                        {item.question.prompt}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.question.type} · {item.question.akmDomain}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {item.avgAccuracy}%
                    </td>
                    <td className="py-2.5 text-right text-xs font-medium text-slate-700">
                      {item.difficulty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmEndOpen}
        title="Akhiri Ujian Sekarang untuk Semua Peserta?"
        description="Notifikasi real-time akan dikirim ke seluruh peserta yang sedang mengerjakan dan jawaban mereka akan langsung dikirim serta dinilai otomatis."
        confirmLabel="Ya, Akhiri & Kirim Notifikasi"
        tone="danger"
        loading={broadcasting}
        onConfirm={async () => {
          setConfirmEndOpen(false);
          setBroadcasting(true);
          setBroadcastError(null);
          setBroadcastFeedback(null);
          try {
            await onBroadcastExamEnd(
              selectedSubjectId,
              'Waktu ujian telah diakhiri secara resmi oleh Admin/Pengawas.'
            );
            setBroadcastFeedback(
              'Perintah akhiri ujian real-time telah dikirim ke semua peserta.'
            );
          } catch (err) {
            setBroadcastError(
              err instanceof Error
                ? err.message
                : 'Gagal mengirim perintah akhiri ujian real-time.'
            );
          } finally {
            setBroadcasting(false);
          }
        }}
        onCancel={() => setConfirmEndOpen(false)}
      />
    </div>
  );
};
