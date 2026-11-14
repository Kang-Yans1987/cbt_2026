import type {
  AccessCredentials,
  ExamPackageData,
  ExamSessionSlot,
  ExamSubmission,
  Question,
  Student,
  SubjectConfig,
} from '../types/exam';

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheetNames: string[];
}

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const REQUIRED_TABS = {
  SOAL: 'Soal',
  PENGATURAN: 'Pengaturan_Ujian',
  PESERTA: 'Peserta',
  HASIL: 'Hasil_Ujian',
} as const;

function formatGoogleApiError(status: number, rawBody: string): string {
  let detail = '';
  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string } };
    detail = parsed?.error?.message || '';
  } catch {
    detail = rawBody.slice(0, 140);
  }

  if (status === 401) {
    return 'Sesi Google Anda telah kedaluwarsa. Silakan klik Sign in with Google ulang.';
  }
  if (status === 403) {
    return `Akses ke Google Spreadsheet ditolak (403). Pastikan akun Google Anda memiliki izin Editor pada spreadsheet ini.${detail ? ` (${detail})` : ''}`;
  }
  if (status === 404) {
    return 'Spreadsheet ID tidak ditemukan (404). Periksa kembali ID Google Spreadsheet yang dimasukkan.';
  }
  return `Gagal terhubung ke Google Sheets (${status})${detail ? `: ${detail}` : '.'}`;
}

async function sheetsFetch<T>(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new Error(
      'Tidak dapat menjangkau Google Sheets. Periksa koneksi internet Anda.'
    );
  }

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(formatGoogleApiError(res.status, errBody));
  }
  return (await res.json()) as T;
}

export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const data = await sheetsFetch<{
    spreadsheetId: string;
    properties: { title: string };
    sheets: { properties: { title: string } }[];
  }>(
    `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title,sheets.properties.title`,
    accessToken
  );

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Spreadsheet Ujian',
    sheetNames: (data.sheets || []).map((s) => s.properties.title),
  };
}

