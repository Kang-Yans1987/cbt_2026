import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini client strictly on server side
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

interface GradeItemRequest {
  questionId: string;
  questionPrompt: string;
  referenceAnswer: string;
  keywords: string;
  maxScore: number;
  studentAnswer: string;
}

interface AiEvaluationOutput {
  questionId: string;
  studentAnswer: string;
  score: number;
  maxScore: number;
  matchedKeywords: string[];
  feedback: string;
  gradedBy: 'AI' | 'LOCAL_OFFLINE';
}

interface ProctorSessionEntry {
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
  cameraStatus?: string;
  lastHeartbeat: string;
  isOffline: boolean;
  startedAt: string;
  score?: number;
}

interface CachedPdfRecord {
  fileId: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
  cachedAt: string;
}

// Runtime in-memory stores for school-network exam coordination & real-time SSE
let publishedPackage: Record<string, unknown> | null = null;
const proctorSessions = new Map<string, ProctorSessionEntry>();
const runtimeSubmissions: Record<string, unknown>[] = [];
const cachedPdfs = new Map<string, CachedPdfRecord>();

interface SseClient {
  id: string;
  role: string;
  participantNumber?: string;
  res: Response;
}

const sseClients = new Set<SseClient>();

function broadcastSse(event: string, data: unknown, targetRole?: string) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (!targetRole || client.role === targetRole) {
      try {
        client.res.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }
}

function localKeywordFallback(item: GradeItemRequest): AiEvaluationOutput {
  const cleaned = (item.studentAnswer || '').trim().toLowerCase();
  const keywords = (item.keywords || item.referenceAnswer || '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 2);

  if (!cleaned) {
    return {
      questionId: item.questionId,
      studentAnswer: item.studentAnswer || '',
      score: 0,
      maxScore: item.maxScore,
      matchedKeywords: [],
      feedback: 'Jawaban kosong.',
      gradedBy: 'LOCAL_OFFLINE',
    };
  }

  const matched = keywords.filter((kw) => {
    if (cleaned.includes(kw)) return true;
    const words = kw.split(/\s+/).filter((w) => w.length > 3);
    return words.length > 0 && words.every((w) => cleaned.includes(w));
  });

  const denom = Math.max(1, Math.min(keywords.length, 4));
  const ratio = Math.min(1, matched.length / denom);
  const score = Math.round(ratio * item.maxScore);

  return {
    questionId: item.questionId,
    studentAnswer: item.studentAnswer || '',
    score,
    maxScore: item.maxScore,
    matchedKeywords: matched,
    feedback:
      matched.length > 0
        ? `Pencocokan kata kunci: ditemukan ${matched.length} konsep (${matched.join(', ')}).`
        : 'Belum ditemukan kata kunci utama yang ditetapkan guru.',
    gradedBy: 'LOCAL_OFFLINE',
  };
}

async function gradeSingleEssayWithAi(
  item: GradeItemRequest
): Promise<AiEvaluationOutput> {
  if (!(item.studentAnswer || '').trim()) {
    return {
      questionId: item.questionId,
      studentAnswer: '',
      score: 0,
      maxScore: item.maxScore,
      matchedKeywords: [],
      feedback: 'Peserta tidak mengisi jawaban pada soal ini.',
      gradedBy: 'AI',
    };
  }

  if (!ai) {
    return localKeywordFallback(item);
  }

  try {
    const prompt = [
      `Pertanyaan Ujian: ${item.questionPrompt}`,
      `Jawaban Referensi Guru: ${item.referenceAnswer}`,
      `Kata Kunci Wajib/Utama dari Guru: ${item.keywords}`,
      `Skor Maksimal: ${item.maxScore}`,
      `Jawaban Siswa: ${item.studentAnswer}`,
      '',
      'Tugas Anda: Nilai jawaban siswa secara objektif dan adil dalam skala 0 hingga Skor Maksimal berdasarkan kecocokan makna dan kata kunci yang diinput guru. Berikan umpan balik singkat 1-2 kalimat dalam bahasa Indonesia.',
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'Anda adalah korektor ujian sekolah yang objektif dan presisi. Nilai jawaban isian siswa berdasarkan kata kunci guru dan substansi makna, meskipun siswa menggunakan sinonim yang tepat. Jangan menyebut diri sebagai AI atau asisten AI dalam teks umpan balik.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER,
              description: `Skor numerik antara 0 dan ${item.maxScore}`,
            },
            matchedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Daftar kata kunci guru yang terpenuhi dalam jawaban siswa',
            },
            feedback: {
              type: Type.STRING,
              description: 'Alasan penilaian singkat dalam bahasa Indonesia (1-2 kalimat)',
            },
          },
          required: ['score', 'matchedKeywords', 'feedback'],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim()) as {
      score?: number;
      matchedKeywords?: string[];
      feedback?: string;
    };

    const clampedScore = Math.max(
      0,
      Math.min(item.maxScore, Number(parsed.score ?? 0))
    );

    return {
      questionId: item.questionId,
      studentAnswer: item.studentAnswer,
      score: Number(clampedScore.toFixed(2)),
      maxScore: item.maxScore,
      matchedKeywords: Array.isArray(parsed.matchedKeywords)
        ? parsed.matchedKeywords
        : [],
      feedback:
        parsed.feedback || 'Dinilai otomatis berdasarkan kesesuaian kata kunci guru.',
      gradedBy: 'AI',
    };
  } catch (err) {
    console.error('Gemini essay grading error, using keyword fallback:', err);
    return localKeywordFallback(item);
  }
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiConfigured: Boolean(ai),
    timestamp: new Date().toISOString(),
  });
});

