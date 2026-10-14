import type { CriterioId, Estado, Tipo } from "./schema";

export const CRITERIO_INFO: Record<
  CriterioId,
  { nombre: string; descripcion: string; /** Meses tras los cuales el documento se considera desactualizado. null = no aplica. */ vigenciaMeses: number | null }
> = {
  cuadro_tarifario: {
    nombre: "Cuadro tarifario vigente",
    descripcion: "Las tarifas que se cobran hoy, con la resolución que las aprueba.",
    vigenciaMeses: 12,
  },
  estados_contables: {
    nombre: "Estados contables",
    descripcion: "Balance, estado de resultados y memoria del último ejercicio.",
    vigenciaMeses: 18,
  },
  calidad_servicio: {
    nombre: "Calidad de servicio (SAIDI/SAIFI)",
    descripcion: "Duración y frecuencia media de los cortes por usuario.",
    vigenciaMeses: 12,
  },
  cortes: {
    nombre: "Cortes en curso y programados",
    descripcion: "Información sobre interrupciones actuales y trabajos programados.",
    vigenciaMeses: null,
  },
  obras: {
    nombre: "Obras e inversiones",
    descripcion: "Plan de obras, inversiones realizadas o en curso.",
    vigenciaMeses: 24,
  },
  reclamos: {
    nombre: "Reclamos y tiempos de respuesta",
    descripcion: "Cantidad de reclamos y tiempos de atención o resolución.",
    vigenciaMeses: 12,
  },
};

export const ESTADO_INFO: Record<Estado, { nombre: string; descripcion: string; simbolo: string }> = {
  publica: {
    nombre: "Publica",
    descripcion: "Verificado en una fuente oficial, con URL y fecha de consulta.",
    simbolo: "✓",
  },
  no_publica: {
    nombre: "No publica",
    descripcion: "Se buscó en el sitio de la empresa, el ente regulador y el boletín oficial, y no está.",
    simbolo: "✕",
  },
  no_verificable: {
    nombre: "No verificable",
    descripcion: "El sitio bloqueó el acceso (403, anti-bot, robots.txt) o no respondió. No suma ni resta.",
    simbolo: "?",
  },
  sin_relevar: {
    nombre: "Sin relevar",
    descripcion: "Todavía no se revisó.",
    simbolo: "–",
  },
};

export const TIPO_INFO: Record<Tipo, { nombre: string; plural: string }> = {
  estatal: { nombre: "Estatal", plural: "Estatales" },
  privada: { nombre: "Privada", plural: "Privadas" },
  cooperativa: { nombre: "Cooperativa", plural: "Cooperativas" },
};
