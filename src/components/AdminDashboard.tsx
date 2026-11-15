import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Database,
  DoorOpen,
  FileCheck2,
  FileText,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import type {
  AccessCredentials,
  AdminSectionId,
  BeritaAcaraRecord,
  DrivePdfFile,
  ExamPackageData,
  ExamRoom,
  ExamScheduleItem,
  ExamSessionSlot,
  ExamSubmission,
  ExamTimeSettings,
  ProctorActionType,
  ProctorMappingEntry,
  ProctorSession,
  Question,
  Student,
  SubjectConfig,
  TeacherAccount,
} from '../types/exam';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  DEFAULT_EXAM_TIME_SETTINGS,
  DEFAULT_PROCTOR_CREDENTIALS,
  INITIAL_BERITA_ACARA,
  INITIAL_EXAM_ROOMS,
  INITIAL_EXAM_SCHEDULES,
  INITIAL_EXAM_SESSIONS,
  INITIAL_PROCTOR_MAPPINGS,
} from '../data/defaultExamData';
import type { SpreadsheetMetadata } from '../services/sheetsService';
import type { AuthenticatedActor } from './RoleLoginModal';
import { AnalyticsMonitorTab } from './admin/AnalyticsMonitorTab';
import { ProctorControlTab } from './admin/ProctorControlTab';
import { QuestionManagerTab } from './admin/QuestionManagerTab';
import { DrivePdfManagerTab } from './admin/DrivePdfManagerTab';
import { IdentitySettingsTab } from './admin/IdentitySettingsTab';
import { SubjectsManagerTab } from './admin/SubjectsManagerTab';
import { SessionsManagerTab } from './admin/SessionsManagerTab';
import { RoomsManagerTab } from './admin/RoomsManagerTab';
import { ProctorMappingTab } from './admin/ProctorMappingTab';
import { ScheduleManagerTab } from './admin/ScheduleManagerTab';
import { BeritaAcaraTab } from './admin/BeritaAcaraTab';
import { StudentsManagerTab } from './admin/StudentsManagerTab';
import {
  DEFAULT_TEACHER_ALLOWED_MENUS,
  TeachersManagerTab,
} from './admin/TeachersManagerTab';
import { PrintCenterTab } from './admin/PrintCenterTab';
import { SheetsBackupTab } from './admin/SheetsBackupTab';
import { ResetDataTab } from './admin/ResetDataTab';
import { SchoolLogo } from './SchoolLogo';

export type AdminSection = AdminSectionId;