// Single essay grading endpoint (also used for Admin test-grading in Question Editor)
app.post('/api/ai/grade-essay', async (req: Request, res: Response) => {
  try {
    const body = req.body as GradeItemRequest;
    if (!body || !body.questionPrompt) {
      res.status(400).json({ error: 'Data soal dan jawaban tidak lengkap.' });
      return;
    }
    const result = await gradeSingleEssayWithAi(body);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Gagal memproses koreksi AI.',
    });
  }
});

// Batch essay grading endpoint on exam submission
app.post('/api/ai/grade-batch', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: GradeItemRequest[] };
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Format items harus berupa array.' });
      return;
    }
    const results = await Promise.all(items.map((item) => gradeSingleEssayWithAi(item)));
    res.json({ results });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Gagal memproses batch koreksi AI.',
    });
  }
});

interface GenerateQuestionsRequest {
  subjectId: string;
  subjectName: string;
  topic: string;
  questionType: 'PG' | 'PG_KOMPLEKS' | 'BENAR_SALAH' | 'MENJODOHKAN' | 'ISIAN' | 'CAMPURAN';
  difficulty?: string;
  gradeLevel?: string;
  count?: number;
  weight?: number;
  startingNumber?: number;
}

// AI Assistant question generator endpoint
app.post('/api/ai/generate-questions', async (req: Request, res: Response) => {
  try {
    const body = req.body as GenerateQuestionsRequest;
    const topic = (body?.topic || '').trim();
    if (!topic) {
      res.status(400).json({ error: 'Materi atau topik soal wajib diisi.' });
      return;
    }

    if (!ai) {
      res.status(503).json({
        error:
          'Asisten AI belum aktif karena GEMINI_API_KEY belum terkonfigurasi di server.',
      });
      return;
    }

    const count = Math.max(1, Math.min(10, Number(body.count) || 3));
    const weight = Math.max(1, Number(body.weight) || 20);
    const startingNumber = Math.max(1, Number(body.startingNumber) || 1);
    const qType = body.questionType || 'PG';
    const difficulty = body.difficulty || 'Sedang';
    const gradeLevel = body.gradeLevel || 'SMP / SMA';
    const subjectName = body.subjectName || 'Umum';

    const typeInstruction =
      qType === 'CAMPURAN'
        ? 'Variasikan jenis soal menggunakan tipe: PG, PG_KOMPLEKS, BENAR_SALAH, MENJODOHKAN, dan ISIAN.'
        : `Seluruh soal WAJIB bertipe "${qType}".`;

    const promptText = [
      `Buatkan tepat ${count} butir soal asesmen berkualitas tinggi berbahasa Indonesia.`,
      `Mata Pelajaran: ${subjectName}`,
      `Jenjang/Kelas: ${gradeLevel}`,
      `Materi / Topik / KD: ${topic}`,
      `Tingkat Kesulitan: ${difficulty}`,
      typeInstruction,
      '',
      'Aturan format ketat tiap jenis soal:',
      '- PG: isi `options` dengan 4 pilihan diawali "A. ", "B. ", "C. ", "D. ", dan `correctAnswer` berisi 1 huruf kapital (contoh: "B").',
      '- PG_KOMPLEKS: isi `options` dengan 4 pilihan diawali "A. " s.d. "D. ", dan `correctAnswer` berisi minimal 2 huruf jawaban benar dipisah koma (contoh: "A,C").',
      '- BENAR_SALAH: isi `statements` (2-3 item dengan `id`: "S1","S2",..., `text`, `isTrue`: boolean) dan `correctAnswer` format "S1:true,S2:false".',
      '- MENJODOHKAN: isi `matchingPairs` (3 item dengan `id`: "P1","P2","P3", `left`, `right`) dan `correctAnswer` format "P1->kanan1,P2->kanan2".',
      '- ISIAN: kosongkan `options`, isi `correctAnswer` dengan jawaban referensi guru yang jelas, dan isi `aiKeywords` dengan 4-6 kata kunci dipisah koma.',
      '- Setiap soal sebaiknya memiliki `stimulus` (konteks singkat AKM/literasi/numerasi) jika relevan dan `akmDomain` yang spesifik.',
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'Anda adalah guru profesional dan penulis soal standar AKM/TKA Indonesia. Buat soal yang akurat, logis, bebas bias, dan lengkap dengan kunci jawabannya dalam JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description:
                  'Salah satu dari: PG, PG_KOMPLEKS, BENAR_SALAH, MENJODOHKAN, ISIAN',
              },
              akmDomain: {
                type: Type.STRING,
                description: 'Domain atau kompetensi soal',
              },
              stimulus: {
                type: Type.STRING,
                description: 'Wacana atau konteks stimulus singkat sebelum pertanyaan',
              },
              prompt: {
                type: Type.STRING,
                description: 'Pertanyaan utama soal',
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 opsi jawaban untuk PG atau PG_KOMPLEKS',
              },
              statements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    isTrue: { type: Type.BOOLEAN },
                  },
                  required: ['id', 'text', 'isTrue'],
                },
              },
              matchingPairs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    left: { type: Type.STRING },
                    right: { type: Type.STRING },
                  },
                  required: ['id', 'left', 'right'],
                },
              },
              correctAnswer: {
                type: Type.STRING,
                description: 'Kunci jawaban sesuai format tipe soal',
              },
              aiKeywords: {
                type: Type.STRING,
                description: 'Kata kunci penilaian AI untuk tipe ISIAN',
              },
            },
            required: ['type', 'akmDomain', 'prompt', 'correctAnswer'],
          },
        },
      },
    });

    const rawList = JSON.parse((response.text || '[]').trim()) as Array<{
      type?: string;
      akmDomain?: string;
      stimulus?: string;
      prompt?: string;
      options?: string[];
      statements?: Array<{ id?: string; text?: string; isTrue?: boolean }>;
      matchingPairs?: Array<{ id?: string; left?: string; right?: string }>;
      correctAnswer?: string;
      aiKeywords?: string;
    }>;

    const validTypes = new Set([
      'PG',
      'PG_KOMPLEKS',
      'BENAR_SALAH',
      'MENJODOHKAN',
      'ISIAN',
    ]);

    const normalized = rawList.map((item, idx) => {
      const normalizedType = validTypes.has((item.type || '').toUpperCase())
        ? (item.type || 'PG').toUpperCase()
        : qType === 'CAMPURAN'
        ? 'PG'
        : qType;

      const statements =
        normalizedType === 'BENAR_SALAH'
          ? (item.statements && item.statements.length > 0
              ? item.statements
              : [
                  { id: 'S1', text: 'Pernyataan 1', isTrue: true },
                  { id: 'S2', text: 'Pernyataan 2', isTrue: false },
                ]
            ).map((s, si) => ({
              id: s.id || `S${si + 1}`,
              text: s.text || `Pernyataan ${si + 1}`,
              isTrue: Boolean(s.isTrue),
            }))
          : undefined;

      const matchingPairs =
        normalizedType === 'MENJODOHKAN'
          ? (item.matchingPairs && item.matchingPairs.length > 0
              ? item.matchingPairs
              : [
                  { id: 'P1', left: 'Premis 1', right: 'Pasangan 1' },
                  { id: 'P2', left: 'Premis 2', right: 'Pasangan 2' },
                ]
            ).map((p, pi) => ({
              id: p.id || `P${pi + 1}`,
              left: p.left || `Item ${pi + 1}`,
              right: p.right || `Pasangan ${pi + 1}`,
            }))
          : undefined;

      let correctAnswer = (item.correctAnswer || '').trim();
      if (normalizedType === 'BENAR_SALAH' && statements) {
        correctAnswer = statements
          .map((s) => `${s.id}:${s.isTrue ? 'true' : 'false'}`)
          .join(',');
      } else if (normalizedType === 'MENJODOHKAN' && matchingPairs) {
        correctAnswer = matchingPairs.map((p) => `${p.id}->${p.right}`).join(',');
      } else if (normalizedType === 'PG' && !correctAnswer) {
        correctAnswer = 'A';
      } else if (normalizedType === 'PG_KOMPLEKS' && !correctAnswer) {
        correctAnswer = 'A,B';
      }

      const options =
        normalizedType === 'PG' || normalizedType === 'PG_KOMPLEKS'
          ? (item.options && item.options.length > 0
              ? item.options
              : ['A. Pilihan A', 'B. Pilihan B', 'C. Pilihan C', 'D. Pilihan D']
            ).map((opt, oi) => {
              const letter = String.fromCharCode(65 + oi);
              const trimmed = opt.trim();
              return /^[A-E]\.\s*/.test(trimmed) ? trimmed : `${letter}. ${trimmed}`;
            })
          : [];

      return {
        id: `Q-AI-${Date.now()}-${idx}`,
        subjectId: body.subjectId,
        number: startingNumber + idx,
        type: normalizedType,
        akmDomain: item.akmDomain || `${subjectName} · AI Asisten`,
        stimulus: item.stimulus || undefined,
        prompt: item.prompt || `Soal ${startingNumber + idx} (${topic})`,
        options,
        statements,
        matchingPairs,
        correctAnswer,
        aiKeywords:
          normalizedType === 'ISIAN'
            ? item.aiKeywords || correctAnswer
            : undefined,
        weight,
      };
    });

    res.json({ questions: normalized });
  } catch (err) {
    console.error('Gemini question generation error:', err);
    res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : 'Gagal membuat soal menggunakan Asisten AI.',
    });
  }
});

