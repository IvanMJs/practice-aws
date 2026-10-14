"use client";

import { useState } from "react";
import { REPO_URL } from "@/lib/config";

/** El sitio es estático: el reporte abre un issue prellenado en el repositorio. */
export function ReportarError({ distribuidoras }: { distribuidoras: { id: string; nombre: string }[] }) {
  const [dist, setDist] = useState("");
  const [tipo, setTipo] = useState("Dato incorrecto");
  const [detalle, setDetalle] = useState("");
  const [fuente, setFuente] = useState("");

  const nombre = distribuidoras.find((d) => d.id === dist)?.nombre ?? "General";
  const url =
    `${REPO_URL}/issues/new?` +
    new URLSearchParams({
      title: `[Reporte] ${nombre}: ${tipo}`,
      labels: "reporte-datos",
      body: `**Distribuidora:** ${nombre}\n**Tipo:** ${tipo}\n\n**Qué está mal:**\n${detalle}\n\n**Fuente que lo respalda (URL):**\n${fuente || "-"}\n`,
    }).toString();

  const control = "w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink";
  return (
    <form
      className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        window.open(url, "_blank", "noopener");
      }}
    >
      <label className="text-sm text-ink-2">
        Distribuidora
        <select className={control} value={dist} onChange={(e) => setDist(e.target.value)}>
          <option value="">General / varias</option>
          {distribuidoras.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-ink-2">
        Tipo de error
        <select className={control} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option>Dato incorrecto</option>
          <option>Enlace roto</option>
          <option>Falta una fuente</option>
          <option>Tipo o regulador incorrecto</option>
          <option>Otro</option>
        </select>
      </label>
      <label className="text-sm text-ink-2 sm:col-span-2">
        Qué está mal
        <textarea className={control} rows={4} required value={detalle} onChange={(e) => setDetalle(e.target.value)} />
      </label>
      <label className="text-sm text-ink-2 sm:col-span-2">
        Fuente que lo respalda (URL, opcional)
        <input className={control} type="url" value={fuente} onChange={(e) => setFuente(e.target.value)} placeholder="https://" />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-bg">
          Abrir reporte en GitHub
        </button>
        <p className="text-xs text-ink-3">Se abre un issue público prellenado; necesitás una cuenta de GitHub. No incluyas datos personales.</p>
      </div>
    </form>
  );
}
