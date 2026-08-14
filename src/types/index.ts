export interface Question {
  id: string;
  domain: number; // 1-5
  topic: string;
  question: string;
  options: Option[];
  correctAnswers: string[]; // array of option IDs
  type: 'single' | 'multiple'; // single choice or multiple choice
  explanation: string; // why the correct answer is correct
  incorrectExplanations: Record<string, string>; // optionId -> why this wrong answer is wrong
}

export interface Option {
  id: string;
  text: string;
}

export interface Domain {
  id: number;
  name: string;
  description: string;
  percentage: number;
  icon: string; // emoji
  color: string; // tailwind color class
}

export interface QuizConfig {
  domains: number[];
  questionCount: number;
  mode: 'practice' | 'exam';
}

export interface QuizResult {
  id: string;
  date: string;
  config: QuizConfig;
  answers: Record<string, string[]>;
  score: number;
  total: number;
  timeSpent: number;
  domainScores: Record<number, { correct: number; total: number }>;
}

export interface QuizState {
  currentIndex: number;
  questions: Question[];
  answers: Record<string, string[]>;
  submitted: Record<string, boolean>;
  startTime: number;
  config: QuizConfig;
}

export interface TopicResource {
  name: string;
  description: string;
  urls: { label: string; url: string }[];
}

export interface DomainAnalysis {
  domainId: number;
  correct: number;
  total: number;
  percentage: number;
  status: 'strong' | 'medium' | 'weak';
  resources: TopicResource[];
}

export interface TopicDefinition {
  id: string;
  name: string;
  domainId: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  questionsAnswered: number;
  correctAnswers: number;
  timeSpent: number;
}

export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
}
