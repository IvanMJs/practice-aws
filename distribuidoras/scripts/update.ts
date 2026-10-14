/**
 * Corrida semanal: consulta cada fuente del relevamiento, guarda un snapshot fechado
 * (estado, URL, hash, fecha de consulta, código HTTP) y el changelog de la semana.
 * Nunca pisa corridas anteriores.
 *
 * Uso: npm run update            (escribe data/snapshots/AAAA-MM-DD.json)
 *      ALERTAS_MD=alertas.md npm run update   (además escribe las alertas en Markdown)
 */
import fs from "node:fs";
import path from "node:path";
import { CRITERIO_INFO } from "../src/lib/criterios";
import { cargarDatos, SNAPSHOTS_DIR } from "../src/lib/data";
import type { ResultadoFuente, Snapshot } from "../src/lib/schema";
import { detectarCambios } from "./lib/cambios";
import { Consultor, USER_AGENT } from "./lib/consulta";

const PAUSA_MISMO_SITIO_MS = 1500;

async function main() {
  const { relevamientos, snapshots, distribuidoras } = cargarDatos();
  const ahora = new Date();
  const consultor = new Consultor();

  const fuentes = relevamientos.flatMap((r) => r.fuentes.map((f) => ({ distribuidora: r.distribuidora, criterio: r.criterio, url: f.url })));
  const resultados: ResultadoFuente[] = [];
  const ultimoPorHost = new Map<string, number>();

  for (const f of fuentes) {
    const host = new URL(f.url).host;
    const espera = (ultimoPorHost.get(host) ?? 0) + PAUSA_MISMO_SITIO_MS - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    const r = await consultor.consultar(f.distribuidora, f.criterio, f.url);
    ultimoPorHost.set(host, Date.now());
    console.log(`${r.resultado.padEnd(18)} ${String(r.http_status ?? "-").padEnd(4)} ${f.distribuidora}/${f.criterio} ${f.url}`);
    resultados.push(r);
  }

  const cambios = detectarCambios(snapshots, resultados, relevamientos, ahora);
  const snapshot: Snapshot = { fecha_corrida: ahora.toISOString(), user_agent: USER_AGENT, resultados, cambios };

  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const dia = ahora.toISOString().slice(0, 10);
  let archivo = path.join(SNAPSHOTS_DIR, `${dia}.json`);
  for (let i = 2; fs.existsSync(archivo); i++) archivo = path.join(SNAPSHOTS_DIR, `${dia}-${i}.json`);
  fs.writeFileSync(archivo, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`\nSnapshot: ${path.relative(process.cwd(), archivo)} — ${resultados.length} fuentes, ${cambios.length} cambios`);

  const alertas = cambios.filter((c) => c.alerta);
  const nombre = (id: string) => distribuidoras.find((d) => d.id === id)?.nombre ?? id;
  if (process.env.ALERTAS_MD && alertas.length) {
    const md = [
      `Corrida del ${dia}: ${alertas.length} fuente(s) que antes respondían ahora fallan.`,
      "",
      "Los criterios afectados quedan como **no verificable** (nunca como \"no publica\") hasta revisarlos a mano.",
      "",
      ...alertas.map((a) => `- **${nombre(a.distribuidora)}** · ${CRITERIO_INFO[a.criterio].nombre}: ${a.detalle} <${a.url}>`),
    ].join("\n");
    fs.writeFileSync(process.env.ALERTAS_MD, md + "\n");
  }
  for (const a of alertas) console.warn(`ALERTA ${a.distribuidora}/${a.criterio}: ${a.detalle}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
