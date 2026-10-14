import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { estimarModelo } from "./modelo";
import { Distribuidora, Dotacion, Drivers, Relevamiento, Snapshot } from "./schema";
import { calcularIndice, criteriosDe, indexarResultados } from "./transparencia";

export const DATA_DIR = path.join(process.cwd(), "data");
export const SNAPSHOTS_DIR = path.join(DATA_DIR, "snapshots");

function leer<T extends z.ZodType>(archivo: string, esquema: T): z.infer<T> {
  const ruta = path.join(DATA_DIR, archivo);
  const resultado = esquema.safeParse(JSON.parse(fs.readFileSync(ruta, "utf8")));
  if (!resultado.success) throw new Error(`${archivo} no cumple el esquema:\n${z.prettifyError(resultado.error)}`);
  return resultado.data;
}

export function cargarSnapshots(): Snapshot[] {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
  return fs
    .readdirSync(SNAPSHOTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => Snapshot.parse(JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), "utf8"))));
}

export function cargarDatos() {
  return {
    distribuidoras: leer("distribuidoras.json", z.array(Distribuidora)),
    relevamientos: leer("transparencia.json", z.array(Relevamiento)),
    dotacion: leer("dotacion.json", z.array(Dotacion)),
    drivers: leer("drivers.json", z.array(Drivers)),
    snapshots: cargarSnapshots(),
  };
}

let cache: ReturnType<typeof construirSitio> | null = null;

/** Todo lo que necesitan las páginas, calculado una sola vez por build. */
export function sitio() {
  cache ??= construirSitio();
  return cache;
}

function construirSitio() {
  const datos = cargarDatos();
  const hoy = new Date();
  const resultados = indexarResultados(datos.snapshots);
  const modelo = estimarModelo(datos.distribuidoras, datos.dotacion, datos.drivers);
  const fichas = datos.distribuidoras.map((d) => {
    const criterios = criteriosDe(d.id, datos.relevamientos, resultados, hoy);
    return { ...d, criterios, indice: calcularIndice(criterios) };
  });
  const ultimaCorrida = datos.snapshots.at(-1) ?? null;
  const ultimoRelevamiento = datos.relevamientos.map((r) => r.fecha_relevamiento).sort().at(-1) ?? null;
  return { ...datos, fichas, modelo, ultimaCorrida, ultimoRelevamiento, generado: hoy.toISOString() };
}

export type Ficha = ReturnType<typeof sitio>["fichas"][number];