interface NavGroupItem {
  id: AdminSection;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
}

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
  authenticatedActor?: AuthenticatedActor | null;
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
  authenticatedActor,
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

  const appTitle = examPackage.appTitle || 'DutawangiCBT';
  const schoolName =
    examPackage.schoolName ||
    examPackage.subjects[0]?.schoolName ||
    'SD Negeri 2 Tukangkayu';
  const schoolLogoUrl = examPackage.schoolLogoUrl || '';
  const homeThumbnailUrl = examPackage.homeThumbnailUrl || '';
  const adminCredentials =
    examPackage.adminCredentials || DEFAULT_ADMIN_CREDENTIALS;
  const proctorCredentials =
    examPackage.proctorCredentials || DEFAULT_PROCTOR_CREDENTIALS;
  const examTimeSettings =
    examPackage.examTimeSettings || DEFAULT_EXAM_TIME_SETTINGS;
  const teachers = examPackage.teachers || [];
  const examSessions =
    examPackage.examSessions && examPackage.examSessions.length > 0
      ? examPackage.examSessions
      : INITIAL_EXAM_SESSIONS;
  const examRooms = examPackage.examRooms || INITIAL_EXAM_ROOMS;
  const proctorMappings =
    examPackage.proctorMappings || INITIAL_PROCTOR_MAPPINGS;
  const examSchedules = examPackage.examSchedules || INITIAL_EXAM_SCHEDULES;
  const beritaAcaraList = examPackage.beritaAcaraList || INITIAL_BERITA_ACARA;

  const allNavItems: NavGroupItem[] = useMemo(
    () => [
      {
        id: 'analytics',
        label: 'Analitik & Monitor',
        group: 'Operasional & Monitor',
        icon: BarChart3,
      },
      {
        id: 'proctor',
        label: 'Konsol Pengawas',
        group: 'Operasional & Monitor',
        icon: ShieldCheck,
      },
      {
        id: 'berita_acara',
        label: 'Berita Acara Ujian',
        group: 'Operasional & Monitor',
        icon: FileCheck2,
      },
      {
        id: 'questions',
        label: 'Bank Soal & AI',
        group: 'Bank Soal & Paket',
        icon: BookOpen,
      },
      {
        id: 'subjects',
        label: 'Mapel & Token',
        group: 'Bank Soal & Paket',
        icon: Layers,
      },
      {
        id: 'drive',
        label: 'PDF Google Drive',
        group: 'Bank Soal & Paket',
        icon: FileText,
      },
      {
        id: 'schedule',
        label: 'Jadwal Pelaksanaan',
        group: 'Ruang, Jadwal & Pengawas',
        icon: CalendarDays,
      },
      {
        id: 'sessions',
        label: 'Pengaturan Sesi',
        group: 'Ruang, Jadwal & Pengawas',
        icon: CalendarClock,
      },
      {
        id: 'rooms',
        label: 'Pengaturan Ruang',
        group: 'Ruang, Jadwal & Pengawas',
        icon: DoorOpen,
      },
      {
        id: 'proctor_mapping',
        label: 'Pemetaan Pengawas',
        group: 'Ruang, Jadwal & Pengawas',
        icon: UserCheck,
      },
      {
        id: 'students',
        label: 'Data Peserta',
        group: 'Peserta, Guru & Cetak',
        icon: Users,
      },
      {
        id: 'teachers',
        label: 'Akun Guru',
        group: 'Peserta, Guru & Cetak',
        icon: GraduationCap,
      },
      {
        id: 'print',
        label: 'Pusat Cetak A4',
        group: 'Peserta, Guru & Cetak',
        icon: Printer,
      },
      {
        id: 'identity',
        label: 'Identitas, Waktu & Akun',
        group: 'Integrasi & Sistem',
        icon: Settings,
      },
      {
        id: 'sheets',
        label: 'Sheets & Backup',
        group: 'Integrasi & Sistem',
        icon: Database,
      },
      {
        id: 'reset',
        label: 'Reset Data',
        group: 'Integrasi & Sistem',
        icon: RotateCcw,
      },
    ],
    []
  );

  // Determine allowed menus when logged in as a teacher account
  const allowedTeacherMenus = useMemo(() => {
    if (authenticatedActor?.role !== 'teacher') return null;
    const liveTeacher = teachers.find(
      (t) => t.id === authenticatedActor.teacherId
    );
    const menus =
      liveTeacher?.allowedMenus && liveTeacher.allowedMenus.length > 0
        ? liveTeacher.allowedMenus
        : authenticatedActor.allowedMenus &&
          authenticatedActor.allowedMenus.length > 0
        ? authenticatedActor.allowedMenus
        : DEFAULT_TEACHER_ALLOWED_MENUS;
    return new Set<AdminSection>(menus);
  }, [authenticatedActor, teachers]);

  const navItems = useMemo(() => {
    if (!allowedTeacherMenus) return allNavItems;
    return allNavItems.filter((item) => allowedTeacherMenus.has(item.id));
  }, [allNavItems, allowedTeacherMenus]);

  const groupedNav = useMemo(() => {
    const groups: { name: string; items: NavGroupItem[] }[] = [];
    const byName = new Map<string, NavGroupItem[]>();
    navItems.forEach((item) => {
      const existing = byName.get(item.group);
      if (existing) {
        existing.push(item);
      } else {
        const list = [item];
        byName.set(item.group, list);
        groups.push({ name: item.group, items: list });
      }
    });
    return groups;
  }, [navItems]);

  // Redirect to first permitted tab if current section is forbidden for teacher
  useEffect(() => {
    if (
      allowedTeacherMenus &&
      !allowedTeacherMenus.has(section) &&
      navItems.length > 0
    ) {
      setSection(navItems[0].id);
    }
  }, [allowedTeacherMenus, section, navItems]);

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

  const handleSaveExamRooms = (nextRooms: ExamRoom[]) => {
    onUpdatePackage({
      ...examPackage,
      examRooms: nextRooms,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveProctorMappings = (nextMappings: ProctorMappingEntry[]) => {
    onUpdatePackage({
      ...examPackage,
      proctorMappings: nextMappings,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveExamSchedules = (nextSchedules: ExamScheduleItem[]) => {
    onUpdatePackage({
      ...examPackage,
      examSchedules: nextSchedules,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveBeritaAcaraList = (nextList: BeritaAcaraRecord[]) => {
    onUpdatePackage({
      ...examPackage,
      beritaAcaraList: nextList,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateBranding = (branding: {
    appTitle: string;
    schoolName: string;
    schoolLogoUrl: string;
    homeThumbnailUrl: string;
  }) => {
    onUpdatePackage({
      ...examPackage,
      appTitle: branding.appTitle,
      schoolName: branding.schoolName,
      schoolLogoUrl: branding.schoolLogoUrl,
      homeThumbnailUrl: branding.homeThumbnailUrl,
      subjects: examPackage.subjects.map((s) => ({
        ...s,
        schoolName: branding.schoolName,
      })),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateAccessCredentials = (next: {
    adminCredentials: AccessCredentials;
    proctorCredentials: AccessCredentials;
  }) => {
    onUpdatePackage({
      ...examPackage,
      adminCredentials: next.adminCredentials,
      proctorCredentials: next.proctorCredentials,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateExamTimeSettings = (nextTime: ExamTimeSettings) => {
    onUpdatePackage({
      ...examPackage,
      examTimeSettings: nextTime,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveTeacher = (teacher: TeacherAccount) => {
    const exists = teachers.some((t) => t.id === teacher.id);
    const nextTeachers = exists
      ? teachers.map((t) => (t.id === teacher.id ? teacher : t))
      : [...teachers, teacher];
    onUpdatePackage({
      ...examPackage,
      teachers: nextTeachers,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteTeacher = (id: string) => {
    onUpdatePackage({
      ...examPackage,
      teachers: teachers.filter((t) => t.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateTeachersBatch = (nextTeachers: TeacherAccount[]) => {
    onUpdatePackage({
      ...examPackage,
      teachers: nextTeachers,
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
          <div className="border-b border-slate-200 px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
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
                  {authenticatedActor?.role === 'teacher'
                    ? `Guru · ${authenticatedActor.displayName}`
                    : section === 'proctor'
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

          {/* Mobile horizontal nav */}
          <nav className="lg:hidden p-2.5 flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex min-h-[38px] items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop grouped nav */}
          <nav className="hidden lg:block p-3 space-y-4">
            {groupedNav.map((group) => (
              <div key={group.name} className="space-y-0.5">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.name}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={`flex w-full min-h-[36px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="hidden lg:block border-t border-slate-200 p-4 space-y-3">
          <div className="text-xs text-slate-500">
            <p className="font-semibold text-slate-800 truncate">
              {authenticatedActor?.displayName || 'Administrator Sekolah'}
            </p>
            <p className="mt-0.5 truncate">
              {userEmail ||
                (authenticatedActor?.role === 'teacher'
                  ? authenticatedActor.subjectSpecialty || 'Akun Guru'
                  : 'Mode Pengelola Lokal')}
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

          <motion.div
            key={section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
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

            {section === 'berita_acara' && (
              <BeritaAcaraTab
                schoolName={schoolName}
                schoolLogoUrl={schoolLogoUrl}
                examTimeSettings={examTimeSettings}
                subjects={examPackage.subjects}
                examSessions={examSessions}
                examRooms={examRooms}
                students={examPackage.students}
                submissions={submissions}
                proctorSessions={proctorSessions}
                beritaAcaraList={beritaAcaraList}
                onSaveBeritaAcaraList={handleSaveBeritaAcaraList}
              />
            )}

            {section === 'questions' && (
              <QuestionManagerTab
                schoolName={schoolName}
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

            {section === 'identity' && (
              <IdentitySettingsTab
                appTitle={appTitle}
                schoolName={schoolName}
                schoolLogoUrl={schoolLogoUrl}
                homeThumbnailUrl={homeThumbnailUrl}
                adminCredentials={adminCredentials}
                proctorCredentials={proctorCredentials}
                examTimeSettings={examTimeSettings}
                onUpdateBranding={handleUpdateBranding}
                onUpdateAccessCredentials={handleUpdateAccessCredentials}
                onUpdateExamTimeSettings={handleUpdateExamTimeSettings}
              />
            )}

            {section === 'subjects' && (
              <SubjectsManagerTab
                schoolName={schoolName}
                examTimeSettings={examTimeSettings}
                subjects={examPackage.subjects}
                onSaveSubject={handleSaveSubject}
                onDeleteSubject={handleDeleteSubject}
              />
            )}

            {section === 'schedule' && (
              <ScheduleManagerTab
                schoolName={schoolName}
                schoolLogoUrl={schoolLogoUrl}
                examTimeSettings={examTimeSettings}
                examSchedules={examSchedules}
                subjects={examPackage.subjects}
                examSessions={examSessions}
                examRooms={examRooms}
                onSaveExamSchedules={handleSaveExamSchedules}
              />
            )}

            {section === 'sessions' && (
              <SessionsManagerTab
                examSessions={examSessions}
                students={examPackage.students}
                onSaveExamSessions={handleSaveExamSessions}
                onUpdateStudentsBatch={handleUpdateStudentsBatch}
              />
            )}

            {section === 'rooms' && (
              <RoomsManagerTab
                schoolName={schoolName}
                schoolLogoUrl={schoolLogoUrl}
                examRooms={examRooms}
                students={examPackage.students}
                onSaveExamRooms={handleSaveExamRooms}
              />
            )}

            {section === 'proctor_mapping' && (
              <ProctorMappingTab
                schoolName={schoolName}
                schoolLogoUrl={schoolLogoUrl}
                proctorMappings={proctorMappings}
                examSessions={examSessions}
                examRooms={examRooms}
                subjects={examPackage.subjects}
                proctorCredentials={proctorCredentials}
                onSaveProctorMappings={handleSaveProctorMappings}
                onUpdateProctorCredentials={(nextProctorCreds) =>
                  handleUpdateAccessCredentials({
                    adminCredentials,
                    proctorCredentials: nextProctorCreds,
                  })
                }
              />
            )}

            {section === 'students' && (
              <StudentsManagerTab
                students={examPackage.students}
                examSessions={examSessions}
                examRooms={examRooms}
                onSaveStudent={handleSaveStudent}
                onDeleteStudent={handleDeleteStudent}
                onUpdateStudentsBatch={handleUpdateStudentsBatch}
              />
            )}

            {section === 'teachers' && (
              <TeachersManagerTab
                schoolName={schoolName}
                teachers={teachers}
                subjects={examPackage.subjects}
                onSaveTeacher={handleSaveTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onUpdateTeachersBatch={handleUpdateTeachersBatch}
              />
            )}

            {section === 'print' && (
              <PrintCenterTab
                schoolName={schoolName}
                schoolLogoUrl={schoolLogoUrl}
                subjects={examPackage.subjects}
                students={examPackage.students}
                submissions={submissions}
                examRooms={examRooms}
                proctorMappings={proctorMappings}
                examSchedules={examSchedules}
                examTimeSettings={examTimeSettings}
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
          </motion.div>
        </main>
      </div>
    </div>
  );
};
