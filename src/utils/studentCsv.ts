import type { Student } from '../types/exam';
import { parseCsvLine } from './gradingEngine';

export interface ParsedStudentImportResult {
  students: Student[];
  skippedRows: { line: number; reason: string }[];
}

export function generateStudentCsvTemplate(): string {
  const header = [
    'No_Peserta',
    'Nama_Siswa',
    'Kelas',
    'Ruang',
    'Sesi',
    'PIN_Akses',
  ].join(',');

  const sampleRows = [
    ['2026-01-007', 'Galih Ramadhan', 'XII-IPA-3', 'Ruang 01', 'Sesi 1 (07:30)', '1007'],
    ['2026-01-008', 'Hana Safitri', 'XII-IPA-3', 'Ruang 01', 'Sesi 1 (07:30)', '1008'],
    ['2026-01-009', 'Indra Kusuma', 'XII-IPS-1', 'Ruang 02', 'Sesi 2 (09:30)', '1009'],
    ['2026-01-010', 'Jihan Nabila', 'XII-IPS-1', 'Ruang 02', 'Sesi 2 (09:30)', '1010'],
  ];

  const escapeCsv = (val: string) => `"${val.replaceAll('"', '""')}"`;

  return (
    '\uFEFF' +
    header +
    '\n' +
    sampleRows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  );
}

/**
 * Supports CSV (comma/semicolon) and TSV (direct copy-paste from Excel / Google Sheets).
 */
export function parseStudentsFromDelimited(
  rawText: string,
  defaultRoom = 'Ruang 01',
  defaultSession = 'Sesi 1 (07:30)',
  existingCount = 0
): ParsedStudentImportResult {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return { students: [], skippedRows: [] };
  }

  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { students: [], skippedRows: [] };
  }

  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  }

  // Detect optional header row
  const firstCols = parseCsvLine(firstLine, delimiter).map((c) =>
    c.toLowerCase().trim()
  );
  const looksLikeHeader =
    firstCols.some(
      (c) =>
        c.includes('no_peserta') ||
        c.includes('nomor') ||
        c.includes('nama') ||
        c.includes('kelas') ||
        c.includes('pin')
    ) && lines.length > 0;

  const startIdx = looksLikeHeader ? 1 : 0;
  const students: Student[] = [];
  const skippedRows: { line: number; reason: string }[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    // Support either 6 columns (No_Peserta, Nama, Kelas, Ruang, Sesi, PIN)
    // or minimal 2 columns (No_Peserta, Nama)
    const rawPartNo = (cols[0] || '').trim();
    const rawName = (cols[1] || '').trim();

    if (!rawName && !rawPartNo) {
      skippedRows.push({ line: i + 1, reason: 'Baris kosong.' });
      continue;
    }

    if (!rawName) {
      skippedRows.push({
        line: i + 1,
        reason: `Nama siswa kosong pada baris ke-${i + 1}.`,
      });
      continue;
    }

    const seq = existingCount + students.length + 1;
    const participantNumber =
      rawPartNo || `2026-01-${String(seq).padStart(3, '0')}`;
    const className = (cols[2] || 'Umum').trim();
    const room = (cols[3] || defaultRoom).trim();
    const session = (cols[4] || defaultSession).trim();
    const accessPin =
      (cols[5] || '').trim() || String(1000 + seq).slice(0, 6);

    students.push({
      id: `STD-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
      participantNumber,
      name: rawName,
      className,
      room,
      session,
      accessPin,
    });
  }

  return { students, skippedRows };
}
