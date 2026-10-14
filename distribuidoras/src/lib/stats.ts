/** Estadística mínima sin dependencias: MCO, errores robustos por cluster y cuantiles t. */

export type Matriz = number[][];

const transpuesta = (a: Matriz): Matriz => a[0].map((_, j) => a.map((f) => f[j]));

const producto = (a: Matriz, b: Matriz): Matriz =>
  a.map((f) => b[0].map((_, j) => f.reduce((s, v, k) => s + v * b[k][j], 0)));

/** Inversa por Gauss-Jordan con pivoteo parcial. Devuelve null si la matriz es singular. */
export function inversa(m: Matriz): Matriz | null {
  const n = m.length;
  const a = m.map((f, i) => [...f, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-10) return null;
    [a[c], a[p]] = [a[p], a[c]];
    const piv = a[c][c];
    for (let j = 0; j < 2 * n; j++) a[c][j] /= piv;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[c][j];
    }
  }
  return a.map((f) => f.slice(n));
}

export interface AjusteMCO {
  coeficientes: number[];
  /** Matriz de varianzas y covarianzas de los coeficientes. */
  vcov: Matriz;
  residuos: number[];
  ajustados: number[];
  n: number;
  k: number;
  /** Grados de libertad para los intervalos t. */
  gl: number;
  r2: number;
  sigma: number;
  errores: "clasicos" | "cluster";
}

/**
 * Mínimos cuadrados ordinarios. X debe incluir la columna de unos.
 * Con `clusters` (por ejemplo, la distribuidora en un panel de varios años) usa errores
 * robustos por cluster (CR1), porque las observaciones de una misma empresa no son independientes.
 */
export function mco(X: Matriz, y: number[], clusters?: string[]): AjusteMCO | null {
  const n = X.length;
  const k = X[0]?.length ?? 0;
  if (n <= k) return null;
  const Xt = transpuesta(X);
  const XtXinv = inversa(producto(Xt, X));
  if (!XtXinv) return null;
  const beta = producto(XtXinv, producto(Xt, y.map((v) => [v]))).map((f) => f[0]);
  const ajustados = X.map((f) => f.reduce((s, v, j) => s + v * beta[j], 0));
  const residuos = y.map((v, i) => v - ajustados[i]);
  const ssr = residuos.reduce((s, e) => s + e * e, 0);
  const media = y.reduce((s, v) => s + v, 0) / n;
  const sst = y.reduce((s, v) => s + (v - media) ** 2, 0);
  const sigma2 = ssr / (n - k);

  let vcov: Matriz;
  let gl = n - k;
  let errores: AjusteMCO["errores"] = "clasicos";
  const grupos = clusters ? new Set(clusters) : null;
  if (clusters && grupos && grupos.size < n && grupos.size > k) {
    // Sándwich: (X'X)^-1 [Σ_g X_g' u_g u_g' X_g] (X'X)^-1, con corrección de muestra chica.
    const G = grupos.size;
    const carne: Matriz = Array.from({ length: k }, () => Array(k).fill(0));
    for (const g of grupos) {
      const s = Array(k).fill(0);
      clusters.forEach((c, i) => {
        if (c === g) for (let j = 0; j < k; j++) s[j] += X[i][j] * residuos[i];
      });
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) carne[a][b] += s[a] * s[b];
    }
    const ajuste = (G / (G - 1)) * ((n - 1) / (n - k));
    vcov = producto(producto(XtXinv, carne), XtXinv).map((f) => f.map((v) => v * ajuste));
    gl = G - 1;
    errores = "cluster";
  } else {
    vcov = XtXinv.map((f) => f.map((v) => v * sigma2));
  }

  return {
    coeficientes: beta,
    vcov,
    residuos,
    ajustados,
    n,
    k,
    gl,
    r2: sst > 0 ? 1 - ssr / sst : 0,
    sigma: Math.sqrt(sigma2),
    errores,
  };
}

/** Error estándar de la predicción media x0·β. */
export function errorPrediccionMedia(ajuste: AjusteMCO, x0: number[]): number {
  let v = 0;
  for (let a = 0; a < x0.length; a++) for (let b = 0; b < x0.length; b++) v += x0[a] * ajuste.vcov[a][b] * x0[b];
  return Math.sqrt(Math.max(v, 0));
}

// --- Distribución t ---

function lnGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const t = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let s = 1.000000000190015;
  for (const ci of c) s += ci / ++y;
  return -t + Math.log((2.5066282746310005 * s) / x);
}

function fraccionBeta(a: number, b: number, x: number): number {
  const EPS = 3e-14;
  const MIN = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < MIN) d = MIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < MIN) d = MIN;
    c = 1 + aa / c;
    if (Math.abs(c) < MIN) c = MIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < MIN) d = MIN;
    c = 1 + aa / c;
    if (Math.abs(c) < MIN) c = MIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Beta incompleta regularizada I_x(a, b). */
export function betaIncompleta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * fraccionBeta(a, b, x)) / a : 1 - (bt * fraccionBeta(b, a, 1 - x)) / b;
}

export function tCDF(t: number, gl: number): number {
  const p = 0.5 * betaIncompleta(gl / (gl + t * t), gl / 2, 0.5);
  return t >= 0 ? 1 - p : p;
}

/** Cuantil de la t de Student por bisección. */
export function tCuantil(p: number, gl: number): number {
  let lo = -1e3;
  let hi = 1e3;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, gl) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function mediana(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
