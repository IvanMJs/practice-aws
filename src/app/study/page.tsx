'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { domains } from '@/data/questions';
import { cheatsheets } from '@/data/cheatsheets';

export default function StudyPage() {
  const router = useRouter();
  const [selectedDomain, setSelectedDomain] = useState(1);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const currentSheet = cheatsheets.find(s => s.domainId === selectedDomain);
  const currentDomain = domains.find(d => d.id === selectedDomain);

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (currentSheet) {
      setExpandedSections(new Set(currentSheet.sections.map((_, i) => i)));
    }
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const startDomainQuiz = () => {
    const params = new URLSearchParams();
    params.set('domains', selectedDomain.toString());
    params.set('count', '20');
    params.set('mode', 'practice');
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
            <h1 className="text-lg font-bold text-text-primary">Cheat Sheets</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Study Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/flashcards"
            className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/30 rounded-xl p-4 hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">&#127183;</span>
              <div>
                <h3 className="font-semibold text-text-primary text-sm">Flashcards</h3>
                <p className="text-xs text-text-secondary">50+ tarjetas interactivas</p>
              </div>
            </div>
          </Link>
          <Link
            href="/comparaciones"
            className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/30 rounded-xl p-4 hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">&#128200;</span>
              <div>
                <h3 className="font-semibold text-text-primary text-sm">Comparaciones</h3>
                <p className="text-xs text-text-secondary">Tablas comparativas de servicios</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Domain Selector */}
        <div className="flex flex-wrap gap-2">
          {domains.map(domain => (
            <button
              key={domain.id}
              onClick={() => {
                setSelectedDomain(domain.id);
                setExpandedSections(new Set([0]));
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-11 ${
                selectedDomain === domain.id
                  ? 'bg-accent text-black'
                  : 'bg-card border border-card-border text-text-secondary hover:border-accent/40 hover:text-text-primary'
              }`}
            >
              <span>{domain.icon}</span>
              <span className="hidden sm:inline">{domain.name}</span>
              <span className="sm:hidden">D{domain.id}</span>
            </button>
          ))}
        </div>

        {/* Current Domain Header */}
        {currentDomain && currentSheet && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary">{currentDomain.icon} {currentSheet.title}</h2>
              <p className="text-sm text-text-secondary mt-1">Dominio {selectedDomain} - {currentDomain.percentage}% del examen</p>
            </div>
            <div className="flex gap-2">
              <button onClick={expandAll} className="text-xs text-accent hover:text-accent-hover transition-colors">Expandir todo</button>
              <span className="text-card-border">|</span>
              <button onClick={collapseAll} className="text-xs text-text-secondary hover:text-text-primary transition-colors">Colapsar</button>
            </div>
          </div>
        )}

        {/* Cheat Sheet Sections */}
        {currentSheet && (
          <div className="space-y-3">
            {currentSheet.sections.map((section, idx) => {
              const isExpanded = expandedSections.has(idx);
              return (
                <div key={idx} className="bg-card border border-card-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection(idx)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-surface/50 transition-colors min-h-12"
                  >
                    <h3 className="font-semibold text-text-primary text-sm sm:text-base">{section.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">{section.items.length} items</span>
                      <svg
                        className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-card-border p-4 animate-fade-in">
                      <ul className="space-y-2.5">
                        {section.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2.5">
                            <span className="text-accent mt-1 shrink-0">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-sm text-text-primary leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Practice Button */}
        <button
          onClick={startDomainQuiz}
          className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-3 rounded-xl text-base transition-all duration-200 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] min-h-12"
        >
          Practicar este dominio ({currentDomain?.name})
        </button>

        <div className="h-8" />
      </main>
    </div>
  );
}