// Exam package sharing for students connecting across devices
app.get('/api/exam/package', (_req: Request, res: Response) => {
  if (!publishedPackage) {
    res.status(404).json({ error: 'Belum ada paket ujian dipublikasikan di server.' });
    return;
  }
  res.json(publishedPackage);
});

app.post('/api/exam/package', (req: Request, res: Response) => {
  publishedPackage = req.body as Record<string, unknown>;
  res.json({ ok: true, updatedAt: new Date().toISOString() });
});

// Drive PDF cache endpoints
app.post('/api/drive/cache-pdf', (req: Request, res: Response) => {
  const { fileId, name, mimeType, base64 } = req.body as {
    fileId: string;
    name: string;
    mimeType?: string;
    base64: string;
  };
  if (!fileId || !base64) {
    res.status(400).json({ error: 'fileId dan base64 wajib diisi.' });
    return;
  }
  const buffer = Buffer.from(base64, 'base64');
  cachedPdfs.set(fileId, {
    fileId,
    name: name || `${fileId}.pdf`,
    mimeType: mimeType || 'application/pdf',
    buffer,
    cachedAt: new Date().toISOString(),
  });
  res.json({ ok: true, fileId, size: buffer.length });
});

app.get('/api/drive/pdfs', (_req: Request, res: Response) => {
  const files = Array.from(cachedPdfs.values()).map((f) => ({
    id: f.fileId,
    name: f.name,
    mimeType: f.mimeType,
    size: String(f.buffer.length),
    cachedOnServer: true,
    modifiedTime: f.cachedAt,
  }));
  res.json({ files });
});

