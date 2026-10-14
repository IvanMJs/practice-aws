import type { Cambio, Relevamiento, ResultadoFuente, Snapshot } from "../../src/lib/schema";
import { clave, esDesactualizado, indexarResultados } from "../../src/lib/transparencia";

const DESCRIPCION_FALLO: Record<ResultadoFuente["resultado"], string> = {
  ok: "respondió",
  bloqueado_robots: "robots.txt bloquea el acceso",
  bloqueado_antibot: "el sitio respondió con un bloqueo anti-bot",
  http_error: "el servidor respondió con error",
  sin_respuesta: "el sitio no respondió",
};

/** Compara la corrida nueva con el historial y arma el changelog de la semana. */
export function detectarCambios(
  anteriores: Snapshot[],
  nuevos: ResultadoFuente[],
  relevamientos: Relevamiento[],
  ahora: Date,
): Cambio[] {
  const previo = indexarResultados(anteriores);
  const fechaPrevia = anteriores.length
    ? new Date([...anteriores].sort((a, b) => a.fecha_corrida.localeCompare(b.fecha_corrida)).at(-1)!.fecha_corrida)
    : null;
  const cambios: Cambio[] = [];

  for (const r of nuevos) {
    const k = clave(r.distribuidora, r.criterio, r.url);
    const ultimo = previo.ultimo.get(k);
    const ultimoOk = previo.ultimoOk.get(k);
    const base = { distribuidora: r.distribuidora, criterio: r.criterio, url: r.url };
    const http = r.http_status ? ` (HTTP ${r.http_status})` : "";

    if (!ultimo) {
      cambios.push({
        ...base,
        tipo: "fuente_nueva",
        detalle: r.resultado === "ok" ? "Primera consulta: el documento está disponible." : `Primera consulta: ${DESCRIPCION_FALLO[r.resultado]}${http}.`,
        alerta: false,
      });
    } else if (r.resultado !== "ok" && ultimo.resultado === "ok") {
      cambios.push({
        ...base,
        tipo: "fuente_caida",
        detalle: `La fuente respondía y ahora ${DESCRIPCION_FALLO[r.resultado]}${http}. El criterio pasa a "no verificable" hasta revisarlo.`,
        alerta: true,
      });
    } else if (r.resultado === "ok" && ultimo.resultado !== "ok") {
      cambios.push({ ...base, tipo: "fuente_recuperada", detalle: "La fuente volvió a responder.", alerta: false });
    }

    if (r.resultado === "ok" && ultimoOk && ultimoOk.hash_sha256 !== r.hash_sha256) {
      const fecha = r.fecha_documento_detectada && r.fecha_documento_detectada !== ultimoOk.fecha_documento_detectada
        ? ` Nueva fecha detectada: ${r.fecha_documento_detectada}.`
        : "";
      cambios.push({ ...base, tipo: "documento_actualizado", detalle: `El contenido cambió desde la última consulta.${fecha}`, alerta: false });
    }

    if (r.resultado === "ok") {
      const rel = relevamientos.find((x) => x.distribuidora === r.distribuidora && x.criterio === r.criterio);
      const manual = rel?.fuentes.find((f) => f.url === r.url)?.fecha_documento;
      const fecha = manual ?? r.fecha_documento_detectada;
      const antes = fechaPrevia ? esDesactualizado(r.criterio, manual ?? ultimoOk?.fecha_documento_detectada ?? null, fechaPrevia) : false;
      if (esDesactualizado(r.criterio, fecha, ahora) && !antes) {
        cambios.push({ ...base, tipo: "documento_desactualizado", detalle: `El documento (fecha ${fecha}) superó el plazo de vigencia.`, alerta: false });
      }
    }
  }
  return cambios;
}
