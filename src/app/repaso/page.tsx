'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { questions as allQuestions, domains } from '@/data/questions';
import { topics } from '@/data/topics';
import { getFrequentlyWrong, getResults } from '@/lib/storage';
import type { Question, QuizResult } from '@/types';

interface WrongQuestion {
  question: Question;
  wrongCount: number;
  lastWrongAnswers: string[];
}

export default function RepasoPage() {
  const router = useRouter();
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const freq = getFrequentlyWrong();
    const results = getResults();

    // Build a map of question ID -> last wrong answers from results
    const lastWrongMap: Record<string, string[]> = {};
    for (const result of results) {
      for (const [qId, selectedAnswers] of Object.entries(result.answers)) {
        const question = allQuestions.find(q => q.id === qId);
        if (!question) continue;
        const isCorrect =
          selectedAnswers.length === question.correctAnswers.length &&
          selectedAnswers.every(a => question.correctAnswers.includes(a));
        if (!isCorrect) {
          // Keep the most recent wrong answers (results are newest-first)
          if (!lastWrongMap[qId]) {
            lastWrongMap[qId] = selectedAnswers;
          }
        }
      }
    }

    const items: WrongQuestion[] = Object.entries(freq)
      .map(([qId, count]) => {
        const question = allQuestions.find(q => q.id === qId);
        if (!question) return null;
        return {
          question,
          wrongCount: count,
          lastWrongAnswers: lastWrongMap[qId] || [],
        };
      })
      .filter((item): item is WrongQuestion => item !== null)
      .sort((a, b) => b.wrongCount - a.wrongCount);

    setWrongQuestions(items);
    setLoaded(true);
  }, []);

  const filteredQuestions = useMemo(() => {
    if (selectedDomain === null) return wrongQuestions;
    return wrongQuestions.filter(wq => wq.question.domain === selectedDomain);
  }, [wrongQuestions, selectedDomain]);

  // Summary stats
  const totalWrongQuestions = wrongQuestions.length;
  const totalWrongAttempts = wrongQuestions.reduce((sum, wq) => sum + wq.wrongCount, 0);

  const mostMissedDomain = useMemo(() => {
    if (wrongQuestions.length === 0) return null;
    const domainCounts: Record<number, number> = {};
    for (const wq of wrongQuestions) {
      domainCounts[wq.question.domain] = (domainCounts[wq.question.domain] || 0) + wq.wrongCount;
    }
    let maxDomain = 0;
    let maxCount = 0;
    for (const [domainId, count] of Object.entries(domainCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxDomain = Number(domainId);
      }
    }
    return domains.find(d => d.id === maxDomain) || null;
  }, [wrongQuestions]);

  const toggleExpand = (qId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const startWrongQuiz = () => {
    const ids = filteredQuestions.map(wq => wq.question.id);
    if (ids.length === 0) return;
    const params = new URLSearchParams();
    params.set('domains', '1,2,3,4,5');
    params.set('count', ids.length.toString());
    params.set('mode', 'practice');
    params.set('wrong', 'true');
    if (selectedDomain !== null) {
      params.set('wrongDomain', selectedDomain.toString());
    }
    router.push(`/quiz?${params.toString()}`);
  };

  if (!loaded) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-text-secondary hover:text-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-text-primary">Repaso de Errores</h1>
          </div>
          <span className="text-sm text-text-secondary">{totalWrongQuestions} preguntas</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {wrongQuestions.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-card-border rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-error">{totalWrongQuestions}</p>
                <p className="text-xs text-text-secondary mt-0.5">Preguntas erradas</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-accent">{totalWrongAttempts}</p>
                <p className="text-xs text-text-secondary mt-0.5">Intentos fallidos</p>
              </div>
              <div className="bg-card border border-card-border rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-text-primary">
                  {mostMissedDomain ? mostMissedDomain.icon : '-'}
                </p>
                <p className="text-xs text-text-secondary mt-0.5 truncate">
                  {mostMissedDomain ? `D${mostMissedDomain.id}` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Domain Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedDomain(null)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedDomain === null
                    ? 'bg-accent text-black'
                    : 'bg-card border border-card-border text-text-secondary hover:text-text-primary'
                }`}
              >
                Todos
              </button>
              {domains.map(domain => {
                const count = wrongQuestions.filter(wq => wq.question.domain === domain.id).length;
                if (count === 0) return null;
                return (
                  <button
                    key={domain.id}
                    onClick={() => setSelectedDomain(domain.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      selectedDomain === domain.id
                        ? 'bg-accent text-black'
                        : 'bg-card border border-card-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span>{domain.icon}</span>
                    <span>D{domain.id}</span>
                    <span className={`text-xs ${selectedDomain === domain.id ? 'text-black/60' : 'text-text-secondary'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Practice button */}
            {filteredQuestions.length > 0 && (
              <button
                onClick={startWrongQuiz}
                className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-3 rounded-xl text-base transition-all duration-200 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] min-h-12 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Practicar estas ({filteredQuestions.length} preguntas)
              </button>
            )}

            {/* Question Cards */}
            <div className="space-y-2">
              {filteredQuestions.map(({ question, wrongCount, lastWrongAnswers }) => {
                const isExpanded = expandedQuestions.has(question.id);
                const domain = domains.find(d => d.id === question.domain);
                const topic = topics.find(t => t.id === question.topic);

                return (
                  <div key={question.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleExpand(question.id)}
                      className="w-full text-left p-3 sm:p-4 flex items-start gap-3 hover:bg-surface/50 transition-colors"
                    >
                      {/* Wrong count badge */}
                      <span className="shrink-0 mt-0.5 bg-error/15 text-error text-xs font-bold px-2 py-0.5 rounded-full">
                        {wrongCount}x
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary line-clamp-2 leading-relaxed">
                          {question.question}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {domain && (
                            <span className="text-xs text-text-secondary">
                              {domain.icon} {domain.name}
                            </span>
                          )}
                          {topic && (
                            <span className="text-[10px] text-text-secondary bg-card-border px-1.5 py-0.5 rounded">
                              {topic.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-text-secondary shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-card-border p-3 sm:p-4 space-y-3 animate-fade-in bg-background/30">
                        {/* Wrong count detail */}
                        <p className="text-xs text-error font-medium">
                          Errada {wrongCount} {wrongCount === 1 ? 'vez' : 'veces'}
                        </p>

                        {/* Options with correct/wrong indicators */}
                        <div className="space-y-1.5">
                          {question.options.map(option => {
                            const isCorrectOption = question.correctAnswers.includes(option.id);
                            const wasWrongPick = lastWrongAnswers.includes(option.id) && !isCorrectOption;

                            return (
                              <div
                                key={option.id}
                                className={`text-sm p-2 rounded-lg ${
                                  isCorrectOption
                                    ? 'bg-success/5'
                                    : wasWrongPick
                                    ? 'bg-error/5'
                                    : ''
                                }`}
                              >
                                <div
                                  className={`flex items-start gap-2 ${
                                    isCorrectOption
                                      ? 'text-success'
                                      : wasWrongPick
                                      ? 'text-error'
                                      : 'text-text-secondary'
                                  }`}
                                >
                                  <span className="shrink-0 mt-0.5">
                                    {isCorrectOption ? (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : wasWrongPick ? (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    ) : (
                                      <span className="w-4 h-4 inline-block" />
                                    )}
                                  </span>
                                  <span>{option.text}</span>
                                </div>
                                {wasWrongPick && question.incorrectExplanations[option.id] && (
                                  <div className="mt-1 ml-6 text-xs text-error/80 leading-relaxed">
                                    {question.incorrectExplanations[option.id]}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                          <p className="text-xs font-medium text-text-secondary mb-1">Explicacion:</p>
                          <p className="text-sm text-text-primary leading-relaxed">{question.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredQuestions.length === 0 && selectedDomain !== null && (
              <div className="text-center py-8">
                <p className="text-text-secondary">No hay errores en este dominio.</p>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-card-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-text-secondary mt-3">No hay errores registrados.</p>
            <p className="text-text-secondary text-sm mt-1">
              Comienza un quiz para practicar.
            </p>
            <Link href="/" className="inline-block mt-4 px-6 py-2 bg-accent text-black font-semibold rounded-lg">
              Iniciar Quiz
            </Link>
          </div>
        )}

        <div className="h-8" />
      </main>
    </div>
  );
}