export async function initializeExamTabs(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  const existing = new Set(meta.sheetNames);
  const requests = Object.values(REQUIRED_TABS)
    .filter((name) => !existing.has(name))
    .map((title) => ({
      addSheet: { properties: { title } },
    }));

  if (requests.length > 0) {
    await sheetsFetch(
      `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );
  }

  return fetchSpreadsheetMetadata(spreadsheetId, accessToken);
}

function safeJsonParse<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export async function pullAllFromSheets(
  spreadsheetId: string,
  accessToken: string
): Promise<{
  metadata: SpreadsheetMetadata;
  subjects: SubjectConfig[];
  questions: Question[];
  students: Student[];
  submissions: ExamSubmission[];
  schoolLogoUrl?: string;
  homeThumbnailUrl?: string;
  appTitle?: string;
  schoolName?: string;
  examSessions?: ExamSessionSlot[];
  adminCredentials?: AccessCredentials;
  proctorCredentials?: AccessCredentials;
}> {
  const metadata = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
  const tabSet = new Set(metadata.sheetNames);

  const readRange = async (tabName: string): Promise<string[][]> => {
    if (!tabSet.has(tabName)) return [];
    const resp = await sheetsFetch<{ values?: string[][] }>(
      `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
        `${tabName}!A1:Z1000`
      )}`,
      accessToken
    );
    return resp.values || [];
  };

  const [subjRows, soalRows, pesertaRows, hasilRows] = await Promise.all([
    readRange(REQUIRED_TABS.PENGATURAN),
    readRange(REQUIRED_TABS.SOAL),
    readRange(REQUIRED_TABS.PESERTA),
    readRange(REQUIRED_TABS.HASIL),
  ]);

  const subjects: SubjectConfig[] = subjRows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0],
      code: r[1] || r[0],
      name: r[2] || 'Mata Pelajaran',
      token: r[3] || 'UJIAN1',
      durationMinutes: Number(r[4]) || 60,
      maxViolations: Number(r[5]) || 3,
      passingGradeKkm: Number(r[6]) || 75,
      shuffleQuestions: String(r[7]).toLowerCase() === 'true',
      shuffleOptions: String(r[8]).toLowerCase() === 'true',
      active: String(r[9] || 'true').toLowerCase() === 'true',
      startTime: r[10] || '',
      endTime: r[11] || '',
      schoolName: r[12] || 'SMA Negeri 1 Nusantara',
      cameraRequired: r[15] ? String(r[15]).toLowerCase() !== 'false' : true,
    }));

  const firstSubjRow = subjRows[1] || [];
  const schoolName = firstSubjRow[12] || undefined;
  const schoolLogoUrl = firstSubjRow[13] || undefined;
  const appTitle = firstSubjRow[14] || undefined;
  const examSessions = safeJsonParse<ExamSessionSlot[] | undefined>(
    firstSubjRow[16],
    undefined
  );
  const adminCredentials = safeJsonParse<AccessCredentials | undefined>(
    firstSubjRow[17],
    undefined
  );
  const proctorCredentials = safeJsonParse<AccessCredentials | undefined>(
    firstSubjRow[18],
    undefined
  );
  const homeThumbnailUrl = firstSubjRow[19] || undefined;

  const questions: Question[] = soalRows
    .slice(1)
    .filter((r) => r[0])
    .map((r, idx) => ({
      id: r[0],
      subjectId: r[1] || subjects[0]?.id || 'SUBJ-AKM-01',
      number: Number(r[2]) || idx + 1,
      type: (r[3] as Question['type']) || 'PG',
      akmDomain: r[4] || 'Umum',
      stimulus: r[5] || undefined,
      prompt: r[6] || '',
      options: safeJsonParse<string[]>(r[7], []),
      statements: safeJsonParse(r[8], undefined),
      matchingPairs: safeJsonParse(r[9], undefined),
      correctAnswer: r[10] || '',
      aiKeywords: r[11] || undefined,
      weight: Number(r[12]) || 10,
      drivePdfId: r[13] || undefined,
      drivePdfName: r[14] || undefined,
      drivePdfPage: r[15] ? Number(r[15]) : undefined,
      imageUrl: r[16] || undefined,
      imageCaption: r[17] || undefined,
      optionImages: safeJsonParse<string[] | undefined>(r[18], undefined),
    }));

  const students: Student[] = pesertaRows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0],
      participantNumber: r[1] || r[0],
      name: r[2] || 'Peserta',
      className: r[3] || 'Umum',
      room: r[4] || 'Ruang 01',
      session: r[5] || 'Sesi 1',
      accessPin: r[6] || '1234',
    }));

  const submissions: ExamSubmission[] = hasilRows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0],
      participantNumber: r[1] || '',
      studentName: r[2] || '',
      className: r[3] || '',
      subjectId: r[4] || '',
      subjectName: r[5] || '',
      objectiveScore: Number(r[6]) || 0,
      aiEssayScore: Number(r[7]) || 0,
      totalScore: Number(r[8]) || 0,
      maxPossibleScore: Number(r[9]) || 100,
      percentage: Number(r[10]) || 0,
      passedKkm: String(r[11]).toLowerCase() === 'true',
      violationCount: Number(r[12]) || 0,
      durationSeconds: Number(r[13]) || 0,
      submittedAt: r[14] || new Date().toISOString(),
      endReason: (r[15] as ExamSubmission['endReason']) || 'manual_submit',
      answers: safeJsonParse<Record<string, string>>(r[16], {}),
      aiEvaluations: safeJsonParse(r[17], []),
      violationLogs: safeJsonParse(r[18], []),
      syncStatus: 'synced_sheets',
    }));

  return {
    metadata,
    subjects,
    questions,
    students,
    submissions,
    schoolLogoUrl,
    homeThumbnailUrl,
    appTitle,
    schoolName,
    examSessions,
    adminCredentials,
    proctorCredentials,
  };
}

export async function pushAllToSheets(
  spreadsheetId: string,
  accessToken: string,
  pkg: ExamPackageData,
  submissions: ExamSubmission[]
): Promise<void> {
  await initializeExamTabs(spreadsheetId, accessToken);

  const writeTab = async (
    tabName: string,
    values: (string | number | boolean)[][]
  ) => {
    await sheetsFetch(
      `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
        `${tabName}!A1:Z1000`
      )}:clear`,
      accessToken,
      { method: 'POST', body: JSON.stringify({}) }
    );
    await sheetsFetch(
      `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
        `${tabName}!A1`
      )}?valueInputOption=RAW`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({ values }),
      }
    );
  };

  const subjValues = [
    [
      'ID_Mapel',
      'Kode',
      'Nama_Mapel',
      'Token',
      'Durasi_Menit',
      'Max_Pelanggaran',
      'KKM',
      'Acak_Soal',
      'Acak_Opsi',
      'Aktif',
      'Mulai',
      'Selesai',
      'Sekolah',
      'Logo_Sekolah',
      'Judul_Aplikasi',
      'Kamera_Wajib',
      'Sesi_JSON',
      'Admin_Auth_JSON',
      'Proktor_Auth_JSON',
      'Thumbnail_Beranda',
    ],
    ...pkg.subjects.map((s, idx) => [
      s.id,
      s.code,
      s.name,
      s.token,
      s.durationMinutes,
      s.maxViolations,
      s.passingGradeKkm,
      s.shuffleQuestions,
      s.shuffleOptions,
      s.active,
      s.startTime,
      s.endTime,
      pkg.schoolName || s.schoolName,
      idx === 0 ? pkg.schoolLogoUrl || '' : '',
      idx === 0 ? pkg.appTitle || 'AksaraCBT' : '',
      s.cameraRequired !== false,
      idx === 0 ? JSON.stringify(pkg.examSessions || []) : '',
      idx === 0 && pkg.adminCredentials
        ? JSON.stringify(pkg.adminCredentials)
        : '',
      idx === 0 && pkg.proctorCredentials
        ? JSON.stringify(pkg.proctorCredentials)
        : '',
      idx === 0 ? pkg.homeThumbnailUrl || '' : '',
    ]),
  ];

  const soalValues = [
    [
      'ID_Soal',
      'ID_Mapel',
      'Nomor',
      'Jenis_Soal',
      'Domain_AKM',
      'Stimulus',
      'Pertanyaan',
      'Opsi_JSON',
      'Pernyataan_JSON',
      'Menjodohkan_JSON',
      'Kunci_Jawaban',
      'Kata_Kunci_AI',
      'Bobot',
      'Drive_PDF_ID',
      'Drive_PDF_Name',
      'Drive_PDF_Page',
      'Gambar_Soal',
      'Keterangan_Gambar',
      'Gambar_Opsi_JSON',
    ],
    ...pkg.questions.map((q) => [
      q.id,
      q.subjectId,
      q.number,
      q.type,
      q.akmDomain,
      q.stimulus || '',
      q.prompt,
      JSON.stringify(q.options || []),
      JSON.stringify(q.statements || []),
      JSON.stringify(q.matchingPairs || []),
      q.correctAnswer,
      q.aiKeywords || '',
      q.weight,
      q.drivePdfId || '',
      q.drivePdfName || '',
      q.drivePdfPage || '',
      q.imageUrl || '',
      q.imageCaption || '',
      JSON.stringify(q.optionImages || []),
    ]),
  ];

  const pesertaValues = [
    ['ID', 'No_Peserta', 'Nama_Siswa', 'Kelas', 'Ruang', 'Sesi', 'PIN_Akses'],
    ...pkg.students.map((st) => [
      st.id,
      st.participantNumber,
      st.name,
      st.className,
      st.room,
      st.session,
      st.accessPin,
    ]),
  ];

  const hasilValues = [
    [
      'ID_Hasil',
      'No_Peserta',
      'Nama_Siswa',
      'Kelas',
      'ID_Mapel',
      'Nama_Mapel',
      'Skor_Objektif',
      'Skor_Isian_AI',
      'Total_Skor',
      'Skor_Maksimal',
      'Nilai_Persen',
      'Tuntas_KKM',
      'Pelanggaran_Tab',
      'Durasi_Detik',
      'Waktu_Kirim',
      'Alasan_Selesai',
      'Jawaban_JSON',
      'Evaluasi_AI_JSON',
      'Log_Pelanggaran_JSON',
    ],
    ...submissions.map((sub) => [
      sub.id,
      sub.participantNumber,
      sub.studentName,
      sub.className,
      sub.subjectId,
      sub.subjectName,
      sub.objectiveScore,
      sub.aiEssayScore,
      sub.totalScore,
      sub.maxPossibleScore,
      sub.percentage,
      sub.passedKkm,
      sub.violationCount,
      sub.durationSeconds,
      sub.submittedAt,
      sub.endReason,
      JSON.stringify(sub.answers),
      JSON.stringify(sub.aiEvaluations),
      JSON.stringify(sub.violationLogs),
    ]),
  ];

  await Promise.all([
    writeTab(REQUIRED_TABS.PENGATURAN, subjValues),
    writeTab(REQUIRED_TABS.SOAL, soalValues),
    writeTab(REQUIRED_TABS.PESERTA, pesertaValues),
    writeTab(REQUIRED_TABS.HASIL, hasilValues),
  ]);
}

export async function appendSubmissionToSheet(
  spreadsheetId: string,
  accessToken: string,
  sub: ExamSubmission
): Promise<void> {
  await initializeExamTabs(spreadsheetId, accessToken);
  const row = [
    sub.id,
    sub.participantNumber,
    sub.studentName,
    sub.className,
    sub.subjectId,
    sub.subjectName,
    sub.objectiveScore,
    sub.aiEssayScore,
    sub.totalScore,
    sub.maxPossibleScore,
    sub.percentage,
    sub.passedKkm,
    sub.violationCount,
    sub.durationSeconds,
    sub.submittedAt,
    sub.endReason,
    JSON.stringify(sub.answers),
    JSON.stringify(sub.aiEvaluations),
    JSON.stringify(sub.violationLogs),
  ];

  await sheetsFetch(
    `${SHEETS_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
      `${REQUIRED_TABS.HASIL}!A1`
    )}:append?valueInputOption=RAW`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ values: [row] }),
    }
  );
}
