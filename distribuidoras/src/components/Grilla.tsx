"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CRITERIO_INFO, TIPO_INFO } from "@/lib/criterios";
import type { CriterioId, Estado, Tipo } from "@/lib/schema";
import { EstadoBadge, TipoEtiqueta } from "./Estado";

export interface TarjetaDatos {
  id: string;
  nombre: string;
  jurisdiccion: string;
  provincias: string[];
  tipo: Tipo;
  tipo_verificado: boolean;
  criterios: { criterio: CriterioId; estado: Estado; desactualizado: boolean }[];
  indice: { valor: number | null; verificados: number };
  dotacion: "sin_dato" | "fuera_del_modelo" | "por_encima" | "dentro" | "por_debajo";
}

const TEXTO_DOTACION: Record<TarjetaDatos["dotacion"], string> = {
  sin_dato: "Sin dato de dotación",
  fuera_del_modelo: "Dotación cargada, fuera del modelo",
  por_encima: "Dotación por encima de lo esperado para empresas similares",
  dentro: "Dotación dentro del rango esperado",
  por_debajo: "Dotación por debajo de lo esperado para empresas similares",
};

export function Grilla({ tarjetas }: { tarjetas: TarjetaDatos[] }) {
  const [provincia, setProvincia] = useState("");
  const [tipo, setTipo] = useState<"" | Tipo>("");
  const [texto, setTexto] = useState("");

  const provincias = useMemo(() => [...new Set(tarjetas.flatMap((t) => t.provincias))].sort((a, b) => a.localeCompare(b, "es")), [tarjetas]);
  const filtradas = tarjetas.filter(
    (t) =>
      (!provincia || t.provincias.includes(provincia)) &&
      (!tipo || t.tipo === tipo) &&
      (!texto || `${t.nombre} ${t.jurisdiccion}`.toLowerCase().includes(texto.toLowerCase())),
  );

  const control = "rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink";
  return (
    <section aria-labelledby="titulo-grilla">
      <h2 id="titulo-grilla" className="mb-3 text-lg font-semibold">
        Distribuidoras
      </h2>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Provincia
          <select className={control} value={provincia} onChange={(e) => setProvincia(e.target.value)}>
            <option value="">Todas</option>
            {provincias.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Tipo de empresa
          <select className={control} value={tipo} onChange={(e) => setTipo(e.target.value as Tipo | "")}>
            <option value="">Todos</option>
            {(Object.keys(TIPO_INFO) as Tipo[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_INFO[t].nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Buscar
          <input className={control} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre o provincia" />
        </label>
        <p className="ml-auto text-sm text-ink-3" aria-live="polite">
          {filtradas.length} de {tarjetas.length}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtradas.map((t) => (
          <li key={t.id}>
            <Link
              href={`/distribuidoras/${t.id}/`}
              className="block h-full rounded-lg border border-line bg-surface p-4 text-ink transition-colors hover:border-ink-3 hover:no-underline"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{t.nombre}</h3>
                  <p className="text-sm text-ink-3">{t.jurisdiccion}</p>
                </div>
                <Indice valor={t.indice.valor} verificados={t.indice.verificados} />
              </div>
              <div className="mt-2">
                <TipoEtiqueta tipo={t.tipo} verificado={t.tipo_verificado} />
              </div>
              <ul className="mt-3 grid grid-cols-6 gap-1" aria-label="Estado de los 6 criterios">
                {t.criterios.map((c) => (
                  <li key={c.criterio} title={CRITERIO_INFO[c.criterio].nombre}>
                    <EstadoBadge estado={c.estado} compacto />
                    <span className="sr-only">{CRITERIO_INFO[c.criterio].nombre}</span>
                  </li>
                ))}
              </ul>
              <p className={`mt-3 text-xs ${t.dotacion === "sin_dato" ? "text-ink-3" : "text-ink-2"}`}>{TEXTO_DOTACION[t.dotacion]}</p>
            </Link>
          </li>
        ))}
      </ul>
      {filtradas.length === 0 && <p className="text-ink-3">Ninguna distribuidora coincide con los filtros.</p>}
    </section>
  );
}

export function Indice({ valor, verificados }: { valor: number | null; verificados: number }) {
  if (valor === null) {
    return (
      <p className="shrink-0 text-right text-xs leading-tight text-ink-3">
        <span className="block text-base font-semibold text-ink-2">{verificados} de 6</span>
        verificados
      </p>
    );
  }
  return (
    <p className="shrink-0 text-right text-xs leading-tight text-ink-3">
      <span className="block text-xl font-semibold text-ink">{valor}</span>
      índice / 100
      <span className="block">sobre {verificados} verificados</span>
    </p>
  );
}
