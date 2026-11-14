import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
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
  INITIAL_QUESTIONS,
  INITIAL_STUDENTS,
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
import { OfflineIndicator } from './components/PWAControls';

type AppView = 'portal' | 'exam' | 'result' | 'admin' | 'proctor';

export default function App() {
  const isOnline = useOnlineStatus();
  const [view, setView] = useState<AppView>('portal');
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
        const hasIllustrated = localPkg.questions.some((q) =>
          Boolean(q.imageUrl)
        );
        if (!hasIllustrated) {
          const sampleImages = INITIAL_QUESTIONS.filter(
            (q) =>
              Boolean(q.imageUrl) &&
              !localPkg.questions.some((existing) => existing.id === q.id)
          );
          if (sampleImages.length > 0) {
            const migratedPkg: ExamPackageData = {
              ...localPkg,
              questions: [...localPkg.questions, ...sampleImages],
            };
            await saveEncryptedExamPackage(migratedPkg);
            setExamPackage(migratedPkg);
          } else {
            setExamPackage(localPkg);
          }
        } else {
          setExamPackage(localPkg);
        }
        setHasEncryptedCache(true);
      } else {
        const initial = createInitialPackage();
        await saveEncryptedExamPackage(initial);
        if (mounted) setHasEncryptedCache(true);
      }

      const localSubs = await getAllLocalSubmissions();
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
      appTitle: pulled.appTitle || examPackage.appTitle || 'AksaraCBT',
      schoolName: pulled.schoolName || examPackage.schoolName,
      schoolLogoUrl:
        pulled.schoolLogoUrl !== undefined
          ? pulled.schoolLogoUrl
          : examPackage.schoolLogoUrl,
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
    let savedSub = sub;
    if (isOnline) {
      try {
        const res = await fetch('/api/exam/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        });
        if (res.ok && accessToken) {
          try {
            await appendSubmissionToSheet(
              examPackage.spreadsheetId,
              accessToken,
              sub
            );
            savedSub = { ...sub, syncStatus: 'synced_sheets' };
          } catch {
            savedSub = { ...sub, syncStatus: 'synced_server' };
          }
        }
      } catch {
        savedSub = { ...sub, syncStatus: 'pending_offline' };
      }
    }

    await saveSubmissionOffline(savedSub);
    setSubmissions((prev) => [
      savedSub,
      ...prev.filter((s) => s.id !== savedSub.id),
    ]);
    setLatestSubmission(savedSub);
    setView('result');
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
      students: INITIAL_STUDENTS,
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

  const appTitle = examPackage.appTitle || 'AksaraCBT';
  const schoolName =
    examPackage.schoolName ||
    examPackage.subjects[0]?.schoolName ||
    'SMA Negeri 1 Nusantara';
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
          subjects={examPackage.subjects}
          students={examPackage.students}
          questionCountBySubject={questionCountBySubject}
          cachedPdfCount={Math.max(
            cachedPdfCount,
            drivePdfs.filter((f) => f.cachedOffline).length
          )}
          isOnline={isOnline}
          hasEncryptedCache={hasEncryptedCache}
          onStartExam={(student, subject) => {
            setActiveStudent(student);
            setActiveSubject(subject);
            setView('exam');
          }}
          onOpenAdmin={() => {
            setAdminInitialSection('analytics');
            setView('admin');
          }}
          onOpenProctor={() => {
            setView('proctor');
          }}
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
          onComplete={handleCompleteExam}
          onExit={() => {
            setActiveStudent(null);
            setActiveSubject(null);
            setView('portal');
          }}
        />
      )}

      {view === 'result' && latestSubmission && (
        <StudentResultView
          schoolName={schoolName}
          schoolLogoUrl={schoolLogoUrl}
          submission={latestSubmission}
          onReturnHome={() => {
            setLatestSubmission(null);
            setActiveStudent(null);
            setActiveSubject(null);
            setView('portal');
          }}
        />
      )}

      {view === 'proctor' && (
        <ProctorStandaloneView
          examPackage={examPackage}
          submissions={submissions}
          proctorSessions={proctorSessions}
          onBackToPortal={() => setView('portal')}
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
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onBackToPortal={() => setView('portal')}
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

      <OfflineIndicator pendingSyncCount={pendingSyncCount} />
    </>
  );
}
