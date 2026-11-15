import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Flag,
  Grid,
  ImageOff,
  Maximize2,
  Send,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
  ZoomIn,
} from 'lucide-react';
import type {
  CameraStatus,
  ExamSubmission,
  ExamTimeSettings,
  ProctorActionPayload,
  Question,
  Student,
  SubjectConfig,
} from '../types/exam';
import { useExamProctor } from '../hooks/useExamProctor';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  clearActiveAttempt,
  loadActiveAttempt,
  saveActiveAttempt,
} from '../utils/offlineDb';
import { evaluateSubmission } from '../utils/gradingEngine';
import { getPdfObjectUrlForPreview } from '../services/driveService';
import { ConfirmDialog } from './ConfirmDialog';

interface StudentExamRunnerProps {
  student: Student;
  subject: SubjectConfig;
  questions: Question[];
  accessToken?: string | null;
  examTimeSettings?: ExamTimeSettings;
  showScoreImmediately?: boolean;
  onComplete: (submission: ExamSubmission) => void;
  onExit: () => void;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export const StudentExamRunner: React.FC<StudentExamRunnerProps> = ({
  student,
  subject,
  questions,
  accessToken,
  examTimeSettings,
  showScoreImmediately,
  onComplete,
  onExit,
}) => {
  const effectiveShowScoreImmediately =
    showScoreImmediately !== undefined
      ? showScoreImmediately
      : examTimeSettings?.showScoreImmediately !== false;
  const isOnline = useOnlineStatus();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    subject.durationMinutes * 60
  );
  const [startedAt] = useState(() => new Date().toISOString());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>(
    {}
  );

