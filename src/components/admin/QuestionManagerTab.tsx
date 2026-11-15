import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  CheckSquare,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import type {
  AiEvaluationResult,
  DrivePdfFile,
  Question,
  QuestionType,
  SubjectConfig,
} from '../../types/exam';
import { TEMPLATE_GUIDE_MARKDOWN } from '../../utils/questionTemplateGuide';
import { compressImageFileToDataUrl } from '../../utils/imageHelper';
import { INITIAL_QUESTIONS } from '../../data/defaultExamData';

interface QuestionManagerTabProps {
  schoolName?: string;
  subjects: SubjectConfig[];
  questions: Question[];
  drivePdfs: DrivePdfFile[];
  onSaveQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onImportQuestions: (imported: Question[]) => void;
}

export const QuestionManagerTab: React.FC<QuestionManagerTabProps> = ({
  schoolName = 'SD Negeri 2 Tukangkayu',
  subjects,
  questions,
  drivePdfs,
  onSaveQuestion,
  onDeleteQuestion,
  onImportQuestions,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    subjects[0]?.id || ''
  );
  const [editing, setEditing] = useState<Question | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [mdGuideOpen, setMdGuideOpen] = useState(false);
  const [copiedMdGuide, setCopiedMdGuide] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [textPasteInput, setTextPasteInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importFileLabel, setImportFileLabel] = useState<string | null>(null);
  const [previewImport, setPreviewImport] = useState<Question[]>([]);
  const [aiTestSample, setAiTestSample] = useState('');
  const [aiTestResult, setAiTestResult] = useState<AiEvaluationResult | null>(
    null
  );
  const [aiTestError, setAiTestError] = useState<string | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // AI Question Generator state
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestionType, setAiQuestionType] = useState<
    QuestionType | 'CAMPURAN'
  >('PG');
  const [aiDifficulty, setAiDifficulty] = useState<
    'Mudah' | 'Sedang' | 'Sulit (HOTS)'
  >('Sedang');
  const [aiGradeLevel, setAiGradeLevel] = useState('SMA/SMK Kelas XII');
  const [aiCount, setAiCount] = useState(3);
  const [aiWeight, setAiWeight] = useState(20);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);
  const [aiGeneratedList, setAiGeneratedList] = useState<Question[]>([]);
  const [aiSelectedIds, setAiSelectedIds] = useState<string[]>([]);

  const effectiveSubjectId = subjects.some((s) => s.id === selectedSubjectId)
    ? selectedSubjectId
    : subjects[0]?.id || '';
  const activeSubject = subjects.find((s) => s.id === effectiveSubjectId);

  const filteredQuestions = questions
    .filter((q) => q.subjectId === effectiveSubjectId)
    .sort((a, b) => a.number - b.number);

  const createEmptyQuestion = (): Question => ({
    id: `Q-${Date.now()}`,
    subjectId: effectiveSubjectId || subjects[0]?.id || 'SUBJ-AKM-01',
    number: filteredQuestions.length + 1,
    type: 'PG',
    akmDomain: 'Literasi · Pemahaman Teks',
    stimulus: '',
    prompt: '',
    options: ['A. ', 'B. ', 'C. ', 'D. '],
    optionImages: ['', '', '', ''],
    correctAnswer: 'A',
    statements: [
      { id: 'S1', text: 'Pernyataan 1', isTrue: true },
      { id: 'S2', text: 'Pernyataan 2', isTrue: false },
    ],
    matchingPairs: [
      { id: 'P1', left: 'Premis 1', right: 'Pasangan 1' },
      { id: 'P2', left: 'Premis 2', right: 'Pasangan 2' },
    ],
    aiKeywords: '',
    weight: 20,
    imageUrl: '',
    imageCaption: '',
  });

  const createSampleIllustratedQuestion = (): Question => {
    const illustratedSamples = INITIAL_QUESTIONS.filter((q) =>
      Boolean(q.imageUrl)
    );
    const preferred =
      illustratedSamples.find((q) => q.subjectId === effectiveSubjectId) ||
      illustratedSamples[0];
    if (!preferred) return createEmptyQuestion();
    return {
      ...preferred,
      id: `Q-IMG-${Date.now()}`,
      subjectId: effectiveSubjectId || preferred.subjectId,
      number: filteredQuestions.length + 1,
      options: [...preferred.options],
    };
  };

  const handleDownloadExcelTemplate = async () => {
    setDownloadingExcel(true);
    try {
      const mod = await import('../../utils/questionTemplates');
      await mod.downloadExcelQuestionTemplate(
        activeSubject?.name || 'Mata Pelajaran',
        schoolName
      );
    } finally {
      setDownloadingExcel(false);
      setTemplateMenuOpen(false);
    }
  };

  const handleDownloadWordDocx = async () => {
    setDownloadingDocx(true);
    try {
      const mod = await import('../../utils/questionTemplates');
      await mod.downloadWordDocxTemplate(
        activeSubject?.name || 'Mata Pelajaran',
        schoolName
      );
    } finally {
      setDownloadingDocx(false);
      setTemplateMenuOpen(false);
    }
  };

  const handleDownloadWordDocLegacy = async () => {
    const mod = await import('../../utils/questionTemplates');
    mod.downloadWordDocLegacyTemplate(
      activeSubject?.name || 'Mata Pelajaran',
      schoolName
    );
    setTemplateMenuOpen(false);
  };

  const handleDownloadMarkdownTemplate = async () => {
    const mod = await import('../../utils/questionTemplates');
    mod.downloadMarkdownQuestionTemplate(
      activeSubject?.name || 'Mata Pelajaran',
      schoolName
    );
    setTemplateMenuOpen(false);
  };

  const handleDownloadGuideMd = () => {
    const blob = new Blob([TEMPLATE_GUIDE_MARKDOWN], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TEMPLATE_SOAL_PANDUAN.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyGuideMd = async () => {
    try {
      await navigator.clipboard.writeText(TEMPLATE_GUIDE_MARKDOWN);
      setCopiedMdGuide(true);
      setTimeout(() => setCopiedMdGuide(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportFileLabel(file.name);
    try {
      const mod = await import('../../utils/questionTemplates');
      const parsed = await mod.parseQuestionsFromFile(
        file,
        effectiveSubjectId,
        filteredQuestions.length + 1
      );
      setPreviewImport(parsed);
      if (
        file.name.toLowerCase().endsWith('.md') ||
        file.name.toLowerCase().endsWith('.markdown') ||
        file.name.toLowerCase().endsWith('.txt')
      ) {
        const text = await file.text();
        setTextPasteInput(text);
      } else {
        setTextPasteInput('');
      }
      if (parsed.length === 0) {
        setImportError(
          `Tidak ditemukan baris/blok soal valid pada "${file.name}". Pastikan susunan mengikuti Template Excel (.xlsx), Word (.docx/.doc), atau Markdown (.md).`
        );
      }
    } catch (err) {
      setPreviewImport([]);
      setImportError(
        err instanceof Error
          ? `Gagal membaca file "${file.name}": ${err.message}`
          : `Gagal memproses file "${file.name}".`
      );
    }
    e.target.value = '';
  };

  const handleQuestionImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingImg(true);
    setEditorError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxDimension: 840,
        quality: 0.82,
      });
      setEditing({ ...editing, imageUrl: dataUrl });
    } catch (err) {
      setEditorError(
        err instanceof Error ? err.message : 'Gagal memproses gambar soal.'
      );
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleOptionImageUpload = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setEditorError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxDimension: 420,
        quality: 0.78,
      });
      const nextImgs = [...(editing.optionImages || ['', '', '', ''])];
      nextImgs[idx] = dataUrl;
      setEditing({ ...editing, optionImages: nextImgs });
    } catch (err) {
      setEditorError(
        err instanceof Error ? err.message : 'Gagal memproses gambar opsi.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleRunAiSandbox = async () => {
    if (!editing) return;
    setTestingAi(true);
    setAiTestResult(null);
    setAiTestError(null);
    try {
      const res = await fetch('/api/ai/grade-essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: editing.id,
          questionPrompt: editing.prompt,
          referenceAnswer: editing.correctAnswer,
          keywords: editing.aiKeywords || editing.correctAnswer,
          maxScore: editing.weight,
          studentAnswer: aiTestSample,
        }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errData.error || `Gagal menghubungi Korektor AI (${res.status}).`
        );
      }
      setAiTestResult((await res.json()) as AiEvaluationResult);
    } catch (err) {
      setAiTestError(
        err instanceof Error
          ? err.message
          : 'Korektor AI tidak dapat dihubungi saat ini.'
      );
    } finally {
      setTestingAi(false);
    }
  };

  const handleSaveEditor = () => {
    if (!editing) return;
    if (!editing.prompt.trim()) {
      setEditorError('Pertanyaan utama wajib diisi.');
      return;
    }
    if (!editing.correctAnswer.trim() && editing.type !== 'BENAR_SALAH' && editing.type !== 'MENJODOHKAN') {
      setEditorError('Kunci jawaban wajib diisi.');
      return;
    }
    setEditorError(null);
    onSaveQuestion(editing);
    setEditing(null);
  };

  const handleGenerateQuestionsWithAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      setAiGenError('Masukkan topik atau materi soal terlebih dahulu.');
      return;
    }
    setGeneratingAi(true);
    setAiGenError(null);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          subjectName: activeSubject?.name || 'Mata Pelajaran Sekolah',
          subjectId: effectiveSubjectId || 'SUBJ-AKM-01',
          questionType: aiQuestionType,
          difficulty: aiDifficulty,
          gradeLevel: aiGradeLevel.trim() || 'SMA/SMK',
          count: aiCount,
          weight: aiWeight,
          startingNumber: filteredQuestions.length + 1,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        questions?: Question[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          data.error || `Gagal membuat soal otomatis (${res.status}).`
        );
      }
      const list = Array.isArray(data.questions) ? data.questions : [];
      if (list.length === 0) {
        throw new Error('Asisten AI tidak mengembalikan butir soal yang valid.');
      }
      setAiGeneratedList(list);
      setAiSelectedIds(list.map((q) => q.id));
    } catch (err) {
      setAiGenError(
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi Asisten AI pembuat soal.'
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  const toggleAiGeneratedSelection = (id: string) => {
    setAiSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCommitAiQuestions = () => {
    const picked = aiGeneratedList.filter((q) => aiSelectedIds.includes(q.id));
    if (picked.length === 0) return;
    const renumbered = picked.map((q, idx) => ({
      ...q,
      subjectId: effectiveSubjectId || q.subjectId,
      number: filteredQuestions.length + idx + 1,
    }));
    onImportQuestions(renumbered);
    setAiGeneratedList([]);
    setAiSelectedIds([]);
    setAiGenOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Bank Soal, Gambar, Kunci & Korektor AI
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Atur butir soal TKA/AKM bergambar, bobot nilai, PDF Google Drive, dan kata kunci Asisten AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={effectiveSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full sm:w-auto min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <button
              type="button"
              onClick={() => setTemplateMenuOpen((v) => !v)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              Unduh Template Soal
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {templateMenuOpen && (
              <div className="absolute right-0 z-20 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  disabled={downloadingExcel}
                  onClick={handleDownloadExcelTemplate}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-emerald-50 disabled:opacity-60"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-700 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {downloadingExcel
                        ? 'Menyusun Tabel Excel...'
                        : 'Template Excel (.xlsx)'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Tabel tertata rapi + dropdown + panduan
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  disabled={downloadingDocx}
                  onClick={handleDownloadWordDocx}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-blue-50 disabled:opacity-60"
                >
                  <FileText className="h-4 w-4 text-blue-700 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      Template Word (.docx)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Tabel kartu soal rapi (Word modern)
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadWordDocLegacy}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-blue-50"
                >
                  <FileText className="h-4 w-4 text-sky-700 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      Template Word (.doc)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Format Word klasik kompatibel
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdownTemplate}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-indigo-50"
                >
                  <FileCode2 className="h-4 w-4 text-indigo-700 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      Template Markdown (.md)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Susunan teks terstruktur &amp; rapi
                    </p>
                  </div>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setTemplateMenuOpen(false);
                    setImportOpen(true);
                    setMdGuideOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span>Lihat Panduan Format (.MD)</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setImportOpen((v) => !v);
              setImportError(null);
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Soal
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing(createSampleIllustratedQuestion());
              setEditorError(null);
              setAiTestResult(null);
              setAiTestError(null);
              setAiTestSample('');
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 whitespace-nowrap shrink-0"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Contoh Bergambar
          </button>

          <button
            type="button"
            onClick={() => {
              setAiGenOpen((v) => !v);
              setAiGenError(null);
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 whitespace-nowrap shrink-0"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Buat Soal dengan AI
          </button>

          <button
            type="button"
            onClick={() => {
              setEditing(createEmptyQuestion());
              setEditorError(null);
              setAiTestResult(null);
              setAiTestError(null);
              setAiTestSample('');
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Soal
          </button>
        </div>
      </div>

      {/* AI Assistant Question Generator Panel */}
      {aiGenOpen && (
        <section className="rounded-xl border border-indigo-200 bg-white p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Asisten AI Pembuat Soal Otomatis (TKA &amp; AKM)
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Masukkan topik materi, model soal, dan jumlah butir soal untuk dibuatkan stimulus, pertanyaan, opsi, dan kunci jawaban otomatis untuk{' '}
                <strong className="text-slate-900">
                  {activeSubject?.name || 'mata pelajaran aktif'}
                </strong>
                .
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiGenOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup generator AI"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleGenerateQuestionsWithAi} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-slate-700">
                  Topik / Materi / Kompetensi Dasar
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Contoh: Literasi Energi Terbarukan, Persamaan Kuadrat, atau Teks Argumentasi"
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-700">
                  Jenis Soal
                </label>
                <select
                  value={aiQuestionType}
                  onChange={(e) =>
                    setAiQuestionType(
                      e.target.value as QuestionType | 'CAMPURAN'
                    )
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs sm:text-sm"
                >
                  <option value="PG">Pilihan Ganda (PG)</option>
                  <option value="PG_KOMPLEKS">PG Kompleks (AKM)</option>
                  <option value="BENAR_SALAH">Benar / Salah</option>
                  <option value="MENJODOHKAN">Menjodohkan</option>
                  <option value="ISIAN">Isian / Uraian</option>
                  <option value="CAMPURAN">Campuran AKM</option>
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-700">
                  Tingkat Kesulitan
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) =>
                    setAiDifficulty(
                      e.target.value as 'Mudah' | 'Sedang' | 'Sulit (HOTS)'
                    )
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs sm:text-sm"
                >
                  <option value="Mudah">Mudah</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Sulit (HOTS)">Sulit (HOTS)</option>
                </select>
              </div>

              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-700">
                  Jenjang / Kelas
                </label>
                <input
                  type="text"
                  value={aiGradeLevel}
                  onChange={(e) => setAiGradeLevel(e.target.value)}
                  placeholder="SMA Kelas XII"
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Jumlah Soal (1–10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={aiCount}
                  onChange={(e) =>
                    setAiCount(
                      Math.min(10, Math.max(1, Number(e.target.value) || 3))
                    )
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Bobot / Soal
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={aiWeight}
                  onChange={(e) =>
                    setAiWeight(
                      Math.min(100, Math.max(1, Number(e.target.value) || 20))
                    )
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex items-end justify-end">
                <button
                  type="submit"
                  disabled={generatingAi}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {generatingAi ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyusun Soal dengan Asisten AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate {aiCount} Soal Otomatis
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {aiGenError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              {aiGenError}
            </div>
          )}

          {aiGeneratedList.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-indigo-600" />
                  Pratinjau Hasil Generator AI ({aiSelectedIds.length} dari{' '}
                  {aiGeneratedList.length} soal dipilih)
                </p>
                <button
                  type="button"
                  disabled={aiSelectedIds.length === 0}
                  onClick={handleCommitAiQuestions}
                  className="min-h-[38px] rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Masukkan {aiSelectedIds.length} Soal ke Bank Soal
                </button>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {aiGeneratedList.map((gq, idx) => {
                  const checked = aiSelectedIds.includes(gq.id);
                  return (
                    <div
                      key={gq.id}
                      className={`rounded-lg border p-3.5 text-xs space-y-1.5 ${
                        checked
                          ? 'border-indigo-300 bg-indigo-50/40'
                          : 'border-slate-200 bg-slate-50/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAiGeneratedSelection(gq.id)}
                            className="mt-0.5"
                          />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span className="font-mono font-bold text-slate-900">
                                Draf #{idx + 1}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-indigo-700">
                                {gq.type}
                              </span>
                              <span>·</span>
                              <span>{gq.akmDomain}</span>
                              <span>·</span>
                              <span className="font-mono">Bobot {gq.weight}</span>
                            </div>
                            {gq.stimulus && (
                              <p className="text-slate-600 italic">
                                Stimulus: {gq.stimulus}
                              </p>
                            )}
                            <p className="text-sm font-medium text-slate-900">
                              {gq.prompt}
                            </p>
                            {gq.options && gq.options.length > 0 && (
                              <p className="text-slate-600">
                                Opsi: {gq.options.join(' | ')}
                              </p>
                            )}
                            <p className="font-mono text-emerald-700 font-semibold">
                              Kunci: {gq.correctAnswer}
                              {gq.aiKeywords
                                ? ` · Kata Kunci AI: ${gq.aiKeywords}`
                                : ''}
                            </p>
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({
                              ...gq,
                              number: filteredQuestions.length + 1,
                            });
                            setEditorError(null);
                            setAiTestResult(null);
                            setAiTestError(null);
                            setAiTestSample('');
                          }}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 shrink-0"
                        >
                          Edit Dulu
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Import & Multi-Format Template Panel */}
      {importOpen && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-700" />
                Pusat Template &amp; Import Soal (Excel, Word &amp; Markdown)
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Unduh template Excel (.xlsx) bertabel rapi atau template Word (.docx / .doc), isi butir soal, lalu unggah kembali untuk langsung masuk ke Bank Soal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMdGuideOpen((v) => !v)}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800 hover:bg-indigo-100"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {mdGuideOpen ? 'Tutup Panduan MD' : 'Lihat Panduan MD'}
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
              >
                Tutup
              </button>
            </div>
          </div>

          {/* Quick Download Grid */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              disabled={downloadingExcel}
              onClick={handleDownloadExcelTemplate}
              className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-left hover:bg-emerald-100/80 transition-colors disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {downloadingExcel ? 'Menyusun...' : 'Excel (.xlsx Tabel Rapi)'}
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Tabel resmi + dropdown + 2 sheet
                </p>
              </div>
            </button>

            <button
              type="button"
              disabled={downloadingDocx}
              onClick={handleDownloadWordDocx}
              className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-left hover:bg-blue-100/80 transition-colors disabled:opacity-60"
            >
              <FileText className="h-4 w-4 text-blue-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {downloadingDocx ? 'Menyusun...' : 'Word Modern (.docx)'}
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Kartu tabel 2 kolom rapi
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleDownloadWordDocLegacy}
              className="flex items-center gap-2.5 rounded-lg border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-left hover:bg-sky-100/80 transition-colors"
            >
              <FileText className="h-4 w-4 text-sky-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  Word Klasik (.doc)
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Kompatibel semua MS Word
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdownTemplate}
              className="flex items-center gap-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-left hover:bg-indigo-100/80 transition-colors"
            >
              <FileCode2 className="h-4 w-4 text-indigo-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  Markdown (.md)
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Teks terstruktur rapi
                </p>
              </div>
            </button>
          </div>

          {mdGuideOpen && (
            <div className="rounded-xl border border-indigo-200 bg-slate-900 text-slate-100 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2.5">
                <p className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <FileCode2 className="h-4 w-4" />
                  Panduan Susunan Format Template Soal (Excel, Word &amp; Markdown)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyGuideMd}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                  >
                    {copiedMdGuide ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Salin MD
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadGuideMd}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-500"
                  >
                    <Download className="h-3 w-3" />
                    Unduh Panduan (.md)
                  </button>
                </div>
              </div>
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-200">
                {TEMPLATE_GUIDE_MARKDOWN}
              </pre>
            </div>
          )}

          {importError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              {importError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Unggah File Soal (.xlsx, .xls, .docx, .doc, .md)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.docx,.doc,.md,.markdown,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/markdown"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:px-3 file:py-2 file:text-xs file:font-medium hover:file:bg-slate-100"
              />
              {importFileLabel && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  File terbaca: <strong className="text-slate-700">{importFileLabel}</strong>
                </p>
              )}
              <textarea
                rows={4}
                value={textPasteInput}
                onChange={async (e) => {
                  const text = e.target.value;
                  setTextPasteInput(text);
                  setImportError(null);
                  setImportFileLabel(null);
                  const mod = await import('../../utils/questionTemplates');
                  const mdParsed = mod.parseQuestionsFromMarkdown(
                    text,
                    effectiveSubjectId,
                    filteredQuestions.length + 1
                  );
                  setPreviewImport(mdParsed);
                }}
                placeholder="Atau tempelkan langsung isi teks Markdown (.md) di sini..."
                className="mt-3 w-full rounded-lg border border-slate-300 p-2.5 font-mono text-xs text-slate-800"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Pratinjau Hasil Parsing ({previewImport.length} soal valid)
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 text-xs text-slate-600">
                  {previewImport.map((pq) => (
                    <div key={pq.id} className="truncate">
                      <span className="font-mono font-semibold text-slate-800">
                        #{pq.number} [{pq.type}]
                      </span>{' '}
                      {pq.prompt}
                    </div>
                  ))}
                  {previewImport.length === 0 && (
                    <p className="text-slate-500">
                      Unggah file Excel (.xlsx), Word (.docx/.doc), atau Markdown (.md) untuk melihat pratinjau butir soal sebelum disimpan.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={previewImport.length === 0}
                onClick={() => {
                  onImportQuestions(previewImport);
                  setImportOpen(false);
                  setTextPasteInput('');
                  setImportFileLabel(null);
                  setPreviewImport([]);
                }}
                className="mt-4 w-full min-h-[40px] rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Masukkan {previewImport.length} Soal ke Bank Soal
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Question Editor */}
      {editing && (
        <section className="rounded-xl border border-blue-200 bg-white p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">
              Editor Soal #{editing.number}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Batal
            </button>
          </div>

          {editorError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {editorError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Nomor Urut
              </label>
              <input
                type="number"
                value={editing.number}
                onChange={(e) =>
                  setEditing({ ...editing, number: Number(e.target.value) || 1 })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Model Soal (TKA/AKM)
              </label>
              <select
                value={editing.type}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    type: e.target.value as QuestionType,
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="PG">Pilihan Ganda (PG)</option>
                <option value="PG_KOMPLEKS">PG Kompleks (AKM)</option>
                <option value="BENAR_SALAH">Benar / Salah (AKM)</option>
                <option value="MENJODOHKAN">Menjodohkan (AKM)</option>
                <option value="ISIAN">Isian / Uraian (AI Grader)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Domain / Kompetensi
              </label>
              <input
                type="text"
                value={editing.akmDomain}
                onChange={(e) =>
                  setEditing({ ...editing, akmDomain: e.target.value })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Bobot Nilai Maksimal
              </label>
              <input
                type="number"
                value={editing.weight}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    weight: Math.max(1, Number(e.target.value) || 10),
                  })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Stimulus / Bacaan (Opsional)
              </label>
              <textarea
                rows={3}
                value={editing.stimulus || ''}
                onChange={(e) =>
                  setEditing({ ...editing, stimulus: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm"
                placeholder="Wacana atau data pendukung soal AKM..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Pertanyaan Utama
              </label>
              <textarea
                rows={3}
                value={editing.prompt}
                onChange={(e) =>
                  setEditing({ ...editing, prompt: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm"
                placeholder="Tulis teks pertanyaan..."
              />
            </div>
          </div>

          {/* Soal Bergambar Setting */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-blue-700" />
                Pengaturan Soal Bergambar (Grafik / Diagram / Ilustrasi)
              </p>
              {editing.imageUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setEditing({ ...editing, imageUrl: '', imageCaption: '' })
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  Hapus Gambar
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Unggah Gambar dari Perangkat (Otomatis dikompresi untuk Offline & Sheets)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImg}
                  onChange={handleQuestionImageUpload}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Atau Tempel URL Gambar
                </label>
                <input
                  type="url"
                  value={
                    editing.imageUrl?.startsWith('data:')
                      ? ''
                      : editing.imageUrl || ''
                  }
                  onChange={(e) =>
                    setEditing({ ...editing, imageUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            {editing.imageUrl && (
              <div className="grid gap-3 sm:grid-cols-2 items-start pt-2">
                <div className="rounded-lg border border-slate-200 bg-white p-2">
                  <img
                    src={editing.imageUrl}
                    alt={editing.imageCaption || 'Pratinjau gambar soal'}
                    referrerPolicy="no-referrer"
                    className="max-h-48 w-full object-contain rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Keterangan Gambar / Sumber (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editing.imageCaption || ''}
                    onChange={(e) =>
                      setEditing({ ...editing, imageCaption: e.target.value })
                    }
                    placeholder="Contoh: Gambar 1. Grafik pertumbuhan..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Link Drive PDF */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Lampiran File PDF dari Google Drive (Opsional)
              </label>
              <select
                value={editing.drivePdfId || ''}
                onChange={(e) => {
                  const found = drivePdfs.find((p) => p.id === e.target.value);
                  setEditing({
                    ...editing,
                    drivePdfId: found?.id || undefined,
                    drivePdfName: found?.name || undefined,
                  });
                }}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">-- Tidak ada lampiran PDF --</option>
                {drivePdfs.map((pdf) => (
                  <option key={pdf.id} value={pdf.id}>
                    {pdf.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type-specific Answer Configuration */}
          {(editing.type === 'PG' || editing.type === 'PG_KOMPLEKS') && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                Pilihan Jawaban (A–D) & Gambar Opsi Opsional
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {editing.options.map((opt, idx) => {
                  const optImg = editing.optionImages?.[idx] || '';
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2"
                    >
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...editing.options];
                          next[idx] = e.target.value;
                          setEditing({ ...editing, options: next });
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                      />
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <label className="cursor-pointer text-blue-700 hover:underline">
                          {optImg ? 'Ganti Gambar Opsi' : '+ Gambar Opsi'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleOptionImageUpload(idx, e)}
                            className="hidden"
                          />
                        </label>
                        {optImg && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextImgs = [
                                ...(editing.optionImages || ['', '', '', '']),
                              ];
                              nextImgs[idx] = '';
                              setEditing({ ...editing, optionImages: nextImgs });
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Hapus Gambar
                          </button>
                        )}
                      </div>
                      {optImg && (
                        <img
                          src={optImg}
                          alt={`Opsi ${String.fromCharCode(65 + idx)}`}
                          className="h-20 w-full rounded border border-slate-200 bg-white object-contain"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Kunci Jawaban (
                  {editing.type === 'PG'
                    ? 'Contoh: B'
                    : 'Pisah koma, contoh: A,C'}
                  )
                </label>
                <input
                  type="text"
                  value={editing.correctAnswer}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      correctAnswer: e.target.value.toUpperCase(),
                    })
                  }
                  className="mt-1 w-full sm:w-64 min-h-[40px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
          )}

          {editing.type === 'BENAR_SALAH' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Daftar Pernyataan Benar/Salah
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const list = editing.statements || [];
                    setEditing({
                      ...editing,
                      statements: [
                        ...list,
                        {
                          id: `S${list.length + 1}`,
                          text: '',
                          isTrue: true,
                        },
                      ],
                    });
                  }}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  + Tambah Pernyataan
                </button>
              </div>
              {(editing.statements || []).map((st, idx) => (
                <div
                  key={st.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <input
                    type="text"
                    value={st.text}
                    onChange={(e) => {
                      const next = [...(editing.statements || [])];
                      next[idx] = { ...st, text: e.target.value };
                      setEditing({ ...editing, statements: next });
                    }}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder={`Pernyataan ${idx + 1}`}
                  />
                  <select
                    value={st.isTrue ? 'true' : 'false'}
                    onChange={(e) => {
                      const next = [...(editing.statements || [])];
                      next[idx] = {
                        ...st,
                        isTrue: e.target.value === 'true',
                      };
                      setEditing({ ...editing, statements: next });
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="true">Benar</option>
                    <option value="false">Salah</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {editing.type === 'MENJODOHKAN' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Pasangan Premis (Kiri) & Respon (Kanan)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const list = editing.matchingPairs || [];
                    setEditing({
                      ...editing,
                      matchingPairs: [
                        ...list,
                        { id: `P${list.length + 1}`, left: '', right: '' },
                      ],
                    });
                  }}
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  + Tambah Pasangan
                </button>
              </div>
              {(editing.matchingPairs || []).map((pair, idx) => (
                <div key={pair.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) => {
                      const next = [...(editing.matchingPairs || [])];
                      next[idx] = { ...pair, left: e.target.value };
                      setEditing({ ...editing, matchingPairs: next });
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Item Kiri"
                  />
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => {
                      const next = [...(editing.matchingPairs || [])];
                      next[idx] = { ...pair, right: e.target.value };
                      setEditing({ ...editing, matchingPairs: next });
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Pasangan Kanan"
                  />
                </div>
              ))}
            </div>
          )}

          {editing.type === 'ISIAN' && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800">
                  Kata Kunci Jawaban Guru (Untuk Korektor Asisten AI)
                </label>
                <input
                  type="text"
                  value={editing.aiKeywords || ''}
                  onChange={(e) =>
                    setEditing({ ...editing, aiKeywords: e.target.value })
                  }
                  placeholder="Pisahkan dengan koma, contoh: mode offline, cache lokal, enkripsi, anti-tab"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800">
                  Jawaban Referensi Lengkap
                </label>
                <textarea
                  rows={2}
                  value={editing.correctAnswer}
                  onChange={(e) =>
                    setEditing({ ...editing, correctAnswer: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
                />
              </div>

              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Simulasi Uji Korektor Asisten AI
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={aiTestSample}
                    onChange={(e) => setAiTestSample(e.target.value)}
                    placeholder="Ketik contoh jawaban siswa untuk diuji oleh AI..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleRunAiSandbox}
                    disabled={testingAi || !aiTestSample.trim()}
                    className="min-h-[38px] rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {testingAi ? 'Menilai...' : 'Uji Koreksi AI'}
                  </button>
                </div>
                {aiTestError && (
                  <p className="mt-2 text-xs text-red-700">{aiTestError}</p>
                )}
                {aiTestResult && (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-white p-3 text-xs">
                    <p className="font-semibold text-slate-900">
                      Skor AI: {aiTestResult.score} / {aiTestResult.maxScore}
                    </p>
                    <p className="mt-1 text-slate-600">{aiTestResult.feedback}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="min-h-[40px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveEditor}
              className="min-h-[40px] rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Simpan Soal & Kunci
            </button>
          </div>
        </section>
      )}

      {/* Question List */}
      <div className="space-y-3">
        {filteredQuestions.map((q) => (
          <div
            key={q.id}
            className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex items-start gap-3 max-w-3xl">
              {q.imageUrl && (
                <img
                  src={q.imageUrl}
                  alt={`Gambar soal ${q.number}`}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-50"
                />
              )}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-slate-900">
                    Soal #{q.number}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-blue-700">{q.type}</span>
                  <span aria-hidden="true">·</span>
                  <span>{q.akmDomain}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">Bobot {q.weight}</span>
                  {q.imageUrl && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-medium">
                        Bergambar
                      </span>
                    </>
                  )}
                  {q.drivePdfName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">PDF: {q.drivePdfName}</span>
                    </>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-900">{q.prompt}</p>
                <p className="text-xs text-slate-600 break-words">
                  Kunci:{' '}
                  <span className="font-mono text-slate-800">
                    {q.correctAnswer}
                  </span>
                  {q.aiKeywords && ` · Kata Kunci AI: ${q.aiKeywords}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditing(q);
                  setEditorError(null);
                  setAiTestResult(null);
                  setAiTestError(null);
                  setAiTestSample('');
                }}
                className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit Soal & Nilai
              </button>
              <button
                type="button"
                onClick={() => onDeleteQuestion(q.id)}
                className="min-h-[38px] rounded-lg border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                aria-label="Hapus soal"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