app.get('/api/drive/pdf/:fileId', (req: Request, res: Response) => {
  const fileId = String(req.params.fileId || '');
  const entry = cachedPdfs.get(fileId);
  if (!entry) {
    res.status(404).json({ error: 'PDF belum di-cache di server.' });
    return;
  }
  res.setHeader('Content-Type', entry.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${entry.name}"`);
  res.send(entry.buffer);
});

// Real-time proctoring & exam-end notifications via SSE
app.get('/api/proctor/stream', (req: Request, res: Response) => {
  const role = String(req.query.role || 'student');
  const participantNumber = req.query.participantNumber
    ? String(req.query.participantNumber)
    : undefined;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client: SseClient = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    participantNumber,
    res,
  };
  sseClients.add(client);

  // Send immediate snapshot to admin
  if (role === 'admin') {
    res.write(
      `event: PROCTOR_SNAPSHOT\ndata: ${JSON.stringify(
        Array.from(proctorSessions.values())
      )}\n\n`
    );
  } else {
    res.write(
      `event: CONNECTED\ndata: ${JSON.stringify({ ok: true, time: new Date().toISOString() })}\n\n`
    );
  }

  const keepAlive = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(client);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(client);
  });
});

app.post('/api/proctor/heartbeat', (req: Request, res: Response) => {
  const session = req.body as ProctorSessionEntry;
  if (!session || !session.participantNumber) {
    res.status(400).json({ error: 'participantNumber wajib diisi.' });
    return;
  }
  const key = `${session.participantNumber}::${session.subjectId}`;
  proctorSessions.set(key, {
    ...session,
    lastHeartbeat: new Date().toISOString(),
  });
  broadcastSse('PROCTOR_UPDATE', Array.from(proctorSessions.values()), 'admin');
  res.json({ ok: true });
});

