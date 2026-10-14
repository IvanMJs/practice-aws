import Link from "next/link";
import { EstadoBadge } from "@/components/Estado";
import { ListaCambios } from "@/components/Cambios";
import { Grilla } from "@/components/Grilla";
import { ESTADO_INFO } from "@/lib/criterios";
import { sitio } from "@/lib/data";
import { formatearFecha } from "@/lib/fechas";
import { ESTADOS } from "@/lib/schema";
import { tarjeta } from "@/lib/vistas";

export default function Inicio() {
  const { fichas, ultimaCorrida, modelo } = sitio();
  const total = fichas.length * 6;
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, fichas.reduce((s, f) => s + f.indice[e], 0)]));
  const conIndice = fichas.filter((f) => f.indice.valor !== null).length;
  const conDotacion = new Set(modelo.observaciones.map((o) => o.distribuidora)).size;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold sm:text-3xl">Transparencia y dotación de las distribuidoras eléctricas</h1>
        <p className="mt-2 max-w-3xl text-ink-2">
          Qué información publican las {fichas.length} distribuidoras eléctricas de Argentina y si su cantidad de personal es razonable para el
          trabajo que hacen, comparadas con empresas similares. Cada cifra enlaza a su fuente, con su período y la fecha de consulta.
        </p>
      </section>

      <section aria-labelledby="resumen" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <h2 id="resumen" className="sr-only">
          Resumen nacional
        </h2>
        <Dato titulo="Criterios relevados" valor={`${total - conteo.sin_relevar} de ${total}`} detalle={`${fichas.length} distribuidoras × 6 criterios`} />
        <Dato titulo="Criterios publicados" valor={String(conteo.publica)} detalle={`${conteo.no_publica} verificados como no publicados`} />
        <Dato titulo="Con índice de transparencia" valor={`${conIndice} de ${fichas.length}`} detalle="Se necesitan 3 criterios verificados" />
        <Dato titulo="Con dato de dotación" valor={`${conDotacion} de ${fichas.length}`} detalle={modelo.especificacion ? modelo.especificacion.nombre : "Modelo todavía no calculado"} />
      </section>

      <section aria-labelledby="leyenda" className="rounded-lg border border-line bg-surface p-4">
        <h2 id="leyenda" className="mb-3 font-semibold">
          Qué significa cada estado
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {ESTADOS.map((e) => (
            <div key={e}>
              <dt>
                <EstadoBadge estado={e} /> <span className="text-sm text-ink-3">({conteo[e]})</span>
              </dt>
              <dd className="mt-0.5 text-sm text-ink-2">{ESTADO_INFO[e].descripcion}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-ink-3">
          Que falte un dato no significa que la empresa no lo publique. El índice solo usa los criterios verificados.{" "}
          <Link href="/metodologia/">Ver metodología</Link>.
        </p>
      </section>

      <Grilla tarjetas={fichas.map(tarjeta)} />

      <section aria-labelledby="cambios">
        <h2 id="cambios" className="mb-2 text-lg font-semibold">
          Cambios de esta semana
        </h2>
        {ultimaCorrida ? (
          <>
            <p className="mb-3 text-sm text-ink-3">Corrida del {formatearFecha(ultimaCorrida.fecha_corrida)}.</p>
            <ListaCambios cambios={ultimaCorrida.cambios} filtrarNuevas />
          </>
        ) : (
          <p className="text-sm text-ink-3">
            Todavía no hubo corridas automáticas. Los estados muestran el relevamiento manual del 14/10/2026.
          </p>
        )}
        <p className="mt-3 text-sm">
          <Link href="/fuentes/#historial">Ver el historial completo</Link>
        </p>
      </section>
    </div>
  );
}

function Dato({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-ink-2">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
      <p className="mt-1 text-xs text-ink-3">{detalle}</p>
    </div>
  );
}
