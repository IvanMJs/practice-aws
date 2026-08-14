'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { questions as allQuestions, domains } from '@/data/questions';
import { getResults } from '@/lib/storage';
import { domainResources } from '@/data/resources';
import type { QuizResult, Question } from '@/types';

function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const resultId = searchParams.get('id');
    if (!resultId) {
      router.push('/');
      return;
    }
    const results = getResults();
    const found = results.find(r => r.id === resultId);
    if (!found) {
      router.push('/');
      return;
    }
    setResult(found);
  }, [searchParams, router]);

  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of allQuestions) {
      map.set(q.id, q);
    }
    return map;
  }, []);

  const toggleExpand = (qId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  if (!result) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Cargando resultados...</div>
      </div>
    );
  }

  const pct = Math.round((result.score / result.total) * 100);
  const mins = Math.floor(result.timeSpent / 60);
  const secs = result.timeSpent % 60;

  const scoreColor = pct >= 80 ? 'text-success' : pct >= 60 ? 'text-accent' : 'text-error';
  const scoreBg = pct >= 80 ? 'from-success/20 to-success/5' : pct >= 60 ? 'from-accent/20 to-accent/5' : 'from-error/20 to-error/5';
  const scoreLabel = pct >= 85
    ? 'Excelente! Estas listo para el examen'
    : pct >= 70
    ? 'Buen trabajo! Estas cerca de aprobar, refuerza los puntos debiles'
    : pct >= 50
    ? 'Necesitas mas practica en las areas senaladas abajo'
    : 'Requiere estudio intensivo. Revisa la documentacion de cada dominio';
  const scoreBorderColor = pct >= 80 ? 'border-success/30' : pct >= 60 ? 'border-accent/30' : 'border-error/30';

  // Build question results list
  const questionResults = Object.entries(result.answers).map(([qId, userAnswers]) => {
    const question = questionMap.get(qId);
    if (!question) return null;
    const isCorrect =
      userAnswers.length === question.correctAnswers.length &&
      question.correctAnswers.every(a => userAnswers.includes(a));
    return { question, userAnswers, isCorrect };
  }).filter(Boolean) as { question: Question; userAnswers: string[]; isCorrect: boolean }[];

  // Also include unanswered questions
  const answeredIds = new Set(Object.keys(result.answers));
  const unansweredFromConfig = allQuestions
    .filter(q => result.config.domains.includes(q.domain) && !answeredIds.has(q.id))
    .slice(0, result.total - questionResults.length);

  for (const q of unansweredFromConfig) {
    questionResults.push({ question: q, userAnswers: [], isCorrect: false });
  }

  const displayedQuestions = showOnlyErrors
    ? questionResults.filter(r => !r.isCorrect)
    : questionResults;

  const getDomainBarColor = (domainId: number) => {
    const colors: Record<number, string> = {
      1: 'bg-blue-500',
      2: 'bg-purple-500',
      3: 'bg-orange-500',
      4: 'bg-green-500',
      5: 'bg-red-500',
    };
    return colors[domainId] ?? 'bg-gray-500';
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-text-secondary hover:text-text-primary transition-colors text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Inicio
          </button>
          <h1 className="text-sm font-semibold text-text-primary">Resultados</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Score Card */}
        <section className={`bg-gradient-to-br ${scoreBg} border ${scoreBorderColor} rounded-xl p-6 text-center animate-scale-in`}>
          <div className={`text-5xl sm:text-6xl font-bold ${scoreColor} mb-1`}>
            {pct}%
          </div>
          <p className={`text-sm font-medium ${scoreColor} mb-3`}>{scoreLabel}</p>
          <div className="flex items-center justify-center gap-4 text-sm text-text-secondary">
            <span>{result.score}/{result.total} correctas</span>
            <span className="w-px h-4 bg-card-border" />
            <span>{mins}:{secs.toString().padStart(2, '0')}</span>
            <span className="w-px h-4 bg-card-border" />
            <span>{result.config.mode === 'practice' ? 'Practica' : 'Examen'}</span>
          </div>
          {/* Pass/fail indicator */}
          <div className="mt-4">
            {pct >= 70 ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-3 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Aprobado (minimo 70%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-error bg-error/10 px-3 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                No aprobado (minimo 70%)
              </span>
            )}
          </div>
        </section>

        {/* Domain Breakdown */}
        <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Desglose por Dominio</h3>
          <div className="space-y-3">
            {Object.entries(result.domainScores).map(([domainIdStr, score]) => {
              const domainId = Number(domainIdStr);
              const domain = domains.find(d => d.id === domainId);
              if (!domain) return null;
              const domainPct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
              const barColor = domainPct >= 70 ? getDomainBarColor(domainId) : 'bg-error';

              return (
                <div key={domainId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{domain.icon}</span>
                      <span className="text-sm text-text-primary truncate">{domain.name}</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary ml-2 whitespace-nowrap">
                      {score.correct}/{score.total} ({domainPct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-700`}
                      style={{ width: `${domainPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Gap Analysis */}
        <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">
            Analisis de Falencias y Plan de Estudio
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Recursos de documentacion oficial de AWS para reforzar tus areas debiles
          </p>

          {Object.entries(result.domainScores)
            .sort(([, a], [, b]) => {
              const pctA = a.total > 0 ? a.correct / a.total : 1;
              const pctB = b.total > 0 ? b.correct / b.total : 1;
              return pctA - pctB; // weakest first
            })
            .map(([domainIdStr, score]) => {
              const domainId = Number(domainIdStr);
              const domain = domains.find(d => d.id === domainId);
              if (!domain) return null;
              const domainPct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
              const resources = domainResources[domainId] || [];

              const statusIcon = domainPct < 50 ? '\u{1F534}' : domainPct < 80 ? '\u{1F7E1}' : '\u{1F7E2}';
              const statusText = domainPct < 50 ? 'Critico' : domainPct < 80 ? 'Necesita refuerzo' : 'Dominado';
              const statusColor = domainPct < 50 ? 'text-error' : domainPct < 80 ? 'text-accent' : 'text-success';

              return (
                <div key={domainId} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{statusIcon}</span>
                    <span className="text-sm font-medium text-text-primary">{domain.name}</span>
                    <span className={`text-xs font-medium ${statusColor} ml-auto`}>
                      {domainPct}% &mdash; {statusText}
                    </span>
                  </div>

                  {domainPct < 80 && resources.length > 0 && (
                    <div className="space-y-2 ml-6">
                      {resources.map((resource, idx) => (
                        <div key={idx} className="bg-background/50 rounded-lg p-3">
                          <div className="text-sm font-medium text-text-primary mb-0.5">{resource.name}</div>
                          <div className="text-xs text-text-secondary mb-2">{resource.description}</div>
                          <div className="flex flex-wrap gap-2">
                            {resource.urls.map((link, linkIdx) => (
                              <a
                                key={linkIdx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
                              >
                                {'\u{1F4C4}'} {link.label}
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {domainPct >= 80 && (
                    <p className="text-xs text-success ml-6">{'✅'} Dominio bien cubierto. Sigue practicando para mantener el nivel.</p>
                  )}
                </div>
              );
            })}
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-accent hover:bg-accent-hover text-black transition-all duration-200 min-h-12 active:scale-[0.98]"
          >
            Volver al Inicio
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set('domains', result.config.domains.join(','));
              params.set('count', result.config.questionCount.toString());
              params.set('mode', result.config.mode);
              router.push(`/quiz?${params.toString()}`);
            }}
            className="flex-1 py-3 rounded-xl font-semibold text-sm border border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 transition-all duration-200 min-h-12 active:scale-[0.98]"
          >
            {'\u{1F504}'} Nuevo Quiz (Diferentes)
          </button>
          <button
            onClick={() => setShowOnlyErrors(!showOnlyErrors)}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm border transition-all duration-200 min-h-12 active:scale-[0.98] ${
              showOnlyErrors
                ? 'border-error/50 bg-error/10 text-error'
                : 'border-card-border text-text-secondary hover:border-error/40 hover:text-error'
            }`}
          >
            {showOnlyErrors ? 'Mostrar Todas' : 'Revisar Errores'}
            {!showOnlyErrors && ` (${questionResults.filter(r => !r.isCorrect).length})`}
          </button>
        </div>

        {/* Question Review List */}
        <section>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            {showOnlyErrors ? 'Preguntas Incorrectas' : 'Todas las Preguntas'} ({displayedQuestions.length})
          </h3>
          <div className="space-y-2">
            {displayedQuestions.map(({ question, userAnswers, isCorrect }, idx) => {
              const isExpanded = expandedQuestions.has(question.id);
              const domain = domains.find(d => d.id === question.domain);

              return (
                <div key={question.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
                  {/* Summary row */}
                  <button
                    onClick={() => toggleExpand(question.id)}
                    className="w-full text-left p-3 sm:p-4 flex items-start gap-3 hover:bg-surface/50 transition-colors"
                  >
                    <span className={`mt-0.5 shrink-0 ${isCorrect ? 'text-success' : 'text-error'}`}>
                      {isCorrect ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary line-clamp-2 leading-relaxed">
                        {question.question}
                      </p>
                      {domain && (
                        <span className="text-xs text-text-secondary mt-1 inline-block">
                          {domain.icon} {domain.name}
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 text-text-secondary shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-card-border p-3 sm:p-4 space-y-3 animate-fade-in bg-background/30">
                      {/* Options review */}
                      <div className="space-y-1.5">
                        {question.options.map(option => {
                          const isUserChoice = userAnswers.includes(option.id);
                          const isCorrectOption = question.correctAnswers.includes(option.id);

                          let optionStyle = 'text-text-secondary';
                          let badge = '';
                          if (isCorrectOption && isUserChoice) {
                            optionStyle = 'text-success';
                            badge = 'Tu respuesta (correcta)';
                          } else if (isCorrectOption) {
                            optionStyle = 'text-success';
                            badge = 'Respuesta correcta';
                          } else if (isUserChoice) {
                            optionStyle = 'text-error';
                            badge = 'Tu respuesta';
                          }

                          return (
                            <div key={option.id} className={`text-sm p-2 rounded-lg ${isCorrectOption ? 'bg-success/5' : isUserChoice ? 'bg-error/5' : ''}`}>
                              <div className={`flex items-start gap-2 ${optionStyle}`}>
                                <span className="shrink-0 mt-0.5">
                                  {isCorrectOption ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : isUserChoice ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  ) : (
                                    <span className="w-4 h-4 inline-block" />
                                  )}
                                </span>
                                <div className="flex-1">
                                  <span>{option.text}</span>
                                  {badge && (
                                    <span className={`ml-2 text-xs ${isCorrectOption ? 'text-success' : 'text-error'}`}>
                                      ({badge})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div className={`p-3 rounded-lg ${isCorrect ? 'bg-success/5 border border-success/20' : 'bg-error/5 border border-error/20'}`}>
                        <p className="text-xs font-medium text-text-secondary mb-1">Explicacion:</p>
                        <p className="text-sm text-text-primary leading-relaxed">{question.explanation}</p>
                      </div>

                      {/* Wrong answer explanations */}
                      {!isCorrect && userAnswers
                        .filter(a => !question.correctAnswers.includes(a))
                        .map(wrongId => {
                          const wrongOption = question.options.find(o => o.id === wrongId);
                          const wrongExplanation = question.incorrectExplanations[wrongId];
                          if (!wrongOption || !wrongExplanation) return null;
                          return (
                            <div key={wrongId} className="p-3 bg-background/50 rounded-lg">
                              <p className="text-xs text-text-secondary mb-1">
                                Por que &quot;{wrongOption.text.substring(0, 80)}{wrongOption.text.length > 80 ? '...' : ''}&quot; es incorrecta:
                              </p>
                              <p className="text-sm text-text-secondary leading-relaxed">{wrongExplanation}</p>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Cargando resultados...</div>
      </div>
    }>
      <ResultsPage />
    </Suspense>
  );
}
