import type { Distribuidora, Dotacion, Drivers, Tipo } from "./schema";
import { errorPrediccionMedia, mco, mediana, tCuantil, type AjusteMCO } from "./stats";

/** Nivel de confianza de los rangos que se muestran. */
export const CONFIANZA = 0.9;

export const VARIABLES = {
  log_usuarios: "log(usuarios)",
  log_km: "log(km de red)",
  log_mwh: "log(MWh)",
  densidad: "densidad (usuarios/km)",
} as const;
type Variable = keyof typeof VARIABLES;

/**
 * Especificaciones en orden de preferencia. Se usa la primera que tenga observaciones suficientes.
 * La completa es la del modelo principal; la reducida no necesita km de red, el dato más difícil.
 */
export const ESPECIFICACIONES: { id: string; nombre: string; variables: Variable[]; minObs: number }[] = [
  { id: "completo", nombre: "Modelo completo", variables: ["log_usuarios", "log_km", "log_mwh", "densidad"], minObs: 15 },
  { id: "reducido", nombre: "Modelo reducido (sin km de red)", variables: ["log_usuarios", "log_mwh"], minObs: 8 },
];

export interface Observacion {
  distribuidora: string;
  tipo: Tipo;
  anio: number;
  empleados: number;
  /** Empleados propios más contratistas, si se conocen. Es la variable que se modela. */
  dotacion_efectiva: number;
  usuarios: number | null;
  km: number | null;
  mwh: number | null;
  densidad: number | null;
  saidi: number | null;
  advertencias: string[];
  /** Motivo por el que la observación no entra en ningún modelo, o null. */
  exclusion: string | null;
}

export interface ResultadoEmpresa {
  distribuidora: string;
  tipo: Tipo;
  anio: number;
  real: number;
  esperado: number;
  esperado_min: number;
  esperado_max: number;
  /** Desvío de la dotación real respecto de la esperada, en %, como rango. */
  desvio_min_pct: number;
  desvio_max_pct: number;
  desvio_central_pct: number;
  clasificacion: "por_encima" | "dentro" | "por_debajo";
  advertencias: string[];
}

export interface ResultadoModelo {
  especificacion: (typeof ESPECIFICACIONES)[number] | null;
  ajuste: AjusteMCO | null;
  observaciones: Observacion[];
  observacionesModelo: Observacion[];
  empresas: ResultadoEmpresa[];
  porTipo: { tipo: Tipo; n: number; mediana_pct: number; desvios_pct: number[] }[];
  /** Línea de tendencia simple log(dotación) = a + b·log(usuarios), para el gráfico. */
  tendencia: { a: number; b: number } | null;
  motivoSinModelo: string | null;
}

const v = (d: { valor: number } | null | undefined) => (d ? d.valor : null);

export function construirObservaciones(
  distribuidoras: Distribuidora[],
  dotacion: Dotacion[],
  drivers: Drivers[],
): Observacion[] {
  const tipos = new Map(distribuidoras.map((d) => [d.id, d.tipo]));
  return dotacion.map((dot) => {
    const dr = drivers.find((x) => x.distribuidora === dot.distribuidora && x.anio === dot.anio);
    const advertencias: string[] = [];
    let exclusion: string | null = null;

    let dotacion_efectiva = dot.empleados.valor;
    if (!dot.incluye_contratistas) {
      if (dot.contratistas) dotacion_efectiva += dot.contratistas.valor;
      else advertencias.push("Sin dato de contratistas: si la empresa terceriza, su dotación efectiva puede estar subestimada.");
    }
    const iv = dot.integracion_vertical;
    if (!iv) advertencias.push("No se sabe si hace generación, transmisión u obras con personal propio.");
    else if ((iv.generacion || iv.transmision || iv.obras_con_personal_propio) && !iv.separado) {
      const act = [iv.generacion && "generación", iv.transmision && "transmisión", iv.obras_con_personal_propio && "obras"].filter(Boolean);
      advertencias.push(`Incluye personal de ${act.join(", ")}: la comparación puede mostrarla por encima de lo esperado por esa razón.`);
    }
    if (dot.definicion === "cargos") exclusion = "La dotación está expresada en cargos (puede incluir vacantes), no comparable con personas.";

    const usuarios =
      v(dr?.usuarios_total) ??
      (dr?.usuarios_residenciales && dr?.grandes_clientes ? dr.usuarios_residenciales.valor + dr.grandes_clientes.valor : null);
    const km = dr?.km_red_mt && dr?.km_red_bt ? dr.km_red_mt.valor + dr.km_red_bt.valor : null;
    if (!dr) exclusion ??= `No hay datos de usuarios, red ni energía para ${dot.anio}.`;

    return {
      distribuidora: dot.distribuidora,
      tipo: tipos.get(dot.distribuidora) ?? "privada",
      anio: dot.anio,
      empleados: dot.empleados.valor,
      dotacion_efectiva,
      usuarios,
      km,
      mwh: v(dr?.mwh),
      densidad: usuarios && km ? usuarios / km : null,
      saidi: v(dr?.saidi_horas),
      advertencias,
      exclusion,
    };
  });
}

function fila(o: Observacion, vars: Variable[]): number[] | null {
  const x: number[] = [1];
  for (const k of vars) {
    const val =
      k === "log_usuarios" ? (o.usuarios ? Math.log(o.usuarios) : null)
      : k === "log_km" ? (o.km ? Math.log(o.km) : null)
      : k === "log_mwh" ? (o.mwh ? Math.log(o.mwh) : null)
      : o.densidad;
    if (val === null || !Number.isFinite(val)) return null;
    x.push(val);
  }
  return x;
}

