import { CRITERIO_INFO } from "./criterios";
import { finDePeriodo, mesesEntre } from "./fechas";
import { CRITERIOS, type CriterioId, type Estado, type Fuente, type Relevamiento, type ResultadoFuente, type Snapshot } from "./schema";

/** Mínimo de criterios verificados (publica + no_publica) para mostrar el índice. */
export const MIN_VERIFICADOS = 3;

export interface FuenteEfectiva extends Fuente {
  /** Resultado de la última corrida semanal para esta URL, si la hubo. */
  ultimo_resultado: ResultadoFuente | null;
  /** Fecha del documento: la cargada a mano o, si no hay, la detectada por el job. */
  fecha_documento_efectiva: string | null;
  desactualizada: boolean;
}

export interface CriterioEfectivo {
  criterio: CriterioId;
  estado: Estado;
  /** Estado cargado en el relevamiento manual, antes de aplicar las corridas semanales. */
  estado_relevado: Estado;
  fuentes: FuenteEfectiva[];
  parcial: boolean;
  motivo: string | null;
  nota: string | null;
  fecha_relevamiento: string | null;
  desactualizado: boolean;
}

/**
 * Último resultado de cada URL entre todas las corridas (las más nuevas primero),
 * más el último resultado exitoso, para saber si una fuente "antes respondía".
 */
export function indexarResultados(snapshots: Snapshot[]) {
  const ultimo = new Map<string, ResultadoFuente>();
  const ultimoOk = new Map<string, ResultadoFuente>();
  const ordenados = [...snapshots].sort((a, b) => b.fecha_corrida.localeCompare(a.fecha_corrida));
  for (const s of ordenados) {
    for (const r of s.resultados) {
      const k = clave(r.distribuidora, r.criterio, r.url);
      if (!ultimo.has(k)) ultimo.set(k, r);
      if (r.resultado === "ok" && !ultimoOk.has(k)) ultimoOk.set(k, r);
    }
  }
  return { ultimo, ultimoOk };
}

export const clave = (d: string, c: string, url: string) => `${d}|${c}|${url}`;

export function esDesactualizado(criterio: CriterioId, fechaDocumento: string | null, hoy: Date): boolean {
  const vigencia = CRITERIO_INFO[criterio].vigenciaMeses;
  if (vigencia === null || !fechaDocumento) return false;
  return mesesEntre(finDePeriodo(fechaDocumento), hoy) > vigencia;
}

/**
 * Combina el relevamiento manual con las corridas semanales.
 * Las corridas nunca crean un `no_publica`: solo confirman un `publica`
 * o, si todas sus fuentes oficiales fallan, lo pasan a `no_verificable`.
 */
export function criterioEfectivo(
  criterio: CriterioId,
  rel: Relevamiento | undefined,
  resultados: ReturnType<typeof indexarResultados>,
  hoy: Date,
): CriterioEfectivo {
  if (!rel) {
    return {
      criterio,
      estado: "sin_relevar",
      estado_relevado: "sin_relevar",
      fuentes: [],
      parcial: false,
      motivo: null,
      nota: null,
      fecha_relevamiento: null,
      desactualizado: false,
    };
  }

  const fuentes: FuenteEfectiva[] = rel.fuentes.map((f) => {
    const k = clave(rel.distribuidora, criterio, f.url);
    const ultimo = resultados.ultimo.get(k) ?? null;
    const ok = resultados.ultimoOk.get(k);
    const fecha = f.fecha_documento ?? ok?.fecha_documento_detectada ?? null;
    return {
      ...f,
      fecha_consulta: ok ? ok.fecha_consulta.slice(0, 10) : f.fecha_consulta,
      ultimo_resultado: ultimo,
      fecha_documento_efectiva: fecha,
      desactualizada: esDesactualizado(criterio, fecha, hoy),
    };
  });

  let estado: Estado = rel.estado;
  let motivo = rel.motivo ?? null;
  if (rel.estado === "publica") {
    // Solo una fuente que antes respondía y ahora falla baja el criterio a `no_verificable`.
    // Si el job nunca pudo acceder (por ejemplo, el sitio bloquea al runner), vale el relevamiento manual.
    const oficiales = fuentes.filter((f) => f.oficial);
    const respondia = (f: FuenteEfectiva) => resultados.ultimoOk.has(clave(rel.distribuidora, criterio, f.url));
    const caidas = oficiales.filter((f) => f.ultimo_resultado && f.ultimo_resultado.resultado !== "ok" && respondia(f));
    const algunaSostiene = oficiales.some((f) => !caidas.includes(f));
    if (caidas.length > 0 && !algunaSostiene) {
      estado = "no_verificable";
      const r = caidas[0].ultimo_resultado!;
      motivo = `La fuente respondía y en la última corrida falló (${r.resultado}${r.http_status ? `, HTTP ${r.http_status}` : ""}). No se baja a "no publica" hasta revisarlo a mano.`;
    }
  }

  const oficialesVigentes = fuentes.filter((f) => f.oficial);
  const desactualizado =
    estado === "publica" && oficialesVigentes.length > 0 && oficialesVigentes.every((f) => f.desactualizada);

  return {
    criterio,
    estado,
    estado_relevado: rel.estado,
    fuentes,
    parcial: rel.parcial,
    motivo,
    nota: rel.nota ?? null,
    fecha_relevamiento: rel.fecha_relevamiento,
    desactualizado,
  };
}

export interface Indice {
  publica: number;
  no_publica: number;
  no_verificable: number;
  sin_relevar: number;
  verificados: number;
  /** 0–100, o null si hay menos de MIN_VERIFICADOS criterios verificados. */
  valor: number | null;
}

/** Índice = criterios publicados / criterios verificados (publica + no_publica), con pesos iguales. */
export function calcularIndice(criterios: Pick<CriterioEfectivo, "estado">[]): Indice {
  const c = { publica: 0, no_publica: 0, no_verificable: 0, sin_relevar: 0 };
  for (const k of criterios) c[k.estado]++;
  const verificados = c.publica + c.no_publica;
  return {
    ...c,
    verificados,
    valor: verificados >= MIN_VERIFICADOS ? Math.round((100 * c.publica) / verificados) : null,
  };
}

export function criteriosDe(
  distribuidora: string,
  relevamientos: Relevamiento[],
  resultados: ReturnType<typeof indexarResultados>,
  hoy: Date,
): CriterioEfectivo[] {
  return CRITERIOS.map((c) =>
    criterioEfectivo(
      c,
      relevamientos.find((r) => r.distribuidora === distribuidora && r.criterio === c),
      resultados,
      hoy,
    ),
  );
}
