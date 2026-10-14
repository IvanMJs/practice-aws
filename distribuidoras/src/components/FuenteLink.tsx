import { formatearFecha } from "@/lib/fechas";
import type { Fuente } from "@/lib/schema";

/** Enlace a una fuente con su período y fecha de consulta. */
export function FuenteLink({ fuente, extra }: { fuente: Fuente; extra?: React.ReactNode }) {
  return (
    <span className="text-sm">
      <a href={fuente.url} target="_blank" rel="noopener noreferrer">
        {fuente.descripcion}
      </a>
      {!fuente.oficial && <span className="ml-1 rounded bg-surface-2 px-1.5 text-xs text-ink-2">no oficial, no cuenta para el índice</span>}
      <span className="block text-xs text-ink-3">
        {fuente.periodo && <>Período: {fuente.periodo} · </>}
        Consultado: {formatearFecha(fuente.fecha_consulta)}
        {extra}
      </span>
    </span>
  );
}
