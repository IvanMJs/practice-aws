import type { TarjetaDatos } from "@/components/Grilla";
import { sitio, type Ficha } from "./data";

export function estadoDotacion(id: string): TarjetaDatos["dotacion"] {
  const { modelo } = sitio();
  const r = modelo.empresas.find((e) => e.distribuidora === id);
  if (r) return r.clasificacion;
  return modelo.observaciones.some((o) => o.distribuidora === id) ? "fuera_del_modelo" : "sin_dato";
}

export function tarjeta(f: Ficha): TarjetaDatos {
  return {
    id: f.id,
    nombre: f.nombre,
    jurisdiccion: f.jurisdiccion,
    provincias: f.provincias,
    tipo: f.tipo,
    tipo_verificado: f.tipo_verificado,
    criterios: f.criterios.map((c) => ({ criterio: c.criterio, estado: c.estado, desactualizado: c.desactualizado })),
    indice: { valor: f.indice.valor, verificados: f.indice.verificados },
    dotacion: estadoDotacion(f.id),
  };
}

export const nombreDe = (id: string) => sitio().distribuidoras.find((d) => d.id === id)?.nombre ?? id;

export const formatoNumero = (n: number, decimales = 0) =>
  n.toLocaleString("es-AR", { maximumFractionDigits: decimales, minimumFractionDigits: decimales });

export const formatoPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatoNumero(Math.abs(n))} %`;
