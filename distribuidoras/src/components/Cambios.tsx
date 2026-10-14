import Link from "next/link";
import { CRITERIO_INFO } from "@/lib/criterios";
import type { Cambio } from "@/lib/schema";
import { nombreDe } from "@/lib/vistas";

const TITULO: Record<Cambio["tipo"], string> = {
  documento_actualizado: "Documento actualizado",
  fuente_caida: "Fuente caída",
  fuente_recuperada: "Fuente recuperada",
  fuente_nueva: "Fuente nueva",
  documento_desactualizado: "Documento desactualizado",
};

export function ListaCambios({ cambios, filtrarNuevas = false }: { cambios: Cambio[]; filtrarNuevas?: boolean }) {
  // En la primera corrida todas las fuentes son "nuevas": se resumen en una línea.
  const nuevas = cambios.filter((c) => c.tipo === "fuente_nueva");
  const resto = filtrarNuevas ? cambios.filter((c) => c.tipo !== "fuente_nueva") : cambios;
  if (!cambios.length) return <p className="text-sm text-ink-3">Sin cambios respecto de la corrida anterior.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {filtrarNuevas && nuevas.length > 0 && <li className="text-ink-2">{nuevas.length} fuente(s) consultada(s) por primera vez.</li>}
      {resto.map((c, i) => (
        <li key={i} className="text-ink-2">
          <span className={`font-medium ${c.alerta ? "text-ink" : "text-ink"}`}>
            {c.alerta && <span aria-hidden>⚠ </span>}
            {TITULO[c.tipo]}
          </span>{" "}
          · <Link href={`/distribuidoras/${c.distribuidora}/`}>{nombreDe(c.distribuidora)}</Link> · {CRITERIO_INFO[c.criterio].nombre}: {c.detalle}
        </li>
      ))}
    </ul>
  );
}
