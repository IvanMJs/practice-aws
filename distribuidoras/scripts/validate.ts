/** Valida todos los archivos de /data contra sus esquemas y chequea referencias cruzadas. */
import { cargarDatos } from "../src/lib/data";

const errores: string[] = [];
try {
  const { distribuidoras, relevamientos, dotacion, drivers, snapshots } = cargarDatos();
  const ids = new Set(distribuidoras.map((d) => d.id));
  if (ids.size !== distribuidoras.length) errores.push("distribuidoras.json tiene ids repetidos");

  const ref = (archivo: string, id: string) => {
    if (!ids.has(id)) errores.push(`${archivo}: distribuidora desconocida "${id}"`);
  };
  const vistos = new Set<string>();
  for (const r of relevamientos) {
    ref("transparencia.json", r.distribuidora);
    const k = `${r.distribuidora}/${r.criterio}`;
    if (vistos.has(k)) errores.push(`transparencia.json: ${k} está repetido`);
    vistos.add(k);
  }
  const anios = (arr: { distribuidora: string; anio: number }[], archivo: string) => {
    const s = new Set<string>();
    for (const x of arr) {
      ref(archivo, x.distribuidora);
      const k = `${x.distribuidora}/${x.anio}`;
      if (s.has(k)) errores.push(`${archivo}: ${k} está repetido`);
      s.add(k);
    }
  };
  anios(dotacion, "dotacion.json");
  anios(drivers, "drivers.json");
  for (const d of dotacion) {
    if (d.incluye_contratistas && d.contratistas) {
      errores.push(`dotacion.json: ${d.distribuidora}/${d.anio} dice que incluye contratistas y además los informa aparte`);
    }
  }
  console.log(
    `OK: ${distribuidoras.length} distribuidoras, ${relevamientos.length} relevamientos, ` +
      `${dotacion.length} registros de dotación, ${drivers.length} de drivers, ${snapshots.length} snapshots.`,
  );
} catch (e) {
  errores.push(e instanceof Error ? e.message : String(e));
}
if (errores.length) {
  console.error(errores.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
