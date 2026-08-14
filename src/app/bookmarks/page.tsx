'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { questions as allQuestions, domains } from '@/data/questions';
import { topics } from '@/data/topics';
import { getBookmarks, toggleBookmark } from '@/lib/storage';
import type { Question } from '@/types';

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Question[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const loadBookmarks = useCallback(() => {
    const bookmarkIds = getBookmarks();
    const questions = bookmarkIds
      .map(id => allQuestions.find(q => q.id === id))
      .filter((q): q is Question => q !== undefined);
    setBookmarkedQuestions(questions);
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const toggleExpand = (qId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const removeBookmark = (questionId: string) => {
    toggleBookmark(questionId);
    loadBookmarks();
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const startBookmarkedQuiz = () => {
    if (bookmarkedQuestions.length === 0) return;
    // Pass bookmark IDs via URL
    const params = new URLSearchParams();
    params.set('domains', '1,2,3,4,5');
    params.set('count', bookmarkedQuestions.length.toString());
    params.set('mode', 'practice');
    params.set('bookmarks', 'true');
    router.push(`/quiz?${params.toString()}`);
  };

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
            <h1 className="text-lg font-bold text-text-primary">Preguntas Marcadas</h1>
          </div>
          <span className="text-sm text-text-secondary">{bookmarkedQuestions.length} marcadas</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Practice Bookmarked button */}
        {bookmarkedQuestions.length > 0 && (
          <button
            onClick={startBookmarkedQuiz}
            className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-3 rounded-xl text-base transition-all duration-200 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] min-h-12 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Practicar marcados ({bookmarkedQuestions.length} preguntas)
          </button>
        )}

        {/* Bookmarked Questions */}
        {bookmarkedQuestions.length > 0 ? (
          <div className="space-y-2">
            {bookmarkedQuestions.map(question => {
              const isExpanded = expandedQuestions.has(question.id);
              const domain = domains.find(d => d.id === question.domain);
              const topic = topics.find(t => t.id === question.topic);

              return (
                <div key={question.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
                  <div className="flex items-start">
                    <button
                      onClick={() => toggleExpand(question.id)}
                      className="flex-1 text-left p-3 sm:p-4 flex items-start gap-3 hover:bg-surface/50 transition-colors"
                    >
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
                    <button
                      onClick={() => removeBookmark(question.id)}
                      className="p-3 text-accent hover:text-error transition-colors shrink-0"
                      title="Quitar marcador"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-card-border p-3 sm:p-4 space-y-3 animate-fade-in bg-background/30">
                      {/* Options */}
                      <div className="space-y-1.5">
                        {question.options.map(option => {
                          const isCorrectOption = question.correctAnswers.includes(option.id);
                          return (
                            <div key={option.id} className={`text-sm p-2 rounded-lg ${isCorrectOption ? 'bg-success/5' : ''}`}>
                              <div className={`flex items-start gap-2 ${isCorrectOption ? 'text-success' : 'text-text-secondary'}`}>
                                <span className="shrink-0 mt-0.5">
                                  {isCorrectOption ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <span className="w-4 h-4 inline-block" />
                                  )}
                                </span>
                                <span>{option.text}</span>
                              </div>
                              {!isCorrectOption && question.incorrectExplanations[option.id] && (
                                <div className="mt-1 ml-6 text-xs text-text-secondary leading-relaxed">
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
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-card-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-text-secondary mt-3">No tienes preguntas marcadas.</p>
            <p className="text-text-secondary text-sm mt-1">
              Usa el icono de marcador durante un quiz para guardar preguntas importantes.
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
