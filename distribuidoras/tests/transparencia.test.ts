import assert from "node:assert/strict";
import { test } from "node:test";
import { Relevamiento, type Snapshot } from "../src/lib/schema";
import { calcularIndice, criterioEfectivo, indexarResultados } from "../src/lib/transparencia";

const hoy = new Date("2026-10-14T12:00:00Z");
const rel = (x: object) => Relevamiento.parse({ distribuidora: "d", fecha_relevamiento: "2026-10-14", ...x });
const fuente = (url: string, extra: object = {}) => ({ url, descripcion: "x", oficial: true, fecha_consulta: "2026-10-14", ...extra });

const snap = (fecha: string, resultado: string, url = "https://a.example/x", status = 200): Snapshot => ({
  fecha_corrida: fecha,
  user_agent: "test",
  cambios: [],
  resultados: [{
    distribuidora: "d", criterio: "obras", url, fecha_consulta: fecha, http_status: status,
    resultado: resultado as "ok", hash_sha256: null, bytes: null, content_type: null, fecha_documento_detectada: null, metodo_fecha: null,
  }],
});

test("índice: solo publica + no_publica; menos de 3 verificados no muestra índice", () => {
  const e = (estado: string) => ({ estado: estado as "publica" });
  const i1 = calcularIndice([e("publica"), e("publica"), e("no_verificable"), e("sin_relevar"), e("sin_relevar"), e("sin_relevar")]);
  assert.equal(i1.valor, null);
  assert.equal(i1.verificados, 2);
  const i2 = calcularIndice([e("publica"), e("publica"), e("no_publica"), e("no_verificable"), e("no_verificable"), e("sin_relevar")]);
  assert.equal(i2.valor, 67);
});

test("esquema: no_publica exige búsqueda en los tres lugares", () => {
  assert.throws(() => rel({ criterio: "obras", estado: "no_publica" }));
  assert.throws(() =>
    rel({ criterio: "obras", estado: "no_publica", busqueda: { sitio_empresa: true, ente_regulador: false, boletin_oficial: true, fecha: "2026-10-14" } }),
  );
  assert.doesNotThrow(() =>
    rel({ criterio: "obras", estado: "no_publica", busqueda: { sitio_empresa: true, ente_regulador: true, boletin_oficial: true, fecha: "2026-10-14" } }),
  );
  assert.throws(() => rel({ criterio: "obras", estado: "publica", fuentes: [fuente("https://a.example/x", { oficial: false })] }));
});

test("una fuente que antes respondía y ahora falla pasa a no_verificable, nunca a no_publica", () => {
  const r = rel({ criterio: "obras", estado: "publica", fuentes: [fuente("https://a.example/x")] });
  const idx = indexarResultados([snap("2026-10-07T00:00:00Z", "ok"), snap("2026-10-14T00:00:00Z", "http_error", undefined, 500)]);
  const c = criterioEfectivo("obras", r, idx, hoy);
  assert.equal(c.estado, "no_verificable");
  assert.match(c.motivo!, /HTTP 500/);
  // Si responde, sigue publica y toma la fecha de consulta de la corrida.
  const ok = criterioEfectivo("obras", r, indexarResultados([snap("2026-10-14T03:00:00Z", "ok")]), hoy);
  assert.equal(ok.estado, "publica");
  assert.equal(ok.fuentes[0].fecha_consulta, "2026-10-14");
});

test("datos viejos: un balance de más de 18 meses queda desactualizado", () => {
  const r = rel({ criterio: "estados_contables", estado: "publica", fuentes: [fuente("https://a.example/b.pdf", { fecha_documento: "2024" })] });
  assert.equal(criterioEfectivo("estados_contables", r, indexarResultados([]), hoy).desactualizado, true);
  const r2 = rel({ criterio: "estados_contables", estado: "publica", fuentes: [fuente("https://a.example/b.pdf", { fecha_documento: "2025" })] });
  assert.equal(criterioEfectivo("estados_contables", r2, indexarResultados([]), hoy).desactualizado, false);
});

test("sin relevamiento el criterio queda sin_relevar", () => {
  assert.equal(criterioEfectivo("reclamos", undefined, indexarResultados([]), hoy).estado, "sin_relevar");
});

test("si el job nunca pudo acceder, vale el relevamiento manual", () => {
  const r = rel({ criterio: "obras", estado: "publica", fuentes: [fuente("https://a.example/x")] });
  const c = criterioEfectivo("obras", r, indexarResultados([snap("2026-10-14T00:00:00Z", "sin_respuesta", undefined, 0)]), hoy);
  assert.equal(c.estado, "publica");
  assert.equal(c.fuentes[0].fecha_consulta, "2026-10-14");
});
