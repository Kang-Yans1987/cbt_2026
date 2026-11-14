import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Database,
  FileText,
  Printer,
  RotateCcw,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type {
  DrivePdfFile,
  ExamPackageData,
  ExamSessionSlot,
  ExamSubmission,
  ProctorActionType,
  ProctorSession,
  Question,
  Student,
  SubjectConfig,
} from '../types/exam';
import { INITIAL_EXAM_SESSIONS } from '../data/defaultExamData';
import type { SpreadsheetMetadata } from '../services/sheetsService';
import { AnalyticsMonitorTab } from './admin/AnalyticsMonitorTab';
import { ProctorControlTab } from './admin/ProctorControlTab';
import { QuestionManagerTab } from './admin/QuestionManagerTab';
import { DrivePdfManagerTab } from './admin/DrivePdfManagerTab';
import { SubjectAndStudentTab } from './admin/SubjectAndStudentTab';
import { PrintCenterTab } from './admin/PrintCenterTab';
import { SheetsBackupTab } from './admin/SheetsBackupTab';
import { ResetDataTab } from './admin/ResetDataTab';
import { SchoolLogo } from './SchoolLogo';

export type AdminSection =
  | 'analytics'
  | 'proctor'
  | 'questions'
  | 'drive'
  | 'settings'
  | 'print'
  | 'sheets'
  | 'reset';

