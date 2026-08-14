'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { questions as allQuestions, domains } from '@/data/questions';
import { saveResult, saveUsedQuestionIds, getUsedQuestionIds, toggleBookmark, isBookmarked, getFrequentlyWrong, getBookmarks } from '@/lib/storage';
import type { Question, QuizState, QuizResult } from '@/types';

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Exam simulation domain distribution: 13 D1, 16 D2, 18 D3, 9 D4, 9 D5 = 65
const EXAM_SIM_DISTRIBUTION: Record<number, number> = { 1: 13, 2: 16, 3: 18, 4: 9, 5: 9 };
const EXAM_SIM_TIME = 85 * 60; // 85 minutes in seconds

function QuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(new Set());
  const [isExamSim, setIsExamSim] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionContainerRef = useRef<HTMLDivElement>(null);

  // Initialize quiz
  useEffect(() => {
    const domainsParam = searchParams.get('domains');
    const countParam = searchParams.get('count');
    const modeParam = searchParams.get('mode');
    const examSimParam = searchParams.get('exam-sim');
    const topicsParam = searchParams.get('topics');
    const bookmarksParam = searchParams.get('bookmarks');

    if (!domainsParam) {
      router.push('/');
      return;
    }

    const selectedDomains = domainsParam.split(',').map(Number);
    let count = countParam ? parseInt(countParam, 10) : 20;
    const mode = modeParam === 'exam' ? 'exam' : 'practice';
    const examSim = examSimParam === 'true';
    const selectedTopics = topicsParam ? topicsParam.split(',') : [];
    const useBookmarks = bookmarksParam === 'true';

    setIsExamSim(examSim);

    let filtered: Question[];

    if (useBookmarks) {
      const bookmarkIds = getBookmarks();
      filtered = allQuestions.filter(q => bookmarkIds.includes(q.id));
      count = filtered.length;
    } else {
      filtered = allQuestions.filter(q => selectedDomains.includes(q.domain));
    }

    // Topic filtering
    if (selectedTopics.length > 0) {
      const topicFiltered = filtered.filter(q => q.topic && selectedTopics.includes(q.topic));
      if (topicFiltered.length > 0) {
        filtered = topicFiltered;
      }
    }

    let selected: Question[];

    if (examSim) {
      // Exam simulation: distribute questions per domain
      count = 65;
      const byDomain: Record<number, Question[]> = {};
      for (const q of filtered) {
        if (!byDomain[q.domain]) byDomain[q.domain] = [];
        byDomain[q.domain].push(q);
      }

      selected = [];
      for (const [domainIdStr, needed] of Object.entries(EXAM_SIM_DISTRIBUTION)) {
        const domainId = Number(domainIdStr);
        const pool = byDomain[domainId] || [];
        const shuffled = shuffleArray(pool);
        selected.push(...shuffled.slice(0, needed));
      }
      selected = shuffleArray(selected);
    } else {
      // Smart rotation: prioritize unseen questions
      const usedIds = getUsedQuestionIds();
      const unseen = filtered.filter(q => !usedIds.includes(q.id));
      const seen = filtered.filter(q => usedIds.includes(q.id));

      // Spaced repetition: include 30% from frequently wrong
      const freqWrong = getFrequentlyWrong();
      const wrongIds = Object.keys(freqWrong).sort((a, b) => freqWrong[b] - freqWrong[a]);
      const wrongQuestions = wrongIds
        .map(id => filtered.find(q => q.id === id))
        .filter((q): q is Question => q !== undefined);
      const wrongCount = Math.min(Math.floor(count * 0.3), wrongQuestions.length);
      const wrongSelected = wrongQuestions.slice(0, wrongCount);
      const wrongSelectedIds = new Set(wrongSelected.map(q => q.id));

      const remainingCount = count - wrongCount;
      const remainingUnseen = unseen.filter(q => !wrongSelectedIds.has(q.id));
      const remainingSeen = seen.filter(q => !wrongSelectedIds.has(q.id));

      let otherSelected: Question[];
      if (remainingUnseen.length >= remainingCount) {
        otherSelected = shuffleArray(remainingUnseen).slice(0, remainingCount);
      } else {
        otherSelected = [...shuffleArray(remainingUnseen), ...shuffleArray(remainingSeen).slice(0, remainingCount - remainingUnseen.length)];
      }

      selected = shuffleArray([...wrongSelected, ...otherSelected]);
    }

    if (selected.length === 0) {
      router.push('/');
      return;
    }

    // Save used question IDs
    saveUsedQuestionIds(selected.map(q => q.id));

    // Init bookmarks
    const initialBookmarks = new Set<string>();
    for (const q of selected) {
      if (isBookmarked(q.id)) initialBookmarks.add(q.id);
    }
    setBookmarkedQuestions(initialBookmarks);

    setQuizState({
      currentIndex: 0,
      questions: selected,
      answers: {},
      submitted: {},
      startTime: Date.now(),
      config: {
        domains: selectedDomains,
        questionCount: count,
        mode,
      },
    });
  }, [searchParams, router]);

  // Timer
  useEffect(() => {
    if (!quizState) return;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - quizState.startTime) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizState?.startTime]);

  // Auto-finish for exam sim when time runs out
  useEffect(() => {
    if (isExamSim && elapsed >= EXAM_SIM_TIME && quizState) {
      finishQuiz();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, isExamSim]);

  const scrollToTop = useCallback(() => {
    questionContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const currentQuestion: Question | undefined = quizState?.questions[quizState.currentIndex];
  const currentAnswers = currentQuestion ? (quizState?.answers[currentQuestion.id] ?? []) : [];
  const isSubmitted = currentQuestion ? (quizState?.submitted[currentQuestion.id] ?? false) : false;

  const toggleOption = useCallback((optionId: string) => {
    if (!quizState || !currentQuestion || isSubmitted) return;

    setQuizState(prev => {
      if (!prev) return prev;
      const qId = currentQuestion.id;
      const current = prev.answers[qId] ?? [];

      let updated: string[];
      if (currentQuestion.type === 'single') {
        updated = current.includes(optionId) ? [] : [optionId];
      } else {
        if (current.includes(optionId)) {
          updated = current.filter(id => id !== optionId);
        } else {
          updated = [...current, optionId];
        }
      }

      return {
        ...prev,
        answers: { ...prev.answers, [qId]: updated },
      };
    });
  }, [quizState, currentQuestion, isSubmitted]);

  const submitAnswer = useCallback(() => {
    if (!quizState || !currentQuestion) return;
    setQuizState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        submitted: { ...prev.submitted, [currentQuestion.id]: true },
      };
    });
  }, [quizState, currentQuestion]);

  const goToQuestion = useCallback((index: number) => {
    if (!quizState) return;
    if (index < 0 || index >= quizState.questions.length) return;
    setQuizState(prev => prev ? { ...prev, currentIndex: index } : prev);
    scrollToTop();
  }, [quizState, scrollToTop]);

  const handleToggleBookmark = useCallback((questionId: string) => {
    const newState = toggleBookmark(questionId);
    setBookmarkedQuestions(prev => {
      const next = new Set(prev);
      if (newState) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  }, []);

  const requestAiExplanation = useCallback(async (question: Question) => {
    if (aiExplanations[question.id] || loadingAi === question.id) return;

    const userAnswerIds = quizState?.answers[question.id] ?? [];
    const selectedOption = question.options.find(o => userAnswerIds.includes(o.id));
    const correctOption = question.options.find(o => question.correctAnswers.includes(o.id));

    if (!selectedOption || !correctOption) return;

    setLoadingAi(question.id);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          selectedAnswer: selectedOption.text,
          correctAnswer: correctOption.text,
          explanation: question.explanation,
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setAiExplanations(prev => ({ ...prev, [question.id]: data.explanation }));
      } else {
        setAiExplanations(prev => ({ ...prev, [question.id]: 'No se pudo obtener la explicacion. Verifica que ANTHROPIC_API_KEY este configurada.' }));
      }
    } catch {
      setAiExplanations(prev => ({ ...prev, [question.id]: 'Error al conectar con el servidor.' }));
    } finally {
      setLoadingAi(null);
    }
  }, [quizState, aiExplanations, loadingAi]);

  const finishQuiz = useCallback(() => {
    if (!quizState) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const totalSeconds = Math.floor((Date.now() - quizState.startTime) / 1000);
    let score = 0;
    const domainScores: Record<number, { correct: number; total: number }> = {};

    for (const q of quizState.questions) {
      if (!domainScores[q.domain]) {
        domainScores[q.domain] = { correct: 0, total: 0 };
      }
      domainScores[q.domain].total += 1;

      const userAnswers = quizState.answers[q.id] ?? [];
      const isCorrect =
        userAnswers.length === q.correctAnswers.length &&
        q.correctAnswers.every(a => userAnswers.includes(a));

      if (isCorrect) {
        score += 1;
        domainScores[q.domain].correct += 1;
      }
    }

    const result: QuizResult = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      config: quizState.config,
      answers: quizState.answers,
      score,
      total: quizState.questions.length,
      timeSpent: totalSeconds,
      domainScores,
    };

    saveResult(result);

    const params = new URLSearchParams();
    params.set('id', result.id);
    if (isExamSim) params.set('exam-sim', 'true');
    router.push(`/results?${params.toString()}`);
  }, [quizState, router, isExamSim]);

  if (!quizState || !currentQuestion) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Cargando quiz...</div>
      </div>
    );
  }

  const isCorrect = currentQuestion.correctAnswers.length === currentAnswers.length &&
    currentQuestion.correctAnswers.every(a => currentAnswers.includes(a));
  const requiredCount = currentQuestion.correctAnswers.length;
  const canSubmit = currentAnswers.length === requiredCount && !isSubmitted;
  const domain = domains.find(d => d.id === currentQuestion.domain);
  const progress = ((quizState.currentIndex + 1) / quizState.questions.length) * 100;
  const answeredCount = Object.keys(quizState.answers).filter(k => (quizState.answers[k]?.length ?? 0) > 0).length;
  const isCurrentBookmarked = bookmarkedQuestions.has(currentQuestion.id);
  const remainingTime = isExamSim ? Math.max(0, EXAM_SIM_TIME - elapsed) : null;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-card-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push('/')}
              className="text-text-secondary hover:text-text-primary transition-colors text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Salir
            </button>
            <div className="flex items-center gap-3">
              {isExamSim && remainingTime !== null ? (
                <span className={`text-xs font-mono font-bold ${remainingTime < 300 ? 'text-error' : remainingTime < 600 ? 'text-accent' : 'text-text-secondary'}`}>
                  {formatTime(remainingTime)}
                </span>
              ) : (
                <span className="text-xs text-text-secondary font-mono">{formatTime(elapsed)}</span>
              )}
              <span className="text-xs text-text-secondary">
                {quizState.currentIndex + 1}/{quizState.questions.length}
              </span>
              {/* Bookmark button */}
              <button
                onClick={() => handleToggleBookmark(currentQuestion.id)}
                className="p-1 transition-colors"
                title={isCurrentBookmarked ? 'Quitar marcador' : 'Marcar pregunta'}
              >
                <svg
                  className={`w-5 h-5 ${isCurrentBookmarked ? 'text-accent fill-accent' : 'text-text-secondary'}`}
                  fill={isCurrentBookmarked ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-card-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isExamSim && (
            <div className="text-center mt-1">
              <span className="text-[10px] text-text-secondary">Simulacro de Examen - 65 preguntas, 85 minutos</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main ref={questionContainerRef} className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 sm:py-6 space-y-4">
        {/* Domain Badge */}
        {domain && (
          <div className="flex items-center gap-2">
            <span className="text-sm">{domain.icon}</span>
            <span className="text-xs text-text-secondary">{domain.name}</span>
            {currentQuestion.type === 'multiple' && (
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full ml-auto">
                Selecciona {requiredCount} respuestas
              </span>
            )}
          </div>
        )}

        {/* Question */}
        <div className="bg-card border border-card-border rounded-xl p-4 sm:p-6">
          <p className="text-base sm:text-lg font-medium text-text-primary leading-relaxed">
            {currentQuestion.question}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = currentAnswers.includes(option.id);
            const isCorrectOption = currentQuestion.correctAnswers.includes(option.id);

            let optionStyle = 'border-card-border bg-card hover:border-accent/40';
            let iconContent: React.ReactNode = (
              <span className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-sm font-semibold text-text-secondary shrink-0">
                {OPTION_LETTERS[idx]}
              </span>
            );

            if (isSubmitted && quizState.config.mode === 'practice') {
              if (isCorrectOption) {
                optionStyle = 'border-success/50 bg-success/10';
                iconContent = (
                  <span className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center text-sm shrink-0">
                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                );
              } else if (isSelected && !isCorrectOption) {
                optionStyle = 'border-error/50 bg-error/10';
                iconContent = (
                  <span className="w-8 h-8 rounded-lg bg-error/20 flex items-center justify-center text-sm shrink-0">
                    <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                );
              } else {
                optionStyle = 'border-card-border bg-card opacity-60';
              }
            } else if (isSelected) {
              optionStyle = 'border-accent bg-accent/10';
              iconContent = (
                <span className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-sm font-semibold text-accent shrink-0">
                  {OPTION_LETTERS[idx]}
                </span>
              );
            }

            return (
              <button
                key={option.id}
                onClick={() => toggleOption(option.id)}
                disabled={isSubmitted && quizState.config.mode === 'practice'}
                className={`w-full text-left p-3 sm:p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 min-h-12 ${optionStyle} ${
                  isSubmitted && quizState.config.mode === 'practice' ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                }`}
              >
                {iconContent}
                <span className="text-sm sm:text-base text-text-primary leading-relaxed pt-1">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Practice Mode: Verify Button */}
        {quizState.config.mode === 'practice' && !isSubmitted && (
          <button
            onClick={submitAnswer}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 min-h-12 ${
              canSubmit
                ? 'bg-accent hover:bg-accent-hover text-black hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]'
                : 'bg-card-border text-text-secondary cursor-not-allowed'
            }`}
          >
            Verificar Respuesta
          </button>
        )}

        {/* Explanation (Practice Mode) - Show ALL option explanations */}
        {isSubmitted && quizState.config.mode === 'practice' && (
          <div className="animate-fade-in space-y-3">
            <div className={`border rounded-xl p-4 sm:p-5 ${
              isCorrect
                ? 'bg-success/5 border-success/30'
                : 'bg-error/5 border-error/30'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {isCorrect ? (
                  <>
                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-success">Correcto!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-error">Incorrecto</span>
                  </>
                )}
              </div>
              <p className="text-sm text-text-primary leading-relaxed mb-3">
                {currentQuestion.explanation}
              </p>
              {/* Show ALL wrong option explanations */}
              {currentQuestion.options
                .filter(o => !currentQuestion.correctAnswers.includes(o.id))
                .map(wrongOption => {
                  const wrongExplanation = currentQuestion.incorrectExplanations[wrongOption.id];
                  if (!wrongExplanation) return null;
                  const wasSelected = currentAnswers.includes(wrongOption.id);
                  return (
                    <div key={wrongOption.id} className={`mt-2 p-3 rounded-lg ${wasSelected ? 'bg-error/10 border border-error/20' : 'bg-background/50'}`}>
                      <p className="text-xs text-text-secondary mb-1">
                        {wasSelected && <span className="text-error font-medium">(Tu respuesta) </span>}
                        Por que &quot;{wrongOption.text.substring(0, 80)}{wrongOption.text.length > 80 ? '...' : ''}&quot; es incorrecta:
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">{wrongExplanation}</p>
                    </div>
                  );
                })}
            </div>

            {/* AI Explanation Button - Only for wrong answers */}
            {!isCorrect && (
              <div>
                {aiExplanations[currentQuestion.id] ? (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">&#129302;</span>
                      <span className="text-sm font-semibold text-purple-400">Explicacion con IA</span>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
                      {aiExplanations[currentQuestion.id]}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => requestAiExplanation(currentQuestion)}
                    disabled={loadingAi === currentQuestion.id}
                    className="w-full py-2.5 rounded-xl text-sm font-medium border border-purple-500/30 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 transition-all duration-200 flex items-center justify-center gap-2 min-h-10"
                  >
                    {loadingAi === currentQuestion.id ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generando explicacion...
                      </>
                    ) : (
                      <>
                        <span>&#129302;</span> Explicame mas
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => goToQuestion(quizState.currentIndex - 1)}
            disabled={quizState.currentIndex === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-10 border border-card-border text-text-secondary hover:border-accent/40 hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </button>

          {quizState.currentIndex < quizState.questions.length - 1 ? (
            <button
              onClick={() => goToQuestion(quizState.currentIndex + 1)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-10 bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20"
            >
              Siguiente
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-10 bg-accent hover:bg-accent-hover text-black"
            >
              Finalizar Quiz
            </button>
          )}
        </div>

        {/* Question Navigation Dots */}
        <div className="flex flex-wrap gap-1.5 justify-center pt-2 pb-4">
          {quizState.questions.map((q, idx) => {
            const hasAnswer = (quizState.answers[q.id]?.length ?? 0) > 0;
            const wasSubmitted = quizState.submitted[q.id] ?? false;
            const isCurrent = idx === quizState.currentIndex;
            const isQBookmarked = bookmarkedQuestions.has(q.id);

            let dotClass = 'bg-card-border';
            if (isCurrent) {
              dotClass = 'bg-accent ring-2 ring-accent/30';
            } else if (wasSubmitted && quizState.config.mode === 'practice') {
              const userAns = quizState.answers[q.id] ?? [];
              const correct = userAns.length === q.correctAnswers.length && q.correctAnswers.every(a => userAns.includes(a));
              dotClass = correct ? 'bg-success' : 'bg-error';
            } else if (hasAnswer) {
              dotClass = 'bg-accent/50';
            }

            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(idx)}
                className={`w-6 h-6 rounded-full text-[10px] font-medium transition-all duration-200 ${dotClass} flex items-center justify-center text-white/80 hover:scale-110 ${isQBookmarked ? 'ring-1 ring-accent/60' : ''}`}
                title={`Pregunta ${idx + 1}${isQBookmarked ? ' (marcada)' : ''}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Finish quiz bar (for exam mode, always visible at bottom) */}
        {quizState.config.mode === 'exam' && (
          <div className="border-t border-card-border bg-card/80 backdrop-blur-sm py-3 text-center">
            <div className="text-xs text-text-secondary mb-2">
              {answeredCount} de {quizState.questions.length} respondidas
            </div>
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-black transition-all duration-200 min-h-10"
            >
              Finalizar Examen
            </button>
          </div>
        )}
      </main>

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-xl p-5 max-w-sm w-full animate-scale-in">
            <h3 className="font-semibold text-text-primary mb-2">Finalizar Quiz?</h3>
            <p className="text-sm text-text-secondary mb-1">
              Has respondido {answeredCount} de {quizState.questions.length} preguntas.
            </p>
            {answeredCount < quizState.questions.length && (
              <p className="text-sm text-accent mb-4">
                Tienes {quizState.questions.length - answeredCount} preguntas sin responder.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-card-border text-text-secondary hover:border-accent/40 transition-colors min-h-10"
              >
                Continuar
              </button>
              <button
                onClick={finishQuiz}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-accent hover:bg-accent-hover text-black transition-colors min-h-10"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Cargando quiz...</div>
      </div>
    }>
      <QuizPage />
    </Suspense>
  );
}
