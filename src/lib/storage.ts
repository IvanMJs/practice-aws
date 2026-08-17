import type { QuizResult, DailyStats, StudyStreak } from "@/types";

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
    localStorage.removeItem('aws-aif-c01-used-questions');
    localStorage.removeItem('aws-aif-c01-wrong-answers');
    localStorage.removeItem('aws-aif-c01-daily-stats');
    localStorage.removeItem('aws-aif-c01-streak');
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
  const trimmed = combined.slice(0, 450);
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

// ==================
// Bookmarks
// ==================
const BOOKMARKS_KEY = 'aws-aif-c01-bookmarks';

export function getBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function toggleBookmark(questionId: string): boolean {
  const bookmarks = getBookmarks();
  const idx = bookmarks.indexOf(questionId);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return false;
  } else {
    bookmarks.push(questionId);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return true;
  }
}

export function isBookmarked(questionId: string): boolean {
  return getBookmarks().includes(questionId);
}

// ==================
// Daily Stats
// ==================
const DAILY_STATS_KEY = 'aws-aif-c01-daily-stats';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function recordDailyStats(questionsAnswered: number, correctAnswers: number, timeSpent: number): void {
  if (typeof window === 'undefined') return;
  const history = getDailyStatsHistory();
  const today = getTodayStr();
  const existing = history.find(d => d.date === today);
  if (existing) {
    existing.questionsAnswered += questionsAnswered;
    existing.correctAnswers += correctAnswers;
    existing.timeSpent += timeSpent;
  } else {
    history.push({ date: today, questionsAnswered, correctAnswers, timeSpent });
  }
  // Keep last 30 days
  const sorted = history.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(sorted));
}

export function getDailyStatsHistory(): DailyStats[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DAILY_STATS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DailyStats[];
  } catch {
    return [];
  }
}

// ==================
// Study Streak
// ==================
const STREAK_KEY = 'aws-aif-c01-streak';

export function getStreak(): StudyStreak {
  if (typeof window === 'undefined') return { currentStreak: 0, longestStreak: 0, lastStudyDate: '' };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { currentStreak: 0, longestStreak: 0, lastStudyDate: '' };
    return JSON.parse(raw) as StudyStreak;
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: '' };
  }
}

export function updateStreak(): void {
  if (typeof window === 'undefined') return;
  const streak = getStreak();
  const today = getTodayStr();

  if (streak.lastStudyDate === today) return; // Already updated today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (streak.lastStudyDate === yesterdayStr) {
    streak.currentStreak += 1;
  } else {
    streak.currentStreak = 1;
  }

  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  streak.lastStudyDate = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

// ==================
// Spaced Repetition - Wrong Answers
// ==================
const WRONG_ANSWERS_KEY = 'aws-aif-c01-wrong-answers';

export function recordWrongAnswers(questionIds: string[]): void {
  if (typeof window === 'undefined') return;
  const freq = getFrequentlyWrong();
  for (const id of questionIds) {
    freq[id] = (freq[id] || 0) + 1;
  }
  localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(freq));
}

export function recordCorrectAnswer(questionId: string): void {
  if (typeof window === 'undefined') return;
  const data = getFrequentlyWrong();
  if (data[questionId]) {
    data[questionId]--;
    if (data[questionId] <= 0) {
      delete data[questionId];
    }
    localStorage.setItem(WRONG_ANSWERS_KEY, JSON.stringify(data));
  }
}

export function getFrequentlyWrong(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WRONG_ANSWERS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}
