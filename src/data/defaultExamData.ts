import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_SPREADSHEET_ID,
  type AccessCredentials,
  type BeritaAcaraRecord,
  type ExamPackageData,
  type ExamRoom,
  type ExamScheduleItem,
  type ExamSessionSlot,
  type ExamSubmission,
  type ExamTimeSettings,
  type ProctorMappingEntry,
  type Question,
  type Student,
  type SubjectConfig,
  type TeacherAccount,
} from '../types/exam';

export const DEFAULT_ADMIN_CREDENTIALS: AccessCredentials = {
  username: 'admin',
  password: 'admin2026',
};

export const DEFAULT_PROCTOR_CREDENTIALS: AccessCredentials = {
  username: 'pengawas',
  password: 'proktor2026',
};

export const DEFAULT_EXAM_TIME_SETTINGS: ExamTimeSettings = {
  timezone: 'WIB',
  enforceScheduleWindow: false,
  minSubmitMinutes: 0,
  warningMinutesBeforeEnd: 5,
  showScoreImmediately: true,
  examInfoNotes:
    'Peserta wajib hadir 15 menit sebelum sesi dimulai, menyiapkan kartu nomor peserta, menjaga koneksi/kamera aktif, dan mengisi seluruh butir soal sebelum waktu berakhir.',
};

export const INITIAL_TEACHERS: TeacherAccount[] = [];

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svg.replace(/\s+/g, ' ').trim()
  )}`;
}

const SAMPLE_SOLAR_CHART_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 280" width="560" height="280">
  <rect width="560" height="280" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
  <text x="280" y="30" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0F172A">Produksi Energi Listrik PLTS Atap Sekolah (kWh)</text>
  <line x1="70" y1="220" x2="515" y2="220" stroke="#64748B" stroke-width="2"/>
  <line x1="70" y1="55" x2="70" y2="220" stroke="#64748B" stroke-width="2"/>
  <line x1="70" y1="180" x2="515" y2="180" stroke="#E2E8F0" stroke-dasharray="4"/>
  <line x1="70" y1="140" x2="515" y2="140" stroke="#E2E8F0" stroke-dasharray="4"/>
  <line x1="70" y1="100" x2="515" y2="100" stroke="#E2E8F0" stroke-dasharray="4"/>
  <line x1="70" y1="60" x2="515" y2="60" stroke="#E2E8F0" stroke-dasharray="4"/>
  <text x="60" y="224" text-anchor="end" font-family="monospace" font-size="11" fill="#475569">0</text>
  <text x="60" y="184" text-anchor="end" font-family="monospace" font-size="11" fill="#475569">200</text>
  <text x="60" y="144" text-anchor="end" font-family="monospace" font-size="11" fill="#475569">400</text>
  <text x="60" y="104" text-anchor="end" font-family="monospace" font-size="11" fill="#475569">600</text>
  <text x="60" y="64" text-anchor="end" font-family="monospace" font-size="11" fill="#475569">800</text>
  <rect x="105" y="170" width="48" height="50" rx="4" fill="#1D4ED8"/>
  <text x="129" y="162" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#1E3A8A">250</text>
  <text x="129" y="242" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">2022</text>
  <rect x="190" y="140" width="48" height="80" rx="4" fill="#1D4ED8"/>
  <text x="214" y="132" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#1E3A8A">400</text>
  <text x="214" y="242" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">2023</text>
  <rect x="275" y="116" width="48" height="104" rx="4" fill="#1D4ED8"/>
  <text x="299" y="108" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#1E3A8A">520</text>
  <text x="299" y="242" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">2024</text>
  <rect x="360" y="90" width="48" height="130" rx="4" fill="#059669"/>
  <text x="384" y="82" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#065F46">650</text>
  <text x="384" y="242" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">2025</text>
  <rect x="445" y="64" width="48" height="156" rx="4" fill="#059669"/>
  <text x="469" y="56" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="#065F46">780</text>
  <text x="469" y="242" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#334155">2026</text>
</svg>
`);

