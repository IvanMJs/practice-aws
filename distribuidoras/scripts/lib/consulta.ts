import { createHash } from "node:crypto";
import type { CriterioId, ResultadoFuente } from "../../src/lib/schema";
import { interpretarRobots, type ReglasRobots } from "./robots";

export const USER_AGENT =
  "DistribuidorasArgentinasBot/0.1 (+https://github.com/IvanMJs/practice-aws; relevamiento semanal de transparencia)";

const TIMEOUT_MS = 30_000;
const MAX_BYTES = 40 * 1024 * 1024;

export interface Opciones {
  userAgent?: string;
  fetch?: typeof fetch;
  ahora?: () => Date;
}

/**
 * Consulta las fuentes respetando robots.txt. Nunca intenta eludir bloqueos:
 * si el sitio no deja pasar, el resultado queda como bloqueado y el criterio, `no_verificable`.
 */
export class Consultor {
  private robots = new Map<string, Promise<ReglasRobots | "inaccesible">>();
  private readonly ua: string;
  private readonly f: typeof fetch;
  private readonly ahora: () => Date;

  constructor(op: Opciones = {}) {
    this.ua = op.userAgent ?? USER_AGENT;
    this.f = op.fetch ?? fetch;
    this.ahora = op.ahora ?? (() => new Date());
  }

  private reglas(origen: string) {
    let p = this.robots.get(origen);
    if (!p) {
      p = (async () => {
        try {
          const r = await this.pedir(`${origen}/robots.txt`);
          // RFC 9309: 4xx = sin restricciones; 5xx o sin respuesta = asumir todo prohibido.
          if (r.status >= 500) return "inaccesible";
          if (r.status >= 400) return interpretarRobots("", this.ua);
          return interpretarRobots(await r.text(), this.ua);
        } catch {
          return "inaccesible";
        }
      })();
      this.robots.set(origen, p);
    }
    return p;
  }

  private pedir(url: string) {
    return this.f(url, {
      headers: { "user-agent": this.ua, accept: "text/html,application/pdf,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  async consultar(distribuidora: string, criterio: CriterioId, url: string): Promise<ResultadoFuente> {
    const base = {
      distribuidora,
      criterio,
      url,
      fecha_consulta: this.ahora().toISOString(),
      http_status: null,
      hash_sha256: null,
      bytes: null,
      content_type: null,
      fecha_documento_detectada: null,
      metodo_fecha: null,
    } satisfies Partial<ResultadoFuente>;

    const u = new URL(url);
    const reglas = await this.reglas(u.origin);
    if (reglas === "inaccesible") {
      return { ...base, resultado: "sin_respuesta", detalle: "robots.txt no respondió; por precaución no se consulta el sitio." };
    }
    if (!reglas.permitido(u.pathname + u.search)) {
      return { ...base, resultado: "bloqueado_robots", detalle: "robots.txt no permite el acceso automatizado a esta ruta." };
    }

    let r: Response;
    try {
      r = await this.pedir(url);
    } catch (e) {
      return { ...base, resultado: "sin_respuesta", detalle: e instanceof Error ? e.message : String(e) };
    }

    const contentType = r.headers.get("content-type");
    const buf = Buffer.from(await r.arrayBuffer());
    const conStatus = { ...base, http_status: r.status, content_type: contentType, bytes: buf.length };
    const texto = esTexto(contentType) ? buf.toString("utf8") : "";

    if (esAntibot(r, texto)) {
      return { ...conStatus, resultado: "bloqueado_antibot", detalle: "El sitio respondió con un desafío anti-bot. No se intentó eludirlo." };
    }
    if (!r.ok) {
      return { ...conStatus, resultado: "http_error", detalle: `HTTP ${r.status}` };
    }
    if (buf.length > MAX_BYTES) {
      return { ...conStatus, resultado: "http_error", detalle: `Documento demasiado grande (${buf.length} bytes)` };
    }

    const fecha = detectarFecha(url, contentType, buf, r.headers.get("last-modified"));
    return {
      ...conStatus,
      resultado: "ok",
      hash_sha256: hashContenido(contentType, buf),
      fecha_documento_detectada: fecha?.fecha ?? null,
      metodo_fecha: fecha?.metodo ?? null,
    };
  }
}

const esTexto = (ct: string | null) => !!ct && /text|html|json|xml/.test(ct);

export function esAntibot(r: Pick<Response, "status" | "headers">, texto: string): boolean {
  if (![403, 429, 503].includes(r.status)) return false;
  return (
    r.headers.has("cf-mitigated") ||
    /just a moment|cf-chl|challenge-platform|captcha|attention required/i.test(texto) ||
    r.status === 429
  );
}

/**
 * En páginas HTML se hashea el texto visible (sin scripts ni estilos), para que cambios
 * de tokens o analítica no se registren como "documento actualizado".
 */
export function hashContenido(contentType: string | null, buf: Buffer): string {
  let datos: Buffer | string = buf;
  if (contentType?.includes("html")) {
    datos = buf
      .toString("utf8")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return createHash("sha256").update(datos).digest("hex");
}

/**
 * Fecha del documento, de la fuente más confiable a la menos:
 * metadatos del PDF, fecha en la URL (por ejemplo /uploads/2024/06/), Last-Modified (no en HTML,
 * porque las páginas dinámicas siempre dicen "hoy").
 */
export function detectarFecha(
  url: string,
  contentType: string | null,
  buf: Buffer,
  lastModified: string | null,
): { fecha: string; metodo: string } | null {
  const esPdf = contentType?.includes("pdf") || buf.subarray(0, 5).toString("latin1") === "%PDF-";
  if (esPdf) {
    const meta = buf.toString("latin1");
    const m = meta.match(/\/CreationDate\s*\(D:(\d{4})(\d{2})(\d{2})/) ?? meta.match(/\/ModDate\s*\(D:(\d{4})(\d{2})(\d{2})/);
    if (m) return { fecha: `${m[1]}-${m[2]}-${m[3]}`, metodo: "metadatos del PDF" };
  }
  const ym = url.match(/\/((?:19|20)\d{2})\/(0[1-9]|1[0-2])\//);
  if (ym) return { fecha: `${ym[1]}-${ym[2]}`, metodo: "año y mes en la URL" };
  if (esPdf) {
    const y = url.match(/(?:^|[^\d])((?:19|20)\d{2})(?:[^\d]|$)/);
    if (y) return { fecha: y[1], metodo: "año en el nombre del archivo" };
  }
  if (lastModified && !contentType?.includes("html")) {
    const d = new Date(lastModified);
    if (!Number.isNaN(d.getTime())) return { fecha: d.toISOString().slice(0, 10), metodo: "encabezado Last-Modified" };
  }
  return null;
}
