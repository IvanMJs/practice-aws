import { z } from "zod";

/**
 * Esquemas de los archivos de datos versionados en /data.
 * Los usan tanto el sitio (en build) como los scripts de actualización y validación.
 */

export const ESTADOS = ["publica", "no_publica", "no_verificable", "sin_relevar"] as const;
export const Estado = z.enum(ESTADOS);
export type Estado = z.infer<typeof Estado>;

export const CRITERIOS = [
  "cuadro_tarifario",
  "estados_contables",
  "calidad_servicio",
  "cortes",
  "obras",
  "reclamos",
] as const;
export const CriterioId = z.enum(CRITERIOS);
export type CriterioId = z.infer<typeof CriterioId>;

export const TIPOS = ["estatal", "privada", "cooperativa"] as const;
export const Tipo = z.enum(TIPOS);
export type Tipo = z.infer<typeof Tipo>;

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha YYYY-MM-DD");
/** Fecha del documento con la precisión que se conozca: año, año-mes o día. */
const fechaParcial = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "fecha YYYY, YYYY-MM o YYYY-MM-DD");

export const Fuente = z.object({
  url: z.url(),
  descripcion: z.string().min(1),
  /** Las fuentes no oficiales (prensa, terceros) se muestran pero no cuentan para el índice. */
  oficial: z.boolean(),
  /** Período que cubre el documento, en texto ("Ejercicio 2024", "2.º semestre 2025"). */
  periodo: z.string().optional(),
  /** Fecha del documento o fin del período que cubre. Se usa para detectar datos viejos. */
  fecha_documento: fechaParcial.optional(),
  fecha_consulta: fechaISO,
});
export type Fuente = z.infer<typeof Fuente>;

export const Distribuidora = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string(),
  jurisdiccion: z.string(),
  /** Provincias (o CABA) donde presta servicio. Se usa para los filtros. */
  provincias: z.array(z.string()).min(1),
  tipo: Tipo,
  /** La carga inicial de tipo y regulador no está verificada hasta que alguien la confirme con una fuente. */
  tipo_verificado: z.boolean(),
  regulador: z.string().nullable(),
  regulador_verificado: z.boolean(),
  sitio_web: z.url().nullable(),
  notas: z.string().optional(),
});
export type Distribuidora = z.infer<typeof Distribuidora>;

export const Busqueda = z.object({
  sitio_empresa: z.boolean(),
  ente_regulador: z.boolean(),
  boletin_oficial: z.boolean(),
  fecha: fechaISO,
  detalle: z.string().optional(),
});

export const Relevamiento = z
  .object({
    distribuidora: z.string(),
    criterio: CriterioId,
    estado: Estado,
    fuentes: z.array(Fuente).default([]),
    /** Obligatoria para `no_publica`: dónde se buscó sin encontrarlo. */
    busqueda: Busqueda.optional(),
    /** Obligatorio para `no_verificable`: por qué no se pudo acceder. */
    motivo: z.string().optional(),
    /** El criterio se cumple solo en parte (por ejemplo, cortes programados sí, en curso no relevado). */
    parcial: z.boolean().default(false),
    nota: z.string().optional(),
    fecha_relevamiento: fechaISO,
  })
  .superRefine((r, ctx) => {
    if (r.estado === "publica" && !r.fuentes.some((f) => f.oficial)) {
      ctx.addIssue({ code: "custom", message: "`publica` requiere al menos una fuente oficial con URL y fecha" });
    }
    if (r.estado === "no_publica") {
      const b = r.busqueda;
      if (!b || !b.sitio_empresa || !b.ente_regulador || !b.boletin_oficial) {
        ctx.addIssue({
          code: "custom",
          message: "`no_publica` requiere haber buscado en el sitio de la empresa, el ente regulador y el boletín oficial",
        });
      }
    }
    if (r.estado === "no_verificable" && !r.motivo) {
      ctx.addIssue({ code: "custom", message: "`no_verificable` requiere un motivo (403, robots.txt, sin respuesta…)" });
    }
  });
export type Relevamiento = z.infer<typeof Relevamiento>;

/** Un número con su fuente. Toda cifra del sitio se guarda así. */
export const Dato = z.object({
  valor: z.number().nonnegative(),
  fuente: Fuente,
  nota: z.string().optional(),
});
export type Dato = z.infer<typeof Dato>;

export const DEFINICIONES_DOTACION = ["personas", "equivalentes_tiempo_completo", "cargos"] as const;

export const Dotacion = z.object({
  distribuidora: z.string(),
  anio: z.number().int().min(1990).max(2100),
  empleados: Dato,
  /** Qué cuenta la cifra: personas, equivalentes a tiempo completo o cargos (pueden incluir vacantes). */
  definicion: z.enum(DEFINICIONES_DOTACION),
  /** Si la cifra de `empleados` ya incluye personal de contratistas. */
  incluye_contratistas: z.boolean(),
  /** Personal de contratistas informado por separado, si existe. */
  contratistas: Dato.nullable(),
  /** Actividades fuera de la distribución hechas con personal propio. null = no se sabe. */
  integracion_vertical: z
    .object({
      generacion: z.boolean(),
      transmision: z.boolean(),
      obras_con_personal_propio: z.boolean(),
      separado: z.boolean().describe("Si la cifra ya descuenta el personal de esas actividades"),
    })
    .nullable(),
});
export type Dotacion = z.infer<typeof Dotacion>;

export const Drivers = z.object({
  distribuidora: z.string(),
  anio: z.number().int().min(1990).max(2100),
  usuarios_total: Dato.nullable(),
  usuarios_residenciales: Dato.nullable(),
  grandes_clientes: Dato.nullable(),
  km_red_mt: Dato.nullable(),
  km_red_bt: Dato.nullable(),
  mwh: Dato.nullable(),
  superficie_km2: Dato.nullable(),
  saidi_horas: Dato.nullable(),
  saifi_veces: Dato.nullable(),
});
export type Drivers = z.infer<typeof Drivers>;

/** Resultado de consultar una fuente en una corrida semanal. */
export const ResultadoFuente = z.object({
  distribuidora: z.string(),
  criterio: CriterioId,
  url: z.string(),
  fecha_consulta: z.string(),
  http_status: z.number().int().nullable(),
  /** ok = se descargó el documento. Cualquier otro valor deja el criterio como `no_verificable`. */
  resultado: z.enum(["ok", "bloqueado_robots", "bloqueado_antibot", "http_error", "sin_respuesta"]),
  detalle: z.string().optional(),
  hash_sha256: z.string().nullable(),
  bytes: z.number().int().nullable(),
  content_type: z.string().nullable(),
  fecha_documento_detectada: z.string().nullable(),
  metodo_fecha: z.string().nullable(),
});
export type ResultadoFuente = z.infer<typeof ResultadoFuente>;

export const TIPOS_CAMBIO = [
  "documento_actualizado",
  "fuente_caida",
  "fuente_recuperada",
  "fuente_nueva",
  "documento_desactualizado",
] as const;

export const Cambio = z.object({
  tipo: z.enum(TIPOS_CAMBIO),
  distribuidora: z.string(),
  criterio: CriterioId,
  url: z.string(),
  detalle: z.string(),
  /** Las caídas de fuentes que antes respondían generan alerta. */
  alerta: z.boolean(),
});
export type Cambio = z.infer<typeof Cambio>;

export const Snapshot = z.object({
  fecha_corrida: z.string(),
  user_agent: z.string(),
  resultados: z.array(ResultadoFuente),
  cambios: z.array(Cambio),
});
export type Snapshot = z.infer<typeof Snapshot>;