const SAMPLE_TRIANGLE_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 250" width="460" height="250">
  <rect width="460" height="250" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
  <text x="230" y="28" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0F172A">Diagram Segitiga Siku-Siku ABC</text>
  <polygon points="110,195 320,195 110,65" fill="#EFF6FF" stroke="#1D4ED8" stroke-width="3"/>
  <rect x="110" y="177" width="18" height="18" fill="none" stroke="#1D4ED8" stroke-width="2"/>
  <text x="94" y="205" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0F172A">A</text>
  <text x="330" y="205" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0F172A">B</text>
  <text x="94" y="65" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0F172A">C</text>
  <text x="215" y="218" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#1E3A8A">AB = 12 cm</text>
  <text x="58" y="135" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#1E3A8A">AC = 9 cm</text>
  <text x="235" y="118" font-family="monospace" font-size="14" font-weight="bold" fill="#059669">BC = ?</text>
</svg>
`);

export const INITIAL_SUBJECTS: SubjectConfig[] = [
  {
    id: 'SUBJ-AKM-01',
    code: 'AKM-LITNUM',
    name: 'Asesmen Kompetensi Minimum (Literasi & Numerasi)',
    token: 'AKM2026',
    tokenMode: 'manual',
    tokenSeed: 'AKM2026',
    durationMinutes: 60,
    maxViolations: 3,
    passingGradeKkm: 75,
    shuffleQuestions: false,
    shuffleOptions: false,
    cameraRequired: true,
    active: true,
    startTime: '2026-11-13T07:30',
    endTime: '2026-11-13T17:00',
    schoolName: 'SD Negeri 2 Tukangkayu',
  },
  {
    id: 'SUBJ-TKA-02',
    code: 'TKA-SAINTEK',
    name: 'Tes Kemampuan Akademik (TKA) Penalaran Sains',
    token: 'TKA2026',
    tokenMode: 'manual',
    tokenSeed: 'TKA2026',
    durationMinutes: 45,
    maxViolations: 3,
    passingGradeKkm: 75,
    shuffleQuestions: true,
    shuffleOptions: true,
    cameraRequired: true,
    active: true,
    startTime: '2026-11-13T09:30',
    endTime: '2026-11-13T17:00',
    schoolName: 'SD Negeri 2 Tukangkayu',
  },
];

export const INITIAL_EXAM_SESSIONS: ExamSessionSlot[] = [
  {
    id: 'SESI-1',
    name: 'Sesi 1 (07:30)',
    startTime: '07:30',
    endTime: '09:00',
    defaultRoom: 'Ruang 01',
    proctorName: 'Drs. Hendra Wijaya, M.Pd',
  },
  {
    id: 'SESI-2',
    name: 'Sesi 2 (09:30)',
    startTime: '09:30',
    endTime: '11:00',
    defaultRoom: 'Ruang 02',
    proctorName: 'Siti Aminah, S.Pd',
  },
  {
    id: 'SESI-3',
    name: 'Sesi 3 (13:00)',
    startTime: '13:00',
    endTime: '14:30',
    defaultRoom: 'Lab Komputer 1',
    proctorName: 'Ahmad Fauzi, S.Kom',
  },
];

export const INITIAL_EXAM_ROOMS: ExamRoom[] = [
  {
    id: 'ROOM-01',
    code: 'R-01',
    name: 'Ruang 01',
    capacity: 20,
    location: 'Gedung Utama Lantai 1',
    notes: '20 unit komputer/Chromebook + proyektor',
  },
  {
    id: 'ROOM-02',
    code: 'R-02',
    name: 'Ruang 02',
    capacity: 20,
    location: 'Gedung Utama Lantai 1',
    notes: '20 unit meja ujian + jaringan Wi-Fi lokal',
  },
  {
    id: 'ROOM-LAB1',
    code: 'LAB-01',
    name: 'Lab Komputer 1',
    capacity: 30,
    location: 'Gedung Timur Lantai 2',
    notes: '30 unit PC LAN Gigabit + kamera pengawas',
  },
];

export const INITIAL_EXAM_SCHEDULES: ExamScheduleItem[] = [
  {
    id: 'SCH-01',
    dayLabel: 'Hari ke-1 (Senin)',
    date: '2026-11-16',
    startTime: '07:30',
    endTime: '09:00',
    subjectId: 'SUBJ-AKM-01',
    subjectName: 'Asesmen Kompetensi Minimum (Literasi & Numerasi)',
    sessionName: 'Sesi 1 (07:30)',
    targetClass: 'Kelas VI-A & VI-B',
    roomSummary: 'Ruang 01, Ruang 02',
    notes: 'Peserta hadir 15 menit sebelum dimulai.',
  },
  {
    id: 'SCH-02',
    dayLabel: 'Hari ke-1 (Senin)',
    date: '2026-11-16',
    startTime: '09:30',
    endTime: '11:00',
    subjectId: 'SUBJ-TKA-02',
    subjectName: 'Tes Kemampuan Akademik (TKA) Penalaran Sains',
    sessionName: 'Sesi 2 (09:30)',
    targetClass: 'Kelas VI-A & VI-B',
    roomSummary: 'Ruang 01, Lab Komputer 1',
    notes: 'Siapkan kartu peserta & token ruang dari pengawas.',
  },
];

export const INITIAL_PROCTOR_MAPPINGS: ProctorMappingEntry[] = [
  {
    id: 'MAP-01',
    date: '2026-11-16',
    sessionId: 'SESI-1',
    sessionName: 'Sesi 1 (07:30)',
    roomId: 'ROOM-01',
    roomName: 'Ruang 01',
    subjectId: 'SUBJ-AKM-01',
    subjectName: 'Asesmen Kompetensi Minimum (Literasi & Numerasi)',
    proctorName: 'Drs. Hendra Wijaya, M.Pd',
    proctorNip: '197804122005011004',
    proctorUsername: 'pengawas',
    notes: 'Pengawas utama ruang 01',
  },
  {
    id: 'MAP-02',
    date: '2026-11-16',
    sessionId: 'SESI-2',
    sessionName: 'Sesi 2 (09:30)',
    roomId: 'ROOM-02',
    roomName: 'Ruang 02',
    subjectId: 'SUBJ-TKA-02',
    subjectName: 'Tes Kemampuan Akademik (TKA) Penalaran Sains',
    proctorName: 'Siti Aminah, S.Pd',
    proctorNip: '198607212010012011',
    proctorUsername: 'pengawas',
    notes: 'Pengawas ruang 02',
  },
];

export const INITIAL_BERITA_ACARA: BeritaAcaraRecord[] = [];

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'Q-AKM-01',
    subjectId: 'SUBJ-AKM-01',
    number: 1,
    type: 'PG',
    akmDomain: 'Literasi Membaca · Teks Informasi',
    stimulus:
      'Pemerintah menargetkan penurunan emisi karbon sektor energi sebesar 29% pada 2030 melalui transisi menuju pembangkit listrik tenaga surya (PLTS) atap dan kendaraan listrik berbasis baterai.',
    prompt:
      'Berdasarkan stimulus di atas, tujuan utama pengembangan PLTS atap dan kendaraan listrik dalam kebijakan nasional adalah...',
    options: [
      'A. Mengurangi ketergantungan impor kendaraan mewah dari luar negeri',
      'B. Menurunkan emisi karbon sektor energi hingga 29% pada tahun 2030',
      'C. Menggantikan seluruh jaringan listrik PLN dalam waktu satu tahun',
      'D. Meningkatkan konsumsi bahan bakar fosil di kawasan industri',
    ],
    correctAnswer: 'B',
    weight: 15,
  },
  {
    id: 'Q-AKM-02',
    subjectId: 'SUBJ-AKM-01',
    number: 2,
    type: 'PG_KOMPLEKS',
    akmDomain: 'Numerasi · Aljabar & Data',
    stimulus:
      'Sebuah koperasi sekolah menjual paket alat tulis: Paket A berisi 3 buku dan 2 pena seharga Rp22.000. Paket B berisi 2 buku dan 4 pena seharga Rp20.000.',
    prompt:
      'Pilih SEMUA pernyataan yang benar mengenai harga satuan dan total pembelian berikut (Pilihan Ganda Kompleks AKM):',
    options: [
      'A. Harga 1 buku tulis adalah Rp6.000',
      'B. Harga 1 pena adalah Rp2.000',
      'C. Harga 5 buku dan 5 pena adalah Rp40.000',
      'D. Selisih harga 1 buku dan 1 pena adalah Rp3.000',
    ],
    correctAnswer: 'A,B,C',
    weight: 20,
  },
  {
    id: 'Q-AKM-03',
    subjectId: 'SUBJ-AKM-01',
    number: 3,
    type: 'BENAR_SALAH',
    akmDomain: 'Literasi Sains · Evaluasi Informasi',
    stimulus:
      'Pada uji coba panel surya berkapasitas 400 Wp di sekolah daerah terpencil, rata-rata penyinaran efektif adalah 5 jam per hari dengan efisiensi inverter 85%.',
    prompt:
      'Tentukan apakah masing-masing pernyataan berikut Benar atau Salah berdasarkan data uji coba tersebut:',
    options: [],
    statements: [
      {
        id: 'S1',
        text: 'Energi teoretis sebelum rugi-rugi inverter per hari adalah 2.000 Wh (2 kWh).',
        isTrue: true,
      },
      {
        id: 'S2',
        text: 'Setelah memperhitungkan efisiensi inverter 85%, energi bersih yang dihasilkan mencapai 1,7 kWh per hari.',
        isTrue: true,
      },
      {
        id: 'S3',
        text: 'Jika beban laboratorium komputer membutuhkan 3 kWh per hari, satu panel 400 Wp sudah mencukupi tanpa tambahan panel.',
        isTrue: false,
      },
    ],
    correctAnswer: 'S1:true,S2:true,S3:false',
    weight: 20,
  },
  {
    id: 'Q-AKM-04',
    subjectId: 'SUBJ-AKM-01',
    number: 4,
    type: 'MENJODOHKAN',
    akmDomain: 'Numerasi · Geometri & Pengukuran',
    stimulus:
      'Cocokkan besaran berikut dengan satuan atau nilai ekuivalennya yang tepat.',
    prompt:
      'Pasangkan setiap item di kolom kiri dengan pasangan yang sesuai di kolom kanan:',
    options: [],
    matchingPairs: [
      { id: 'P1', left: 'Luas persegi dengan keliling 36 cm', right: '81 cm²' },
      { id: 'P2', left: 'Volume kubus dengan rusuk 5 cm', right: '125 cm³' },
      { id: 'P3', left: 'Konversi 2,5 kilometer ke meter', right: '2.500 m' },
    ],
    correctAnswer: 'P1->81 cm²,P2->125 cm³,P3->2.500 m',
    weight: 20,
  },
  {
    id: 'Q-AKM-05',
    subjectId: 'SUBJ-AKM-01',
    number: 5,
    type: 'ISIAN',
    akmDomain: 'Literasi & Penalaran · Uraian Terbuka',
    stimulus:
      'Sekolah di daerah kepulauan sering mengalami ketidakstabilan jaringan internet saat jam sibuk ujian berlangsung.',
    prompt:
      'Jelaskan dua langkah teknis utama agar pelaksanaan ujian digital di daerah dengan koneksi terbatas tetap berjalan lancar dan aman dari kecurangan!',
    options: [],
    correctAnswer:
      'Menggunakan mode offline atau caching lokal terenkripsi (PWA/IndexedDB) agar soal tetap dapat dikerjakan saat sinyal terputus, serta menerapkan sistem anti-tab/fullscreen untuk mencegah kecurangan.',
    aiKeywords:
      'mode offline, cache lokal, sinkronisasi otomatis, enkripsi soal, anti-tab, fullscreen, koneksi tidak stabil',
    weight: 25,
  },
  {
    id: 'Q-AKM-06',
    subjectId: 'SUBJ-AKM-01',
    number: 6,
    type: 'PG',
    akmDomain: 'Numerasi · Representasi Grafik Data (Soal Bergambar)',
    stimulus:
      'Perhatikan grafik batang hasil pemantauan produksi energi listrik bersih PLTS Atap sekolah selama lima tahun berturut-turut di bawah ini.',
    imageUrl: SAMPLE_SOLAR_CHART_SVG,
    imageCaption:
      'Gambar 1. Grafik Produksi Energi Listrik PLTS Atap Sekolah Tahun 2022–2026 (dalam kWh)',
    prompt:
      'Berdasarkan grafik di atas, berapakah persentase kenaikan produksi energi listrik dari tahun 2022 ke tahun 2026?',
    options: [
      'A. 150%',
      'B. 212%',
      'C. 250%',
      'D. 312%',
    ],
    correctAnswer: 'B',
    weight: 20,
  },
  {
    id: 'Q-TKA-01',
    subjectId: 'SUBJ-TKA-02',
    number: 1,
    type: 'PG',
    akmDomain: 'TKA · Penalaran Kuantitatif',
    prompt:
      'Jika x + y = 14 dan x² - y² = 56, maka nilai dari 2x - y adalah...',
    options: ['A. 11', 'B. 13', 'C. 15', 'D. 17'],
    correctAnswer: 'B',
    weight: 30,
  },
  {
    id: 'Q-TKA-02',
    subjectId: 'SUBJ-TKA-02',
    number: 2,
    type: 'ISIAN',
    akmDomain: 'TKA · Analisis Konsep Fisika',
    prompt:
      'Jelaskan mengapa efisiensi transmisi energi listrik jarak jauh ditingkatkan dengan menaikkan tegangan menggunakan transformator step-up!',
    options: [],
    correctAnswer:
      'Dengan menaikkan tegangan pada daya tetap (P = V·I), kuat arus listrik I menjadi kecil sehingga rugi-rugi panas pada kawat penghantar (P_rugi = I²·R) berkurang drastis.',
    aiKeywords:
      'menaikkan tegangan, memperkecil arus, rugi-rugi daya, I kuadrat R, disipasi panas, daya tetap',
    weight: 40,
  },
  {
    id: 'Q-TKA-03',
    subjectId: 'SUBJ-TKA-02',
    number: 3,
    type: 'PG',
    akmDomain: 'TKA · Geometri & Pengukuran (Soal Bergambar)',
    stimulus:
      'Diketahui segitiga siku-siku ABC siku-siku di titik A seperti terlihat pada gambar diagram berikut.',
    imageUrl: SAMPLE_TRIANGLE_SVG,
    imageCaption: 'Gambar 2. Segitiga siku-siku ABC dengan AB = 12 cm dan AC = 9 cm',
    prompt:
      'Berdasarkan gambar diagram segitiga ABC di atas, panjang sisi miring BC adalah...',
    options: ['A. 13 cm', 'B. 14 cm', 'C. 15 cm', 'D. 18 cm'],
    correctAnswer: 'C',
    weight: 30,
  },
];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_SUBMISSIONS: ExamSubmission[] = [];

export function createInitialPackage(): ExamPackageData {
  return {
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
    appTitle: 'DutawangiCBT',
    schoolName: 'SD Negeri 2 Tukangkayu',
    schoolLogoUrl: '',
    homeThumbnailUrl: '',
    adminCredentials: { ...DEFAULT_ADMIN_CREDENTIALS },
    proctorCredentials: { ...DEFAULT_PROCTOR_CREDENTIALS },
    teachers: INITIAL_TEACHERS,
    examTimeSettings: { ...DEFAULT_EXAM_TIME_SETTINGS },
    subjects: INITIAL_SUBJECTS,
    questions: INITIAL_QUESTIONS,
    students: INITIAL_STUDENTS,
    examSessions: INITIAL_EXAM_SESSIONS,
    examRooms: INITIAL_EXAM_ROOMS,
    proctorMappings: INITIAL_PROCTOR_MAPPINGS,
    examSchedules: INITIAL_EXAM_SCHEDULES,
    beritaAcaraList: INITIAL_BERITA_ACARA,
    updatedAt: new Date().toISOString(),
  };
}
