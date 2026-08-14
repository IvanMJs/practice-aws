'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { domains } from '@/data/questions';
import { topics } from '@/data/topics';
import { getResults, getDomainStats, clearResults, getStreak, getBookmarks, getDailyStatsHistory } from '@/lib/storage';
import type { QuizResult, StudyStreak } from '@/types';

function HomePage() {
  const router = useRouter();
  const [selectedDomains, setSelectedDomains] = useState<number[]>([1, 2, 3, 4, 5]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [showConfig, setShowConfig] = useState(false);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [recentResults, setRecentResults] = useState<QuizResult[]>([]);
  const [domainStats, setDomainStats] = useState<Record<number, { correct: number; total: number; attempts: number }>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [streak, setStreak] = useState<StudyStreak>({ currentStreak: 0, longestStreak: 0, lastStudyDate: '' });
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [totalTimeStudied, setTotalTimeStudied] = useState(0);

  useEffect(() => {
    const results = getResults();
    setAllResults(results);
    setRecentResults(results.slice(0, 5));
    setDomainStats(getDomainStats());
    setStreak(getStreak());
    setBookmarkCount(getBookmarks().length);
    const dailyStats = getDailyStatsHistory();
    const totalTime = dailyStats.reduce((sum, d) => sum + d.timeSpent, 0);
    setTotalTimeStudied(totalTime);
  }, []);

  const toggleDomain = useCallback((domainId: number) => {
    setSelectedDomains(prev => {
      if (prev.includes(domainId)) {
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== domainId);
      }
      return [...prev, domainId];
    });
  }, []);

  const toggleTopic = useCallback((topicId: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(t => t !== topicId);
      }
      return [...prev, topicId];
    });
  }, []);

  const availableTopics = topics.filter(t => selectedDomains.includes(t.domainId));

  const startQuiz = useCallback(() => {
    const params = new URLSearchParams();
    params.set('domains', selectedDomains.join(','));
    params.set('count', questionCount.toString());
    params.set('mode', mode);
    if (selectedTopics.length > 0) {
      params.set('topics', selectedTopics.join(','));
    }
    router.push(`/quiz?${params.toString()}`);
  }, [selectedDomains, questionCount, mode, selectedTopics, router]);

  const startExamSimulation = useCallback(() => {
    const params = new URLSearchParams();
    params.set('domains', '1,2,3,4,5');
    params.set('count', '65');
    params.set('mode', 'exam');
    params.set('exam-sim', 'true');
    router.push(`/quiz?${params.toString()}`);
  }, [router]);

  const totalCorrect = allResults.reduce((s, r) => s + r.score, 0);
  const totalQuestions = allResults.reduce((s, r) => s + r.total, 0);
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const handleClearResults = useCallback(() => {
    clearResults();
    setAllResults([]);
    setRecentResults([]);
    setDomainStats({});
    setShowClearConfirm(false);
  }, []);

  // Readiness Score Calculation
  const readinessData = useMemo(() => {
    // 1. Domain coverage (20 pts): attempted questions from all 5 domains
    const domainsAttempted = [1, 2, 3, 4, 5].filter(d => domainStats[d] && domainStats[d].total > 0);
    const domainCoverageScore = Math.round((domainsAttempted.length / 5) * 20);

    // 2. Accuracy (30 pts): overall accuracy scaled
    const accuracyScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 30) : 0;

    // 3. Volume (20 pts): total questions answered, max at 200+
    const volumeScore = Math.min(20, Math.round((totalQuestions / 200) * 20));

    // 4. Consistency (15 pts): quizzes completed, max at 10+
    const consistencyScore = Math.min(15, Math.round((allResults.length / 10) * 15));

    // 5. Simulations (15 pts): at least 2 exam sims with 70%+
    const examSims = allResults.filter(r =>
      r.config.mode === 'exam' &&
      r.config.questionCount === 65 &&
      r.config.domains.length === 5
    );
    const passedSims = examSims.filter(r => (r.score / r.total) >= 0.7);
    const simScore = Math.min(15, Math.round((Math.min(passedSims.length, 2) / 2) * 15));

    const score = domainCoverageScore + accuracyScore + volumeScore + consistencyScore + simScore;

    const checklist = [
      {
        label: 'Cobertura de dominios',
        met: domainsAttempted.length === 5,
        detail: `${domainsAttempted.length}/5 dominios`,
      },
      {
        label: 'Precision general',
        met: overallPct >= 70,
        detail: `${overallPct}% (objetivo: 70%)`,
      },
      {
        label: 'Volumen de practica',
        met: totalQuestions >= 200,
        detail: `${totalQuestions}/200 preguntas`,
      },
      {
        label: 'Consistencia',
        met: allResults.length >= 10,
        detail: `${allResults.length}/10 quizzes`,
      },
      {
        label: 'Simulacros aprobados',
        met: passedSims.length >= 2,
        detail: `${passedSims.length}/2 con 70%+`,
      },
    ];

    return { score, checklist };
  }, [allResults, domainStats, totalQuestions, totalCorrect, overallPct]);

  const getDomainGradient = (domainId: number) => {
    const gradients: Record<number, string> = {
      1: 'from-blue-500/20 to-blue-600/5',
      2: 'from-purple-500/20 to-purple-600/5',
      3: 'from-orange-500/20 to-orange-600/5',
      4: 'from-green-500/20 to-green-600/5',
      5: 'from-red-500/20 to-red-600/5',
    };
    return gradients[domainId] ?? 'from-gray-500/20 to-gray-600/5';
  };

  const getDomainBorder = (domainId: number) => {
    const borders: Record<number, string> = {
      1: 'border-blue-500/30',
      2: 'border-purple-500/30',
      3: 'border-orange-500/30',
      4: 'border-green-500/30',
      5: 'border-red-500/30',
    };
    return borders[domainId] ?? 'border-gray-500/30';
  };

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

  const formatStudyTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">&#9729;&#65039;</span>
              <div>
                <h1 className="text-lg font-bold text-text-primary sm:text-xl">AWS AIF-C01 Practice</h1>
                <p className="text-xs text-text-secondary sm:text-sm">Certified AI Practitioner</p>
              </div>
            </div>
            {/* Desktop nav links */}
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/progress" className="text-sm text-text-secondary hover:text-accent transition-colors">Progreso</Link>
              <Link href="/study" className="text-sm text-text-secondary hover:text-accent transition-colors">Estudiar</Link>
              <Link href="/flashcards" className="text-sm text-text-secondary hover:text-accent transition-colors">Flashcards</Link>
              <Link href="/comparaciones" className="text-sm text-text-secondary hover:text-accent transition-colors">Comparaciones</Link>
              <Link href="/bookmarks" className="text-sm text-text-secondary hover:text-accent transition-colors relative">
                Marcados
                {bookmarkCount > 0 && (
                  <span className="absolute -top-2 -right-4 bg-accent text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {bookmarkCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Streak Banner */}
        {streak.currentStreak > 0 && (
          <div className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-3xl">&#128293;</span>
              <div>
                <div className="text-lg font-bold text-accent">Racha: {streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'}</div>
                <div className="text-xs text-text-secondary">Record: {streak.longestStreak} dias</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Bar */}
        {totalQuestions > 0 && (
          <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Progreso General</h3>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-text-secondary hover:text-error transition-colors"
              >
                Borrar datos
              </button>
            </div>
            {showClearConfirm && (
              <div className="mb-3 p-3 bg-error/10 border border-error/30 rounded-lg flex items-center justify-between gap-2">
                <span className="text-sm text-error">Se borraran todos los resultados</span>
                <div className="flex gap-2">
                  <button onClick={handleClearResults} className="text-xs px-3 py-1 bg-error text-white rounded-md hover:bg-error/80 transition-colors">Confirmar</button>
                  <button onClick={() => setShowClearConfirm(false)} className="text-xs px-3 py-1 bg-card-border text-text-secondary rounded-md hover:bg-card-border/80 transition-colors">Cancelar</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-accent">{overallPct}%</div>
                <div className="text-xs text-text-secondary">Precision</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">{totalQuestions}</div>
                <div className="text-xs text-text-secondary">Preguntas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">{allResults.length}</div>
                <div className="text-xs text-text-secondary">Quizzes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">{formatStudyTime(totalTimeStudied)}</div>
                <div className="text-xs text-text-secondary">Estudiado</div>
              </div>
            </div>
          </section>
        )}

        {/* Readiness Assessment */}
        {totalQuestions > 0 && (
          <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Evaluacion de Preparacion</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Circular Progress Ring */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                  {/* Background circle */}
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="currentColor"
                    className="text-card-border"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="currentColor"
                    className={
                      readinessData.score >= 75 ? 'text-success' :
                      readinessData.score >= 50 ? 'text-accent' :
                      'text-error'
                    }
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(readinessData.score / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${
                    readinessData.score >= 75 ? 'text-success' :
                    readinessData.score >= 50 ? 'text-accent' :
                    'text-error'
                  }`}>
                    {readinessData.score}%
                  </span>
                  <span className="text-[10px] text-text-secondary">READINESS</span>
                </div>
              </div>

              {/* Status + Checklist */}
              <div className="flex-1 w-full space-y-3">
                <div className={`text-sm font-semibold ${
                  readinessData.score >= 75 ? 'text-success' :
                  readinessData.score >= 50 ? 'text-accent' :
                  'text-error'
                }`}>
                  {readinessData.score >= 75
                    ? 'Listo para rendir'
                    : readinessData.score >= 50
                    ? 'Casi listo — segui practicando'
                    : 'Necesitas mas practica'}
                </div>
                <div className="space-y-1.5">
                  {readinessData.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        item.met
                          ? 'bg-success/20 text-success'
                          : 'bg-error/20 text-error'
                      }`}>
                        {item.met ? '✓' : '✗'}
                      </span>
                      <span className="text-text-primary flex-1">{item.label}</span>
                      <span className="text-xs text-text-secondary">{item.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Hero */}
        <section className="text-center space-y-2 py-4">
          <h2 className="text-xl font-bold text-text-primary sm:text-2xl">
            Practica para AWS Certified AI Practitioner
          </h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl mx-auto">
            Prepara tu examen AIF-C01 con preguntas de practica organizadas por dominio.
            Modo practica con retroalimentacion inmediata o modo examen simulado.
          </p>
        </section>

        {/* Action Buttons Row */}
        <section className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-black font-bold px-8 py-3 rounded-xl text-base transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-accent/25 active:scale-95 min-h-12"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showConfig ? 'Ocultar Configuracion' : 'Iniciar Quiz'}
          </button>
          <button
            onClick={startExamSimulation}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-6 py-3 rounded-xl text-base transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 min-h-12"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Simulacro de Examen
          </button>
        </section>

        {/* Domain Cards */}
        <section>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Dominios del Examen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {domains.map(domain => {
              const stats = domainStats[domain.id];
              const pct = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              return (
                <div
                  key={domain.id}
                  className={`bg-gradient-to-br ${getDomainGradient(domain.id)} bg-card border ${getDomainBorder(domain.id)} rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{domain.icon}</span>
                    <span className="text-xs font-medium text-text-secondary bg-background/50 px-2 py-0.5 rounded-full">
                      {domain.percentage}% del examen
                    </span>
                  </div>
                  <h4 className="font-semibold text-text-primary text-sm mb-1">{domain.name}</h4>
                  <p className="text-xs text-text-secondary mb-3 line-clamp-2">{domain.description}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">
                        {stats ? `${stats.correct}/${stats.total} correctas` : 'Sin intentos'}
                      </span>
                      {stats && stats.total > 0 && (
                        <span className="text-text-primary font-medium">{pct}%</span>
                      )}
                    </div>
                    <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getDomainBarColor(domain.id)} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Config Section */}
        {showConfig && (
          <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6 space-y-5 animate-slide-down">
            <h3 className="font-semibold text-text-primary text-base">Configurar Quiz</h3>

            {/* Domain Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Dominios</label>
              <div className="space-y-2">
                {domains.map(domain => (
                  <label
                    key={domain.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedDomains.includes(domain.id)
                        ? `${getDomainBorder(domain.id)} bg-card`
                        : 'border-card-border bg-background/50 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDomains.includes(domain.id)}
                      onChange={() => toggleDomain(domain.id)}
                      className="w-4 h-4 rounded accent-accent"
                    />
                    <span className="text-lg">{domain.icon}</span>
                    <span className="text-sm text-text-primary flex-1">{domain.name}</span>
                    <span className="text-xs text-text-secondary">{domain.percentage}%</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Topic Selection */}
            {availableTopics.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Temas (opcional - deja vacio para todos)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedDomains.map(domainId => {
                    const domainTopics = availableTopics.filter(t => t.domainId === domainId);
                    const domain = domains.find(d => d.id === domainId);
                    if (domainTopics.length === 0) return null;
                    return domainTopics.map(topic => (
                      <label
                        key={topic.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all duration-200 text-xs ${
                          selectedTopics.includes(topic.id)
                            ? 'border-accent/50 bg-accent/10'
                            : 'border-card-border bg-background/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTopics.includes(topic.id)}
                          onChange={() => toggleTopic(topic.id)}
                          className="w-3 h-3 rounded accent-accent"
                        />
                        <span className="text-text-secondary">{domain?.icon}</span>
                        <span className="text-text-primary">{topic.name}</span>
                      </label>
                    ));
                  })}
                </div>
              </div>
            )}

            {/* Question Count */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Numero de preguntas</label>
              <div className="flex flex-wrap gap-2">
                {[10, 20, 40, 60].map(count => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-10 ${
                      questionCount === count
                        ? 'bg-accent text-black'
                        : 'bg-background border border-card-border text-text-secondary hover:border-accent/50 hover:text-text-primary'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Modo</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('practice')}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                    mode === 'practice'
                      ? 'border-accent bg-accent/10'
                      : 'border-card-border bg-background/50 hover:border-accent/30'
                  }`}
                >
                  <div className="font-medium text-sm text-text-primary">Practica</div>
                  <div className="text-xs text-text-secondary mt-1">Retroalimentacion inmediata por pregunta</div>
                </button>
                <button
                  onClick={() => setMode('exam')}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                    mode === 'exam'
                      ? 'border-accent bg-accent/10'
                      : 'border-card-border bg-background/50 hover:border-accent/30'
                  }`}
                >
                  <div className="font-medium text-sm text-text-primary">Examen</div>
                  <div className="text-xs text-text-secondary mt-1">Resultados al final del quiz</div>
                </button>
              </div>
            </div>

            {/* Start */}
            <button
              onClick={startQuiz}
              className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-3 rounded-xl text-base transition-all duration-200 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] min-h-12"
            >
              Comenzar ({questionCount} preguntas)
            </button>
          </section>
        )}

        {/* Recent Results */}
        {recentResults.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Resultados Recientes</h3>
            <div className="space-y-2">
              {recentResults.map(result => {
                const pct = Math.round((result.score / result.total) * 100);
                const color = pct >= 80 ? 'text-success' : pct >= 60 ? 'text-accent' : 'text-error';
                const mins = Math.floor(result.timeSpent / 60);
                const secs = result.timeSpent % 60;
                return (
                  <div
                    key={result.id}
                    className="bg-card border border-card-border rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${color}`}>{pct}%</span>
                        <span className="text-xs text-text-secondary">
                          {result.score}/{result.total} correctas
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {result.config.mode === 'practice' ? 'Practica' : 'Examen'} &middot; {mins}:{secs.toString().padStart(2, '0')} &middot; {new Date(result.date).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/results?id=${result.id}`)}
                      className="text-xs text-accent hover:text-accent-hover transition-colors whitespace-nowrap ml-2"
                    >
                      Ver detalle
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
