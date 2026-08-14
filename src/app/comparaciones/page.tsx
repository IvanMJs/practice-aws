'use client';

import { useState } from 'react';
import Link from 'next/link';
import { comparisons, type Comparison } from '@/data/comparisons';

function ComparisonCard({ comparison }: { comparison: Comparison }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden transition-all duration-200">
      {/* Header (always visible) */}
      <button
        onClick={() => setIsExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-surface/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary text-sm sm:text-base">{comparison.title}</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {comparison.items.map((item, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-text-secondary shrink-0 ml-3 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="border-t border-card-border animate-slide-down">
          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left p-3 sm:p-4 text-text-secondary font-medium text-xs uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Criterio
                  </th>
                  {comparison.items.map((item, i) => (
                    <th
                      key={i}
                      className="text-left p-3 sm:p-4 text-accent font-medium text-xs uppercase tracking-wider whitespace-nowrap min-w-[160px]"
                    >
                      {item}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.criteria.map((row, ri) => (
                  <tr
                    key={ri}
                    className={`border-b border-card-border/50 ${
                      ri % 2 === 0 ? 'bg-background/30' : ''
                    }`}
                  >
                    <td className="p-3 sm:p-4 text-text-secondary font-medium whitespace-nowrap align-top">
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="p-3 sm:p-4 text-text-primary align-top">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* When to use */}
          <div className="p-4 sm:p-5 space-y-3 border-t border-card-border bg-surface/30">
            <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Cuando usar cada uno
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {comparison.whenToUse.map((w, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-card-border bg-card p-3 sm:p-4"
                >
                  <div className="text-sm font-semibold text-accent mb-2">{w.item}</div>
                  <p className="text-xs text-text-secondary leading-relaxed">{w.use}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparacionesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = comparisons.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      c.items.some(item => item.toLowerCase().includes(term)) ||
      c.criteria.some(cr =>
        cr.label.toLowerCase().includes(term) ||
        cr.values.some(v => v.toLowerCase().includes(term))
      )
    );
  });

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-card-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-text-secondary hover:text-accent transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-text-primary">Comparaciones</h1>
                <p className="text-xs text-text-secondary">Servicios y conceptos AWS comparados</p>
              </div>
            </div>
            <span className="text-xs text-text-secondary bg-card border border-card-border px-2.5 py-1 rounded-full">
              {comparisons.length} comparaciones
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Search + expand all */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar comparaciones..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-card-border text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary">No se encontraron comparaciones para &quot;{searchTerm}&quot;</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => (
              <ComparisonCard key={c.id} comparison={c} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom spacer for mobile nav */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
