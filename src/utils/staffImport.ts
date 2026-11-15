import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import type {
  AdminSectionId,
  ExamRoom,
  ExamSessionSlot,
  ProctorMappingEntry,
  SubjectConfig,
  TeacherAccount,
} from '../types/exam';
import { parseCsvLine } from './gradingEngine';

export interface ParsedTeacherImportResult {
  teachers: TeacherAccount[];
  skippedRows: { line: number; reason: string }[];
}

export interface ParsedProctorImportResult {
  mappings: ProctorMappingEntry[];
  skippedRows: { line: number; reason: string }[];
}

const VALID_MENU_IDS: AdminSectionId[] = [
  'analytics',
  'proctor',
  'questions',
  'drive',
  'identity',
  'subjects',
  'sessions',
  'rooms',
  'proctor_mapping',
  'schedule',
  'berita_acara',
  'students',
  'teachers',
  'print',
  'sheets',
  'reset',
];

const MENU_LABEL_ALIASES: Record<string, AdminSectionId> = {
  analitik: 'analytics',
  monitor: 'analytics',
  pengawas: 'proctor',
  proktor: 'proctor',
  soal: 'questions',
  bank_soal: 'questions',
  drive: 'drive',
  pdf: 'drive',
  identitas: 'identity',
  waktu: 'identity',
  mapel: 'subjects',
  token: 'subjects',
  sesi: 'sessions',
  ruang: 'rooms',
  pemetaan: 'proctor_mapping',
  jadwal: 'schedule',
  berita_acara: 'berita_acara',
  peserta: 'students',
  siswa: 'students',
  guru: 'teachers',
  cetak: 'print',
  print: 'print',
  sheets: 'sheets',
  backup: 'sheets',
  reset: 'reset',
};

const DEFAULT_TEACHER_MENUS: AdminSectionId[] = [
  'analytics',
  'questions',
  'drive',
  'print',
];

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugifyUsername(name: string, seq: number): string {
  const clean = name
    .toLowerCase()
    .replace(/\b(drs|dra|dr|ir|h|hj|prof|spd|mpd|ssi|msi|kom|gr)\b\.?/gi, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 20);
  return clean ? `guru.${clean}` : `guru.${seq}`;
}

function parseAllowedMenus(raw: string): AdminSectionId[] {
  const trimmed = raw.trim();
  if (!trimmed) return [...DEFAULT_TEACHER_MENUS];

  const tokens = trimmed
    .split(/[,;|]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const resolved = new Set<AdminSectionId>();
  for (const token of tokens) {
    if ((VALID_MENU_IDS as string[]).includes(token)) {
      resolved.add(token as AdminSectionId);
      continue;
    }
    const normalized = token.replace(/[\s-]+/g, '_');
    if ((VALID_MENU_IDS as string[]).includes(normalized)) {
      resolved.add(normalized as AdminSectionId);
      continue;
    }
    for (const [alias, id] of Object.entries(MENU_LABEL_ALIASES)) {
      if (normalized.includes(alias)) {
        resolved.add(id);
      }
    }
  }

  return resolved.size > 0 ? Array.from(resolved) : [...DEFAULT_TEACHER_MENUS];
}

function parseActiveStatus(raw: string): boolean {
  const val = raw.trim().toLowerCase();
  if (!val) return true;
  if (
    val === 'nonaktif' ||
    val === 'tidak' ||
    val === 'no' ||
    val === 'false' ||
    val === '0' ||
    val === 'off'
  ) {
    return false;
  }
  return true;
}

function normalizeDateCell(raw: unknown, fallbackDate: string): string {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === 'number' && raw > 20000 && raw < 90000) {
    // Excel serial date
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  const str = String(raw ?? '').trim();
  if (!str) return fallbackDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Support DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return fallbackDate;
}

function parseDelimitedRows(rawText: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  }

  return lines.map((line) => parseCsvLine(line, delimiter));
}

function extractRowsFromExcelBuffer(
  buffer: ArrayBuffer,
  preferredSheetKeyword: string
): unknown[][] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) =>
      n.toLowerCase().includes(preferredSheetKeyword.toLowerCase())
    ) || wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
}

