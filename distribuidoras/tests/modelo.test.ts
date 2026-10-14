import assert from "node:assert/strict";
import { test } from "node:test";
import { estimarModelo, ratiosDe } from "../src/lib/modelo";
import type { Distribuidora, Dotacion, Drivers, Fuente } from "../src/lib/schema";

// Datos sintéticos SOLO para pruebas: no representan a ninguna empresa real.
const fuente: Fuente = { url: "https://example.org/x", descripcion: "prueba", oficial: true, fecha_consulta: "2026-01-01" };
const dato = (valor: number) => ({ valor, fuente });

function generar(n: number, anios = [2024]) {
  const distribuidoras: Distribuidora[] = [];
  const dotacion: Dotacion[] = [];
  const drivers: Drivers[] = [];
  for (let i = 0; i < n; i++) {
    const id = `e${i}`;
    distribuidoras.push({
      id, nombre: id, jurisdiccion: "X", provincias: ["X"], tipo: (["estatal", "privada", "cooperativa"] as const)[i % 3],
      tipo_verificado: true, regulador: null, regulador_verificado: false, sitio_web: null,
    });
    for (const anio of anios) {
      const usuarios = 50_000 * (1 + i) * (1 + 0.02 * (anio - 2024));
      const km = 3_000 * (1 + ((i * 7) % 5)) + 500 * i;
      const mwh = usuarios * (3 + (i % 4) * 0.4);
      const ruido = Math.sin(i * 12.9898 + anio) * 0.08;
      const extra = i === 0 ? Math.log(1.6) : 0; // e0: 60 % por encima
      const empleados = Math.exp(-3 + 0.6 * Math.log(usuarios) + 0.2 * Math.log(km) + 0.15 * Math.log(mwh) + ruido + extra);
      dotacion.push({
        distribuidora: id, anio, empleados: dato(Math.round(empleados)), definicion: "personas",
        incluye_contratistas: i % 2 === 0, contratistas: null,
        integracion_vertical: { generacion: false, transmision: false, obras_con_personal_propio: false, separado: true },
      });
      drivers.push({
        distribuidora: id, anio, usuarios_total: dato(usuarios), usuarios_residenciales: null, grandes_clientes: null,
        km_red_mt: dato(km * 0.4), km_red_bt: dato(km * 0.6), mwh: dato(mwh), superficie_km2: null,
        saidi_horas: dato(10 + i), saifi_veces: null,
      });
    }
  }
  return { distribuidoras, dotacion, drivers };
}

test("sin datos suficientes no hay modelo y se explica por qué", () => {
  const d = generar(4);
  const r = estimarModelo(d.distribuidoras, d.dotacion, d.drivers);
  assert.equal(r.especificacion, null);
  assert.match(r.motivoSinModelo!, /4 observaciones/);
});

test("con pocas observaciones usa el modelo reducido", () => {
  const d = generar(10);
  const r = estimarModelo(d.distribuidoras, d.dotacion, d.drivers);
  assert.equal(r.especificacion?.id, "reducido");
  assert.equal(r.empresas.length, 10);
});

test("panel completo: detecta la empresa por encima de lo esperado, con un rango", () => {
  const d = generar(12, [2022, 2023, 2024]);
  const r = estimarModelo(d.distribuidoras, d.dotacion, d.drivers);
  assert.equal(r.especificacion?.id, "completo");
  assert.equal(r.ajuste?.errores, "cluster");
  const e0 = r.empresas.find((e) => e.distribuidora === "e0")!;
  assert.equal(e0.anio, 2024);
  assert.ok(e0.desvio_min_pct < e0.desvio_max_pct);
  assert.equal(e0.clasificacion, "por_encima");
  // e0 tiene mucha influencia (es la más chica), así que el ajuste absorbe parte del 60 %.
  assert.ok(e0.desvio_central_pct > 10);
  // Las que no informan contratistas quedan marcadas.
  const e1 = r.empresas.find((e) => e.distribuidora === "e1")!;
  assert.ok(e1.advertencias.some((a) => a.includes("contratistas")));
  assert.deepEqual(r.porTipo.map((t) => t.tipo).sort(), ["cooperativa", "estatal", "privada"]);
});

test("dotación en cargos queda fuera del modelo", () => {
  const d = generar(10);
  d.dotacion[3].definicion = "cargos";
  const r = estimarModelo(d.distribuidoras, d.dotacion, d.drivers);
  assert.ok(r.observaciones.find((o) => o.distribuidora === "e3")!.exclusion);
  assert.ok(!r.empresas.some((e) => e.distribuidora === "e3"));
});

test("ratios simples por año", () => {
  const d = generar(3, [2023, 2024]);
  const r = estimarModelo(d.distribuidoras, d.dotacion, d.drivers);
  const ratios = ratiosDe(r.observaciones, "e1");
  assert.deepEqual(ratios.map((x) => x.anio), [2023, 2024]);
  assert.ok(ratios[0].usuarios_por_empleado! > 0);
});

test("variables colineales: no hay modelo y el motivo lo dice", () => {
  const d = generar(10);
  d.drivers.forEach((x) => (x.mwh = { ...x.mwh!, valor: x.usuarios_total!.valor * 3 }));
  const r = estimarModelo(d.distribuidoras, d.dotacion, d.drivers);
  assert.equal(r.especificacion, null);
  assert.match(r.motivoSinModelo!, /colineales/);
});
