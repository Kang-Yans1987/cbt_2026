export type QuestionType =
  | 'PG'
  | 'PG_KOMPLEKS'
  | 'BENAR_SALAH'
  | 'MENJODOHKAN'
  | 'ISIAN';

export type AdminSectionId =
  | 'analytics'
  | 'proctor'
  | 'questions'
  | 'drive'
  | 'identity'
  | 'subjects'
  | 'sessions'
  | 'rooms'
  | 'proctor_mapping'
  | 'schedule'
  | 'berita_acara'
  | 'students'
  | 'teachers'
  | 'print'
  | 'sheets'
  | 'reset';

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface StatementItem {
  id: string;
  text: string;
  isTrue: boolean;
}

export interface Question {
  id: string;
  subjectId: string;
  number: number;
  type: QuestionType;
  akmDomain: string;
  stimulus?: string;
  prompt: string;
  options: string[];
  /** For PG: 'A' | 'B' ..., PG_KOMPLEKS: 'A,C', BENAR_SALAH: JSON/comma booleans, MENJODOHKAN: pairs, ISIAN: reference answer */
  correctAnswer: string;
  statements?: StatementItem[];
  matchingPairs?: MatchingPair[];
  /** Keywords input by teacher for Gemini AI essay grading */
  aiKeywords?: string;
  weight: number;
  drivePdfId?: string;
  drivePdfName?: string;
  drivePdfPage?: number;
  imageUrl?: string;
  imageCaption?: string;
  optionImages?: string[];
}

export interface SubjectConfig {
  id: string;
  code: string;
  name: string;
  token: string;
  tokenMode?: 'manual' | 'auto_15m';
  tokenSeed?: string;
  durationMinutes: number;
  maxViolations: number;
  passingGradeKkm: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  cameraRequired?: boolean;
  active: boolean;
  startTime: string;
  endTime: string;
  schoolName: string;
}

export interface ExamSessionSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  defaultRoom: string;
  proctorName?: string;
}

export interface ExamRoom {
  id: string;
  code: string;
  name: string;
  capacity: number;
  location: string;
  notes?: string;
}

export interface ProctorMappingEntry {
  id: string;
  date: string;
  sessionId: string;
  sessionName: string;
  roomId: string;
  roomName: string;
  subjectId: string;
  subjectName: string;
  proctorName: string;
  proctorNip?: string;
  proctorUsername?: string;
  notes?: string;
}

export interface ExamScheduleItem {
  id: string;
  dayLabel: string;
  date: string;
  startTime: string;
  endTime: string;
  subjectId?: string;
  subjectName: string;
  sessionName: string;
  targetClass: string;
  roomSummary: string;
  notes?: string;
}

export interface BeritaAcaraRecord {
  id: string;
  documentNumber: string;
  date: string;
  dayName: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  sessionName: string;
  roomName: string;
  expectedCount: number;
  presentCount: number;
  absentCount: number;
  absentParticipantNumbers: string;
  incidentNotes: string;
  proctorName: string;
  proctorNip?: string;
  principalName: string;
  principalNip?: string;
  city: string;
  createdAt: string;
}

export interface AccessCredentials {
  username: string;
  password: string;
}

export interface TeacherAccount {
  id: string;
  nip?: string;
  name: string;
  subjectSpecialty: string;
  username: string;
  password: string;
  active: boolean;
  allowedMenus?: AdminSectionId[];
}

export interface ExamTimeSettings {
  timezone: 'WIB' | 'WITA' | 'WIT';
  enforceScheduleWindow: boolean;
  minSubmitMinutes: number;
  warningMinutesBeforeEnd: number;
  showScoreImmediately?: boolean;
  examInfoNotes?: string;
}

export interface Student {
  id: string;
  participantNumber: string;
  name: string;
  className: string;
  room: string;
  session: string;
  accessPin: string;
  photoUrl?: string;
}

export interface ViolationLog {
  timestamp: string;
  reason: string;
}

export interface AiEvaluationResult {
  questionId: string;
  studentAnswer: string;
  score: number;
  maxScore: number;
  matchedKeywords: string[];
  feedback: string;
  gradedBy: 'AI' | 'LOCAL_OFFLINE';
}

export interface ExamSubmission {
  id: string;
  participantNumber: string;
  studentName: string;
  className: string;
  subjectId: string;
  subjectName: string;
  answers: Record<string, string>;
  objectiveScore: number;
  aiEssayScore: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  passedKkm: boolean;
  violationCount: number;
  violationLogs: ViolationLog[];
  aiEvaluations: AiEvaluationResult[];
  submittedAt: string;
  durationSeconds: number;
  syncStatus: 'synced_sheets' | 'synced_server' | 'pending_offline';
  endReason: 'manual_submit' | 'time_up' | 'admin_force_end' | 'max_violations';
}

export type CameraStatus = 'active' | 'denied' | 'requesting' | 'unsupported' | 'disabled';

export interface ProctorSession {
  participantNumber: string;
  studentName: string;
  className: string;
  room?: string;
  session?: string;
  subjectId: string;
  subjectName: string;
  status: 'Mengerjakan' | 'Selesai' | 'Terkunci';
  answeredCount: number;
  totalQuestions: number;
  violationCount: number;
  lastViolation?: string;
  cameraStatus?: CameraStatus;
  lastHeartbeat: string;
  isOffline: boolean;
  startedAt: string;
  score?: number;
}

export type ProctorActionType =
  | 'UNLOCK_STUDENT'
  | 'EXTEND_TIME'
  | 'WARN_STUDENT'
  | 'FORCE_FINISH_STUDENT';

export interface ProctorActionPayload {
  action: ProctorActionType;
  participantNumber: string;
  subjectId?: string;
  extraMinutes?: number;
  message?: string;
  timestamp: string;
}

export interface DrivePdfFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  cachedOffline?: boolean;
  cachedOnServer?: boolean;
}

export interface EncryptedEnvelope {
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
  checksum: string;
}

export interface ExamPackageData {
  spreadsheetId: string;
  driveFolderId: string;
  appTitle?: string;
  schoolName?: string;
  schoolLogoUrl?: string;
  homeThumbnailUrl?: string;
  adminCredentials?: AccessCredentials;
  proctorCredentials?: AccessCredentials;
  teachers?: TeacherAccount[];
  examTimeSettings?: ExamTimeSettings;
  subjects: SubjectConfig[];
  questions: Question[];
  students: Student[];
  examSessions?: ExamSessionSlot[];
  examRooms?: ExamRoom[];
  proctorMappings?: ProctorMappingEntry[];
  examSchedules?: ExamScheduleItem[];
  beritaAcaraList?: BeritaAcaraRecord[];
  updatedAt: string;
}

export const DEFAULT_SPREADSHEET_ID =
  '16zPOetdxG0pMw2YNH8uP3mituosDxvLEdoWoC1QDQvU';
export const DEFAULT_DRIVE_FOLDER_ID = '1G4gzjBXkyHwZlAdnpdcurFuiKcrIA0Ty';
