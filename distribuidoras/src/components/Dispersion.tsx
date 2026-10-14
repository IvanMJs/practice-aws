"use client";

import { useState } from "react";
import { TIPO_INFO } from "@/lib/criterios";
import type { Tipo } from "@/lib/schema";
import { Marcador } from "./Estado";

export interface PuntoDispersion {
  id: string;
  nombre: string;
  tipo: Tipo;
  anio: number;
  usuarios: number;
  dotacion: number;
  esperado: number | null;
}

const W = 720;
const H = 440;
const M = { t: 16, r: 16, b: 48, l: 76 };

/** Marcas 1-2-5 por década; si el rango abarca muchas décadas, solo potencias de 10. */
const marcas = (min: number, max: number) => {
  const r: number[] = [];
  const pasos = Math.log10(max / min) > 3 ? [1] : [1, 2, 5];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) for (const p of pasos) r.push(p * 10 ** e);
  return r.filter((v) => v >= min && v <= max);
};
const fmt = (n: number) => (n >= 1e6 ? `${n / 1e6} M` : n >= 1e3 ? `${n / 1e3} mil` : String(n));

/** Empleados vs. usuarios en escala log, con la línea de tendencia y color + forma por tipo. */
export function Dispersion({ puntos, tendencia }: { puntos: PuntoDispersion[]; tendencia: { a: number; b: number } | null }) {
  const [activo, setActivo] = useState<string | null>(null);
  const xs = puntos.map((p) => p.usuarios);
  const ys = puntos.flatMap((p) => [p.dotacion, p.esperado ?? p.dotacion]);
  const xMin = Math.min(...xs) / 1.5;
  const xMax = Math.max(...xs) * 1.5;
  const yMin = Math.min(...ys) / 1.5;
  const yMax = Math.max(...ys) * 1.5;
  const sx = (v: number) => M.l + ((Math.log(v) - Math.log(xMin)) / (Math.log(xMax) - Math.log(xMin))) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - ((Math.log(v) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin))) * (H - M.t - M.b);
  const tx = marcas(xMin, xMax);
  const ty = marcas(yMin, yMax);
  const sel = puntos.find((p) => p.id === activo);
  const tipos = [...new Set(puntos.map((p) => p.tipo))];

  return (
    <figure className="rounded-lg border border-line bg-surface p-4">
      <figcaption className="mb-2 flex flex-wrap items-center gap-4 text-sm text-ink-2">
        <span className="font-medium text-ink">Dotación vs. usuarios (escala logarítmica)</span>
        {tipos.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden>
              <Marcador tipo={t} r={5} />
            </svg>
            {TIPO_INFO[t].plural}
          </span>
        ))}
        {tendencia && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="20" height="4" aria-hidden>
              <line x1="0" y1="2" x2="20" y2="2" stroke="var(--ink-3)" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Tendencia
          </span>
        )}
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Gráfico de dispersión de dotación contra usuarios. Los datos están en la tabla siguiente.">
          {tx.map((v) => (
            <g key={`x${v}`}>
              <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={H - M.b} stroke="var(--grid)" />
              <text x={sx(v)} y={H - M.b + 18} textAnchor="middle" fontSize="12" fill="var(--ink-3)">
                {fmt(v)}
              </text>
            </g>
          ))}
          {ty.map((v) => (
            <g key={`y${v}`}>
              <line x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} stroke="var(--grid)" />
              <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="12" fill="var(--ink-3)">
                {fmt(v)}
              </text>
            </g>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
            Usuarios
          </text>
          <text x={14} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize="12" fill="var(--ink-2)" transform={`rotate(-90 14 ${(M.t + H - M.b) / 2})`}>
            Dotación
          </text>
          {tendencia && (
            <line
              x1={sx(xMin)}
              y1={sy(Math.exp(tendencia.a + tendencia.b * Math.log(xMin)))}
              x2={sx(xMax)}
              y2={sy(Math.exp(tendencia.a + tendencia.b * Math.log(xMax)))}
              stroke="var(--ink-3)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          )}
          {sel?.esperado && (
            <line x1={sx(sel.usuarios)} x2={sx(sel.usuarios)} y1={sy(sel.dotacion)} y2={sy(sel.esperado)} stroke="var(--ink-2)" strokeWidth="2" />
          )}
          {puntos.map((p) => (
            <g
              key={p.id}
              tabIndex={0}
              role="button"
              aria-label={`${p.nombre}: ${p.dotacion.toLocaleString("es-AR")} personas de dotación, ${p.usuarios.toLocaleString("es-AR")} usuarios`}
              onMouseEnter={() => setActivo(p.id)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(p.id)}
              onBlur={() => setActivo(null)}
              style={{ cursor: "pointer", outline: "none" }}
            >
              <circle cx={sx(p.usuarios)} cy={sy(p.dotacion)} r={14} fill="transparent" />
              <Marcador tipo={p.tipo} x={sx(p.usuarios)} y={sy(p.dotacion)} r={activo === p.id ? 7 : 5.5} />
            </g>
          ))}
        </svg>
        {sel && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(sx(sel.usuarios) / W) * 100}%`,
              top: `${(sy(sel.dotacion) / H) * 100}%`,
              transform: `translate(${sx(sel.usuarios) > W / 2 ? "calc(-100% - 12px)" : "12px"}, -50%)`,
            }}
          >
            <p className="font-semibold text-ink">
              {sel.nombre} · {sel.anio}
            </p>
            <p className="text-ink-2">Dotación: {sel.dotacion.toLocaleString("es-AR")}</p>
            <p className="text-ink-2">Usuarios: {sel.usuarios.toLocaleString("es-AR")}</p>
            {sel.esperado && <p className="text-ink-2">Esperado (modelo): {Math.round(sel.esperado).toLocaleString("es-AR")}</p>}
          </div>
        )}
      </div>
    </figure>
  );
}
