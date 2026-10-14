/**
 * Intérprete mínimo de robots.txt (RFC 9309): grupos por user-agent, Allow/Disallow,
 * comodines `*` y `$`, y la regla más específica gana.
 */
export interface ReglasRobots {
  permitido(ruta: string): boolean;
}

interface Regla {
  permitir: boolean;
  patron: string;
}

export function interpretarRobots(texto: string, userAgent: string): ReglasRobots {
  const ua = userAgent.toLowerCase().split("/")[0];
  const grupos: { agentes: string[]; reglas: Regla[] }[] = [];
  let actual: { agentes: string[]; reglas: Regla[] } | null = null;
  let ultimoFueAgente = false;

  for (const crudo of texto.split(/\r?\n/)) {
    const linea = crudo.replace(/#.*/, "").trim();
    const m = linea.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const campo = m[1].toLowerCase();
    const valor = m[2].trim();
    if (campo === "user-agent") {
      if (!actual || !ultimoFueAgente) {
        actual = { agentes: [], reglas: [] };
        grupos.push(actual);
      }
      actual.agentes.push(valor.toLowerCase());
      ultimoFueAgente = true;
    } else if ((campo === "allow" || campo === "disallow") && actual) {
      ultimoFueAgente = false;
      if (valor === "" && campo === "disallow") continue; // "Disallow:" vacío = todo permitido
      actual.reglas.push({ permitir: campo === "allow", patron: valor });
    } else {
      ultimoFueAgente = false;
    }
  }

  const especificos = grupos.filter((g) => g.agentes.some((a) => a !== "*" && ua.includes(a)));
  const aplicables = especificos.length ? especificos : grupos.filter((g) => g.agentes.includes("*"));
  const reglas = aplicables.flatMap((g) => g.reglas);

  return {
    permitido(ruta: string) {
      let mejor: Regla | null = null;
      for (const r of reglas) {
        if (!coincide(r.patron, ruta)) continue;
        if (
          !mejor ||
          r.patron.length > mejor.patron.length ||
          (r.patron.length === mejor.patron.length && r.permitir && !mejor.permitir)
        ) {
          mejor = r;
        }
      }
      return mejor ? mejor.permitir : true;
    },
  };
}

function coincide(patron: string, ruta: string): boolean {
  const anclado = patron.endsWith("$");
  const cuerpo = (anclado ? patron.slice(0, -1) : patron)
    .split("*")
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${cuerpo}${anclado ? "$" : ""}`).test(ruta);
}
