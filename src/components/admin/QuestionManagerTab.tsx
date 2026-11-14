import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  AiEvaluationResult,
  DrivePdfFile,
  Question,
  QuestionType,
  SubjectConfig,
} from '../../types/exam';
import {
  generateQuestionCsvTemplate,
  parseQuestionsFromCsv,
} from '../../utils/gradingEngine';
import { compressImageFileToDataUrl } from '../../utils/imageHelper';
import { INITIAL_QUESTIONS } from '../../data/defaultExamData';

interface QuestionManagerTabProps {
  subjects: SubjectConfig[];
  questions: Question[];
  drivePdfs: DrivePdfFile[];
  onSaveQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onImportQuestions: (imported: Question[]) => void;
}

export const QuestionManagerTab: React.FC<QuestionManagerTabProps> = ({
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
  const [csvInput, setCsvInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [previewImport, setPreviewImport] = useState<Question[]>([]);
  const [aiTestSample, setAiTestSample] = useState('');
  const [aiTestResult, setAiTestResult] = useState<AiEvaluationResult | null>(
    null
  );
  const [aiTestError, setAiTestError] = useState<string | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const effectiveSubjectId = subjects.some((s) => s.id === selectedSubjectId)
    ? selectedSubjectId
    : subjects[0]?.id || '';

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

  const handleDownloadTemplate = () => {
    const csv = generateQuestionCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_Soal_AKM_TKA.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setCsvInput(text);
      const parsed = parseQuestionsFromCsv(
        text,
        effectiveSubjectId,
        filteredQuestions.length + 1
      );
      setPreviewImport(parsed);
      if (parsed.length === 0) {
        setImportError(
          'Tidak ditemukan baris soal valid pada file CSV. Pastikan menggunakan format Template CSV.'
        );
      }
    };
    reader.onerror = () => {
      setImportError('Gagal membaca file CSV dari perangkat.');
    };
    reader.readAsText(file);
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

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Template CSV
          </button>

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

      {/* Import Template Panel */}
      {importOpen && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-700" />
              Import Soal dari Template CSV
            </h3>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Tutup
            </button>
          </div>

          {importError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              {importError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Unggah File CSV (.csv sesuai template)
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:px-3 file:py-2 file:text-xs file:font-medium"
              />
              <textarea
                rows={4}
                value={csvInput}
                onChange={(e) => {
                  const text = e.target.value;
                  setCsvInput(text);
                  setImportError(null);
                  setPreviewImport(
                    parseQuestionsFromCsv(
                      text,
                      effectiveSubjectId,
                      filteredQuestions.length + 1
                    )
                  );
                }}
                placeholder="Atau tempelkan isi CSV di sini..."
                className="mt-3 w-full rounded-lg border border-slate-300 p-2.5 font-mono text-xs text-slate-800"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Pratinjau Hasil Parsing ({previewImport.length} soal valid)
                </p>
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 text-xs text-slate-600">
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
                      Unggah file template CSV untuk melihat pratinjau soal.
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
                  setCsvInput('');
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