// ============================================================================
// 1. IMPORT & TEMPLATE DATA GURU
// ============================================================================

export async function downloadExcelTeacherTemplate(
  schoolName = 'SD Negeri 2 Tukangkayu',
  defaultSubject = 'Matematika'
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = schoolName;
  wb.created = new Date();

  const ws = wb.addWorksheet('Data_Guru', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${schoolName.toUpperCase()} — TEMPLATE IMPORT DATA & AKUN GURU`;
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:G2');
  const subCell = ws.getCell('A2');
  subCell.value =
    'Petunjuk: Isi data guru mulai baris 5 ke bawah. Kolom Nama_Guru wajib diisi; Username & Password otomatis dibuat bila dikosongkan.';
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  ws.getRow(2).height = 19;
  ws.getRow(3).height = 8;

  ws.columns = [
    { width: 22 },
    { width: 32 },
    { width: 24 },
    { width: 22 },
    { width: 18 },
    { width: 15 },
    { width: 34 },
  ];

  const sampleRows: string[][] = [
    [
      '198504122010012014',
      'Siti Rahayu, S.Pd',
      defaultSubject,
      'guru.siti',
      'guru2026',
      'Aktif',
      'analytics,questions,drive,print',
    ],
    [
      '198811032014021005',
      'Ahmad Fauzi, M.Pd',
      'Bahasa Indonesia',
      'guru.fauzi',
      'guru2026',
      'Aktif',
      'analytics,questions,print',
    ],
    ...Array.from({ length: 12 }, () => [
      '',
      '',
      defaultSubject,
      '',
      '',
      'Aktif',
      'analytics,questions,drive,print',
    ]),
  ];

  ws.addTable({
    name: 'TabelDataGuru',
    ref: 'A4',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: [
      { name: 'NIP_Kode', filterButton: true },
      { name: 'Nama_Guru', filterButton: true },
      { name: 'Mapel_Diampu', filterButton: true },
      { name: 'Username', filterButton: true },
      { name: 'Password', filterButton: true },
      { name: 'Status_Aktif', filterButton: true },
      { name: 'Hak_Menu', filterButton: true },
    ],
    rows: sampleRows,
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const headerRow = ws.getRow(4);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  for (let r = 5; r < 5 + sampleRows.length; r++) {
    const row = ws.getRow(r);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 6 ? 'center' : 'left',
      };
      cell.border = thinBorder;
    });

    ws.getCell(`F${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Aktif,Nonaktif"'],
    };
  }

  const wsGuide = wb.addWorksheet('Panduan_Pengisian');
  wsGuide.columns = [{ width: 20 }, { width: 14 }, { width: 65 }];
  wsGuide.getCell('A1').value = 'PANDUAN IMPORT DATA GURU';
  wsGuide.getCell('A1').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  const guideRows = [
    ['NIP_Kode', 'Opsional', 'Nomor induk pegawai atau kode internal guru.'],
    ['Nama_Guru', 'Wajib', 'Nama lengkap guru beserta gelar. Baris tanpa nama akan dilewati.'],
    ['Mapel_Diampu', 'Opsional', 'Mata pelajaran yang diampu guru, misal: Matematika / Kelas VI.'],
    ['Username', 'Opsional', 'Username untuk login guru. Jika kosong otomatis dibuat dari nama.'],
    ['Password', 'Opsional', 'Password minimal 4 karakter. Jika kosong otomatis diisi: guru2026'],
    ['Status_Aktif', 'Opsional', 'Pilih Aktif atau Nonaktif (default: Aktif).'],
    [
      'Hak_Menu',
      'Opsional',
      'Pisahkan koma ID menu: analytics, proctor, questions, drive, subjects, schedule, rooms, proctor_mapping, students, print. Kosong = Preset Guru Mapel.',
    ],
  ];
  wsGuide.addTable({
    name: 'PanduanGuru',
    ref: 'A3',
    headerRow: true,
    columns: [
      { name: 'Nama Kolom' },
      { name: 'Sifat' },
      { name: 'Keterangan' },
    ],
    rows: guideRows,
  });

  const buffer = await wb.xlsx.writeBuffer();
  triggerBlobDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'Template_Import_Data_Guru.xlsx'
  );
}

