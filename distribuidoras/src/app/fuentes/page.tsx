import type { Metadata } from "next";
import Link from "next/link";
import { ListaCambios } from "@/components/Cambios";
import { EstadoBadge } from "@/components/Estado";
import { ReportarError } from "@/components/ReportarError";
import { CRITERIO_INFO } from "@/lib/criterios";
import { sitio } from "@/lib/data";
import { formatearFecha } from "@/lib/fechas";

export const metadata: Metadata = { title: "Fuentes" };

export default function FuentesPage() {
  const { fichas, snapshots, dotacion, drivers } = sitio();
  const filas = fichas.flatMap((f) => f.criterios.flatMap((c) => c.fuentes.map((fu) => ({ f, c, fu }))));
  const numericas = [
    ...dotacion.flatMap((d) => [d.empleados, d.contratistas].filter(Boolean).map((x) => ({ id: d.distribuidora, anio: d.anio, dato: "Dotación", fuente: x!.fuente }))),
    ...drivers.flatMap((d) =>
      (["usuarios_total", "km_red_mt", "km_red_bt", "mwh", "saidi_horas", "saifi_veces"] as const)
        .filter((k) => d[k])
        .map((k) => ({ id: d.distribuidora, anio: d.anio, dato: k, fuente: d[k]!.fuente })),
    ),
  ];
  const historial = [...snapshots].reverse();

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Fuentes</h1>
        <p className="mt-2 max-w-3xl text-ink-2">Todas las fuentes usadas, con su período, la fecha de consulta y el último resultado de la verificación automática.</p>
      </header>

      <section aria-labelledby="transparencia">
        <h2 id="transparencia" className="mb-3 text-lg font-semibold">
          Transparencia ({filas.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Distribuidora</th>
                <th scope="col">Criterio</th>
                <th scope="col">Fuente</th>
                <th scope="col">Consulta</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ f, c, fu }) => (
                <tr key={`${f.id}-${c.criterio}-${fu.url}`}>
                  <td><Link href={`/distribuidoras/${f.id}/`}>{f.nombre}</Link></td>
                  <td>{CRITERIO_INFO[c.criterio].nombre}</td>
                  <td className="max-w-md break-words">
                    <a href={fu.url} target="_blank" rel="noopener noreferrer">{fu.descripcion}</a>
                    <span className="block text-xs text-ink-3">
                      {fu.oficial ? "Oficial" : "No oficial"}
                      {fu.periodo && ` · ${fu.periodo}`}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {formatearFecha(fu.fecha_consulta)}
                    {fu.ultimo_resultado?.http_status && <span className="block text-xs text-ink-3">HTTP {fu.ultimo_resultado.http_status}</span>}
                  </td>
                  <td><EstadoBadge estado={c.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="numericas">
        <h2 id="numericas" className="mb-3 text-lg font-semibold">
          Dotación y drivers ({numericas.length})
        </h2>
        {numericas.length === 0 ? (
          <p className="text-sm text-ink-3">Todavía no se cargaron datos de dotación ni de drivers.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {numericas.map((n, i) => (
              <li key={i}>
                {n.id} · {n.anio} · {n.dato}: <a href={n.fuente.url}>{n.fuente.descripcion}</a> <span className="text-ink-3">(consultado {formatearFecha(n.fuente.fecha_consulta)})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial" id="historial">
        <h2 className="mb-3 text-lg font-semibold">Historial de corridas</h2>
        {historial.length === 0 ? (
          <p className="text-sm text-ink-3">Todavía no hubo corridas automáticas.</p>
        ) : (
          <ol className="space-y-6">
            {historial.map((s) => {
              const ok = s.resultados.filter((r) => r.resultado === "ok").length;
              return (
                <li key={s.fecha_corrida}>
                  <h3 className="font-medium">
                    {formatearFecha(s.fecha_corrida)}{" "}
                    <span className="text-sm font-normal text-ink-3">
                      · {ok} de {s.resultados.length} fuentes respondieron
                    </span>
                  </h3>
                  <div className="mt-2">
                    <ListaCambios cambios={s.cambios} filtrarNuevas />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="reportar" id="reportar">
        <h2 className="mb-2 text-lg font-semibold">Reportar un error</h2>
        <p className="mb-3 text-sm text-ink-2">Si un dato está mal, un enlace se rompió o conocés una fuente oficial que falta, contanos.</p>
        <ReportarError distribuidoras={fichas.map((f) => ({ id: f.id, nombre: f.nombre }))} />
      </section>
    </div>
  );
}
