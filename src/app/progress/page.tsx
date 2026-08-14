'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { domains, questions as allQuestions } from '@/data/questions';
import { topics } from '@/data/topics';
import { getResults, getStreak, getDailyStatsHistory } from '@/lib/storage';
import type { StudyStreak, DailyStats, QuizResult } from '@/types';

export default function ProgressPage() {
  const [streak, setStreak] = useState<StudyStreak>({ currentStreak: 0, longestStreak: 0, lastStudyDate: '' });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);

  useEffect(() => {
    setStreak(getStreak());
    setDailyStats(getDailyStatsHistory());
    setResults(getResults());
  }, []);

  // Compute domain stats from all results
  const domainAcc: Record<number, { correct: number; total: number }> = {};
  for (const r of results) {
    for (const [domainIdStr, score] of Object.entries(r.domainScores)) {
      const domainId = Number(domainIdStr);
      if (!domainAcc[domainId]) domainAcc[domainId] = { correct: 0, total: 0 };
      domainAcc[domainId].correct += score.correct;
      domainAcc[domainId].total += score.total;
    }
  }

  // Topic stats
  const topicAcc: Record<string, { correct: number; total: number }> = {};
  for (const r of results) {
    for (const [qId, userAnswers] of Object.entries(r.answers)) {
      const question = allQuestions.find(q => q.id === qId);
      if (!question) continue;
      const topicId = question.topic || 'sin-tema';
      if (!topicAcc[topicId]) topicAcc[topicId] = { correct: 0, total: 0 };
      topicAcc[topicId].total += 1;
      const isCorrect =
        userAnswers.length === question.correctAnswers.length &&
        question.correctAnswers.every(a => userAnswers.includes(a));
      if (isCorrect) topicAcc[topicId].correct += 1;
    }
  }

  // Total stats
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);
  const totalCorrect = results.reduce((s, r) => s + r.score, 0);
  const totalTimeSeconds = dailyStats.reduce((s, d) => s + d.timeSpent, 0);
  const totalHours = Math.floor(totalTimeSeconds / 3600);
  const totalMins = Math.floor((totalTimeSeconds % 3600) / 60);
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Chart data: fill in last 30 days
  const chartDays: { date: string; label: string; questionsAnswered: number; accuracy: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const stat = dailyStats.find(s => s.date === dateStr);
    const answered = stat?.questionsAnswered ?? 0;
    const accuracy = stat && stat.questionsAnswered > 0
      ? Math.round((stat.correctAnswers / stat.questionsAnswered) * 100)
      : 0;
    chartDays.push({ date: dateStr, label: dayLabel, questionsAnswered: answered, accuracy });
  }

  const maxQuestions = Math.max(...chartDays.map(d => d.questionsAnswered), 1);

  // Weak topics
  const weakTopics = Object.entries(topicAcc)
    .map(([id, stats]) => ({
      id,
      topic: topics.find(t => t.id === id),
      pct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      total: stats.total,
    }))
    .filter(t => t.pct < 70 && t.total >= 2)
    .sort((a, b) => a.pct - b.pct);

  const getDomainBarColor = (domainId: number) => {
    const colors: Record<number, string> = { 1: '#3b82f6', 2: '#a855f7', 3: '#f97316', 4: '#22c55e', 5: '#ef4444' };
    return colors[domainId] ?? '#6b7280';
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
            <h1 className="text-lg font-bold text-text-primary">Progreso</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Streak */}
        <section className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">&#128293;</span>
            <div>
              <div className="text-2xl font-bold text-accent">{streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'}</div>
              <div className="text-sm text-text-secondary">Racha actual</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-text-primary">{streak.longestStreak}</div>
            <div className="text-sm text-text-secondary">Record</div>
          </div>
        </section>

        {/* Total Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Preguntas', value: totalQuestions.toString(), color: 'text-text-primary' },
            { label: 'Precision', value: `${overallPct}%`, color: overallPct >= 70 ? 'text-success' : 'text-accent' },
            { label: 'Tiempo', value: totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`, color: 'text-text-primary' },
            { label: 'Quizzes', value: results.length.toString(), color: 'text-text-primary' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-card-border rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-text-secondary mt-1">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* 30-Day Chart */}
        <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Ultimos 30 dias</h3>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 700 200" className="w-full min-w-[500px]" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(frac => (
                <line key={frac} x1="40" y1={180 - frac * 160} x2="690" y2={180 - frac * 160} stroke="#1e1e2e" strokeWidth="0.5" />
              ))}
              {/* Y axis labels */}
              <text x="35" y="184" textAnchor="end" fill="#a1a1aa" fontSize="8">0</text>
              <text x="35" y="24" textAnchor="end" fill="#a1a1aa" fontSize="8">{maxQuestions}</text>
              {/* Bars */}
              {chartDays.map((day, i) => {
                const barWidth = 18;
                const gap = (650 - 30 * barWidth) / 29;
                const x = 45 + i * (barWidth + gap);
                const height = day.questionsAnswered > 0 ? (day.questionsAnswered / maxQuestions) * 160 : 0;
                const fill = day.questionsAnswered === 0 ? '#1e1e2e'
                  : day.accuracy >= 70 ? '#22c55e'
                  : day.accuracy >= 50 ? '#FF9900'
                  : '#ef4444';
                return (
                  <g key={day.date}>
                    <rect
                      x={x}
                      y={180 - height}
                      width={barWidth}
                      height={Math.max(height, 2)}
                      rx="2"
                      fill={fill}
                      opacity={day.questionsAnswered === 0 ? 0.3 : 0.8}
                    />
                    {/* Show label every 5 days */}
                    {i % 5 === 0 && (
                      <text x={x + barWidth / 2} y="196" textAnchor="middle" fill="#a1a1aa" fontSize="7">
                        {day.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success inline-block" /> &gt;70%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent inline-block" /> 50-70%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-error inline-block" /> &lt;50%</span>
          </div>
        </section>

        {/* Domain Mastery */}
        <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Dominio por Area</h3>
          <div className="space-y-3">
            {domains.map(domain => {
              const stats = domainAcc[domain.id];
              const pct = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              return (
                <div key={domain.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{domain.icon}</span>
                      <span className="text-sm text-text-primary">{domain.name}</span>
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {stats ? `${pct}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="h-3 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: getDomainBarColor(domain.id) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Topic Heatmap */}
        <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Mapa de Temas</h3>
          {domains.map(domain => {
            const domainTopics = topics.filter(t => t.domainId === domain.id);
            return (
              <div key={domain.id} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{domain.icon}</span>
                  <span className="text-xs font-medium text-text-secondary">{domain.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {domainTopics.map(topic => {
                    const stats = topicAcc[topic.id];
                    const pct = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : -1;
                    let bgColor = 'bg-card-border'; // gray = no data
                    let textColor = 'text-text-secondary';
                    if (pct >= 0) {
                      if (pct >= 80) { bgColor = 'bg-success/20'; textColor = 'text-success'; }
                      else if (pct >= 50) { bgColor = 'bg-accent/20'; textColor = 'text-accent'; }
                      else { bgColor = 'bg-error/20'; textColor = 'text-error'; }
                    }
                    return (
                      <span key={topic.id} className={`${bgColor} ${textColor} text-[10px] px-2 py-1 rounded-md`}>
                        {topic.name} {pct >= 0 ? `${pct}%` : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* Weak Topics */}
        {weakTopics.length > 0 && (
          <section className="bg-card border border-card-border rounded-xl p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Temas para Reforzar</h3>
            <div className="space-y-2">
              {weakTopics.map(({ id, topic, pct, total }) => (
                <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-error/5 border border-error/10">
                  <div>
                    <span className="text-sm text-text-primary">{topic?.name || id}</span>
                    <span className="text-xs text-text-secondary ml-2">({total} preguntas)</span>
                  </div>
                  <span className={`text-sm font-bold ${pct < 50 ? 'text-error' : 'text-accent'}`}>{pct}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* No data message */}
        {results.length === 0 && (
          <section className="text-center py-12">
            <span className="text-4xl">&#128200;</span>
            <p className="text-text-secondary mt-3">Aun no hay datos de progreso.</p>
            <p className="text-text-secondary text-sm">Completa tu primer quiz para ver tu progreso aqui.</p>
            <Link href="/" className="inline-block mt-4 px-6 py-2 bg-accent text-black font-semibold rounded-lg">
              Iniciar Quiz
            </Link>
          </section>
        )}

        <div className="h-8" />
      </main>
    </div>
  );
}
