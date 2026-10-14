import { ESTADO_INFO, TIPO_INFO } from "@/lib/criterios";
import type { Estado, Tipo } from "@/lib/schema";

const COLOR: Record<Estado, string> = {
  publica: "var(--estado-publica)",
  no_publica: "var(--estado-no-publica)",
  no_verificable: "var(--estado-no-verificable)",
  sin_relevar: "var(--estado-sin-relevar)",
};

/** El estado nunca se comunica solo con color: lleva símbolo y texto. */
export function EstadoBadge({ estado, compacto = false }: { estado: Estado; compacto?: boolean }) {
  const info = ESTADO_INFO[estado];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink" title={info.descripcion}>
      <span
        aria-hidden
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: COLOR[estado], color: estado === "no_verificable" ? "#3a2a00" : "#fff" }}
      >
        {info.simbolo}
      </span>
      <span className={compacto ? "sr-only" : undefined}>{info.nombre}</span>
    </span>
  );
}

export function colorEstado(e: Estado) {
  return COLOR[e];
}

export const COLOR_TIPO: Record<Tipo, string> = {
  estatal: "var(--tipo-estatal)",
  privada: "var(--tipo-privada)",
  cooperativa: "var(--tipo-cooperativa)",
};

/** Forma del marcador por tipo: segunda codificación además del color. */
export const FORMA_TIPO: Record<Tipo, "circulo" | "cuadrado" | "triangulo"> = {
  estatal: "circulo",
  privada: "cuadrado",
  cooperativa: "triangulo",
};

export function Marcador({ tipo, x = 0, y = 0, r = 5 }: { tipo: Tipo; x?: number; y?: number; r?: number }) {
  const fill = COLOR_TIPO[tipo];
  const props = { fill, stroke: "var(--surface)", strokeWidth: 2 };
  if (FORMA_TIPO[tipo] === "circulo") return <circle cx={x} cy={y} r={r} {...props} />;
  if (FORMA_TIPO[tipo] === "cuadrado") return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} rx={1.5} {...props} />;
  const h = r * 1.15;
  return <polygon points={`${x},${y - h} ${x + h},${y + h * 0.8} ${x - h},${y + h * 0.8}`} {...props} />;
}

export function TipoEtiqueta({ tipo, verificado }: { tipo: Tipo; verificado?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
      <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden>
        <Marcador tipo={tipo} r={5} />
      </svg>
      {TIPO_INFO[tipo].nombre}
      {verificado === false && <span className="text-ink-3">(a verificar)</span>}
    </span>
  );
}
