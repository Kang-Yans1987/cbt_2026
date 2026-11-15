import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AiEvaluationResult,
  DrivePdfFile,
  ExamPackageData,
  ExamSubmission,
  ProctorActionType,
  ProctorSession,
  Student,
  SubjectConfig,
} from './types/exam';
import { DEFAULT_SPREADSHEET_ID } from './types/exam';
import {
  createInitialPackage,
  DEFAULT_ADMIN_CREDENTIALS,
  DEFAULT_PROCTOR_CREDENTIALS,
  INITIAL_QUESTIONS,
  INITIAL_SUBMISSIONS,
} from './data/defaultExamData';
import {
  clearAllActiveAttempts,
  clearLocalSubmissions,
  clearPdfCache,
  getAllLocalSubmissions,
  listCachedPdfIds,
  loadEncryptedExamPackage,
  saveEncryptedExamPackage,
  saveSubmissionOffline,
} from './utils/offlineDb';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { googleSignIn, initAuth, logoutGoogle } from './services/firebaseAuth';
import {
  appendSubmissionToSheet,
  pullAllFromSheets,
  pushAllToSheets,
  type SpreadsheetMetadata,
} from './services/sheetsService';
import { listDrivePdfs } from './services/driveService';
import { PortalEntry } from './components/PortalEntry';
import { StudentExamRunner } from './components/StudentExamRunner';
import { StudentResultView } from './components/StudentResultView';
import { AdminDashboard, type AdminSection } from './components/AdminDashboard';
import { ProctorStandaloneView } from './components/ProctorStandaloneView';
import {
  RoleLoginModal,
  type AuthenticatedActor,
} from './components/RoleLoginModal';
import { OfflineIndicator } from './components/PWAControls';

type AppView = 'portal' | 'exam' | 'result' | 'admin' | 'proctor';