app.post('/api/proctor/broadcast', (req: Request, res: Response) => {
  const { type, subjectId, message } = req.body as {
    type: 'EXAM_ENDED_BY_ADMIN' | 'ANNOUNCEMENT';
    subjectId?: string;
    message?: string;
  };
  if (type !== 'EXAM_ENDED_BY_ADMIN' && type !== 'ANNOUNCEMENT') {
    res.status(400).json({ error: 'Jenis siaran tidak dikenali.' });
    return;
  }
  broadcastSse(type, {
    subjectId,
    message:
      message ||
      (type === 'EXAM_ENDED_BY_ADMIN'
        ? 'Waktu ujian telah diakhiri oleh Pengawas/Admin. Jawaban Anda sedang dikirim otomatis.'
        : ''),
    timestamp: new Date().toISOString(),
  });
  res.json({ ok: true, recipients: sseClients.size });
});

app.post('/api/proctor/action', (req: Request, res: Response) => {
  const { action, participantNumber, subjectId, extraMinutes, message } =
    req.body as {
      action:
        | 'UNLOCK_STUDENT'
        | 'EXTEND_TIME'
        | 'WARN_STUDENT'
        | 'FORCE_FINISH_STUDENT';
      participantNumber: string;
      subjectId?: string;
      extraMinutes?: number;
      message?: string;
    };

  if (!action || !participantNumber) {
    res
      .status(400)
      .json({ error: 'action dan participantNumber wajib diisi.' });
    return;
  }

  for (const [key, entry] of proctorSessions.entries()) {
    if (
      entry.participantNumber === participantNumber &&
      (!subjectId || entry.subjectId === subjectId)
    ) {
      if (action === 'UNLOCK_STUDENT') {
        proctorSessions.set(key, {
          ...entry,
          status: 'Mengerjakan',
          violationCount: 0,
          lastViolation: undefined,
          lastHeartbeat: new Date().toISOString(),
        });
      } else if (action === 'FORCE_FINISH_STUDENT') {
        proctorSessions.set(key, {
          ...entry,
          status: 'Selesai',
          lastHeartbeat: new Date().toISOString(),
        });
      }
    }
  }

  broadcastSse(
    'PROCTOR_ACTION',
    {
      action,
      participantNumber,
      subjectId,
      extraMinutes: Number(extraMinutes) || 0,
      message,
      timestamp: new Date().toISOString(),
    },
    'student'
  );
  broadcastSse(
    'PROCTOR_UPDATE',
    Array.from(proctorSessions.values()),
    'admin'
  );

  res.json({ ok: true });
});

// Submissions runtime sync
app.get('/api/exam/submissions', (_req: Request, res: Response) => {
  res.json({ submissions: runtimeSubmissions });
});

app.post('/api/exam/submit', (req: Request, res: Response) => {
  const sub = req.body as Record<string, unknown>;
  if (!sub || !sub.id) {
    res.status(400).json({ error: 'Data submisi tidak valid.' });
    return;
  }
  const existingIdx = runtimeSubmissions.findIndex((s) => s.id === sub.id);
  if (existingIdx >= 0) {
    runtimeSubmissions[existingIdx] = sub;
  } else {
    runtimeSubmissions.unshift(sub);
  }
  const key = `${String(sub.participantNumber)}::${String(sub.subjectId)}`;
  const existingProctor = proctorSessions.get(key);
  if (existingProctor) {
    proctorSessions.set(key, {
      ...existingProctor,
      status: 'Selesai',
      score: Number(sub.percentage ?? 0),
      lastHeartbeat: new Date().toISOString(),
    });
    broadcastSse('PROCTOR_UPDATE', Array.from(proctorSessions.values()), 'admin');
  }
  broadcastSse('SUBMISSION_NEW', sub, 'admin');
  res.json({ ok: true, id: sub.id });
});

app.post('/api/exam/reset', (req: Request, res: Response) => {
  const { scope } = req.body as {
    scope?: 'submissions' | 'proctor' | 'all';
  };
  const target = scope || 'all';

  if (target === 'submissions' || target === 'all') {
    runtimeSubmissions.length = 0;
  }
  if (target === 'proctor' || target === 'submissions' || target === 'all') {
    proctorSessions.clear();
    broadcastSse('PROCTOR_UPDATE', [], 'admin');
  }
  if (target === 'all') {
    publishedPackage = null;
    cachedPdfs.clear();
  }

  res.json({ ok: true, scope: target, timestamp: new Date().toISOString() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DutawangiCBT Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
