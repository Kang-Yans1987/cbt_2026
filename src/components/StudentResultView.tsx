import React from 'react';
import {
  CheckCircle2,
  CloudCheck,
  CloudOff,
  FileCheck2,
  Home,
  Lock,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { ExamSubmission } from '../types/exam';
import { SchoolLogo } from './SchoolLogo';

interface StudentResultViewProps {
  schoolName: string;
  schoolLogoUrl: string;
  submission: ExamSubmission;
  showScoreImmediately?: boolean;
  onReturnHome: () => void;
}

export const StudentResultView: React.FC<StudentResultViewProps> = ({
  schoolName,
  schoolLogoUrl,
  submission,
  showScoreImmediately = true,
  onReturnHome,
}) => {
  const endReasonText: Record<ExamSubmission['endReason'], string> = {
    manual_submit: 'Dikirim manual oleh peserta',
    time_up: 'Waktu ujian telah berakhir otomatis',
    admin_force_end: 'Diakhiri secara real-time oleh Pengawas/Admin',
    max_violations: 'Dikunci otomatis karena melebihi batas pelanggaran',
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-6 py-6 sm:py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-start gap-3">
              <SchoolLogo
                logoUrl={schoolLogoUrl}
                schoolName={schoolName}
                size="lg"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-medium text-slate-700">
                    {submission.participantNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{submission.className}</span>
                  <span aria-hidden="true">·</span>
                  <span>{endReasonText[submission.endReason]}</span>
                </div>
                <h1 className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900">
                  {showScoreImmediately
                    ? `Hasil Ujian: ${submission.studentName}`
                    : `Jawaban Diterima: ${submission.studentName}`}
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  {submission.subjectName}
                </p>
              </div>
            </div>

            {showScoreImmediately ? (
              <div className="flex sm:block items-center justify-between border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 sm:text-right">
                <div>
                  <p className="text-xs font-medium text-slate-500">Nilai Akhir</p>
                  <p className="font-mono text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
                    {submission.percentage}
                  </p>
                </div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold">
                  {submission.passedKkm ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Tuntas KKM
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <XCircle className="h-4 w-4" />
                      Belum Tuntas KKM
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-blue-700" />
                Ujian Selesai
              </div>
            )}
          </div>

          {showScoreImmediately ? (
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
                <dt className="text-xs text-slate-500">Skor PG & AKM</dt>
                <dd className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {submission.objectiveScore}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
                <dt className="text-xs text-slate-500">Skor Isian</dt>
                <dd className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {submission.aiEssayScore}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
                <dt className="text-xs text-slate-500">Total Poin</dt>
                <dd className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {submission.totalScore} / {submission.maxPossibleScore}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
                <dt className="text-xs text-slate-500">Catatan Fokus</dt>
                <dd className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums flex items-center gap-1.5">
                  {submission.violationCount > 0 && (
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                  )}
                  {submission.violationCount} kali
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">
                  Seluruh Jawaban Telah Berhasil Dikirim
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                  Sesuai pengaturan sekolah, nilai ujian tidak ditampilkan langsung kepada peserta. Hasil nilai resmi dapat dilihat melalui Guru Mata Pelajaran atau Panitia Ujian.
                </p>
                <p className="text-xs font-mono text-slate-500 pt-1">
                  Durasi pengerjaan: {Math.max(1, Math.round(submission.durationSeconds / 60))} menit ·{' '}
                  {Object.keys(submission.answers).length} soal terjawab
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              {submission.syncStatus === 'pending_offline' ? (
                <>
                  <CloudOff className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Tersimpan aman di perangkat (Mode Offline). Hasil akan dikirim otomatis saat koneksi internet kembali stabil.
                  </span>
                </>
              ) : (
                <>
                  <CloudCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Hasil ujian telah tercatat di server dan siap direkap pada Google Spreadsheet sekolah.
                  </span>
                </>
              )}
            </div>
          </div>

          {showScoreImmediately && submission.aiEvaluations.length > 0 && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <FileCheck2 className="h-4 w-4 text-blue-700" />
                Rincian Koreksi Soal Isian
              </h2>
              <div className="mt-4 space-y-4">
                {submission.aiEvaluations.map((ev, idx) => (
                  <div
                    key={ev.questionId}
                    className="rounded-lg border border-slate-200 bg-white p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-700">
                        Butir Isian #{idx + 1} ·{' '}
                        {ev.gradedBy === 'AI'
                          ? 'Koreksi Otomatis'
                          : 'Koreksi Kata Kunci Offline'}
                      </span>
                      <span className="font-mono font-bold text-blue-700 tabular-nums">
                        Skor: {ev.score} / {ev.maxScore}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800">
                      <span className="font-medium text-slate-500">
                        Jawaban Anda:{' '}
                      </span>
                      {ev.studentAnswer || '(Kosong)'}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600">
                      <span className="font-medium text-slate-700">
                        Evaluasi:{' '}
                      </span>
                      {ev.feedback}
                    </p>
                    {ev.matchedKeywords.length > 0 && (
                      <p className="text-xs text-emerald-700">
                        Kata kunci terpenuhi: {ev.matchedKeywords.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={onReturnHome}
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Home className="h-4 w-4" />
              Kembali ke Portal Ujian
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