export default function App() {
  const isOnline = useOnlineStatus();
  const [view, setView] = useState<AppView>('portal');
  const [loginPromptRole, setLoginPromptRole] = useState<
    'admin' | 'proctor' | null
  >(null);
  const [authenticatedActor, setAuthenticatedActor] =
    useState<AuthenticatedActor | null>(null);
  const [adminInitialSection, setAdminInitialSection] =
    useState<AdminSection>('analytics');
  const [examPackage, setExamPackage] = useState<ExamPackageData>(() =>
    createInitialPackage()
  );
  const [hasEncryptedCache, setHasEncryptedCache] = useState(false);
  const [submissions, setSubmissions] =
    useState<ExamSubmission[]>(INITIAL_SUBMISSIONS);
  const [proctorSessions, setProctorSessions] = useState<ProctorSession[]>([]);
  const [drivePdfs, setDrivePdfs] = useState<DrivePdfFile[]>([]);
  const [cachedPdfCount, setCachedPdfCount] = useState(0);

  // Active student exam state
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeSubject, setActiveSubject] = useState<SubjectConfig | null>(null);
  const [latestSubmission, setLatestSubmission] =
    useState<ExamSubmission | null>(null);

  // Google Workspace Auth state (access token kept strictly in memory)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sheetMeta, setSheetMeta] = useState<SpreadsheetMetadata | null>(null);
  const [authBannerError, setAuthBannerError] = useState<string | null>(null);

  // Initialize Firebase auth listener
  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setAccessToken(token);
        setUserEmail(user.email || user.displayName || 'Akun Google');
      },
      () => {
        setAccessToken(null);
      }
    );
    return () => unsub();
  }, []);

  // Load encrypted offline package + server runtime package & PDF cache status
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const localPkg = await loadEncryptedExamPackage(DEFAULT_SPREADSHEET_ID);
      if (localPkg && mounted) {
        let updatedPkg = localPkg;
        let changed = false;

        // Clear untouched legacy dummy students once if still cached in IndexedDB
        const legacyDummyStudents =
          updatedPkg.students.length === 6 &&
          updatedPkg.students.every(
            (s) =>
              /^STD-0[1-6]$/.test(s.id) &&
              /^2026-01-00[1-6]$/.test(s.participantNumber)
          );
        if (legacyDummyStudents) {
          updatedPkg = { ...updatedPkg, students: [] };
          changed = true;
        }

        const hasIllustrated = updatedPkg.questions.some((q) =>
          Boolean(q.imageUrl)
        );
        if (!hasIllustrated) {
          const sampleImages = INITIAL_QUESTIONS.filter(
            (q) =>
              Boolean(q.imageUrl) &&
              !updatedPkg.questions.some((existing) => existing.id === q.id)
          );
          if (sampleImages.length > 0) {
            updatedPkg = {
              ...updatedPkg,
              questions: [...updatedPkg.questions, ...sampleImages],
            };
            changed = true;
          }
        }

        // Migrate legacy default AksaraCBT branding & default school name
        if (!updatedPkg.appTitle || updatedPkg.appTitle === 'AksaraCBT') {
          updatedPkg = { ...updatedPkg, appTitle: 'DutawangiCBT' };
          changed = true;
        }
        if (
          !updatedPkg.schoolName ||
          updatedPkg.schoolName === 'SMA Negeri 1 Nusantara'
        ) {
          updatedPkg = {
            ...updatedPkg,
            schoolName: 'SD Negeri 2 Tukangkayu',
            subjects: updatedPkg.subjects.map((s) =>
              s.schoolName === 'SMA Negeri 1 Nusantara'
                ? { ...s, schoolName: 'SD Negeri 2 Tukangkayu' }
                : s
            ),
          };
          changed = true;
        }

        if (changed) {
          await saveEncryptedExamPackage(updatedPkg);
        }
        setExamPackage(updatedPkg);
        setHasEncryptedCache(true);
      } else {
        const initial = createInitialPackage();
        await saveEncryptedExamPackage(initial);
        if (mounted) setHasEncryptedCache(true);
      }

      const localSubs = (await getAllLocalSubmissions()).filter(
        (s) => s.id !== 'SUB-DEMO-01' && s.id !== 'SUB-DEMO-02'
      );
      if (localSubs.length > 0 && mounted) {
        setSubmissions((prev) => {
          const map = new Map<string, ExamSubmission>();
          [...localSubs, ...prev].forEach((s) => map.set(s.id, s));
          return Array.from(map.values()).sort((a, b) =>
            b.submittedAt.localeCompare(a.submittedAt)
          );
        });
      }

      const cachedIds = await listCachedPdfIds();
      if (mounted) setCachedPdfCount(cachedIds.length);

      if (navigator.onLine) {
        try {
          const pkgRes = await fetch('/api/exam/package');
          if (pkgRes.ok && mounted) {
            const serverPkg = (await pkgRes.json()) as ExamPackageData;
            if (serverPkg?.subjects?.length) {
              setExamPackage(serverPkg);
              await saveEncryptedExamPackage(serverPkg);
            }
          }
          const subRes = await fetch('/api/exam/submissions');
          if (subRes.ok && mounted) {
            const { submissions: srvSubs } = (await subRes.json()) as {
              submissions: ExamSubmission[];
            };
            if (Array.isArray(srvSubs) && srvSubs.length > 0) {
              setSubmissions((prev) => {
                const map = new Map<string, ExamSubmission>();
                [...srvSubs, ...prev].forEach((s) => map.set(s.id, s));
                return Array.from(map.values()).sort((a, b) =>
                  b.submittedAt.localeCompare(a.submittedAt)
                );
              });
            }
          }
          const pdfRes = await fetch('/api/drive/pdfs');
          if (pdfRes.ok && mounted) {
            const { files } = (await pdfRes.json()) as { files: DrivePdfFile[] };
            if (Array.isArray(files) && files.length > 0) {
              setDrivePdfs(files);
            }
          }
        } catch {
          // Offline or server not yet populated
        }
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-sync pending offline submissions when network returns
  useEffect(() => {
    if (!isOnline) return;
    const pending = submissions.filter(
      (s) => s.syncStatus === 'pending_offline'
    );
    if (pending.length === 0) return;

    (async () => {
      for (const sub of pending) {
        try {
          const res = await fetch('/api/exam/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...sub, syncStatus: 'synced_server' }),
          });
          if (res.ok) {
            let finalStatus: ExamSubmission['syncStatus'] = 'synced_server';
            if (accessToken) {
              try {
                await appendSubmissionToSheet(
                  examPackage.spreadsheetId,
                  accessToken,
                  sub
                );
                finalStatus = 'synced_sheets';
              } catch {
                // Keep synced_server if Sheets append fails
              }
            }
            const updated: ExamSubmission = { ...sub, syncStatus: finalStatus };
            await saveSubmissionOffline(updated);
            setSubmissions((prev) =>
              prev.map((item) => (item.id === sub.id ? updated : item))
            );
          }
        } catch {
          // Will retry on next online transition
        }
      }
    })();
  }, [isOnline, submissions, accessToken, examPackage.spreadsheetId]);

  // Real-time SSE listener for Admin Dashboard & Standalone Proctor View
  useEffect(() => {
    if ((view !== 'admin' && view !== 'proctor') || !isOnline) return;
    const es = new EventSource('/api/proctor/stream?role=admin');

    es.addEventListener('PROCTOR_SNAPSHOT', (ev) => {
      try {
        const list = JSON.parse((ev as MessageEvent).data) as ProctorSession[];
        setProctorSessions(list);
      } catch {
        // ignore
      }
    });

    es.addEventListener('PROCTOR_UPDATE', (ev) => {
      try {
        const list = JSON.parse((ev as MessageEvent).data) as ProctorSession[];
        setProctorSessions(list);
      } catch {
        // ignore
      }
    });

    es.addEventListener('SUBMISSION_NEW', (ev) => {
      try {
        const sub = JSON.parse((ev as MessageEvent).data) as ExamSubmission;
        setSubmissions((prev) => {
          const map = new Map<string, ExamSubmission>();
          [sub, ...prev].forEach((s) => map.set(s.id, s));
          return Array.from(map.values()).sort((a, b) =>
            b.submittedAt.localeCompare(a.submittedAt)
          );
        });
      } catch {
        // ignore
      }
    });

    return () => {
      es.close();
    };
  }, [view, isOnline]);

  const updateExamPackage = useCallback(async (next: ExamPackageData) => {
    setExamPackage(next);
    await saveEncryptedExamPackage(next);
    setHasEncryptedCache(true);
    if (navigator.onLine) {
      fetch('/api/exam/package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {});
    }
  }, []);

  const handleSignIn = async () => {
    setAuthBannerError(null);
    try {
      const { user, accessToken: token } = await googleSignIn();
      setAccessToken(token);
      setUserEmail(user.email || user.displayName || 'Akun Google');

      try {
        const files = await listDrivePdfs(examPackage.driveFolderId, token);
        setDrivePdfs(files);
      } catch {
        // Non-fatal if folder permissions differ
      }
    } catch (err) {
      setAuthBannerError(
        err instanceof Error ? err.message : 'Gagal masuk dengan Google.'
      );
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setAccessToken(null);
    setUserEmail(null);
    setSheetMeta(null);
  };

  const handlePullFromSheets = async () => {
    if (!accessToken)
      throw new Error('Silakan masuk dengan Google terlebih dahulu.');
    const pulled = await pullAllFromSheets(
      examPackage.spreadsheetId,
      accessToken
    );
    setSheetMeta(pulled.metadata);

    const nextPkg: ExamPackageData = {
      ...examPackage,
      appTitle:
        !pulled.appTitle || pulled.appTitle === 'AksaraCBT'
          ? 'DutawangiCBT'
          : pulled.appTitle,
      schoolName:
        pulled.schoolName === 'SMA Negeri 1 Nusantara'
          ? 'SD Negeri 2 Tukangkayu'
          : pulled.schoolName || examPackage.schoolName,
      schoolLogoUrl:
        pulled.schoolLogoUrl !== undefined
          ? pulled.schoolLogoUrl
          : examPackage.schoolLogoUrl,
      homeThumbnailUrl:
        pulled.homeThumbnailUrl !== undefined
          ? pulled.homeThumbnailUrl
          : examPackage.homeThumbnailUrl,
      adminCredentials:
        pulled.adminCredentials || examPackage.adminCredentials,
      proctorCredentials:
        pulled.proctorCredentials || examPackage.proctorCredentials,
      examTimeSettings:
        pulled.examTimeSettings || examPackage.examTimeSettings,
      teachers:
        pulled.teachers.length > 0 ? pulled.teachers : examPackage.teachers,
      subjects:
        pulled.subjects.length > 0 ? pulled.subjects : examPackage.subjects,
      questions:
        pulled.questions.length > 0 ? pulled.questions : examPackage.questions,
      students:
        pulled.students.length > 0 ? pulled.students : examPackage.students,
      examSessions:
        pulled.examSessions && pulled.examSessions.length > 0
          ? pulled.examSessions
          : examPackage.examSessions,
      examRooms:
        pulled.examRooms && pulled.examRooms.length > 0
          ? pulled.examRooms
          : examPackage.examRooms,
      proctorMappings:
        pulled.proctorMappings && pulled.proctorMappings.length > 0
          ? pulled.proctorMappings
          : examPackage.proctorMappings,
      examSchedules:
        pulled.examSchedules && pulled.examSchedules.length > 0
          ? pulled.examSchedules
          : examPackage.examSchedules,
      beritaAcaraList:
        pulled.beritaAcaraList && pulled.beritaAcaraList.length > 0
          ? pulled.beritaAcaraList
          : examPackage.beritaAcaraList,
      updatedAt: new Date().toISOString(),
    };
    await updateExamPackage(nextPkg);
    if (pulled.submissions.length > 0) {
      setSubmissions(pulled.submissions);
    }
  };

  const handlePushToSheets = async () => {
    if (!accessToken)
      throw new Error('Silakan masuk dengan Google terlebih dahulu.');
    await pushAllToSheets(
      examPackage.spreadsheetId,
      accessToken,
      examPackage,
      submissions
    );
  };

  const handlePublishEncryptedPackage = async () => {
    await saveEncryptedExamPackage(examPackage);
    setHasEncryptedCache(true);
    const res = await fetch('/api/exam/package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examPackage),
    });
    if (!res.ok) {
      throw new Error('Gagal mempublikasikan paket ke server runtime.');
    }
  };

  const handleCompleteExam = async (sub: ExamSubmission) => {
    const initialSub: ExamSubmission = {
      ...sub,
      syncStatus: isOnline ? 'synced_server' : 'pending_offline',
    };

    // Save locally and show result screen immediately without waiting on network I/O
    await saveSubmissionOffline(initialSub);
    setSubmissions((prev) => [
      initialSub,
      ...prev.filter((s) => s.id !== initialSub.id),
    ]);
    setLatestSubmission(initialSub);
    setView('result');

    if (!isOnline) return;

    // Background sync: optionally upgrade deferred AI essay grading, submit to server, and append to Sheets
    (async () => {
      let finalSub = initialSub;
      try {
        const subjectCfg = examPackage.subjects.find(
          (s) => s.id === finalSub.subjectId
        );
        const essayQuestions = examPackage.questions.filter(
          (q) => q.subjectId === finalSub.subjectId && q.type === 'ISIAN'
        );
        const hasDeferredLocalAi =
          essayQuestions.length > 0 &&
          finalSub.aiEvaluations.some((ev) => ev.gradedBy === 'LOCAL_OFFLINE');

        if (hasDeferredLocalAi) {
          try {
            const aiRes = await fetch('/api/ai/grade-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: essayQuestions.map((q) => ({
                  questionId: q.id,
                  questionPrompt: q.prompt,
                  referenceAnswer: q.correctAnswer,
                  keywords: q.aiKeywords || q.correctAnswer,
                  maxScore: q.weight,
                  studentAnswer: finalSub.answers[q.id] || '',
                })),
              }),
            });
            if (aiRes.ok) {
              const data = (await aiRes.json()) as {
                results: AiEvaluationResult[];
              };
              if (Array.isArray(data.results) && data.results.length > 0) {
                const aiEssayScore = Number(
                  data.results
                    .reduce((sum, ev) => sum + ev.score, 0)
                    .toFixed(2)
                );
                const totalScore = Number(
                  (finalSub.objectiveScore + aiEssayScore).toFixed(2)
                );
                const percentage =
                  finalSub.maxPossibleScore > 0
                    ? Math.round((totalScore / finalSub.maxPossibleScore) * 100)
                    : 0;
                const kkm = subjectCfg?.passingGradeKkm ?? 75;
                finalSub = {
                  ...finalSub,
                  aiEvaluations: data.results,
                  aiEssayScore,
                  totalScore,
                  percentage,
                  passedKkm: percentage >= kkm,
                };
              }
            }
          } catch {
            // Keep offline local essay score if AI call fails
          }
        }

        const res = await fetch('/api/exam/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalSub),
        });

        if (res.ok) {
          let nextStatus: ExamSubmission['syncStatus'] = 'synced_server';
          if (accessToken) {
            try {
              await appendSubmissionToSheet(
                examPackage.spreadsheetId,
                accessToken,
                finalSub
              );
              nextStatus = 'synced_sheets';
            } catch {
              // Keep synced_server
            }
          }
          finalSub = { ...finalSub, syncStatus: nextStatus };
        } else {
          finalSub = { ...finalSub, syncStatus: 'pending_offline' };
        }
      } catch {
        finalSub = { ...finalSub, syncStatus: 'pending_offline' };
      }

      await saveSubmissionOffline(finalSub);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === finalSub.id ? finalSub : item))
      );
      setLatestSubmission((prev) =>
        prev?.id === finalSub.id ? finalSub : prev
      );
    })();
  };

  const handleBroadcastExamEnd = async (subjectId: string, message: string) => {
    const res = await fetch('/api/proctor/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'EXAM_ENDED_BY_ADMIN',
        subjectId: subjectId || undefined,
        message,
      }),
    });
    if (!res.ok) {
      throw new Error('Gagal mengirim perintah akhiri ujian ke server.');
    }
  };

  const handleBroadcastAnnouncement = async (
    subjectId: string,
    message: string
  ) => {
    const res = await fetch('/api/proctor/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ANNOUNCEMENT',
        subjectId: subjectId || undefined,
        message,
      }),
    });
    if (!res.ok) {
      throw new Error('Gagal mengirim pengumuman real-time ke server.');
    }
  };

  const handleSendProctorAction = async (params: {
    action: ProctorActionType;
    participantNumber: string;
    subjectId?: string;
    extraMinutes?: number;
    message?: string;
  }) => {
    const res = await fetch('/api/proctor/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(
        errBody.error || 'Gagal mengirim perintah pengawas ruang ke server.'
      );
    }
  };

  const handleResetSubmissions = async () => {
    await clearLocalSubmissions();
    setSubmissions([]);
    if (navigator.onLine) {
      const res = await fetch('/api/exam/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'submissions' }),
      });
      if (!res.ok) {
        throw new Error('Gagal mereset hasil ujian pada server runtime.');
      }
    }
  };

  const handleResetProctorSessions = async () => {
    await clearAllActiveAttempts();
    setProctorSessions([]);
    if (navigator.onLine) {
      const res = await fetch('/api/exam/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'proctor' }),
      });
      if (!res.ok) {
        throw new Error('Gagal mereset sesi pengawas pada server runtime.');
      }
    }
  };

  const handleResetStudentsToDefault = async () => {
    await updateExamPackage({
      ...examPackage,
      students: [],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleFactoryReset = async () => {
    await clearLocalSubmissions();
    await clearAllActiveAttempts();
    await clearPdfCache();
    setSubmissions(INITIAL_SUBMISSIONS);
    setProctorSessions([]);
    setDrivePdfs([]);
    setCachedPdfCount(0);
    if (navigator.onLine) {
      const res = await fetch('/api/exam/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'all' }),
      });
      if (!res.ok) {
        throw new Error('Gagal mereset data runtime di server.');
      }
    }
    const freshPkg = createInitialPackage();
    await updateExamPackage(freshPkg);
  };

  const questionCountBySubject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of examPackage.questions) {
      counts[q.subjectId] = (counts[q.subjectId] || 0) + 1;
    }
    return counts;
  }, [examPackage.questions]);

  const pendingSyncCount = useMemo(
    () => submissions.filter((s) => s.syncStatus === 'pending_offline').length,
    [submissions]
  );

  const appTitle = examPackage.appTitle || 'DutawangiCBT';
  const schoolName =
    examPackage.schoolName ||
    examPackage.subjects[0]?.schoolName ||
    'SD Negeri 2 Tukangkayu';
  const schoolLogoUrl = examPackage.schoolLogoUrl || '';

  return (
    <>
      {authBannerError && (
        <div className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-2.5 text-xs text-red-800 flex items-center justify-between gap-3 no-print">
          <span>{authBannerError}</span>
          <button
            type="button"
            onClick={() => setAuthBannerError(null)}
            className="font-semibold underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {view === 'portal' && (
        <PortalEntry
          appTitle={appTitle}
          schoolName={schoolName}
          schoolLogoUrl={schoolLogoUrl}
          homeThumbnailUrl={examPackage.homeThumbnailUrl || ''}
          subjects={examPackage.subjects}
          students={examPackage.students}
          questionCountBySubject={questionCountBySubject}
          cachedPdfCount={Math.max(
            cachedPdfCount,
            drivePdfs.filter((f) => f.cachedOffline).length
          )}
          isOnline={isOnline}
          hasEncryptedCache={hasEncryptedCache}
          examTimeSettings={examPackage.examTimeSettings}
          examSessions={examPackage.examSessions}
          examSchedules={examPackage.examSchedules}
          onStartExam={(student, subject) => {
            setActiveStudent(student);
            setActiveSubject(subject);
            setView('exam');
          }}
          onOpenAdmin={() => setLoginPromptRole('admin')}
          onOpenProctor={() => setLoginPromptRole('proctor')}
        />
      )}

      {view === 'exam' && activeStudent && activeSubject && (
        <StudentExamRunner
          student={activeStudent}
          subject={activeSubject}
          questions={examPackage.questions.filter(
            (q) => q.subjectId === activeSubject.id
          )}
          accessToken={accessToken}
          examTimeSettings={examPackage.examTimeSettings}
          showScoreImmediately={
            activeSubject.showScoreImmediately !== undefined
              ? activeSubject.showScoreImmediately
              : examPackage.examTimeSettings?.showScoreImmediately !== false
          }
          onComplete={handleCompleteExam}
          onExit={() => {
            setActiveStudent(null);
            setActiveSubject(null);
            setView('portal');
          }}
        />
      )}

      {view === 'result' && latestSubmission && (() => {
        const resultSubject = examPackage.subjects.find(
          (s) => s.id === latestSubmission.subjectId
        );
        const resultShowScoreImmediately =
          resultSubject?.showScoreImmediately !== undefined
            ? resultSubject.showScoreImmediately
            : examPackage.examTimeSettings?.showScoreImmediately !== false;
        return (
          <StudentResultView
            schoolName={schoolName}
            schoolLogoUrl={schoolLogoUrl}
            submission={latestSubmission}
            showScoreImmediately={resultShowScoreImmediately}
            onReturnHome={() => {
              setLatestSubmission(null);
              setActiveStudent(null);
              setActiveSubject(null);
              setView('portal');
            }}
          />
        );
      })()}

      {view === 'proctor' && (
        <ProctorStandaloneView
          examPackage={examPackage}
          submissions={submissions}
          proctorSessions={proctorSessions}
          onBackToPortal={() => {
            setAuthenticatedActor(null);
            setView('portal');
          }}
          onBroadcastAnnouncement={handleBroadcastAnnouncement}
          onSendProctorAction={handleSendProctorAction}
        />
      )}

      {view === 'admin' && (
        <AdminDashboard
          initialSection={adminInitialSection}
          examPackage={examPackage}
          submissions={submissions}
          proctorSessions={proctorSessions}
          drivePdfs={drivePdfs}
          accessToken={accessToken}
          userEmail={userEmail}
          sheetMeta={sheetMeta}
          cachedPdfCount={Math.max(
            cachedPdfCount,
            drivePdfs.filter((f) => f.cachedOffline).length
          )}
          authenticatedActor={authenticatedActor}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onBackToPortal={() => {
            setAuthenticatedActor(null);
            setView('portal');
          }}
          onUpdatePackage={updateExamPackage}
          onUpdateSubmissions={setSubmissions}
          onUpdateDrivePdfs={(files) => {
            setDrivePdfs(files);
            setCachedPdfCount(files.filter((f) => f.cachedOffline).length);
          }}
          onPullFromSheets={handlePullFromSheets}
          onPushToSheets={handlePushToSheets}
          onPublishEncryptedPackage={handlePublishEncryptedPackage}
          onBroadcastExamEnd={handleBroadcastExamEnd}
          onBroadcastAnnouncement={handleBroadcastAnnouncement}
          onSendProctorAction={handleSendProctorAction}
          onResetSubmissions={handleResetSubmissions}
          onResetProctorSessions={handleResetProctorSessions}
          onResetStudentsToDefault={handleResetStudentsToDefault}
          onFactoryReset={handleFactoryReset}
        />
      )}

      <RoleLoginModal
        role={loginPromptRole}
        expectedCredentials={
          loginPromptRole === 'admin'
            ? examPackage.adminCredentials || DEFAULT_ADMIN_CREDENTIALS
            : examPackage.proctorCredentials || DEFAULT_PROCTOR_CREDENTIALS
        }
        teacherAccounts={examPackage.teachers || []}
        onSuccess={(actor) => {
          setLoginPromptRole(null);
          setAuthenticatedActor(actor);
          if (actor.role === 'admin') {
            setAdminInitialSection('analytics');
            setView('admin');
          } else if (actor.role === 'teacher') {
            setAdminInitialSection(actor.allowedMenus?.[0] || 'analytics');
            setView('admin');
          } else {
            setView('proctor');
          }
        }}
        onClose={() => setLoginPromptRole(null)}
      />

      <OfflineIndicator pendingSyncCount={pendingSyncCount} />
    </>
  );
}
