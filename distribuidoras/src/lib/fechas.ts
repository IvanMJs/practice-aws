/** Convierte una fecha parcial (YYYY, YYYY-MM o YYYY-MM-DD) al último día del período que indica. */
export function finDePeriodo(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  if (d) return new Date(Date.UTC(y, m - 1, d));
  if (m) return new Date(Date.UTC(y, m, 0));
  return new Date(Date.UTC(y, 11, 31));
}

export function mesesEntre(desde: Date, hasta: Date): number {
  return (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Formato legible en español para fechas parciales o ISO completas. */
export function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.slice(0, 10).split("-").map(Number);
  if (d) return `${d}/${String(m).padStart(2, "0")}/${y}`;
  if (m) return `${MESES[m - 1]} de ${y}`;
  return String(y);
}
