import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { detectarCambios } from "../scripts/lib/cambios";
import { Consultor, detectarFecha } from "../scripts/lib/consulta";
import { interpretarRobots } from "../scripts/lib/robots";
import type { Snapshot } from "../src/lib/schema";

test("robots.txt: grupo específico, comodines y regla más larga", () => {
  const r = interpretarRobots(
    "User-agent: *\nDisallow: /privado/\nAllow: /privado/publico$\n\nUser-agent: OtroBot\nDisallow: /",
    "DistribuidorasArgentinasBot/0.1",
  );
  assert.equal(r.permitido("/obras"), true);
  assert.equal(r.permitido("/privado/x"), false);
  assert.equal(r.permitido("/privado/publico"), true);
  const todo = interpretarRobots("User-agent: *\nDisallow: /", "X");
  assert.equal(todo.permitido("/"), false);
  const esp = interpretarRobots("User-agent: *\nDisallow:\n\nUser-agent: distribuidorasargentinasbot\nDisallow: /docs/*.pdf$", "DistribuidorasArgentinasBot/0.1");
  assert.equal(esp.permitido("/docs/a.pdf"), false);
  assert.equal(esp.permitido("/docs/a.pdfx"), true);
});

test("fecha del documento: PDF, URL y Last-Modified", () => {
  const pdf = Buffer.from("%PDF-1.7\n/CreationDate (D:20250315120000-03'00')");
  assert.deepEqual(detectarFecha("https://x/a.pdf", "application/pdf", pdf, null), { fecha: "2025-03-15", metodo: "metadatos del PDF" });
  assert.equal(detectarFecha("https://x/wp-content/uploads/2024/06/a.pdf", "application/pdf", Buffer.from("%PDF-"), null)?.fecha, "2024-06");
  assert.equal(detectarFecha("https://x/estados-contables-2024.pdf", "application/pdf", Buffer.from("%PDF-"), null)?.fecha, "2024");
  assert.equal(detectarFecha("https://x/pagina", "text/html", Buffer.from(""), "Tue, 01 Oct 2026 00:00:00 GMT"), null);
});

let servidor: http.Server;
let base = "";
before(async () => {
  servidor = http.createServer((req, res) => {
    if (req.url === "/robots.txt") return res.end("User-agent: *\nDisallow: /bloqueado/\n");
    if (req.url === "/doc.pdf") {
      res.setHeader("content-type", "application/pdf");
      return res.end("%PDF-1.4\n/CreationDate (D:20260101000000)");
    }
    if (req.url === "/cf") {
      res.statusCode = 403;
      res.setHeader("content-type", "text/html");
      return res.end("<title>Just a moment...</title>");
    }
    if (req.url === "/caido") {
      res.statusCode = 503;
      return res.end("mantenimiento");
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});
after(() => servidor.close());

test("consultor: ok, robots, anti-bot y error HTTP", async () => {
  const c = new Consultor();
  const ok = await c.consultar("d", "obras", `${base}/doc.pdf`);
  assert.equal(ok.resultado, "ok");
  assert.equal(ok.http_status, 200);
  assert.equal(ok.fecha_documento_detectada, "2026-01-01");
  assert.match(ok.hash_sha256!, /^[0-9a-f]{64}$/);
  assert.equal((await c.consultar("d", "obras", `${base}/bloqueado/x`)).resultado, "bloqueado_robots");
  assert.equal((await c.consultar("d", "obras", `${base}/cf`)).resultado, "bloqueado_antibot");
  const caido = await c.consultar("d", "obras", `${base}/caido`);
  assert.equal(caido.resultado, "http_error");
  assert.equal(caido.http_status, 503);
});

test("sitio sin respuesta: no se consulta y queda sin_respuesta", async () => {
  const c = new Consultor({ fetch: () => Promise.reject(new Error("ECONNREFUSED")) });
  assert.equal((await c.consultar("d", "obras", "https://no-existe.example/x")).resultado, "sin_respuesta");
});

test("changelog: caída con alerta, documento actualizado y recuperación", () => {
  const r = (resultado: string, hash: string | null, url = "https://a/x") => ({
    distribuidora: "d", criterio: "obras" as const, url, fecha_consulta: "", http_status: resultado === "ok" ? 200 : 500,
    resultado: resultado as "ok", hash_sha256: hash, bytes: null, content_type: null, fecha_documento_detectada: null, metodo_fecha: null,
  });
  const previo: Snapshot = { fecha_corrida: "2026-10-07T00:00:00Z", user_agent: "", cambios: [], resultados: [r("ok", "h1"), r("http_error", null, "https://a/y")] };
  const ahora = new Date("2026-10-14T00:00:00Z");
  const cambios = detectarCambios([previo], [r("http_error", null), r("ok", "h2", "https://a/y"), r("ok", "h3", "https://a/z")], [], ahora);
  assert.deepEqual(cambios.map((c) => [c.tipo, c.alerta]), [["fuente_caida", true], ["fuente_recuperada", false], ["fuente_nueva", false]]);
  const act = detectarCambios([previo], [r("ok", "h9")], [], ahora);
  assert.deepEqual(act.map((c) => c.tipo), ["documento_actualizado"]);
});