  // Automatic camera proctoring state
  const cameraEnabled = subject.cameraRequired !== false;
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>(
    cameraEnabled ? 'requesting' : 'disabled'
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showMobileCamera, setShowMobileCamera] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);

  // PDF preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewName, setPdfPreviewName] = useState<string | null>(null);
  const [pdfSourceLabel, setPdfSourceLabel] = useState<string>('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const remainingRef = useRef(remainingSeconds);
  remainingRef.current = remainingSeconds;

  const orderedQuestions = useMemo(() => {
    const list = [...questions].sort((a, b) => a.number - b.number);
    if (!subject.shuffleQuestions) return list;
    let seed = student.participantNumber
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    for (let i = list.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = seed % (i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [questions, subject.shuffleQuestions, student.participantNumber]);

  const currentQuestion = orderedQuestions[currentIndex];

  useEffect(() => {
    let mounted = true;
    loadActiveAttempt(student.participantNumber, subject.id).then((saved) => {
      if (saved && mounted) {
        setAnswers(saved.answers || {});
        setFlaggedIds(saved.flaggedIds || []);
        setCurrentIndex(
          Math.min(
            saved.currentIndex || 0,
            Math.max(0, orderedQuestions.length - 1)
          )
        );
        if (saved.remainingSeconds > 0) {
          setRemainingSeconds(saved.remainingSeconds);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [student.participantNumber, subject.id, orderedQuestions.length]);

  const finishExam = useCallback(
    async (endReason: ExamSubmission['endReason']) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      setConfirmSubmitOpen(false);

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      const elapsedSeconds = Math.max(
        1,
        subject.durationMinutes * 60 - remainingRef.current
      );

      try {
        const result = await evaluateSubmission({
          participantNumber: student.participantNumber,
          studentName: student.name,
          className: student.className,
          subject,
          questions: orderedQuestions,
          answers: answersRef.current,
          violationCount: proctorViolationRef.current.count,
          violationLogs: proctorViolationRef.current.logs,
          durationSeconds: elapsedSeconds,
          endReason,
          isOnline,
          deferAiToBackground: !effectiveShowScoreImmediately,
        });

        clearActiveAttempt(student.participantNumber, subject.id).catch(
          () => {}
        );
        onComplete(result);
      } catch (err) {
        submittedRef.current = false;
        setSubmitting(false);
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Gagal mengirim jawaban. Periksa koneksi lalu coba kirim ulang.'
        );
      }
    },
    [
      student,
      subject,
      orderedQuestions,
      isOnline,
      effectiveShowScoreImmediately,
      onComplete,
    ]
  );

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  const attachStreamToVideos = useCallback((stream: MediaStream | null) => {
    if (desktopVideoRef.current) {
      desktopVideoRef.current.srcObject = stream;
    }
    if (mobileVideoRef.current) {
      mobileVideoRef.current.srcObject = stream;
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (!cameraEnabled) {
      setCameraStatus('disabled');
      return;
    }
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraStatus('unsupported');
      setCameraError(
        'Browser/perangkat ini tidak mendukung akses kamera pengawas.'
      );
      return;
    }

    setCameraStatus('requesting');
    setCameraError(null);
    stopCameraStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 240 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraStatus('active');
      attachStreamToVideos(stream);
    } catch (err) {
      setCameraStatus('denied');
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError(
          'Izin kamera ditolak. Klik "Aktifkan Kamera" dan izinkan akses pada browser.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('Perangkat kamera tidak ditemukan pada perangkat ini.');
      } else {
        setCameraError(
          'Kamera tidak dapat diakses (mungkin sedang dipakai aplikasi lain).'
        );
      }
    }
  }, [cameraEnabled, stopCameraStream, attachStreamToVideos]);

  // Automatically prompt camera permission on exam start & clean up on unmount
  useEffect(() => {
    if (orderedQuestions.length === 0 || !cameraEnabled) return;
    requestCameraPermission();
    return () => {
      stopCameraStream();
    };
  }, [orderedQuestions.length, cameraEnabled, requestCameraPermission, stopCameraStream]);

  // Re-attach stream if video elements mount/toggle (e.g. mobile drawer/preview)
  useEffect(() => {
    if (cameraStreamRef.current && cameraStatus === 'active') {
      attachStreamToVideos(cameraStreamRef.current);
    }
  }, [cameraStatus, showMobileCamera, attachStreamToVideos]);

  const handleProctorAction = useCallback(
    (payload: ProctorActionPayload) => {
      if (payload.action === 'EXTEND_TIME' && payload.extraMinutes) {
        const extraSec = Math.max(1, payload.extraMinutes) * 60;
        setRemainingSeconds((prev) => prev + extraSec);
        setAnnouncement(
          payload.message ||
            `Pengawas menambahkan waktu ekstra +${payload.extraMinutes} menit untuk Anda.`
        );
      } else if (payload.action === 'UNLOCK_STUDENT') {
        setAnnouncement(
          payload.message ||
            'Kunci pelanggaran telah dibuka oleh Pengawas. Silakan lanjutkan mengerjakan dengan tertib.'
        );
      } else if (payload.action === 'WARN_STUDENT') {
        setAnnouncement(
          payload.message ||
            'Peringatan dari Pengawas Ruang: harap tetap fokus pada layar ujian.'
        );
      } else if (payload.action === 'FORCE_FINISH_STUDENT') {
        setAnnouncement(
          payload.message ||
            'Sesi Anda telah dihentikan oleh Pengawas Ruang. Mengirim jawaban...'
        );
        setTimeout(() => {
          finishExam('admin_force_end');
        }, 1200);
      }
    },
    [finishExam]
  );

  const proctorViolationRef = useRef<{
    count: number;
    logs: { timestamp: string; reason: string }[];
  }>({ count: 0, logs: [] });

  const {
    violationCount,
    violationLogs,
    warningModal,
    dismissWarning,
    isFullscreen,
    requestFullscreen,
  } = useExamProctor({
    enabled: !submitting && orderedQuestions.length > 0,
    suspendDetection: cameraStatus === 'requesting',
    maxViolations: subject.maxViolations,
    onMaxViolationsReached: () => finishExam('max_violations'),
    onAdminForceEnd: (msg) => {
      setAnnouncement(msg);
      setTimeout(() => {
        finishExam('admin_force_end');
      }, 1500);
    },
    onAnnouncement: (msg) => {
      setAnnouncement(msg);
    },
    onProctorAction: handleProctorAction,
    participantNumber: student.participantNumber,
    subjectId: subject.id,
  });

  proctorViolationRef.current = { count: violationCount, logs: violationLogs };

  useEffect(() => {
    requestFullscreen();
  }, [requestFullscreen]);

  useEffect(() => {
    if (orderedQuestions.length === 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAnnouncement(
            'Waktu ujian telah habis! Mengirim jawaban Anda secara otomatis...'
          );
          finishExam('time_up');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finishExam, orderedQuestions.length]);

  const lastHeartbeatAtRef = useRef(0);
  const lastUrgentSigRef = useRef('');

  useEffect(() => {
    const answeredCount = Object.values(answers).filter(
      (v) => v && v.trim().length > 0
    ).length;

    const saveTimer = window.setTimeout(() => {
      saveActiveAttempt({
        attemptKey: `${student.participantNumber}::${subject.id}`,
        participantNumber: student.participantNumber,
        subjectId: subject.id,
        answers,
        flaggedIds,
        currentIndex,
        remainingSeconds: remainingRef.current,
        violationCount,
        violationLogs,
        startedAt,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }, 500);

    const sendHeartbeat = () => {
      if (!isOnline) return;
      lastHeartbeatAtRef.current = Date.now();
      fetch('/api/proctor/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantNumber: student.participantNumber,
          studentName: student.name,
          className: student.className,
          room: student.room,
          session: student.session,
          subjectId: subject.id,
          subjectName: subject.name,
          status:
            violationCount >= subject.maxViolations ? 'Terkunci' : 'Mengerjakan',
          answeredCount,
          totalQuestions: orderedQuestions.length,
          violationCount,
          lastViolation: violationLogs[violationLogs.length - 1]?.reason,
          cameraStatus,
          isOffline: false,
          startedAt,
        }),
      }).catch(() => {});
    };

    const urgentSig = `${violationCount}::${cameraStatus}::${isOnline}`;
    const isUrgent = urgentSig !== lastUrgentSigRef.current;
    lastUrgentSigRef.current = urgentSig;

    let hbTimer: number | undefined;
    if (isOnline) {
      const elapsedSinceLast = Date.now() - lastHeartbeatAtRef.current;
      if (isUrgent || elapsedSinceLast >= 2500) {
        sendHeartbeat();
      } else {
        hbTimer = window.setTimeout(
          sendHeartbeat,
          Math.max(400, 2500 - elapsedSinceLast)
        );
      }
    }

    return () => {
      window.clearTimeout(saveTimer);
      if (hbTimer) window.clearTimeout(hbTimer);
    };
  }, [
    answers,
    flaggedIds,
    currentIndex,
    violationCount,
    violationLogs,
    cameraStatus,
    isOnline,
    student,
    subject,
    orderedQuestions.length,
    startedAt,
  ]);

  const handleOpenDrivePdf = async (fileId: string, fileName?: string) => {
    setLoadingPdf(true);
    setPdfError(null);
    setPdfPreviewName(fileName || 'Dokumen Soal PDF');
    try {
      const result = await getPdfObjectUrlForPreview(fileId, accessToken);
      setPdfPreviewUrl(result.url);
      setPdfSourceLabel(
        result.source === 'offline_cache'
          ? 'Dimuat dari Cache Offline Lokal'
          : result.source === 'server_cache'
          ? 'Dimuat dari Cache Server Sekolah'
          : 'Dimuat dari Google Drive'
      );
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : 'Gagal memuat pratinjau PDF.'
      );
    } finally {
      setLoadingPdf(false);
    }
  };

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const answeredCount = orderedQuestions.filter(
    (q) => (answers[q.id] || '').trim().length > 0
  ).length;

  const warningSeconds =
    Math.max(1, examTimeSettings?.warningMinutesBeforeEnd ?? 5) * 60;
  const isLowTime = remainingSeconds <= warningSeconds;

  const elapsedSecondsNow = Math.max(
    0,
    subject.durationMinutes * 60 - remainingSeconds
  );
  const minSubmitSeconds =
    Math.max(0, examTimeSettings?.minSubmitMinutes ?? 0) * 60;
  const canManualSubmit = elapsedSecondsNow >= minSubmitSeconds;
  const remainingUntilSubmitMin = Math.ceil(
    Math.max(0, minSubmitSeconds - elapsedSecondsNow) / 60
  );

  if (orderedQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center space-y-4">
          <p className="text-base font-semibold text-slate-900">
            Belum Ada Soal pada Mata Pelajaran Ini
          </p>
          <p className="text-sm text-slate-600">
            Silakan hubungi admin/guru untuk menambahkan atau menyinkronkan butir soal terlebih dahulu.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white"
          >
            Kembali ke Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col exam-protected">
      {/* Compact Sticky Exam Bar (fits comfortably <= 56px on smartphone!) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3">
          {/* Desktop Student Identity (hidden on small phone to keep sticky bar <= 15% height) */}
          <div className="hidden sm:block min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-medium text-slate-700">
                {student.participantNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate font-medium text-slate-700">
                {student.name}
              </span>
              <span aria-hidden="true">·</span>
              <span>{student.className}</span>
            </div>
            <h1 className="truncate text-sm font-bold text-slate-900">
              {subject.name}
            </h1>
          </div>

          {/* Mobile compact identifier */}
          <div className="sm:hidden min-w-0">
            <span className="font-mono text-xs font-bold text-slate-900">
              #{currentIndex + 1}/{orderedQuestions.length}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-600">
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-amber-700">Offline</span>
                </>
              )}
            </div>

            <div
              className={`flex items-center gap-1 rounded-lg border px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium tabular-nums ${
                violationCount > 0
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>
                {violationCount}/{subject.maxViolations}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 font-mono text-xs sm:text-sm font-bold tabular-nums ${
                isLowTime
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-slate-900 text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>{formatDuration(remainingSeconds)}</span>
            </div>

            {!isFullscreen && (
              <button
                type="button"
                onClick={requestFullscreen}
                className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Layar Penuh
              </button>
            )}

            {cameraEnabled && (
              <button
                type="button"
                onClick={() =>
                  cameraStatus === 'active'
                    ? setShowMobileCamera((v) => !v)
                    : requestCameraPermission()
                }
                title={
                  cameraStatus === 'active'
                    ? 'Kamera Pengawas Aktif'
                    : 'Aktifkan Kamera Pengawas'
                }
                className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg border px-2 sm:px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0 ${
                  cameraStatus === 'active'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-300 bg-amber-50 text-amber-800'
                }`}
              >
                {cameraStatus === 'active' ? (
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CameraOff className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="hidden md:inline">
                  {cameraStatus === 'active'
                    ? 'Kamera Aktif'
                    : cameraStatus === 'requesting'
                    ? 'Izin Kamera...'
                    : 'Aktifkan Kamera'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (!canManualSubmit) {
                  setSubmitError(
                    `Tombol selesai baru terbuka dalam ${remainingUntilSubmitMin} menit (ketentuan minimal pengerjaan ${examTimeSettings?.minSubmitMinutes} menit).`
                  );
                  return;
                }
                setConfirmSubmitOpen(true);
              }}
              disabled={submitting}
              title={
                canManualSubmit
                  ? 'Kumpulkan ujian'
                  : `Tunggu ${remainingUntilSubmitMin} menit lagi sebelum selesai`
              }
              className="inline-flex min-h-[36px] sm:min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-600 px-3 sm:px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'Kirim...' : 'Selesai'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Student Summary & Quick Map Button (non-sticky so it doesn't crowd phone screen) */}
      <div className="sm:hidden border-b border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 text-xs">
          <p className="truncate font-semibold text-slate-900">
            {student.name} ({student.participantNumber})
          </p>
          <p className="truncate text-slate-500">
            {student.room} · {subject.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 whitespace-nowrap shrink-0"
        >
          <Grid className="h-3.5 w-3.5" />
          Soal ({answeredCount}/{orderedQuestions.length})
        </button>
      </div>

      {/* Camera Permission Prompt / Warning Banner if denied on phone/desktop */}
      {cameraEnabled && cameraStatus === 'denied' && cameraError && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 sm:px-6 py-2.5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <CameraOff className="h-4 w-4 shrink-0 text-amber-700" />
              <span>{cameraError}</span>
            </div>
            <button
              type="button"
              onClick={requestCameraPermission}
              className="min-h-[34px] rounded-md bg-amber-700 px-3 py-1 font-semibold text-white hover:bg-amber-800 whitespace-nowrap shrink-0"
            >
              Izinkan & Aktifkan Kamera
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Mobile Camera Feed */}
      {cameraEnabled && cameraStatus === 'active' && showMobileCamera && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <video
                ref={mobileVideoRef}
                autoPlay
                playsInline
                muted
                className="h-16 w-24 rounded-lg border border-slate-300 bg-slate-900 object-cover -scale-x-100"
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-900">
                  Kamera Pengawas Aktif
                </p>
                <p className="text-slate-500">
                  Terhubung ke pemantauan proktor ruang.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileCamera(false)}
              className="text-xs font-medium text-slate-600 underline"
            >
              Sembunyikan
            </button>
          </div>
        </div>
      )}

      {/* Real-time Admin Notification Banner */}
      {announcement && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 sm:px-6 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-xs sm:text-sm text-blue-900">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-blue-700" />
              <span>Notifikasi Pengawas Real-Time: {announcement}</span>
            </div>
            <button
              type="button"
              onClick={() => setAnnouncement(null)}
              className="text-blue-700 hover:text-blue-900"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 sm:px-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {submitError}
          </div>
        </div>
      )}

      {/* Main Exam Workspace */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 sm:px-6 py-4 sm:py-6 grid gap-6 lg:grid-cols-12 items-start">
        <section className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-4 sm:p-8">
          {currentQuestion && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-slate-900">
                    Soal {currentIndex + 1} dari {orderedQuestions.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {currentQuestion.type === 'PG'
                      ? 'Pilihan Ganda'
                      : currentQuestion.type === 'PG_KOMPLEKS'
                      ? 'PG Kompleks (AKM)'
                      : currentQuestion.type === 'BENAR_SALAH'
                      ? 'Benar / Salah (AKM)'
                      : currentQuestion.type === 'MENJODOHKAN'
                      ? 'Menjodohkan (AKM)'
                      : 'Isian / Uraian'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{currentQuestion.akmDomain}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Bobot {currentQuestion.weight}
                  </span>
                </div>

                {currentQuestion.drivePdfId && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenDrivePdf(
                        currentQuestion.drivePdfId!,
                        currentQuestion.drivePdfName
                      )
                    }
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Preview PDF Lampiran
                  </button>
                )}
              </div>

              {/* PDF Preview Drawer */}
              {(pdfPreviewUrl || loadingPdf || pdfError) && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3 pb-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {pdfPreviewName}
                      </p>
                      {pdfSourceLabel && (
                        <p className="text-[11px] text-slate-500">
                          {pdfSourceLabel}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfPreviewUrl(null);
                        setPdfError(null);
                      }}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {loadingPdf && (
                    <p className="py-6 text-center text-xs text-slate-600">
                      Memuat dokumen PDF...
                    </p>
                  )}
                  {pdfError && (
                    <p className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                      {pdfError}
                    </p>
                  )}
                  {pdfPreviewUrl && (
                    <iframe
                      title={pdfPreviewName || 'Preview Soal PDF'}
                      src={`${pdfPreviewUrl}#toolbar=0&navpanes=0`}
                      className="h-[320px] sm:h-[400px] w-full rounded-md border border-slate-200 bg-white"
                    />
                  )}
                </div>
              )}

              {/* Stimulus */}
              {currentQuestion.stimulus && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:p-4 text-sm leading-relaxed text-slate-700">
                  {currentQuestion.stimulus}
                </div>
              )}

              {/* Soal Bergambar */}
              {currentQuestion.imageUrl && (
                <figure className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {brokenImageIds[currentQuestion.id] ? (
                    <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-500">
                      <ImageOff className="h-7 w-7 text-slate-400 mb-2" />
                      <span>Gambar soal gagal dimuat. Periksa koneksi atau cache.</span>
                    </div>
                  ) : (
                    <div className="relative group">
                      <img
                        src={currentQuestion.imageUrl}
                        alt={
                          currentQuestion.imageCaption ||
                          `Ilustrasi Soal ${currentIndex + 1}`
                        }
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImageIds((prev) => ({
                            ...prev,
                            [currentQuestion.id]: true,
                          }))
                        }
                        onClick={() =>
                          setZoomedImageUrl(currentQuestion.imageUrl!)
                        }
                        className="mx-auto max-h-64 sm:max-h-80 w-auto cursor-zoom-in rounded object-contain"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImageUrl(currentQuestion.imageUrl!)
                        }
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                        Perbesar Gambar
                      </button>
                    </div>
                  )}
                  {currentQuestion.imageCaption && (
                    <figcaption className="mt-2 text-center text-xs text-slate-600">
                      {currentQuestion.imageCaption}
                    </figcaption>
                  )}
                </figure>
              )}

              {/* Prompt */}
              <div className="mt-5 text-sm sm:text-base font-medium leading-relaxed text-slate-900">
                {currentQuestion.prompt}
              </div>

              {/* Dynamic Answer Input */}
              <div className="mt-5 space-y-3">
                {currentQuestion.type === 'PG' &&
                  currentQuestion.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const selected =
                      (answers[currentQuestion.id] || '').toUpperCase() ===
                      letter;
                    const optImg = currentQuestion.optionImages?.[idx];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAnswer(currentQuestion.id, letter)}
                        className={`flex min-h-[48px] w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition-colors ${
                          selected
                            ? 'border-blue-700 bg-blue-50/70 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-mono font-semibold ${
                            selected
                              ? 'border-blue-700 bg-blue-700 text-white'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        >
                          {letter}
                        </span>
                        <div className="space-y-2 min-w-0 flex-1">
                          <span className="block leading-relaxed">
                            {opt.replace(/^[A-E]\.\s*/, '')}
                          </span>
                          {optImg && (
                            <img
                              src={optImg}
                              alt={`Gambar Opsi ${letter}`}
                              referrerPolicy="no-referrer"
                              className="max-h-32 rounded border border-slate-200 bg-white object-contain"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}

                {currentQuestion.type === 'PG_KOMPLEKS' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500">
                      Pilih semua jawaban yang benar (dapat lebih dari satu):
                    </p>
                    {currentQuestion.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const currentSet = new Set(
                        (answers[currentQuestion.id] || '')
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      );
                      const checked = currentSet.has(letter);
                      const optImg = currentQuestion.optionImages?.[idx];
                      const toggle = () => {
                        if (checked) currentSet.delete(letter);
                        else currentSet.add(letter);
                        setAnswer(
                          currentQuestion.id,
                          Array.from(currentSet).sort().join(',')
                        );
                      };
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={toggle}
                          className={`flex min-h-[48px] w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition-colors ${
                            checked
                              ? 'border-blue-700 bg-blue-50/70 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                              checked
                                ? 'border-blue-700 bg-blue-700 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked ? '✓' : ''}
                          </span>
                          <div className="space-y-2 min-w-0 flex-1">
                            <span className="block leading-relaxed">
                              {opt.replace(/^[A-E]\.\s*/, '')}
                            </span>
                            {optImg && (
                              <img
                                src={optImg}
                                alt={`Gambar Opsi ${letter}`}
                                referrerPolicy="no-referrer"
                                className="max-h-32 rounded border border-slate-200 bg-white object-contain"
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'BENAR_SALAH' && (
                  <>
                    {/* Smartphone stacked card view */}
                    <div className="space-y-3 sm:hidden">
                      {(currentQuestion.statements || []).map((st) => {
                        const map = new Map<string, string>();
                        (answers[currentQuestion.id] || '')
                          .split(',')
                          .forEach((p) => {
                            const [k, v] = p.split(':');
                            if (k && v) map.set(k, v);
                          });
                        const val = map.get(st.id);
                        const updateChoice = (choice: 'true' | 'false') => {
                          map.set(st.id, choice);
                          const serialized = Array.from(map.entries())
                            .map(([k, v]) => `${k}:${v}`)
                            .join(',');
                          setAnswer(currentQuestion.id, serialized);
                        };
                        return (
                          <div
                            key={st.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2.5"
                          >
                            <p className="text-sm text-slate-800">{st.text}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => updateChoice('true')}
                                className={`min-h-[42px] rounded-lg border text-xs font-semibold ${
                                  val === 'true'
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-700'
                                }`}
                              >
                                Benar
                              </button>
                              <button
                                type="button"
                                onClick={() => updateChoice('false')}
                                className={`min-h-[42px] rounded-lg border text-xs font-semibold ${
                                  val === 'false'
                                    ? 'border-red-600 bg-red-600 text-white'
                                    : 'border-slate-300 bg-white text-slate-700'
                                }`}
                              >
                                Salah
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop table view */}
                    <div className="hidden sm:block overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Pernyataan</th>
                            <th className="w-24 px-3 py-3 text-center">Benar</th>
                            <th className="w-24 px-3 py-3 text-center">Salah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(currentQuestion.statements || []).map((st) => {
                            const map = new Map<string, string>();
                            (answers[currentQuestion.id] || '')
                              .split(',')
                              .forEach((p) => {
                                const [k, v] = p.split(':');
                                if (k && v) map.set(k, v);
                              });
                            const val = map.get(st.id);
                            const updateChoice = (choice: 'true' | 'false') => {
                              map.set(st.id, choice);
                              const serialized = Array.from(map.entries())
                                .map(([k, v]) => `${k}:${v}`)
                                .join(',');
                              setAnswer(currentQuestion.id, serialized);
                            };
                            return (
                              <tr key={st.id} className="bg-white">
                                <td className="px-4 py-3 text-slate-800">
                                  {st.text}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => updateChoice('true')}
                                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                                      val === 'true'
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    Benar
                                  </button>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => updateChoice('false')}
                                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                                      val === 'false'
                                        ? 'border-red-600 bg-red-600 text-white'
                                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    Salah
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {currentQuestion.type === 'MENJODOHKAN' && (
                  <div className="space-y-3">
                    {(currentQuestion.matchingPairs || []).map((pair) => {
                      const rightChoices = (currentQuestion.matchingPairs || [])
                        .map((p) => p.right)
                        .sort();
                      const currentMap = new Map<string, string>();
                      (answers[currentQuestion.id] || '')
                        .split('||')
                        .forEach((entry) => {
                          const idx = entry.indexOf('->');
                          if (idx > -1) {
                            currentMap.set(
                              entry.slice(0, idx),
                              entry.slice(idx + 2)
                            );
                          }
                        });
                      const chosen = currentMap.get(pair.id) || '';
                      const handleMatch = (rightVal: string) => {
                        if (rightVal) currentMap.set(pair.id, rightVal);
                        else currentMap.delete(pair.id);
                        const serialized = Array.from(currentMap.entries())
                          .map(([k, v]) => `${k}->${v}`)
                          .join('||');
                        setAnswer(currentQuestion.id, serialized);
                      };

                      return (
                        <div
                          key={pair.id}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="text-sm font-medium text-slate-800">
                            {pair.left}
                          </span>
                          <select
                            value={chosen}
                            onChange={(e) => handleMatch(e.target.value)}
                            className="min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none sm:w-64"
                          >
                            <option value="">-- Pilih Pasangan --</option>
                            {rightChoices.map((rc) => (
                              <option key={rc} value={rc}>
                                {rc}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'ISIAN' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      Tulis jawaban singkat / uraian Anda dengan jelas:
                    </label>
                    <textarea
                      rows={5}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) =>
                        setAnswer(currentQuestion.id, e.target.value)
                      }
                      placeholder="Ketik jawaban Anda di sini..."
                      className="w-full rounded-lg border border-slate-300 bg-white p-3.5 text-sm leading-relaxed text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 select-text"
                    />
                  </div>
                )}
              </div>

              {/* Mobile-friendly Navigation Footer */}
              <div className="mt-7 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-2.5 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Sebelumnya
                </button>

                <button
                  type="button"
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`col-span-2 sm:col-span-1 order-3 sm:order-2 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium whitespace-nowrap shrink-0 ${
                    flaggedIds.includes(currentQuestion.id)
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Flag className="h-4 w-4" />
                  {flaggedIds.includes(currentQuestion.id)
                    ? 'Ditandai Ragu-ragu'
                    : 'Tandai Ragu-ragu'}
                </button>

                {currentIndex < orderedQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((i) =>
                        Math.min(orderedQuestions.length - 1, i + 1)
                      )
                    }
                    className="order-2 sm:order-3 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                  >
                    Berikutnya
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSubmitOpen(true)}
                    className="order-2 sm:order-3 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Kirim Jawaban
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        {/* Desktop Question Map */}
        <aside className="hidden lg:block lg:col-span-4 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Navigasi Nomor Soal
              </h2>
              <span className="font-mono text-xs text-slate-600 tabular-nums">
                {answeredCount}/{orderedQuestions.length} Terjawab
              </span>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {orderedQuestions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = (answers[q.id] || '').trim().length > 0;
                const isFlagged = flaggedIds.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-lg border font-mono text-xs font-semibold tabular-nums transition-colors ${
                      isCurrent
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : isFlagged
                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                        : isAnswered
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-400" />
              <span>Sudah dijawab</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-amber-100 border border-amber-400" />
              <span>Ditandai ragu-ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-white border border-slate-300" />
              <span>Belum dijawab</span>
            </div>
          </div>

          {/* Proctoring Camera Widget */}
          {cameraEnabled && (
            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-blue-700" />
                  Kamera Pengawas
                </span>
                <span
                  className={`font-medium ${
                    cameraStatus === 'active'
                      ? 'text-emerald-700'
                      : cameraStatus === 'requesting'
                      ? 'text-blue-700'
                      : 'text-amber-700'
                  }`}
                >
                  {cameraStatus === 'active'
                    ? 'Aktif'
                    : cameraStatus === 'requesting'
                    ? 'Meminta Izin...'
                    : 'Nonaktif'}
                </span>
              </div>

              {cameraStatus === 'active' ? (
                <video
                  ref={desktopVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-36 w-full rounded-lg border border-slate-200 bg-slate-900 object-cover -scale-x-100"
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center space-y-2">
                  <CameraOff className="h-5 w-5 text-slate-400 mx-auto" />
                  <p className="text-[11px] text-slate-600">
                    {cameraError ||
                      'Aplikasi otomatis meminta izin kamera untuk pengawasan ujian.'}
                  </p>
                  {cameraStatus !== 'requesting' && (
                    <button
                      type="button"
                      onClick={requestCameraPermission}
                      className="rounded-md bg-blue-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-800"
                    >
                      Aktifkan Kamera
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            <p className="font-medium text-slate-700">Proteksi Anti-Tab Aktif</p>
            <p className="mt-1">
              Jangan membuka tab baru, menutup layar penuh, atau berpindah jendela. Jawaban tersimpan otomatis setiap detik di penyimpanan lokal terenkripsi.
            </p>
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onExit();
              }}
              className="mt-3 text-slate-500 underline hover:text-slate-800"
            >
              Keluar Darurat (Tanpa Kirim)
            </button>
          </div>
        </aside>
      </main>

      {/* Mobile Question Map Sheet */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/50 lg:hidden">
          <div className="w-full rounded-t-2xl bg-white p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Navigasi Soal ({answeredCount}/{orderedQuestions.length})
              </h3>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {orderedQuestions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = (answers[q.id] || '').trim().length > 0;
                const isFlagged = flaggedIds.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setMobileNavOpen(false);
                    }}
                    className={`min-h-[44px] rounded-lg border font-mono text-xs font-semibold tabular-nums ${
                      isCurrent
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : isFlagged
                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                        : isAnswered
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  onExit();
                }}
                className="text-red-600 underline"
              >
                Keluar Darurat
              </button>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="min-h-[40px] rounded-lg bg-slate-900 px-4 py-2 text-white font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoomed Image Lightbox */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              className="absolute -top-10 right-0 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900"
            >
              Tutup
            </button>
            <img
              src={zoomedImageUrl}
              alt="Perbesaran gambar soal"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] w-auto rounded-lg bg-white object-contain"
            />
          </div>
        </div>
      )}

      {/* Anti-Tab Security Warning Overlay */}
      {warningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Peringatan Sistem Anti-Tab
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {warningModal}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  dismissWarning();
                  requestFullscreen();
                }}
                className="min-h-[42px] rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Kembali ke Ujian (Layar Penuh)
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmSubmitOpen}
        title="Kirim Jawaban & Akhiri Ujian?"
        description={
          !effectiveShowScoreImmediately
            ? `Anda telah menjawab ${answeredCount} dari ${orderedQuestions.length} soal. Setelah dikirim, jawaban Anda langsung disimpan ke sistem dan pengawas.`
            : `Anda telah menjawab ${answeredCount} dari ${orderedQuestions.length} soal. Setelah dikirim, jawaban segera disimpan dan hasil ujian langsung ditampilkan.`
        }
        confirmLabel="Ya, Kirim Sekarang"
        cancelLabel="Lanjutkan Mengerjakan"
        loading={submitting}
        onConfirm={() => finishExam('manual_submit')}
        onCancel={() => setConfirmSubmitOpen(false)}
      />
    </div>
  );
};
