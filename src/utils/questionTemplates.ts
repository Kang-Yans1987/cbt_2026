import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { Question, QuestionType } from '../types/exam';
import { parseQuestionsFromCsv } from './gradingEngine';

export interface TemplateQuestionRow {
  nomor: number;
  jenisSoal: QuestionType;
  domainAkm: string;
  stimulus: string;
  pertanyaan: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  kunciJawaban: string;
  kataKunciAi: string;
  bobotNilai: number;
  gambarUrl: string;
}

export const TEMPLATE_QUESTION_HEADERS = [
  'Nomor',
  'Jenis_Soal',
  'Domain_AKM',
  'Stimulus',
  'Pertanyaan',
  'Opsi_A',
  'Opsi_B',
  'Opsi_C',
  'Opsi_D',
  'Kunci_Jawaban',
  'Kata_Kunci_AI',
  'Bobot_Nilai',
  'Gambar_URL',
] as const;

export const TEMPLATE_SAMPLE_ROWS: TemplateQuestionRow[] = [
  {
    nomor: 1,
    jenisSoal: 'PG',
    domainAkm: 'Literasi · Teks Informasi',
    stimulus:
      'Sekolah dasar di kawasan pesisir mulai menerapkan program sekolah bebas plastik sekali pakai dengan mewajibkan siswa membawa botol minum isi ulang.',
    pertanyaan:
      'Tujuan utama penerapan program membawa botol minum isi ulang di sekolah adalah...',
    opsiA: 'A. Menambah beban tas siswa setiap hari',
    opsiB: 'B. Mengurangi timbulan sampah plastik sekali pakai di lingkungan sekolah',
    opsiC: 'C. Menggantikan seluruh jam pelajaran olahraga',
    opsiD: 'D. Menghapus kegiatan kantin sehat sekolah',
    kunciJawaban: 'B',
    kataKunciAi: '',
    bobotNilai: 20,
    gambarUrl: '',
  },
  {
    nomor: 2,
    jenisSoal: 'PG_KOMPLEKS',
    domainAkm: 'Numerasi · Aljabar & Operasi Hitung',
    stimulus:
      'Koperasi sekolah menjual 2 buku tulis dan 1 pensil seharga Rp10.000. Harga 1 buku tulis adalah Rp4.000.',
    pertanyaan:
      'Pilih SEMUA pernyataan yang benar berdasarkan data harga alat tulis di atas:',
    opsiA: 'A. Harga 1 pensil adalah Rp2.000',
    opsiB: 'B. Harga 3 buku tulis adalah Rp12.000',
    opsiC: 'C. Harga 1 buku dan 2 pensil adalah Rp10.000',
    opsiD: 'D. Selisih harga 1 buku tulis dan 1 pensil adalah Rp2.000',
    kunciJawaban: 'A,B,D',
    kataKunciAi: '',
    bobotNilai: 20,
    gambarUrl: '',
  },
  {
    nomor: 3,
    jenisSoal: 'BENAR_SALAH',
    domainAkm: 'Literasi Sains · Perubahan Wujud Zat',
    stimulus:
      'Air murni mendidih pada suhu 100°C di tekanan 1 atm dan membeku menjadi es pada suhu 0°C.',
    pertanyaan:
      'Tentukan Benar atau Salah untuk setiap pernyataan berikut (format impor: Pernyataan|true atau false):',
    opsiA: 'Es akan mencair jika dipanaskan di atas suhu 0°C|true',
    opsiB: 'Air mendidih pada suhu 25°C di tekanan udara normal|false',
    opsiC: 'Perubahan air menjadi uap disebut menguap|true',
    opsiD: '',
    kunciJawaban: 'S1:true,S2:false,S3:true',
    kataKunciAi: '',
    bobotNilai: 20,
    gambarUrl: '',
  },
  {
    nomor: 4,
    jenisSoal: 'MENJODOHKAN',
    domainAkm: 'Numerasi · Geometri & Pengukuran',
    stimulus:
      'Pasangkan bangun datar atau besaran satuan di kolom kiri dengan hasil yang sesuai di kolom kanan.',
    pertanyaan:
      'Pasangkan setiap item berikut dengan tepat (format impor: Kiri->Kanan):',
    opsiA: 'Keliling persegi dengan sisi 6 cm->24 cm',
    opsiB: 'Luas persegi panjang 8 cm x 5 cm->40 cm²',
    opsiC: 'Konversi 2,5 kilometer ke meter->2.500 m',
    opsiD: '',
    kunciJawaban: 'P1->24 cm,P2->40 cm²,P3->2.500 m',
    kataKunciAi: '',
    bobotNilai: 20,
    gambarUrl: '',
  },
  {
    nomor: 5,
    jenisSoal: 'ISIAN',
    domainAkm: 'Penalaran Terbuka (Korektor Asisten AI)',
    stimulus:
      'Pada saat ujian berlangsung, koneksi internet di ruang kelas dapat terputus sementara.',
    pertanyaan:
      'Jelaskan manfaat penyimpanan jawaban lokal (mode offline) bagi peserta ujian saat jaringan terputus.',
    opsiA: '',
    opsiB: '',
    opsiC: '',
    opsiD: '',
    kunciJawaban:
      'Jawaban peserta tetap tersimpan aman di perangkat dan akan terkirim otomatis ketika koneksi internet kembali pulih.',
    kataKunciAi: 'tersimpan aman, perangkat lokal, tidak hilang, kirim otomatis, koneksi pulih',
    bobotNilai: 20,
    gambarUrl: '',
  },
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

function sanitizeFilenamePart(text: string): string {
  return (
    text
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'AKM_TKA'
  );
}

function normalizeQuestionType(raw: string): QuestionType {
  const clean = raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (clean.includes('KOMPLEKS') || clean === 'PGK') return 'PG_KOMPLEKS';
  if (clean.includes('BENAR') || clean.includes('SALAH') || clean === 'BS')
    return 'BENAR_SALAH';
  if (clean.includes('JODOH') || clean === 'MATCHING') return 'MENJODOHKAN';
  if (clean.includes('ISIAN') || clean.includes('URAIAN') || clean.includes('ESSAY'))
    return 'ISIAN';
  return 'PG';
}

function buildQuestionFromColumns(
  cols: string[],
  subjectId: string,
  fallbackNumber: number,
  rowIndex: number
): Question | null {
  const prompt = (cols[4] || '').trim();
  if (!prompt) return null;

  const type = normalizeQuestionType(cols[1] || 'PG');
  const rawOpts = [cols[5] || '', cols[6] || '', cols[7] || '', cols[8] || '']
    .map((s) => s.trim())
    .filter(Boolean);

  const q: Question = {
    id: `Q-IMP-${Date.now()}-${rowIndex}`,
    subjectId,
    number: Number(cols[0]) || fallbackNumber,
    type,
    akmDomain: (cols[2] || 'Umum').trim(),
    stimulus: (cols[3] || '').trim() || undefined,
    prompt,
    options: type === 'PG' || type === 'PG_KOMPLEKS' ? rawOpts : [],
    correctAnswer: (cols[9] || '').trim(),
    aiKeywords: (cols[10] || '').trim() || undefined,
    weight: Math.max(1, Number(cols[11]) || 10),
    imageUrl: (cols[12] || '').trim() || undefined,
  };

  if (type === 'BENAR_SALAH') {
    q.statements = rawOpts.map((item, idx) => {
      const parts = item.split('|');
      const txt = (parts[0] || item).trim();
      const boolStr = (parts[1] || 'true').trim().toLowerCase();
      return {
        id: `S${idx + 1}`,
        text: txt,
        isTrue: boolStr !== 'false' && boolStr !== 'salah' && boolStr !== 's',
      };
    });
    if (!q.correctAnswer && q.statements.length > 0) {
      q.correctAnswer = q.statements
        .map((st) => `${st.id}:${st.isTrue ? 'true' : 'false'}`)
        .join(',');
    }
  }

  if (type === 'MENJODOHKAN') {
    q.matchingPairs = rawOpts.map((item, idx) => {
      const arrowIdx = item.indexOf('->');
      if (arrowIdx > -1) {
        return {
          id: `P${idx + 1}`,
          left: item.slice(0, arrowIdx).trim(),
          right: item.slice(arrowIdx + 2).trim(),
        };
      }
      const pipeIdx = item.indexOf('|');
      if (pipeIdx > -1) {
        return {
          id: `P${idx + 1}`,
          left: item.slice(0, pipeIdx).trim(),
          right: item.slice(pipeIdx + 1).trim(),
        };
      }
      return {
        id: `P${idx + 1}`,
        left: item.trim(),
        right: `Pasangan ${idx + 1}`,
      };
    });
    if (!q.correctAnswer && q.matchingPairs.length > 0) {
      q.correctAnswer = q.matchingPairs
        .map((p) => `${p.id}->${p.right}`)
        .join(',');
    }
  }

  return q;
}

// ============================================================================
// 1. FORMAT EXCEL (.XLSX) GENERATOR (TERTATA RAPI DENGAN TABEL RESMI) & PARSER
// ============================================================================

export async function downloadExcelQuestionTemplate(
  subjectName = 'Mata Pelajaran',
  schoolName = 'SD Negeri 2 Tukangkayu'
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = schoolName;
  wb.created = new Date();

  const wsBank = wb.addWorksheet('Bank_Soal', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  // Title banner rows 1-2
  wsBank.mergeCells('A1:M1');
  const titleCell = wsBank.getCell('A1');
  titleCell.value = `${schoolName.toUpperCase()} — TEMPLATE IMPORT BANK SOAL (DUTAWANGICBT)`;
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  wsBank.getRow(1).height = 24;

  wsBank.mergeCells('A2:M2');
  const subCell = wsBank.getCell('A2');
  subCell.value = `Mata Pelajaran: ${subjectName} | Petunjuk: Isi soal mulai baris 5 ke bawah (baris 5–9 adalah contoh, silakan edit atau tambah baris baru).`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left' };
  wsBank.getRow(2).height = 19;
  wsBank.getRow(3).height = 8;

  const colWidths = [8, 16, 26, 38, 42, 28, 28, 28, 28, 24, 28, 12, 26];
  wsBank.columns = colWidths.map((width) => ({ width }));

  const tableRows: (string | number)[][] = [
    ...TEMPLATE_SAMPLE_ROWS.map((r) => [
      r.nomor,
      r.jenisSoal,
      r.domainAkm,
      r.stimulus,
      r.pertanyaan,
      r.opsiA,
      r.opsiB,
      r.opsiC,
      r.opsiD,
      r.kunciJawaban,
      r.kataKunciAi,
      r.bobotNilai,
      r.gambarUrl,
    ]),
    // 15 clean ready-to-fill blank rows inside the Excel table
    ...Array.from({ length: 15 }, (_, idx) => [
      TEMPLATE_SAMPLE_ROWS.length + idx + 1,
      'PG',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      20,
      '',
    ]),
  ];

  wsBank.addTable({
    name: 'TabelBankSoal',
    ref: 'A4',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: TEMPLATE_QUESTION_HEADERS.map((header) => ({
      name: header,
      filterButton: true,
    })),
    rows: tableRows,
  });

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // Style header row (row 4)
  const headerRow = wsBank.getRow(4);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = thinBorder;
  });

  // Style data rows (rows 5..24)
  for (let rIdx = 5; rIdx < 5 + tableRows.length; rIdx++) {
    const row = wsBank.getRow(rIdx);
    const isSample = rIdx < 5 + TEMPLATE_SAMPLE_ROWS.length;
    row.height = isSample ? 56 : 28;
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        color: { argb: 'FF0F172A' },
      };
      cell.alignment = {
        vertical: 'top',
        horizontal: colNum === 1 || colNum === 12 ? 'center' : 'left',
        wrapText: true,
      };
      cell.border = thinBorder;
      if (isSample && rIdx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
    });

    // Add Excel dropdown validation for Jenis_Soal (col B)
    wsBank.getCell(`B${rIdx}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"PG,PG_KOMPLEKS,BENAR_SALAH,MENJODOHKAN,ISIAN"'],
      showErrorMessage: true,
      errorTitle: 'Jenis Soal Tidak Valid',
      error: 'Pilih salah satu: PG, PG_KOMPLEKS, BENAR_SALAH, MENJODOHKAN, atau ISIAN.',
    };
  }

  // Sheet 2: Panduan_Pengisian
  const wsGuide = wb.addWorksheet('Panduan_Pengisian');
  wsGuide.columns = [
    { width: 22 },
    { width: 14 },
    { width: 70 },
    { width: 34 },
  ];

  wsGuide.mergeCells('A1:D1');
  const gTitle = wsGuide.getCell('A1');
  gTitle.value = `PANDUAN PENGISIAN TEMPLATE SOAL EXCEL — ${schoolName.toUpperCase()}`;
  gTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  wsGuide.getRow(1).height = 24;

  wsGuide.getCell('A2').value = `Mata Pelajaran: ${subjectName}`;
  wsGuide.getCell('A2').font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF334155' } };

  const guideData: string[][] = [
    ['Nomor', 'Ya', 'Angka urut butir soal (1, 2, 3, dst.)', '1'],
    ['Jenis_Soal', 'Ya', 'Pilih dari dropdown: PG, PG_KOMPLEKS, BENAR_SALAH, MENJODOHKAN, atau ISIAN', 'PG'],
    ['Domain_AKM', 'Disarankan', 'Domain / Kompetensi Dasar butir soal', 'Literasi · Teks Informasi'],
    ['Stimulus', 'Opsional', 'Wacana bacaan atau pengantar konteks AKM sebelum pertanyaan', 'Sekolah menerapkan program...'],
    ['Pertanyaan', 'Ya', 'Kalimat pertanyaan inti soal (wajib diisi agar baris diimpor)', 'Tujuan utama program...'],
    ['Opsi_A .. Opsi_D', 'Sesuai Jenis', 'PG/PG_KOMPLEKS: awali A./B./C./D. | BENAR_SALAH: Teks|true atau false | MENJODOHKAN: Kiri->Kanan', 'A. Pilihan pertama'],
    ['Kunci_Jawaban', 'Ya', 'PG: B | PG_KOMPLEKS: A,B,D | BENAR_SALAH: S1:true,S2:false | MENJODOHKAN: P1->24 cm | ISIAN: Kalimat kunci', 'B'],
    ['Kata_Kunci_AI', 'Khusus ISIAN', 'Daftar kata kunci dipisah koma untuk Asisten AI mengoreksi jawaban esai', 'tersimpan aman, lokal, otomatis'],
    ['Bobot_Nilai', 'Ya', 'Angka bobot maksimal butir soal', '20'],
    ['Gambar_URL', 'Opsional', 'URL gambar publik (https://...) atau kosongkan lalu unggah di editor aplikasi', ''],
  ];

  wsGuide.addTable({
    name: 'TabelPanduanSoal',
    ref: 'A4',
    headerRow: true,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: [
      { name: 'Nama Kolom' },
      { name: 'Wajib?' },
      { name: 'Format & Keterangan Pengisian' },
      { name: 'Contoh' },
    ],
    rows: guideData,
  });

  const guideHeader = wsGuide.getRow(4);
  guideHeader.height = 26;
  guideHeader.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' },
    };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = thinBorder;
  });

  for (let r = 5; r < 5 + guideData.length; r++) {
    const row = wsGuide.getRow(r);
    row.height = 34;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.border = thinBorder;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBlobDownload(
    blob,
    `Template_Soal_${sanitizeFilenamePart(subjectName)}.xlsx`
  );
}

export function parseQuestionsFromExcelBuffer(
  buffer: ArrayBuffer,
  subjectId: string,
  startingNumber = 1
): Question[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const preferredSheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes('bank')) ||
    wb.SheetNames[0];
  if (!preferredSheetName) return [];

  const ws = wb.Sheets[preferredSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    ws,
    { header: 1, defval: '' }
  );

  if (rows.length === 0) return [];

  // Find header row index (either row 0 or any row containing "Pertanyaan")
  let startRowIdx = 0;
  const headerIdx = rows.findIndex((r) =>
    r.some((cell) => String(cell).toLowerCase().includes('pertanyaan'))
  );
  if (headerIdx >= 0) {
    startRowIdx = headerIdx + 1;
  } else if (
    String(rows[0]?.[0] || '')
      .toLowerCase()
      .includes('nomor')
  ) {
    startRowIdx = 1;
  }

  const parsed: Question[] = [];
  for (let i = startRowIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => String(c || '').trim() === '')) continue;
    const cols = Array.from({ length: 13 }, (_, idx) =>
      String(row[idx] ?? '').trim()
    );
    const q = buildQuestionFromColumns(
      cols,
      subjectId,
      startingNumber + parsed.length,
      i
    );
    if (q) parsed.push(q);
  }

  return parsed;
}

// ============================================================================
// 2. FORMAT WORD (.DOCX & .DOC) GENERATOR & PARSER
// ============================================================================

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
  left: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
};

function makeWordRow(label: string, value: string, highlight = false): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 2500, type: WidthType.DXA },
        shading: {
          type: ShadingType.CLEAR,
          color: 'auto',
          fill: highlight ? 'EFF6FF' : 'F8FAFC',
        },
        margins: { top: 90, bottom: 90, left: 140, right: 140 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                bold: true,
                size: 20,
                font: 'Calibri',
                color: '1E293B',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 7500, type: WidthType.DXA },
        shading: {
          type: ShadingType.CLEAR,
          color: 'auto',
          fill: 'FFFFFF',
        },
        margins: { top: 90, bottom: 90, left: 140, right: 140 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: value || '-',
                bold: highlight,
                size: 20,
                font: 'Calibri',
                color: highlight ? '1D4ED8' : '0F172A',
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function getWordQuestionOptionRows(r: TemplateQuestionRow): [string, string][] {
  if (r.jenisSoal === 'BENAR_SALAH') {
    const out: [string, string][] = [];
    if (r.opsiA) out.push(['Pernyataan S1', r.opsiA]);
    if (r.opsiB) out.push(['Pernyataan S2', r.opsiB]);
    if (r.opsiC) out.push(['Pernyataan S3', r.opsiC]);
    if (r.opsiD) out.push(['Pernyataan S4', r.opsiD]);
    return out;
  }
  if (r.jenisSoal === 'MENJODOHKAN') {
    const out: [string, string][] = [];
    if (r.opsiA) out.push(['Pasangan P1', r.opsiA]);
    if (r.opsiB) out.push(['Pasangan P2', r.opsiB]);
    if (r.opsiC) out.push(['Pasangan P3', r.opsiC]);
    if (r.opsiD) out.push(['Pasangan P4', r.opsiD]);
    return out;
  }
  if (r.jenisSoal === 'ISIAN') {
    return [];
  }
  return [
    ['Opsi A', r.opsiA],
    ['Opsi B', r.opsiB],
    ['Opsi C', r.opsiC],
    ['Opsi D', r.opsiD],
  ];
}

export async function downloadWordDocxTemplate(
  subjectName = 'Mata Pelajaran',
  schoolName = 'SD Negeri 2 Tukangkayu'
): Promise<void> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: schoolName.toUpperCase(),
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'TEMPLATE PENYUSUNAN BANK SOAL CBT (TKA & AKM)',
          bold: true,
          size: 30,
          font: 'Calibri',
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `DutawangiCBT · Mata Pelajaran: ${subjectName}`,
          size: 21,
          font: 'Calibri',
          color: '475569',
        }),
      ],
    }),
    new Table({
      width: { size: 10000, type: WidthType.DXA },
      borders: TABLE_BORDERS,
      rows: [
        makeWordRow(
          'Petunjuk Singkat',
          'Setiap soal berada di dalam tabel 2 kolom. Cukup ganti isi pada kolom kanan, lalu simpan dan unggah langsung file .docx ini pada menu Import Soal di aplikasi.',
          true
        ),
        makeWordRow(
          'Jenis Soal Valid',
          'PG | PG_KOMPLEKS | BENAR_SALAH | MENJODOHKAN | ISIAN'
        ),
        makeWordRow(
          'Aturan Khusus',
          'BENAR_SALAH: akhiri pernyataan dengan |true atau |false. MENJODOHKAN: pisahkan kiri dan kanan dengan ->. PG_KOMPLEKS: kunci dipisah koma (misal A,B,D).'
        ),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 160 } }),
  ];

  TEMPLATE_SAMPLE_ROWS.forEach((r) => {
    const typeTitleMap: Record<QuestionType, string> = {
      PG: 'PILIHAN GANDA (PG)',
      PG_KOMPLEKS: 'PILIHAN GANDA KOMPLEKS (AKM)',
      BENAR_SALAH: 'BENAR / SALAH (AKM)',
      MENJODOHKAN: 'MENJODOHKAN (AKM)',
      ISIAN: 'ISIAN / URAIAN (KOREKTOR AI)',
    };

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 100 },
        children: [
          new TextRun({
            text: `SOAL #${r.nomor} — ${typeTitleMap[r.jenisSoal]}`,
            bold: true,
            size: 24,
            font: 'Calibri',
            color: '1D4ED8',
          }),
        ],
      })
    );

    const optRows = getWordQuestionOptionRows(r).map(([lbl, val]) =>
      makeWordRow(lbl, val)
    );

    children.push(
      new Table({
        width: { size: 10000, type: WidthType.DXA },
        borders: TABLE_BORDERS,
        rows: [
          makeWordRow('Nomor', String(r.nomor)),
          makeWordRow('Jenis Soal', r.jenisSoal, true),
          makeWordRow('Domain AKM', r.domainAkm),
          makeWordRow('Bobot Nilai', String(r.bobotNilai)),
          makeWordRow('Stimulus', r.stimulus),
          makeWordRow('Pertanyaan', r.pertanyaan, true),
          ...optRows,
          makeWordRow('Kunci Jawaban', r.kunciJawaban, true),
          makeWordRow('Kata Kunci AI', r.kataKunciAi),
          makeWordRow('Gambar URL', r.gambarUrl),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 900,
              right: 900,
              bottom: 900,
              left: 900,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(
    blob,
    `Template_Soal_${sanitizeFilenamePart(subjectName)}.docx`
  );
}

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function downloadWordDocLegacyTemplate(
  subjectName = 'Mata Pelajaran',
  schoolName = 'SD Negeri 2 Tukangkayu'
): void {
  const blocksHtml = TEMPLATE_SAMPLE_ROWS.map((r) => {
    const optRows = getWordQuestionOptionRows(r)
      .map(
        ([lbl, val]) =>
          `<tr><td class="lbl">${escapeHtml(lbl)}</td><td>${escapeHtml(
            val
          )}</td></tr>`
      )
      .join('');

    return `
      <h2>SOAL #${r.nomor} — ${escapeHtml(r.jenisSoal)}</h2>
      <table>
        <tr><td class="lbl">Nomor</td><td>${r.nomor}</td></tr>
        <tr><td class="lbl">Jenis Soal</td><td><strong>${escapeHtml(r.jenisSoal)}</strong></td></tr>
        <tr><td class="lbl">Domain AKM</td><td>${escapeHtml(r.domainAkm)}</td></tr>
        <tr><td class="lbl">Bobot Nilai</td><td>${r.bobotNilai}</td></tr>
        <tr><td class="lbl">Stimulus</td><td>${escapeHtml(r.stimulus || '-')}</td></tr>
        <tr><td class="lbl">Pertanyaan</td><td><strong>${escapeHtml(r.pertanyaan)}</strong></td></tr>
        ${optRows}
        <tr><td class="lbl">Kunci Jawaban</td><td><strong>${escapeHtml(r.kunciJawaban)}</strong></td></tr>
        <tr><td class="lbl">Kata Kunci AI</td><td>${escapeHtml(r.kataKunciAi || '-')}</td></tr>
        <tr><td class="lbl">Gambar URL</td><td>${escapeHtml(r.gambarUrl || '-')}</td></tr>
      </table>
    `;
  }).join('\n');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>Template Soal ${escapeHtml(subjectName)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; color: #0f172a; font-size: 11pt; line-height: 1.45; }
    .hdr { text-align: center; margin-bottom: 14pt; border-bottom: 2px solid #1e3a8a; padding-bottom: 8pt; }
    .hdr .school { font-size: 12pt; font-weight: bold; color: #1e3a8a; }
    .hdr h1 { font-size: 15pt; margin: 4pt 0; color: #0f172a; }
    .hdr .sub { font-size: 10pt; color: #475569; }
    h2 { font-size: 12pt; color: #1d4ed8; margin: 16pt 0 6pt; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
    td { border: 1px solid #cbd5e1; padding: 6pt 8pt; vertical-align: top; }
    td.lbl { width: 24%; background: #f8fafc; font-weight: bold; color: #1e293b; }
  </style>
</head>
<body>
  <div class="hdr">
    <div class="school">${escapeHtml(schoolName.toUpperCase())}</div>
    <h1>TEMPLATE PENYUSUNAN BANK SOAL CBT (TKA &amp; AKM)</h1>
    <div class="sub">DutawangiCBT · Mata Pelajaran: ${escapeHtml(subjectName)}</div>
  </div>
  <table>
    <tr><td class="lbl">Petunjuk Singkat</td><td>Ubah isi pada kolom kanan di setiap tabel soal, simpan sebagai .doc atau .docx, lalu unggah langsung ke menu Import Soal.</td></tr>
    <tr><td class="lbl">Jenis Soal Valid</td><td>PG | PG_KOMPLEKS | BENAR_SALAH | MENJODOHKAN | ISIAN</td></tr>
  </table>
  ${blocksHtml}
</body>
</html>`;

  const blob = new Blob(['\uFEFF', html], {
    type: 'application/msword;charset=utf-8',
  });
  triggerBlobDownload(
    blob,
    `Template_Soal_${sanitizeFilenamePart(subjectName)}.doc`
  );
}

function parseKeyValueTablePairs(
  pairs: [string, string][],
  subjectId: string,
  fallbackNumber: number,
  idx: number
): Question | null {
  const map = new Map<string, string>();
  pairs.forEach(([rawKey, rawVal]) => {
    const key = rawKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    const val = rawVal.trim() === '-' ? '' : rawVal.trim();
    if (key) map.set(key, val);
  });

  const pertanyaan =
    map.get('pertanyaan') || map.get('pertanyaan utama') || map.get('soal') || '';
  if (!pertanyaan) return null;

  const nomor = Number(map.get('nomor') || map.get('no')) || fallbackNumber;
  const jenis = map.get('jenis soal') || map.get('jenis') || 'PG';
  const domain = map.get('domain akm') || map.get('domain') || 'Umum';
  const bobot = map.get('bobot nilai') || map.get('bobot') || '20';
  const stimulus = map.get('stimulus') || map.get('bacaan') || '';
  const kunci = map.get('kunci jawaban') || map.get('kunci') || '';
  const kataKunciAi = map.get('kata kunci ai') || map.get('kata kunci') || '';
  const gambarUrl = map.get('gambar url') || map.get('gambar') || '';

  const opsi1 =
    map.get('opsi a') ||
    map.get('pernyataan s1') ||
    map.get('pasangan p1') ||
    '';
  const opsi2 =
    map.get('opsi b') ||
    map.get('pernyataan s2') ||
    map.get('pasangan p2') ||
    '';
  const opsi3 =
    map.get('opsi c') ||
    map.get('pernyataan s3') ||
    map.get('pasangan p3') ||
    '';
  const opsi4 =
    map.get('opsi d') ||
    map.get('pernyataan s4') ||
    map.get('pasangan p4') ||
    '';

  return buildQuestionFromColumns(
    [
      String(nomor),
      jenis,
      domain,
      stimulus,
      pertanyaan,
      opsi1,
      opsi2,
      opsi3,
      opsi4,
      kunci,
      kataKunciAi,
      bobot,
      gambarUrl,
    ],
    subjectId,
    fallbackNumber,
    idx
  );
}

export async function parseQuestionsFromDocxBuffer(
  buffer: ArrayBuffer,
  subjectId: string,
  startingNumber = 1
): Promise<Question[]> {
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) return [];

  const xmlString = await docXmlFile.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

  const getParagraphText = (pEl: Element): string => {
    const texts: string[] = [];
    const walkers = pEl.getElementsByTagName('*');
    for (let i = 0; i < walkers.length; i++) {
      const node = walkers[i];
      if (node.localName === 't') {
        texts.push(node.textContent || '');
      } else if (node.localName === 'tab') {
        texts.push(' ');
      } else if (node.localName === 'br') {
        texts.push('\n');
      }
    }
    return texts.join('').trim();
  };

  const getCellText = (tcEl: Element): string => {
    const pEls = Array.from(tcEl.getElementsByTagName('*')).filter(
      (el) => el.localName === 'p'
    );
    return pEls
      .map(getParagraphText)
      .filter(Boolean)
      .join('\n')
      .trim();
  };

  const tables = Array.from(xmlDoc.getElementsByTagName('*')).filter(
    (el) => el.localName === 'tbl'
  );

  const parsed: Question[] = [];

  tables.forEach((tbl, tIdx) => {
    const rows = Array.from(tbl.children).filter(
      (el) => el.localName === 'tr'
    );
    if (rows.length === 0) return;

    const matrix = rows.map((tr) =>
      Array.from(tr.children)
        .filter((el) => el.localName === 'tc')
        .map(getCellText)
    );

    // Case A: 2-column vertical question card table
    if (matrix[0]?.length === 2) {
      const pairs: [string, string][] = matrix.map((r) => [
        r[0] || '',
        r[1] || '',
      ]);
      const q = parseKeyValueTablePairs(
        pairs,
        subjectId,
        startingNumber + parsed.length,
        tIdx
      );
      if (q) parsed.push(q);
      return;
    }

    // Case B: Horizontal Excel-style table inside Word (5+ cols)
    if ((matrix[0]?.length || 0) >= 5) {
      const startRow = String(matrix[0][0] || '')
        .toLowerCase()
        .includes('nomor')
        ? 1
        : 0;
      for (let r = startRow; r < matrix.length; r++) {
        const cols = Array.from({ length: 13 }, (_, cIdx) =>
          (matrix[r][cIdx] || '').trim()
        );
        const q = buildQuestionFromColumns(
          cols,
          subjectId,
          startingNumber + parsed.length,
          r
        );
        if (q) parsed.push(q);
      }
    }
  });

  if (parsed.length > 0) return parsed;

  // Fallback: extract paragraphs and parse as structured Markdown/labeled blocks
  const allParagraphs = Array.from(xmlDoc.getElementsByTagName('*'))
    .filter((el) => el.localName === 'p')
    .map(getParagraphText)
    .filter(Boolean);

  return parseQuestionsFromMarkdown(
    allParagraphs.join('\n'),
    subjectId,
    startingNumber
  );
}

export function parseQuestionsFromLegacyDocText(
  rawText: string,
  subjectId: string,
  startingNumber = 1
): Question[] {
  if (/<html|<table|<tr/i.test(rawText)) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawText, 'text/html');
    const tables = Array.from(doc.querySelectorAll('table'));
    const parsed: Question[] = [];

    tables.forEach((tbl, tIdx) => {
      const rows = Array.from(tbl.querySelectorAll('tr'));
      const matrix = rows.map((tr) =>
        Array.from(tr.querySelectorAll('th, td')).map((cell) =>
          (cell.textContent || '').trim()
        )
      );
      if (matrix[0]?.length === 2) {
        const q = parseKeyValueTablePairs(
          matrix.map((r) => [r[0] || '', r[1] || '']),
          subjectId,
          startingNumber + parsed.length,
          tIdx
        );
        if (q) parsed.push(q);
      } else if ((matrix[0]?.length || 0) >= 5) {
        const start = String(matrix[0][0] || '')
          .toLowerCase()
          .includes('nomor')
          ? 1
          : 0;
        for (let r = start; r < matrix.length; r++) {
          const cols = Array.from({ length: 13 }, (_, cIdx) =>
            (matrix[r][cIdx] || '').trim()
          );
          const q = buildQuestionFromColumns(
            cols,
            subjectId,
            startingNumber + parsed.length,
            r
          );
          if (q) parsed.push(q);
        }
      }
    });

    if (parsed.length > 0) return parsed;
    const plain = doc.body?.textContent || '';
    return parseQuestionsFromMarkdown(plain, subjectId, startingNumber);
  }

  return parseQuestionsFromMarkdown(rawText, subjectId, startingNumber);
}

// ============================================================================
// 3. FORMAT MARKDOWN (.MD) GENERATOR, GUIDE & PARSER
// ============================================================================

export function generateMarkdownQuestionTemplate(
  subjectName = 'Mata Pelajaran',
  schoolName = 'SD Negeri 2 Tukangkayu'
): string {
  const blocks = TEMPLATE_SAMPLE_ROWS.map((r) => {
    const lines: string[] = [
      `## Soal ${r.nomor}`,
      `- **Jenis Soal**: ${r.jenisSoal}`,
      `- **Domain AKM**: ${r.domainAkm}`,
      `- **Bobot Nilai**: ${r.bobotNilai}`,
      `- **Gambar URL**: ${r.gambarUrl}`,
      '',
      `> **Stimulus**:`,
      `> ${r.stimulus}`,
      '',
      `**Pertanyaan**:`,
      r.pertanyaan,
      '',
    ];

    if (r.jenisSoal === 'PG' || r.jenisSoal === 'PG_KOMPLEKS') {
      if (r.opsiA) lines.push(`- **A.** ${r.opsiA.replace(/^A\.\s*/i, '')}`);
      if (r.opsiB) lines.push(`- **B.** ${r.opsiB.replace(/^B\.\s*/i, '')}`);
      if (r.opsiC) lines.push(`- **C.** ${r.opsiC.replace(/^C\.\s*/i, '')}`);
      if (r.opsiD) lines.push(`- **D.** ${r.opsiD.replace(/^D\.\s*/i, '')}`);
      lines.push('');
    } else if (r.jenisSoal === 'BENAR_SALAH') {
      if (r.opsiA) lines.push(`- **S1:** ${r.opsiA}`);
      if (r.opsiB) lines.push(`- **S2:** ${r.opsiB}`);
      if (r.opsiC) lines.push(`- **S3:** ${r.opsiC}`);
      if (r.opsiD) lines.push(`- **S4:** ${r.opsiD}`);
      lines.push('');
    } else if (r.jenisSoal === 'MENJODOHKAN') {
      if (r.opsiA) lines.push(`- **P1:** ${r.opsiA}`);
      if (r.opsiB) lines.push(`- **P2:** ${r.opsiB}`);
      if (r.opsiC) lines.push(`- **P3:** ${r.opsiC}`);
      if (r.opsiD) lines.push(`- **P4:** ${r.opsiD}`);
      lines.push('');
    }

    lines.push(`- **Kunci Jawaban**: ${r.kunciJawaban}`);
    lines.push(`- **Kata Kunci AI**: ${r.kataKunciAi}`);
    return lines.join('\n');
  }).join('\n\n---\n\n');

  return `# TEMPLATE BANK SOAL — DUTAWANGICBT

> **Sekolah:** ${schoolName}
> **Mata Pelajaran:** ${subjectName}
> **Jenis Soal Didukung:** \`PG\`, \`PG_KOMPLEKS\`, \`BENAR_SALAH\`, \`MENJODOHKAN\`, \`ISIAN\`

## Panduan Singkat Format Markdown (.md)
| Jenis Soal | Format Opsi / Item | Format Kunci Jawaban |
| --- | --- | --- |
| \`PG\` | \`- **A.** ...\` s.d. \`- **D.** ...\` | \`B\` |
| \`PG_KOMPLEKS\` | \`- **A.** ...\` s.d. \`- **D.** ...\` | \`A,B,D\` |
| \`BENAR_SALAH\` | \`- **S1:** Pernyataan\\|true\` | \`S1:true,S2:false,S3:true\` |
| \`MENJODOHKAN\` | \`- **P1:** Kiri->Kanan\` | \`P1->24 cm,P2->40 cm²\` |
| \`ISIAN\` | *(Tidak perlu opsi)* | Isi kalimat referensi + **Kata Kunci AI** |

---

${blocks}
`;
}

export function downloadMarkdownQuestionTemplate(
  subjectName = 'Mata Pelajaran',
  schoolName = 'SD Negeri 2 Tukangkayu'
): void {
  const md = generateMarkdownQuestionTemplate(subjectName, schoolName);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  triggerBlobDownload(
    blob,
    `Template_Soal_${sanitizeFilenamePart(subjectName)}.md`
  );
}

export const TEMPLATE_GUIDE_MARKDOWN = `# Panduan Format Template Soal DutawangiCBT

Aplikasi **DutawangiCBT** mendukung 4 format file template soal yang dapat diunduh, diisi secara offline/kolaboratif, lalu diimpor langsung ke **Bank Soal**:

1. **Microsoft Excel (\`.xlsx\`)** — paling ideal untuk impor massal puluhan hingga ratusan butir soal sekaligus.
2. **Microsoft Word (\`.docx\` & \`.doc\`)** — tersusun rapi dalam bentuk tabel kartu per soal sehingga nyaman dibaca, diedit, dan dicetak guru.
3. **Markdown (\`.md\`)** — format teks terstruktur ringan, rapi, mudah disalin dari editor teks maupun AI.
4. **CSV (\`.csv\`)** — format tabel teks ringan yang kompatibel dengan Excel maupun Google Sheets.

---

## 1. Struktur Kolom Standar (Excel \`.xlsx\` & CSV \`.csv\`)

Pada sheet **\`Bank_Soal\`** (baris 1 wajib berisi header):

| No | Nama Kolom | Keterangan | Contoh |
| --- | --- | --- | --- |
| 1 | \`Nomor\` | Nomor urut soal | \`1\` |
| 2 | \`Jenis_Soal\` | \`PG\`, \`PG_KOMPLEKS\`, \`BENAR_SALAH\`, \`MENJODOHKAN\`, atau \`ISIAN\` | \`PG\` |
| 3 | \`Domain_AKM\` | Domain atau kompetensi dasar | \`Literasi · Teks Informasi\` |
| 4 | \`Stimulus\` | Teks bacaan / konteks pengantar (opsional) | \`Sekolah menerapkan bebas plastik...\` |
| 5 | \`Pertanyaan\` | Kalimat inti pertanyaan (wajib) | \`Tujuan utama program adalah...\` |
| 6–9 | \`Opsi_A\` .. \`Opsi_D\` | Pilihan jawaban / pernyataan / pasangan | \`A. Pilihan pertama\` |
| 10 | \`Kunci_Jawaban\` | Kunci jawaban sesuai jenis soal | \`B\` atau \`A,B,D\` |
| 11 | \`Kata_Kunci_AI\` | Kata kunci korektor AI khusus \`ISIAN\` | \`lokal, otomatis, aman\` |
| 12 | \`Bobot_Nilai\` | Bobot skor maksimal | \`20\` |
| 13 | \`Gambar_URL\` | URL gambar (opsional) | \`https://...\` |

---

## 2. Struktur Tabel Kartu Word (\`.docx\` / \`.doc\`)

Di Microsoft Word, setiap soal disusun dalam **1 tabel 2 kolom** (\`Field\` | \`Isi\`) setelah judul \`SOAL #1 — ...\`:
- **Nomor**, **Jenis Soal**, **Domain AKM**, **Bobot Nilai**
- **Stimulus**, **Pertanyaan**
- **Opsi A–D** (untuk PG/PG Kompleks), **Pernyataan S1–S4** (untuk Benar/Salah), atau **Pasangan P1–P4** (untuk Menjodohkan)
- **Kunci Jawaban**, **Kata Kunci AI**, **Gambar URL**

---

## 3. Struktur Markdown (\`.md\`)

Setiap soal dipisahkan oleh judul \`## Soal <nomor>\`:

\`\`\`markdown
## Soal 1
- **Jenis Soal**: PG
- **Domain AKM**: Literasi · Teks Informasi
- **Bobot Nilai**: 20
- **Gambar URL**:

> **Stimulus**:
> Teks bacaan singkat...

**Pertanyaan**:
Pertanyaan inti di sini...

- **A.** Pilihan A
- **B.** Pilihan B
- **C.** Pilihan C
- **D.** Pilihan D

- **Kunci Jawaban**: B
- **Kata Kunci AI**:
\`\`\``;

export function parseQuestionsFromMarkdown(
  mdText: string,
  subjectId: string,
  startingNumber = 1
): Question[] {
  const cleanText = mdText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  // Split by "## Soal <n>" or "SOAL #<n>"
  const sectionRegex = /^(?:#{1,3}\s*Soal\s*#?(\d+)|SOAL\s*#(\d+))/gim;
  const matches = Array.from(cleanText.matchAll(sectionRegex));

  if (matches.length === 0) {
    return [];
  }

  const parsed: Question[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const startIdx = match.index ?? 0;
    const endIdx =
      i + 1 < matches.length ? matches[i + 1].index ?? cleanText.length : cleanText.length;
    const block = cleanText.slice(startIdx, endIdx).trim();
    const blockNum =
      Number(match[1] || match[2]) || startingNumber + parsed.length;

    const extractMeta = (labelRegex: RegExp): string => {
      const m = block.match(labelRegex);
      return m ? m[1].trim() : '';
    };

    const stripMd = (s: string) =>
      s.replace(/\*\*/g, '').replace(/^[-*]\s*/, '').trim();

    const jenisRaw = extractMeta(
      /^[-*]?\s*\*?\*?Jenis(?:\s+Soal)?\*?\*?\s*[:\-]\s*(.+)$/im
    );
    const domain =
      extractMeta(
        /^[-*]?\s*\*?\*?Domain(?:\s+AKM)?\*?\*?\s*[:\-]\s*(.+)$/im
      ) || 'Umum';
    const bobot = extractMeta(
      /^[-*]?\s*\*?\*?Bobot(?:\s+Nilai)?\*?\*?\s*[:\-]\s*(\d+)/im
    );
    const gambarUrl = extractMeta(
      /^[-*]?\s*\*?\*?Gambar(?:\s+URL)?\*?\*?\s*[:\-]\s*(.+)$/im
    );
    const kunci = extractMeta(
      /^[-*]?\s*\*?\*?Kunci(?:\s+Jawaban)?\*?\*?\s*[:\-]\s*(.+)$/im
    );
    const kataKunciAi = extractMeta(
      /^[-*]?\s*\*?\*?Kata\s+Kunci\s+AI\*?\*?\s*[:\-]\s*(.+)$/im
    );

    // Extract Stimulus blockquote or labeled line
    let stimulus = '';
    const stimBlockMatch = block.match(
      />\s*\*?\*?Stimulus\*?\*?\s*:?\s*\n((?:>.*\n?)+)/i
    );
    if (stimBlockMatch) {
      stimulus = stimBlockMatch[1]
        .split('\n')
        .map((l) => l.replace(/^>\s?/, '').trim())
        .filter(Boolean)
        .join(' ');
    } else {
      stimulus = extractMeta(
        /^[>-]*\s*\*?\*?Stimulus\*?\*?\s*:\s*(.+)$/im
      );
    }

    // Extract Pertanyaan
    let pertanyaan = '';
    const lines = block.split(/\r?\n/);
    for (let li = 0; li < lines.length; li++) {
      const ln = lines[li].trim();
      const inlineQ = ln.match(
        /^[-*]?\s*\*?\*?Pertanyaan(?:\s+Utama)?\*?\*?\s*:\s*(.+)$/i
      );
      if (inlineQ && inlineQ[1].trim()) {
        pertanyaan = stripMd(inlineQ[1]);
        break;
      }
      if (/^[-*]?\s*\*?\*?Pertanyaan(?:\s+Utama)?\*?\*?\s*:?\s*$/i.test(ln)) {
        const collected: string[] = [];
        for (let lj = li + 1; lj < lines.length; lj++) {
          const nextLn = lines[lj].trim();
          if (
            !nextLn ||
            /^[-*]\s*\*?\*?(?:[A-D]\.|S\d+|P\d+|Kunci|Kata Kunci)/i.test(nextLn)
          ) {
            if (collected.length > 0) break;
            continue;
          }
          collected.push(nextLn);
        }
        pertanyaan = collected.join(' ').trim();
        break;
      }
    }

    if (!pertanyaan) continue;

    // Extract options / statements / pairs
    const type = normalizeQuestionType(jenisRaw || 'PG');
    const collectedOpts: string[] = [];

    lines.forEach((rawLine) => {
      const ln = rawLine.trim();
      const optMatch = ln.match(
        /^[-*]?\s*\*?\*?([A-D])\.\*?\*?\s*(.+)$/i
      );
      if (optMatch && (type === 'PG' || type === 'PG_KOMPLEKS')) {
        const letter = optMatch[1].toUpperCase();
        collectedOpts.push(`${letter}. ${stripMd(optMatch[2])}`);
        return;
      }
      const stmtMatch = ln.match(
        /^[-*]?\s*\*?\*?S\d+\*?\*?\s*[:.]\s*(.+)$/i
      );
      if (stmtMatch && type === 'BENAR_SALAH') {
        collectedOpts.push(stripMd(stmtMatch[1]));
        return;
      }
      const pairMatch = ln.match(
        /^[-*]?\s*\*?\*?P\d+\*?\*?\s*[:.]\s*(.+)$/i
      );
      if (pairMatch && type === 'MENJODOHKAN') {
        collectedOpts.push(stripMd(pairMatch[1]));
      }
    });

    const q = buildQuestionFromColumns(
      [
        String(blockNum),
        type,
        domain,
        stimulus,
        pertanyaan,
        collectedOpts[0] || '',
        collectedOpts[1] || '',
        collectedOpts[2] || '',
        collectedOpts[3] || '',
        kunci,
        kataKunciAi,
        bobot || '20',
        gambarUrl,
      ],
      subjectId,
      startingNumber + parsed.length,
      i
    );
    if (q) parsed.push(q);
  }

  return parsed;
}

// ============================================================================
// 4. UNIVERSAL MULTI-FORMAT FILE IMPORT DISPATCHER
// ============================================================================

export async function parseQuestionsFromFile(
  file: File,
  subjectId: string,
  startingNumber = 1
): Promise<Question[]> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    return parseQuestionsFromExcelBuffer(buffer, subjectId, startingNumber);
  }

  if (ext === 'docx') {
    const buffer = await file.arrayBuffer();
    return parseQuestionsFromDocxBuffer(buffer, subjectId, startingNumber);
  }

  if (ext === 'doc') {
    const text = await file.text();
    return parseQuestionsFromLegacyDocText(text, subjectId, startingNumber);
  }

  if (ext === 'md' || ext === 'markdown') {
    const text = await file.text();
    return parseQuestionsFromMarkdown(text, subjectId, startingNumber);
  }

  // Fallback CSV or plain text
  const text = await file.text();
  const mdTry = parseQuestionsFromMarkdown(text, subjectId, startingNumber);
  if (mdTry.length > 0) return mdTry;
  return parseQuestionsFromCsv(text, subjectId, startingNumber);
}
