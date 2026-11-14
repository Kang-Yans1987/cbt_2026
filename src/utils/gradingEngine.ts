import type {
  AiEvaluationResult,
  ExamSubmission,
  Question,
  QuestionType,
  SubjectConfig,
} from '../types/exam';

export function gradeObjectiveQuestion(
  question: Question,
  rawAnswer: string | undefined
): number {
  const answer = (rawAnswer || '').trim();
  if (!answer) return 0;

  switch (question.type) {
    case 'PG': {
      const expected = question.correctAnswer.trim().toUpperCase();
      const got = answer.charAt(0).toUpperCase();
      return got === expected ? question.weight : 0;
    }

    case 'PG_KOMPLEKS': {
      const expectedSet = new Set(
        question.correctAnswer
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      );
      const gotSet = new Set(
        answer
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      );
      if (expectedSet.size === 0) return 0;
      let correctCount = 0;
      let wrongCount = 0;
      gotSet.forEach((item) => {
        if (expectedSet.has(item)) correctCount += 1;
        else wrongCount += 1;
      });
      const net = Math.max(0, correctCount - wrongCount * 0.5);
      return Number(
        Math.min(question.weight, (net / expectedSet.size) * question.weight).toFixed(2)
      );
    }

    case 'BENAR_SALAH': {
      const statements = question.statements || [];
      if (statements.length === 0) return 0;
      const gotMap = new Map<string, string>();
      answer.split(',').forEach((pair) => {
        const [k, v] = pair.split(':');
        if (k && v) gotMap.set(k.trim(), v.trim().toLowerCase());
      });
      let matches = 0;
      statements.forEach((st) => {
        const expected = st.isTrue ? 'true' : 'false';
        if (gotMap.get(st.id) === expected) matches += 1;
      });
      return Number(((matches / statements.length) * question.weight).toFixed(2));
    }

    case 'MENJODOHKAN': {
      const pairs = question.matchingPairs || [];
      if (pairs.length === 0) return 0;
      const gotMap = new Map<string, string>();
      answer.split('||').forEach((entry) => {
        const idx = entry.indexOf('->');
        if (idx > -1) {
          gotMap.set(entry.slice(0, idx).trim(), entry.slice(idx + 2).trim());
        }
      });
      let matches = 0;
      pairs.forEach((p) => {
        if (gotMap.get(p.id) === p.right.trim()) matches += 1;
      });
      return Number(((matches / pairs.length) * question.weight).toFixed(2));
    }

    default:
      return 0;
  }
}

