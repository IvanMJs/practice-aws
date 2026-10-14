import assert from "node:assert/strict";
import { test } from "node:test";
import { mco, tCuantil, inversa } from "../src/lib/stats";

test("tCuantil coincide con tablas", () => {
  assert.ok(Math.abs(tCuantil(0.95, 10) - 1.8125) < 1e-3);
  assert.ok(Math.abs(tCuantil(0.975, 5) - 2.5706) < 1e-3);
  assert.ok(Math.abs(tCuantil(0.95, 1000) - 1.6464) < 1e-3);
});

test("inversa detecta matrices singulares", () => {
  assert.equal(inversa([[1, 2], [2, 4]]), null);
  const inv = inversa([[4, 7], [2, 6]])!;
  assert.ok(Math.abs(inv[0][0] - 0.6) < 1e-12 && Math.abs(inv[1][1] - 0.4) < 1e-12);
});

test("MCO recupera coeficientes exactos sin ruido", () => {
  const X = [1, 2, 3, 4, 5, 6].map((x) => [1, x, x * x]);
  const y = X.map(([, x, x2]) => 2 + 3 * x - 0.5 * x2);
  const a = mco(X, y)!;
  [2, 3, -0.5].forEach((b, i) => assert.ok(Math.abs(a.coeficientes[i] - b) < 1e-9));
  assert.ok(a.r2 > 0.999999);
});

test("MCO con clusters usa errores robustos y G-1 grados de libertad", () => {
  const X: number[][] = [];
  const y: number[] = [];
  const g: string[] = [];
  for (let e = 0; e < 6; e++) {
    for (let t = 0; t < 3; t++) {
      const x = e + t * 0.1;
      X.push([1, x]);
      y.push(1 + 2 * x + (e % 2 ? 0.3 : -0.3) + t * 0.01);
      g.push(`e${e}`);
    }
  }
  const a = mco(X, y, g)!;
  assert.equal(a.errores, "cluster");
  assert.equal(a.gl, 5);
  assert.ok(a.vcov[1][1] > 0);
});
