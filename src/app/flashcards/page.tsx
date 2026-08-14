'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { flashcards, type Flashcard } from '@/data/flashcards';

const STORAGE_KEY = 'flashcard-known';

const domainNames: Record<number, string> = {
  1: 'Fundamentos de IA/ML',
  2: 'IA Generativa',
  3: 'Aplicaciones de IA',
  4: 'IA Responsable',
  5: 'Seguridad y Gobernanza',
};

const domainColors: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  2: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  3: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  4: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
  5: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
};

function getKnown(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveKnown(known: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...known]));
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function FlashcardsPage() {
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [selectedDomains, setSelectedDomains] = useState<number[]>([1, 2, 3, 4, 5]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>(flashcards);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setKnown(getKnown());
    setMounted(true);
  }, []);

  const filteredCards = useMemo(() => {
    return cards.filter(c => selectedDomains.includes(c.domain));
  }, [cards, selectedDomains]);

  const currentCard = filteredCards[currentIndex] ?? null;

  const toggleDomain = useCallback((d: number) => {
    setSelectedDomains(prev => {
      const next = prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d];
      if (next.length === 0) return prev;
      return next;
    });
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= filteredCards.length) return;
    setCurrentIndex(index);
    setIsFlipped(false);
  }, [filteredCards.length]);

  const handleShuffle = useCallback(() => {
    setCards(shuffleArray(flashcards));
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const markKnown = useCallback((cardId: string, isKnown: boolean) => {
    setKnown(prev => {
      const next = new Set(prev);
      if (isKnown) {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }
      saveKnown(next);
      return next;
    });
    // Advance to next card
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(i => i + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, filteredCards.length]);

  const knownInFiltered = useMemo(() => {
    return filteredCards.filter(c => known.has(c.id)).length;
  }, [filteredCards, known]);

  const progressPct = filteredCards.length > 0
    ? Math.round((knownInFiltered / filteredCards.length) * 100)
    : 0;

  if (!mounted) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-text-secondary hover:text-accent transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-text-primary">Flashcards</h1>
                <p className="text-xs text-text-secondary">Servicios y conceptos AWS</p>
              </div>
            </div>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors px-3 py-1.5 rounded-lg border border-card-border hover:border-accent/50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Mezclar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Domain filters */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map(d => {
            const colors = domainColors[d];
            const isActive = selectedDomains.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleDomain(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  isActive
                    ? `${colors.bg} ${colors.border} ${colors.text}`
                    : 'bg-background border-card-border text-text-secondary opacity-50'
                }`}
              >
                D{d}
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{knownInFiltered} de {filteredCards.length} conocidas</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-card border border-card-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">No hay tarjetas para los dominios seleccionados.</p>
          </div>
        ) : currentCard ? (
          <>
            {/* Card counter */}
            <div className="text-center text-sm text-text-secondary">
              {currentIndex + 1}/{filteredCards.length}
            </div>

            {/* Flashcard */}
            <div
              className="relative w-full cursor-pointer"
              style={{ perspective: '1200px' }}
              onClick={() => setIsFlipped(f => !f)}
            >
              <div
                className="relative w-full transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  minHeight: '280px',
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-2xl border border-card-border bg-card p-6 sm:p-8 flex flex-col items-center justify-center gap-4"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-5xl sm:text-6xl">{currentCard.emoji}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-text-primary text-center">
                    {currentCard.front}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border ${domainColors[currentCard.domain]?.bg} ${domainColors[currentCard.domain]?.border} ${domainColors[currentCard.domain]?.text}`}>
                      D{currentCard.domain}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-card-border text-text-secondary">
                      {currentCard.category === 'service' ? 'Servicio' : 'Concepto'}
                    </span>
                    {known.has(currentCard.id) && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-success/20 text-success border border-success/30">
                        Conocida
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-2">Toca para voltear</p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl border border-card-border bg-card p-6 sm:p-8 flex flex-col overflow-y-auto"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <h3 className="text-lg font-bold text-accent mb-4">{currentCard.front}</h3>
                  <ul className="space-y-2.5 flex-1">
                    {currentCard.back.map((point, i) => (
                      <li key={i} className="flex gap-2 text-sm text-text-primary">
                        <span className="text-accent mt-0.5 shrink-0">&#9656;</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-text-secondary mt-4 text-center">Toca para voltear</p>
                </div>
              </div>
            </div>

            {/* Conozco / No conozco */}
            <div className="flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); markKnown(currentCard.id, false); }}
                className="flex-1 py-3 rounded-xl border border-error/30 bg-error/10 text-error font-semibold text-sm hover:bg-error/20 transition-all duration-200 active:scale-95"
              >
                No conozco
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); markKnown(currentCard.id, true); }}
                className="flex-1 py-3 rounded-xl border border-success/30 bg-success/10 text-success font-semibold text-sm hover:bg-success/20 transition-all duration-200 active:scale-95"
              >
                Conozco
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => goTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-card-border text-text-secondary hover:text-text-primary hover:border-accent/50 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Anterior
              </button>
              <button
                onClick={() => goTo(currentIndex + 1)}
                disabled={currentIndex === filteredCards.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-card-border text-text-secondary hover:text-text-primary hover:border-accent/50 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Siguiente
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </>
        ) : null}
      </main>

      {/* Bottom spacer for mobile nav */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
