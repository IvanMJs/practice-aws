'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { questions as allQuestions, domains } from '@/data/questions';
import { saveResult, saveUsedQuestionIds, getUsedQuestionIds } from '@/lib/storage';
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

function QuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionContainerRef = useRef<HTMLDivElement>(null);

  // Initialize quiz
  useEffect(() => {
    const domainsParam = searchParams.get('domains');
    const countParam = searchParams.get('count');
    const modeParam = searchParams.get('mode');

    if (!domainsParam) {
      router.push('/');
      return;
    }

    const selectedDomains = domainsParam.split(',').map(Number);
    const count = countParam ? parseInt(countParam, 10) : 20;
    const mode = modeParam === 'exam' ? 'exam' : 'practice';

    const filtered = allQuestions.filter(q => selectedDomains.includes(q.domain));

    // Smart rotation: prioritize unseen questions
    const usedIds = getUsedQuestionIds();
    const unseen = filtered.filter(q => !usedIds.includes(q.id));
    const seen = filtered.filter(q => usedIds.includes(q.id));

    // Take from unseen first, then fill from seen (reshuffled)
    let selected: Question[];
    if (unseen.length >= count) {
      selected = shuffleArray(unseen).slice(0, count);
    } else {
      selected = [...shuffleArray(unseen), ...shuffleArray(seen).slice(0, count - unseen.length)];
    }

    if (selected.length === 0) {
      router.push('/');
      return;
    }

    // Save used question IDs
    saveUsedQuestionIds(selected.map(q => q.id));

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
    router.push(`/results?id=${result.id}`);
  }, [quizState, router]);

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
              <span className="text-xs text-text-secondary font-mono">{formatTime(elapsed)}</span>
              <span className="text-xs text-text-secondary">
                {quizState.currentIndex + 1}/{quizState.questions.length}
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-card-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
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

        {/* Explanation (Practice Mode) */}
        {isSubmitted && quizState.config.mode === 'practice' && (
          <div className="animate-fade-in">
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
              {/* Wrong answer explanations */}
              {!isCorrect && currentAnswers
                .filter(a => !currentQuestion.correctAnswers.includes(a))
                .map(wrongId => {
                  const wrongOption = currentQuestion.options.find(o => o.id === wrongId);
                  const wrongExplanation = currentQuestion.incorrectExplanations[wrongId];
                  if (!wrongOption || !wrongExplanation) return null;
                  return (
                    <div key={wrongId} className="mt-2 p-3 bg-background/50 rounded-lg">
                      <p className="text-xs text-text-secondary mb-1">
                        Por que <span className="text-error">&quot;{wrongOption.text.substring(0, 60)}...&quot;</span> es incorrecta:
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">{wrongExplanation}</p>
                    </div>
                  );
                })}
            </div>
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
                className={`w-6 h-6 rounded-full text-[10px] font-medium transition-all duration-200 ${dotClass} flex items-center justify-center text-white/80 hover:scale-110`}
                title={`Pregunta ${idx + 1}`}
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