interface AdminDashboardProps {
  initialSection?: AdminSection;
  examPackage: ExamPackageData;
  submissions: ExamSubmission[];
  proctorSessions: ProctorSession[];
  drivePdfs: DrivePdfFile[];
  accessToken: string | null;
  userEmail: string | null;
  sheetMeta: SpreadsheetMetadata | null;
  cachedPdfCount: number;
  onSignIn: () => void;
  onSignOut: () => void;
  onBackToPortal: () => void;
  onUpdatePackage: (next: ExamPackageData) => void;
  onUpdateSubmissions: (next: ExamSubmission[]) => void;
  onUpdateDrivePdfs: (files: DrivePdfFile[]) => void;
  onPullFromSheets: () => Promise<void>;
  onPushToSheets: () => Promise<void>;
  onPublishEncryptedPackage: () => Promise<void>;
  onBroadcastExamEnd: (subjectId: string, message: string) => Promise<void>;
  onBroadcastAnnouncement: (subjectId: string, message: string) => Promise<void>;
  onSendProctorAction: (params: {
    action: ProctorActionType;
    participantNumber: string;
    subjectId?: string;
    extraMinutes?: number;
    message?: string;
  }) => Promise<void>;
  onResetSubmissions: () => Promise<void>;
  onResetProctorSessions: () => Promise<void>;
  onResetStudentsToDefault: () => Promise<void>;
  onFactoryReset: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialSection = 'analytics',
  examPackage,
  submissions,
  proctorSessions,
  drivePdfs,
  accessToken,
  userEmail,
  sheetMeta,
  cachedPdfCount,
  onSignIn,
  onSignOut,
  onBackToPortal,
  onUpdatePackage,
  onUpdateSubmissions,
  onUpdateDrivePdfs,
  onPullFromSheets,
  onPushToSheets,
  onPublishEncryptedPackage,
  onBroadcastExamEnd,
  onBroadcastAnnouncement,
  onSendProctorAction,
  onResetSubmissions,
  onResetProctorSessions,
  onResetStudentsToDefault,
  onFactoryReset,
}) => {
  const [section, setSection] = useState<AdminSection>(initialSection);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const appTitle = examPackage.appTitle || 'AksaraCBT';
  const schoolName =
    examPackage.schoolName ||
    examPackage.subjects[0]?.schoolName ||
    'SMA Negeri 1 Nusantara';
  const schoolLogoUrl = examPackage.schoolLogoUrl || '';
  const examSessions =
    examPackage.examSessions && examPackage.examSessions.length > 0
      ? examPackage.examSessions
      : INITIAL_EXAM_SESSIONS;

  const navItems: {
    id: AdminSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'analytics', label: 'Analitik & Monitor', icon: BarChart3 },
    { id: 'proctor', label: 'Pengawas / Proktor', icon: ShieldCheck },
    { id: 'questions', label: 'Bank Soal & AI', icon: BookOpen },
    { id: 'drive', label: 'PDF Google Drive', icon: FileText },
    { id: 'settings', label: 'Sesi, Peserta & Logo', icon: Settings },
    { id: 'print', label: 'Cetak & Preview', icon: Printer },
    { id: 'sheets', label: 'Sheets & Backup', icon: Database },
    { id: 'reset', label: 'Reset Data', icon: RotateCcw },
  ];

  const handleSaveQuestion = (q: Question) => {
    const exists = examPackage.questions.some((item) => item.id === q.id);
    const nextQuestions = exists
      ? examPackage.questions.map((item) => (item.id === q.id ? q : item))
      : [...examPackage.questions, q];
    onUpdatePackage({
      ...examPackage,
      questions: nextQuestions,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteQuestion = (id: string) => {
    onUpdatePackage({
      ...examPackage,
      questions: examPackage.questions.filter((q) => q.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleImportQuestions = (imported: Question[]) => {
    onUpdatePackage({
      ...examPackage,
      questions: [...examPackage.questions, ...imported],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveSubject = (subj: SubjectConfig) => {
    const exists = examPackage.subjects.some((s) => s.id === subj.id);
    const nextSubjects = exists
      ? examPackage.subjects.map((s) => (s.id === subj.id ? subj : s))
      : [...examPackage.subjects, subj];
    onUpdatePackage({
      ...examPackage,
      subjects: nextSubjects,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteSubject = (id: string) => {
    onUpdatePackage({
      ...examPackage,
      subjects: examPackage.subjects.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveStudent = (st: Student) => {
    const exists = examPackage.students.some((s) => s.id === st.id);
    const nextStudents = exists
      ? examPackage.students.map((s) => (s.id === st.id ? st : s))
      : [...examPackage.students, st];
    onUpdatePackage({
      ...examPackage,
      students: nextStudents,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteStudent = (id: string) => {
    onUpdatePackage({
      ...examPackage,
      students: examPackage.students.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateStudentsBatch = (nextStudents: Student[]) => {
    onUpdatePackage({
      ...examPackage,
      students: nextStudents,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveExamSessions = (nextSessions: ExamSessionSlot[]) => {
    onUpdatePackage({
      ...examPackage,
      examSessions: nextSessions,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateBranding = (branding: {
    appTitle: string;
    schoolName: string;
    schoolLogoUrl: string;
  }) => {
    onUpdatePackage({
      ...examPackage,
      appTitle: branding.appTitle,
      schoolName: branding.schoolName,
      schoolLogoUrl: branding.schoolLogoUrl,
      subjects: examPackage.subjects.map((s) => ({
        ...s,
        schoolName: branding.schoolName,
      })),
      updatedAt: new Date().toISOString(),
    });
  };

  const wrapBroadcast = async (
    fn: (subjectId: string, message: string) => Promise<void>,
    subjectId: string,
    message: string
  ) => {
    setGlobalError(null);
    try {
      await fn(subjectId, message);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim siaran real-time ke peserta.'
      );
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar Navigation (Hidden when printing) */}
      <aside className="no-print w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white flex flex-col justify-between">
        <div>
          <div className="border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <SchoolLogo
                logoUrl={schoolLogoUrl}
                schoolName={schoolName}
                size="sm"
              />
              <div className="min-w-0">
                <span className="block truncate font-display text-base font-bold tracking-tight text-slate-900">
                  {appTitle}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {section === 'proctor'
                    ? 'Konsol Pengawas / Proktor'
                    : 'Panel Admin & Guru'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onBackToPortal}
              className="lg:hidden inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Portal
            </button>
          </div>

          <nav className="p-2.5 sm:p-3 flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex min-h-[40px] items-center gap-2.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block border-t border-slate-200 p-4 space-y-3">
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-700 truncate">
              {userEmail || 'Mode Pengelola Lokal'}
            </p>
            <p className="mt-0.5 font-mono truncate">
              Sheet: {examPackage.spreadsheetId.slice(0, 12)}...
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToPortal}
            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Portal Siswa
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:max-w-none">
          {globalError && (
            <div className="no-print mb-5 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-800">
              <span>{globalError}</span>
              <button
                type="button"
                onClick={() => setGlobalError(null)}
                className="font-semibold underline shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {section === 'analytics' && (
            <AnalyticsMonitorTab
              subjects={examPackage.subjects}
              questions={examPackage.questions}
              students={examPackage.students}
              submissions={submissions}
              proctorSessions={proctorSessions}
              onBroadcastExamEnd={(sid, msg) =>
                wrapBroadcast(onBroadcastExamEnd, sid, msg)
              }
              onBroadcastAnnouncement={(sid, msg) =>
                wrapBroadcast(onBroadcastAnnouncement, sid, msg)
              }
            />
          )}

          {section === 'proctor' && (
            <ProctorControlTab
              subjects={examPackage.subjects}
              students={examPackage.students}
              examSessions={examSessions}
              proctorSessions={proctorSessions}
              submissions={submissions}
              onBroadcastAnnouncement={(sid, msg) =>
                wrapBroadcast(onBroadcastAnnouncement, sid, msg)
              }
              onSendProctorAction={onSendProctorAction}
            />
          )}

          {section === 'questions' && (
            <QuestionManagerTab
              subjects={examPackage.subjects}
              questions={examPackage.questions}
              drivePdfs={drivePdfs}
              onSaveQuestion={handleSaveQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onImportQuestions={handleImportQuestions}
            />
          )}

          {section === 'drive' && (
            <DrivePdfManagerTab
              folderId={examPackage.driveFolderId}
              onChangeFolderId={(id) =>
                onUpdatePackage({ ...examPackage, driveFolderId: id })
              }
              accessToken={accessToken}
              onSignIn={onSignIn}
              drivePdfs={drivePdfs}
              onUpdateDrivePdfs={onUpdateDrivePdfs}
            />
          )}

          {section === 'settings' && (
            <SubjectAndStudentTab
              appTitle={appTitle}
              schoolName={schoolName}
              schoolLogoUrl={schoolLogoUrl}
              onUpdateBranding={handleUpdateBranding}
              subjects={examPackage.subjects}
              students={examPackage.students}
              examSessions={examSessions}
              onSaveSubject={handleSaveSubject}
              onDeleteSubject={handleDeleteSubject}
              onSaveStudent={handleSaveStudent}
              onDeleteStudent={handleDeleteStudent}
              onUpdateStudentsBatch={handleUpdateStudentsBatch}
              onSaveExamSessions={handleSaveExamSessions}
            />
          )}

          {section === 'print' && (
            <PrintCenterTab
              schoolName={schoolName}
              schoolLogoUrl={schoolLogoUrl}
              subjects={examPackage.subjects}
              students={examPackage.students}
              submissions={submissions}
            />
          )}

          {section === 'sheets' && (
            <SheetsBackupTab
              spreadsheetId={examPackage.spreadsheetId}
              onChangeSpreadsheetId={(id) =>
                onUpdatePackage({ ...examPackage, spreadsheetId: id })
              }
              accessToken={accessToken}
              userEmail={userEmail}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
              sheetMeta={sheetMeta}
              examPackage={examPackage}
              submissions={submissions}
              onPullFromSheets={onPullFromSheets}
              onPushToSheets={onPushToSheets}
              onPublishEncryptedPackage={onPublishEncryptedPackage}
              onRestoreData={(pkg, subs) => {
                onUpdatePackage(pkg);
                onUpdateSubmissions(subs);
              }}
            />
          )}

          {section === 'reset' && (
            <ResetDataTab
              questionCount={examPackage.questions.length}
              studentCount={examPackage.students.length}
              submissionCount={submissions.length}
              proctorSessionCount={proctorSessions.length}
              cachedPdfCount={cachedPdfCount}
              onResetSubmissions={onResetSubmissions}
              onResetProctorSessions={onResetProctorSessions}
              onResetStudentsToDefault={onResetStudentsToDefault}
              onFactoryReset={onFactoryReset}
            />
          )}
        </main>
      </div>
    </div>
  );
};