export function estimarModelo(distribuidoras: Distribuidora[], dotacion: Dotacion[], drivers: Drivers[]): ResultadoModelo {
  const observaciones = construirObservaciones(distribuidoras, dotacion, drivers);
  const validas = observaciones.filter((o) => !o.exclusion && o.dotacion_efectiva > 0);
  const vacio: ResultadoModelo = {
    especificacion: null,
    ajuste: null,
    observaciones,
    observacionesModelo: [],
    empresas: [],
    porTipo: [],
    tendencia: tendencia(validas),
    motivoSinModelo: null,
  };

  let colineal = false;
  for (const esp of ESPECIFICACIONES) {
    const usadas = validas.filter((o) => fila(o, esp.variables));
    if (usadas.length < esp.minObs) continue;
    const X = usadas.map((o) => fila(o, esp.variables)!);
    const y = usadas.map((o) => Math.log(o.dotacion_efectiva));
    const ajuste = mco(X, y, usadas.map((o) => o.distribuidora));
    if (!ajuste) {
      colineal = true;
      continue;
    }

    const t = tCuantil(1 - (1 - CONFIANZA) / 2, ajuste.gl);
    // Para cada empresa se usa su año más reciente dentro del modelo.
    const ultimas = new Map<string, number>();
    usadas.forEach((o, i) => {
      const prev = ultimas.get(o.distribuidora);
      if (prev === undefined || usadas[prev].anio < o.anio) ultimas.set(o.distribuidora, i);
    });
    const saidiMediana = mediana(usadas.map((o) => o.saidi).filter((s): s is number => s !== null));

    const empresas: ResultadoEmpresa[] = [...ultimas.values()].map((i) => {
      const o = usadas[i];
      const pred = ajuste.ajustados[i];
      const se = errorPrediccionMedia(ajuste, X[i]);
      const lo = pred - t * se;
      const hi = pred + t * se;
      const ly = y[i];
      const desvio_min_pct = 100 * (Math.exp(ly - hi) - 1);
      const desvio_max_pct = 100 * (Math.exp(ly - lo) - 1);
      const clasificacion = desvio_min_pct > 0 ? "por_encima" : desvio_max_pct < 0 ? "por_debajo" : "dentro";
      const advertencias = [...o.advertencias];
      if (clasificacion === "por_debajo" && o.saidi !== null && Number.isFinite(saidiMediana) && o.saidi > saidiMediana) {
        advertencias.push(
          "Tiene menos personal que lo esperado y cortes más largos que la mediana: puede reflejar subinversión, no eficiencia.",
        );
      }
      return {
        distribuidora: o.distribuidora,
        tipo: o.tipo,
        anio: o.anio,
        real: o.dotacion_efectiva,
        esperado: Math.exp(pred),
        esperado_min: Math.exp(lo),
        esperado_max: Math.exp(hi),
        desvio_min_pct,
        desvio_max_pct,
        desvio_central_pct: 100 * (Math.exp(ly - pred) - 1),
        clasificacion,
        advertencias,
      };
    });

    const tipos: Tipo[] = ["estatal", "privada", "cooperativa"];
    const porTipo = tipos
      .map((tipo) => {
        const d = empresas.filter((e) => e.tipo === tipo).map((e) => e.desvio_central_pct);
        return { tipo, n: d.length, mediana_pct: d.length ? mediana(d) : NaN, desvios_pct: d };
      })
      .filter((g) => g.n > 0);

    return { ...vacio, especificacion: esp, ajuste, observacionesModelo: usadas, empresas, porTipo };
  }

  const empresasConDato = new Set(validas.map((o) => o.distribuidora)).size;
  return {
    ...vacio,
    motivoSinModelo: colineal
      ? `Hay ${validas.length} observaciones (${empresasConDato} empresas), pero las variables explicativas son colineales ` +
        `(por ejemplo, MWh proporcional a usuarios en todas las empresas) y el modelo no se puede estimar.`
      : `Hay ${validas.length} observaciones utilizables (${empresasConDato} empresas). ` +
        `El modelo reducido necesita al menos ${ESPECIFICACIONES.at(-1)!.minObs} con dotación, usuarios y MWh.`,
  };
}

function tendencia(obs: Observacion[]): { a: number; b: number } | null {
  const usadas = obs.filter((o) => o.usuarios);
  if (usadas.length < 3) return null;
  const ajuste = mco(
    usadas.map((o) => [1, Math.log(o.usuarios!)]),
    usadas.map((o) => Math.log(o.dotacion_efectiva)),
  );
  return ajuste ? { a: ajuste.coeficientes[0], b: ajuste.coeficientes[1] } : null;
}

export interface Ratios {
  anio: number;
  usuarios_por_empleado: number | null;
  km_por_empleado: number | null;
  mwh_por_empleado: number | null;
}

/** Nivel 1: ratios simples por año. Usan la dotación efectiva (con contratistas si se conocen). */
export function ratiosDe(observaciones: Observacion[], distribuidora: string): Ratios[] {
  return observaciones
    .filter((o) => o.distribuidora === distribuidora && o.dotacion_efectiva > 0)
    .sort((a, b) => a.anio - b.anio)
    .map((o) => ({
      anio: o.anio,
      usuarios_por_empleado: o.usuarios ? o.usuarios / o.dotacion_efectiva : null,
      km_por_empleado: o.km ? o.km / o.dotacion_efectiva : null,
      mwh_por_empleado: o.mwh ? o.mwh / o.dotacion_efectiva : null,
    }));
}