export function gradeEssayLocally(
  question: Question,
  studentAnswer: string
): AiEvaluationResult {
  const cleaned = studentAnswer.trim().toLowerCase();
  const keywords = (question.aiKeywords || question.correctAnswer || '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 2);

  if (!cleaned) {
    return {
      questionId: question.id,
      studentAnswer,
      score: 0,
      maxScore: question.weight,
      matchedKeywords: [],
      feedback: 'Tidak ada jawaban yang diisi oleh peserta.',
      gradedBy: 'LOCAL_OFFLINE',
    };
  }

  if (keywords.length === 0) {
    const partial = cleaned.length >= 12 ? Math.round(question.weight * 0.5) : 0;
    return {
      questionId: question.id,
      studentAnswer,
      score: partial,
      maxScore: question.weight,
      matchedKeywords: [],
      feedback: 'Dinilai lokal saat offline (kata kunci belum disetel guru).',
      gradedBy: 'LOCAL_OFFLINE',
    };
  }

  const matched = keywords.filter((kw) => {
    if (cleaned.includes(kw)) return true;
    const words = kw.split(/\s+/).filter((w) => w.length > 3);
    return words.length > 0 && words.every((w) => cleaned.includes(w));
  });

  const ratio = Math.min(1, matched.length / Math.max(1, Math.min(keywords.length, 4)));
  const score = Math.round(ratio * question.weight);

  return {
    questionId: question.id,
    studentAnswer,
    score,
    maxScore: question.weight,
    matchedKeywords: matched,
    feedback:
      matched.length > 0
        ? `Koreksi lokal (offline): Mencocokkan ${matched.length} kata kunci (${matched.join(', ')}).`
        : 'Koreksi lokal (offline): Belum menemukan kata kunci utama yang ditetapkan guru.',
    gradedBy: 'LOCAL_OFFLINE',
  };
}

export async function evaluateSubmission(params: {
  participantNumber: string;
  studentName: string;
  className: string;
  subject: SubjectConfig;
  questions: Question[];
  answers: Record<string, string>;
  violationCount: number;
  violationLogs: { timestamp: string; reason: string }[];
  durationSeconds: number;
  endReason: ExamSubmission['endReason'];
  isOnline: boolean;
}): Promise<ExamSubmission> {
  const {
    participantNumber,
    studentName,
    className,
    subject,
    questions,
    answers,
    violationCount,
    violationLogs,
    durationSeconds,
    endReason,
    isOnline,
  } = params;

  let objectiveScore = 0;
  let maxPossibleScore = 0;
  const essayQuestions: Question[] = [];

  for (const q of questions) {
    maxPossibleScore += q.weight;
    if (q.type === 'ISIAN') {
      essayQuestions.push(q);
    } else {
      objectiveScore += gradeObjectiveQuestion(q, answers[q.id]);
    }
  }

  let aiEvaluations: AiEvaluationResult[] = [];
  if (essayQuestions.length > 0) {
    if (isOnline) {
      try {
        const res = await fetch('/api/ai/grade-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: essayQuestions.map((q) => ({
              questionId: q.id,
              questionPrompt: q.prompt,
              referenceAnswer: q.correctAnswer,
              keywords: q.aiKeywords || q.correctAnswer,
              maxScore: q.weight,
              studentAnswer: answers[q.id] || '',
            })),
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { results: AiEvaluationResult[] };
          aiEvaluations = data.results;
        } else {
          aiEvaluations = essayQuestions.map((q) =>
            gradeEssayLocally(q, answers[q.id] || '')
          );
        }
      } catch {
        aiEvaluations = essayQuestions.map((q) =>
          gradeEssayLocally(q, answers[q.id] || '')
        );
      }
    } else {
      aiEvaluations = essayQuestions.map((q) =>
        gradeEssayLocally(q, answers[q.id] || '')
      );
    }
  }

  const aiEssayScore = Number(
    aiEvaluations.reduce((sum, ev) => sum + ev.score, 0).toFixed(2)
  );
  const totalScore = Number((objectiveScore + aiEssayScore).toFixed(2));
  const percentage =
    maxPossibleScore > 0
      ? Math.round((totalScore / maxPossibleScore) * 100)
      : 0;

  return {
    id: `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    participantNumber,
    studentName,
    className,
    subjectId: subject.id,
    subjectName: subject.name,
    answers,
    objectiveScore: Number(objectiveScore.toFixed(2)),
    aiEssayScore,
    totalScore,
    maxPossibleScore,
    percentage,
    passedKkm: percentage >= subject.passingGradeKkm,
    violationCount,
    violationLogs,
    aiEvaluations,
    submittedAt: new Date().toISOString(),
    durationSeconds,
    syncStatus: isOnline ? 'synced_server' : 'pending_offline',
    endReason,
  };
}

export function generateQuestionCsvTemplate(): string {
  const header = [
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
  ].join(',');

  const rows = [
    [
      '1',
      'PG',
      'Literasi · Teks Informasi',
      'Teks bacaan singkat tentang energi terbarukan.',
      'Apa manfaat utama panel surya bagi sekolah di daerah terpencil?',
      'A. Menambah polusi suara',
      'B. Menyediakan listrik mandiri yang bersih dan stabil',
      'C. Menggantikan komputer dengan buku cetak',
      'D. Menghabiskan cadangan batu bara',
      'B',
      '',
      '20',
      '',
    ],
    [
      '2',
      'PG_KOMPLEKS',
      'Numerasi · Aljabar',
      'Diketahui persamaan 2x + 4 = 12.',
      'Pilih semua pernyataan yang benar:',
      'A. Nilai x adalah 4',
      'B. Nilai 3x adalah 12',
      'C. Nilai x + 5 adalah 10',
      'D. x merupakan bilangan genap',
      'A,B,D',
      '',
      '25',
      '',
    ],
    [
      '3',
      'BENAR_SALAH',
      'Literasi Sains',
      'Air mendidih pada suhu 100°C di tekanan 1 atm.',
      'Tentukan Benar/Salah pernyataan berikut (pisah opsi dengan |):',
      'Titik didih air menurun di dataran tinggi|true',
      'Es mencair pada 50°C di tekanan normal|false',
      '',
      '',
      'S1:true,S2:false',
      '',
      '20',
      '',
    ],
    [
      '4',
      'MENJODOHKAN',
      'Numerasi · Geometri',
      'Cocokkan bangun ruang dengan rumusnya.',
      'Pasangkan bangun dan volume (format kiri->kanan):',
      'Kubus sisi s->s³',
      'Balok p x l x t->p·l·t',
      'Tabung->π·r²·t',
      '',
      'P1->s³,P2->p·l·t,P3->π·r²·t',
      '',
      '15',
      '',
    ],
    [
      '5',
      'ISIAN',
      'Penalaran Terbuka (AI Grader)',
      'Jaringan internet sekolah sering putus saat ujian.',
      'Jelaskan cara kerja sinkronisasi offline pada aplikasi ujian.',
      '',
      '',
      '',
      '',
      'Menyimpan jawaban di perangkat secara lokal lalu mengirim ke server saat koneksi kembali aktif.',
      'simpan lokal, cache, offline, kirim otomatis, koneksi aktif',
      '20',
      '',
    ],
  ];

  const escapeCsv = (val: string) =>
    `"${val.replaceAll('"', '""')}"`;

  return (
    '\uFEFF' +
    header +
    '\n' +
    rows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  );
}

