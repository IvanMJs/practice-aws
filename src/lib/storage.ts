import type { QuizResult } from "@/types";

const RESULTS_KEY = "aws-aif-c01-results";

export function saveResult(result: QuizResult): void {
  const results = getResults();
  results.unshift(result);
  if (typeof window !== "undefined") {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  }
}

export function getResults(): QuizResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuizResult[];
  } catch {
    return [];
  }
}

export function getDomainStats(): Record<
  number,
  { correct: number; total: number; attempts: number }
> {
  const results = getResults();
  const stats: Record<
    number,
    { correct: number; total: number; attempts: number }
  > = {};

  for (const result of results) {
    const domainScores = result.domainScores;
    for (const [domainIdStr, score] of Object.entries(domainScores)) {
      const domainId = Number(domainIdStr);
      if (!stats[domainId]) {
        stats[domainId] = { correct: 0, total: 0, attempts: 0 };
      }
      stats[domainId].correct += score.correct;
      stats[domainId].total += score.total;
      stats[domainId].attempts += 1;
    }
  }

  return stats;
}

export function clearResults(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(RESULTS_KEY);
  }
}

const USED_QUESTIONS_KEY = 'aws-aif-c01-used-questions';

export function getUsedQuestionIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USED_QUESTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function saveUsedQuestionIds(questionIds: string[]): void {
  if (typeof window === 'undefined') return;
  const existing = getUsedQuestionIds();
  const combined = [...new Set([...questionIds, ...existing])];
  // Keep only last 200 to allow rotation
  const trimmed = combined.slice(0, 200);
  localStorage.setItem(USED_QUESTIONS_KEY, JSON.stringify(trimmed));
}

export function clearUsedQuestions(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USED_QUESTIONS_KEY);
  }
}

export function getWeakDomains(): Record<number, { correct: number; total: number; percentage: number }> {
  const results = getResults();
  const stats: Record<number, { correct: number; total: number }> = {};

  // Only consider last 10 quizzes for recency
  const recent = results.slice(0, 10);
  for (const result of recent) {
    for (const [domainIdStr, score] of Object.entries(result.domainScores)) {
      const domainId = Number(domainIdStr);
      if (!stats[domainId]) stats[domainId] = { correct: 0, total: 0 };
      stats[domainId].correct += score.correct;
      stats[domainId].total += score.total;
    }
  }

  const weakDomains: Record<number, { correct: number; total: number; percentage: number }> = {};
  for (const [id, s] of Object.entries(stats)) {
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    weakDomains[Number(id)] = { ...s, percentage: pct };
  }
  return weakDomains;
}
