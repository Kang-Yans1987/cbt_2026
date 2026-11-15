import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type {
  ExamPackageData,
  ExamSubmission,
  ProctorActionType,
  ProctorSession,
} from '../types/exam';
import { INITIAL_EXAM_SESSIONS } from '../data/defaultExamData';
import { ProctorControlTab } from './admin/ProctorControlTab';
import { SchoolLogo } from './SchoolLogo';

interface ProctorStandaloneViewProps {
  examPackage: ExamPackageData;
  submissions: ExamSubmission[];
  proctorSessions: ProctorSession[];
  onBackToPortal: () => void;
  onBroadcastAnnouncement: (subjectId: string, message: string) => Promise<void>;
  onSendProctorAction: (params: {
    action: ProctorActionType;
    participantNumber: string;
    subjectId?: string;
    extraMinutes?: number;
    message?: string;
  }) => Promise<void>;
}

export const ProctorStandaloneView: React.FC<ProctorStandaloneViewProps> = ({
  examPackage,
  submissions,
  proctorSessions,
  onBackToPortal,
  onBroadcastAnnouncement,
  onSendProctorAction,
}) => {
  const [globalError, setGlobalError] = useState<string | null>(null);

  const appTitle = examPackage.appTitle || 'DutawangiCBT';
  const schoolName =
    examPackage.schoolName ||
    examPackage.subjects[0]?.schoolName ||
    'SD Negeri 2 Tukangkayu';
  const schoolLogoUrl = examPackage.schoolLogoUrl || '';
  const examSessions =
    examPackage.examSessions && examPackage.examSessions.length > 0
      ? examPackage.examSessions
      : INITIAL_EXAM_SESSIONS;

  const handleBroadcast = async (subjectId: string, message: string) => {
    setGlobalError(null);
    try {
      await onBroadcastAnnouncement(subjectId, message);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim siaran pengawas ke peserta.'
      );
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Focused Proctor-Only Top Bar (No other admin menus shown) */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <SchoolLogo
              logoUrl={schoolLogoUrl}
              schoolName={schoolName}
              size="sm"
            />
            <div className="min-w-0">
              <span className="block truncate font-display text-base font-bold tracking-tight text-slate-900">
                {appTitle} — Ruang Pengawas / Proktor
              </span>
              <span className="block truncate text-[11px] text-slate-500">
                {schoolName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToPortal}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Portal
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
        {globalError && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-800">
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

        <ProctorControlTab
          subjects={examPackage.subjects}
          students={examPackage.students}
          examSessions={examSessions}
          proctorSessions={proctorSessions}
          submissions={submissions}
          onBroadcastAnnouncement={handleBroadcast}
          onSendProctorAction={onSendProctorAction}
        />
      </main>
    </div>
  );
};