export function parseCsvLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseQuestionsFromCsv(
  csvText: string,
  subjectId: string,
  startingNumber = 1
): Question[] {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const imported: Question[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length < 5 || !cols[4]) continue;

    const rawType = (cols[1] || 'PG').toUpperCase().trim();
    const validTypes: QuestionType[] = [
      'PG',
      'PG_KOMPLEKS',
      'BENAR_SALAH',
      'MENJODOHKAN',
      'ISIAN',
    ];
    const type: QuestionType = validTypes.includes(rawType as QuestionType)
      ? (rawType as QuestionType)
      : 'PG';

    const optCols = [cols[5] || '', cols[6] || '', cols[7] || '', cols[8] || ''].filter(
      Boolean
    );

    const q: Question = {
      id: `Q-IMP-${Date.now()}-${i}`,
      subjectId,
      number: Number(cols[0]) || startingNumber + imported.length,
      type,
      akmDomain: cols[2] || 'Umum',
      stimulus: cols[3] || undefined,
      prompt: cols[4],
      options: type === 'PG' || type === 'PG_KOMPLEKS' ? optCols : [],
      correctAnswer: cols[9] || '',
      aiKeywords: cols[10] || undefined,
      weight: Number(cols[11]) || 10,
      imageUrl: cols[12] || undefined,
    };

    if (type === 'BENAR_SALAH') {
      q.statements = optCols.map((item, idx) => {
        const [txt, boolStr] = item.split('|');
        return {
          id: `S${idx + 1}`,
          text: (txt || item).trim(),
          isTrue: (boolStr || 'true').trim().toLowerCase() === 'true',
        };
      });
    }

    if (type === 'MENJODOHKAN') {
      q.matchingPairs = optCols.map((item, idx) => {
        const [left, right] = item.split('->');
        return {
          id: `P${idx + 1}`,
          left: (left || item).trim(),
          right: (right || `Pasangan ${idx + 1}`).trim(),
        };
      });
    }

    imported.push(q);
  }

  return imported;
}