export function parseTeachersFromRows(
  rawRows: unknown[][],
  defaultSubject = 'Umum',
  existingCount = 0
): ParsedTeacherImportResult {
  if (rawRows.length === 0) return { teachers: [], skippedRows: [] };

  let startIdx = 0;
  const headerIdx = rawRows.findIndex((r) =>
    r.some((c) => {
      const s = String(c ?? '').toLowerCase().trim();
      return s === 'nama_guru' || s === 'nama guru';
    })
  );
  if (headerIdx >= 0) {
    startIdx = headerIdx + 1;
  } else {
    const col0 = String(rawRows[0]?.[0] ?? '').toLowerCase().trim();
    const col1 = String(rawRows[0]?.[1] ?? '').toLowerCase().trim();
    if (
      col0.includes('nip') ||
      col1 === 'nama' ||
      col1.includes('nama guru') ||
      col1.includes('nama_guru')
    ) {
      startIdx = 1;
    }
  }

  const teachers: TeacherAccount[] = [];
  const skippedRows: { line: number; reason: string }[] = [];
  const usedUsernames = new Set<string>();

  for (let i = startIdx; i < rawRows.length; i++) {
    const row = rawRows[i];
    const nip = String(row[0] ?? '').trim();
    const name = String(row[1] ?? '').trim();
    const subjectSpecialty = String(row[2] ?? '').trim() || defaultSubject;
    const rawUsername = String(row[3] ?? '').trim();
    const rawPassword = String(row[4] ?? '').trim();
    const rawStatus = String(row[5] ?? '').trim();
    const rawMenus = String(row[6] ?? '').trim();

    if (!name && !nip && !rawUsername) {
      continue;
    }

    if (!name) {
      skippedRows.push({
        line: i + 1,
        reason: `Baris ${i + 1}: Nama guru kosong.`,
      });
      continue;
    }

    const seq = existingCount + teachers.length + 1;
    let username = rawUsername || slugifyUsername(name, seq);
    if (usedUsernames.has(username.toLowerCase())) {
      username = `${username}.${seq}`;
    }
    usedUsernames.add(username.toLowerCase());

    const password = rawPassword.length >= 4 ? rawPassword : 'guru2026';

    teachers.push({
      id: `GURU-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
      nip,
      name,
      subjectSpecialty,
      username,
      password,
      active: parseActiveStatus(rawStatus),
      allowedMenus: parseAllowedMenus(rawMenus),
    });
  }

  return { teachers, skippedRows };
}

export function parseTeachersFromDelimited(
  rawText: string,
  defaultSubject = 'Umum',
  existingCount = 0
): ParsedTeacherImportResult {
  const rows = parseDelimitedRows(rawText);
  return parseTeachersFromRows(rows, defaultSubject, existingCount);
}

export function parseTeachersFromExcelBuffer(
  buffer: ArrayBuffer,
  defaultSubject = 'Umum',
  existingCount = 0
): ParsedTeacherImportResult {
  const rows = extractRowsFromExcelBuffer(buffer, 'guru');
  return parseTeachersFromRows(rows, defaultSubject, existingCount);
}

// ============================================================================
// 2. IMPORT & TEMPLATE DATA PENGAWAS RUANG
// ============================================================================

export async function downloadExcelProctorTemplate(
  schoolName = 'SD Negeri 2 Tukangkayu',
  examSessions: ExamSessionSlot[] = [],
  examRooms: ExamRoom[] = [],
  subjects: SubjectConfig[] = [],
  defaultProctorUsername = 'pengawas'
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = schoolName;
  wb.created = new Date();

  const ws = wb.addWorksheet('Data_Pengawas', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${schoolName.toUpperCase()} — TEMPLATE IMPORT PEMETAAN PENGAWAS RUANG`;
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:H2');
  const subCell = ws.getCell('A2');
  subCell.value =
    'Petunjuk: Isi daftar pengawas ruang mulai baris 5 ke bawah. Kolom Nama_Pengawas wajib diisi.';
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  ws.getRow(2).height = 19;
  ws.getRow(3).height = 8;

  ws.columns = [
    { width: 15 },
    { width: 22 },
    { width: 18 },
    { width: 28 },
    { width: 30 },
    { width: 22 },
    { width: 18 },
    { width: 26 },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const sesi1 = examSessions[0]?.name || 'Sesi 1 (07:30)';
  const sesi2 = examSessions[1]?.name || sesi1;
  const ruang1 = examRooms[0]?.name || 'Ruang 01';
  const ruang2 = examRooms[1]?.name || 'Ruang 02';
  const mapel1 = subjects[0]?.name || 'Literasi & Numerasi';

  const sampleRows: string[][] = [
    [
      today,
      sesi1,
      ruang1,
      mapel1,
      'Drs. Hendra Wijaya, M.Pd',
      '197804152005011008',
      defaultProctorUsername,
      'Pengawas Utama Ruang 01',
    ],
    [
      today,
      sesi2,
      ruang2,
      mapel1,
      'Rina Kusumawati, S.Pd',
      '198709212011012009',
      defaultProctorUsername,
      'Pengawas Ruang 02',
    ],
    ...Array.from({ length: 12 }, () => [
      today,
      sesi1,
      ruang1,
      mapel1,
      '',
      '',
      defaultProctorUsername,
      '',
    ]),
  ];

  ws.addTable({
    name: 'TabelDataPengawas',
    ref: 'A4',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: [
      { name: 'Tanggal', filterButton: true },
      { name: 'Sesi_Ujian', filterButton: true },
      { name: 'Ruang_Ujian', filterButton: true },
      { name: 'Mata_Pelajaran', filterButton: true },
      { name: 'Nama_Pengawas', filterButton: true },
      { name: 'NIP_Kode', filterButton: true },
      { name: 'Username_Akun', filterButton: true },
      { name: 'Catatan', filterButton: true },
    ],
    rows: sampleRows,
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const headerRow = ws.getRow(4);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  for (let r = 5; r < 5 + sampleRows.length; r++) {
    const row = ws.getRow(r);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 1 ? 'center' : 'left',
      };
      cell.border = thinBorder;
    });
  }

  const wsGuide = wb.addWorksheet('Panduan_Pengisian');
  wsGuide.columns = [{ width: 20 }, { width: 14 }, { width: 65 }];
  wsGuide.getCell('A1').value = 'PANDUAN IMPORT DATA PENGAWAS RUANG';
  wsGuide.getCell('A1').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  wsGuide.addTable({
    name: 'PanduanPengawas',
    ref: 'A3',
    headerRow: true,
    columns: [
      { name: 'Nama Kolom' },
      { name: 'Sifat' },
      { name: 'Keterangan' },
    ],
    rows: [
      ['Tanggal', 'Opsional', 'Format YYYY-MM-DD (misal 2026-11-16). Kosong = tanggal hari ini.'],
      ['Sesi_Ujian', 'Opsional', 'Nama sesi ujian (misal Sesi 1 (07:30)).'],
      ['Ruang_Ujian', 'Opsional', 'Nama atau kode ruang ujian (misal Ruang 01).'],
      ['Mata_Pelajaran', 'Opsional', 'Nama mata pelajaran yang diujikan.'],
      ['Nama_Pengawas', 'Wajib', 'Nama lengkap pengawas ruang. Baris kosong dilewati.'],
      ['NIP_Kode', 'Opsional', 'NIP atau kode pengawas.'],
      ['Username_Akun', 'Opsional', 'Username login pengawas yang digunakan (default: pengawas).'],
      ['Catatan', 'Opsional', 'Keterangan tugas pengawas.'],
    ],
  });

  const buffer = await wb.xlsx.writeBuffer();
  triggerBlobDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'Template_Import_Data_Pengawas.xlsx'
  );
}

export function parseProctorMappingsFromRows(
  rawRows: unknown[][],
  examSessions: ExamSessionSlot[],
  examRooms: ExamRoom[],
  subjects: SubjectConfig[],
  defaultProctorUsername = 'pengawas'
): ParsedProctorImportResult {
  if (rawRows.length === 0) return { mappings: [], skippedRows: [] };

  let startIdx = 0;
  const headerIdx = rawRows.findIndex((r) =>
    r.some((c) => {
      const s = String(c ?? '').toLowerCase().trim();
      return s === 'nama_pengawas' || s === 'nama pengawas';
    })
  );
  if (headerIdx >= 0) {
    startIdx = headerIdx + 1;
  } else {
    const col0 = String(rawRows[0]?.[0] ?? '').toLowerCase().trim();
    const col4 = String(rawRows[0]?.[4] ?? '').toLowerCase().trim();
    if (
      col0.includes('tanggal') ||
      col4 === 'nama' ||
      col4.includes('nama pengawas') ||
      col4.includes('nama_pengawas')
    ) {
      startIdx = 1;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const defSession = examSessions[0];
  const defRoom = examRooms[0];
  const defSubject = subjects[0];

  const mappings: ProctorMappingEntry[] = [];
  const skippedRows: { line: number; reason: string }[] = [];

  for (let i = startIdx; i < rawRows.length; i++) {
    const row = rawRows[i];
    const dateVal = normalizeDateCell(row[0], today);
    const rawSession = String(row[1] ?? '').trim();
    const rawRoom = String(row[2] ?? '').trim();
    const rawSubject = String(row[3] ?? '').trim();
    const proctorName = String(row[4] ?? '').trim();
    const proctorNip = String(row[5] ?? '').trim();
    const proctorUsername =
      String(row[6] ?? '').trim() || defaultProctorUsername;
    const notes = String(row[7] ?? '').trim();

    if (!proctorName && !proctorNip && !notes) {
      continue;
    }

    if (!proctorName) {
      skippedRows.push({
        line: i + 1,
        reason: `Baris ${i + 1}: Nama pengawas kosong.`,
      });
      continue;
    }

    const matchedSession = rawSession
      ? examSessions.find(
          (s) =>
            s.name.toLowerCase() === rawSession.toLowerCase() ||
            s.name.toLowerCase().includes(rawSession.toLowerCase())
        )
      : defSession;

    const matchedRoom = rawRoom
      ? examRooms.find(
          (r) =>
            r.name.toLowerCase() === rawRoom.toLowerCase() ||
            r.code.toLowerCase() === rawRoom.toLowerCase()
        )
      : defRoom;

    const matchedSubject = rawSubject
      ? subjects.find(
          (s) =>
            s.name.toLowerCase() === rawSubject.toLowerCase() ||
            s.code.toLowerCase() === rawSubject.toLowerCase()
        )
      : defSubject;

    mappings.push({
      id: `MAP-IMP-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
      date: dateVal,
      sessionId: matchedSession?.id || '',
      sessionName:
        matchedSession?.name || rawSession || defSession?.name || 'Sesi 1 (07:30)',
      roomId: matchedRoom?.id || '',
      roomName: matchedRoom?.name || rawRoom || defRoom?.name || 'Ruang 01',
      subjectId: matchedSubject?.id || '',
      subjectName:
        matchedSubject?.name ||
        rawSubject ||
        defSubject?.name ||
        'Mata Pelajaran',
      proctorName,
      proctorNip,
      proctorUsername,
      notes,
    });
  }

  return { mappings, skippedRows };
}

export function parseProctorMappingsFromDelimited(
  rawText: string,
  examSessions: ExamSessionSlot[],
  examRooms: ExamRoom[],
  subjects: SubjectConfig[],
  defaultProctorUsername = 'pengawas'
): ParsedProctorImportResult {
  const rows = parseDelimitedRows(rawText);
  return parseProctorMappingsFromRows(
    rows,
    examSessions,
    examRooms,
    subjects,
    defaultProctorUsername
  );
}

export function parseProctorMappingsFromExcelBuffer(
  buffer: ArrayBuffer,
  examSessions: ExamSessionSlot[],
  examRooms: ExamRoom[],
  subjects: SubjectConfig[],
  defaultProctorUsername = 'pengawas'
): ParsedProctorImportResult {
  const rows = extractRowsFromExcelBuffer(buffer, 'pengawas');
  return parseProctorMappingsFromRows(
    rows,
    examSessions,
    examRooms,
    subjects,
    defaultProctorUsername
  );
}
