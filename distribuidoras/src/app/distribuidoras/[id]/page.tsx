import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EstadoBadge, TipoEtiqueta } from "@/components/Estado";
import { FuenteLink } from "@/components/FuenteLink";
import { Indice } from "@/components/Grilla";
import { CRITERIO_INFO } from "@/lib/criterios";
import { sitio } from "@/lib/data";
import { formatearFecha } from "@/lib/fechas";
import { CONFIANZA, ratiosDe } from "@/lib/modelo";
import { MIN_VERIFICADOS } from "@/lib/transparencia";
import { formatoNumero, formatoPct } from "@/lib/vistas";

export const dynamicParams = false;

export function generateStaticParams() {
  return sitio().distribuidoras.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = sitio().distribuidoras.find((x) => x.id === id);
  return { title: d ? `${d.nombre} (${d.jurisdiccion})` : "Distribuidora" };
}

const RESULTADO: Record<string, string> = {
  ok: "respondió",
  bloqueado_robots: "bloqueada por robots.txt",
  bloqueado_antibot: "bloqueo anti-bot",
  http_error: "error del servidor",
  sin_respuesta: "sin respuesta",
};

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { fichas, modelo, dotacion, drivers } = sitio();
  const f = fichas.find((x) => x.id === id);
  if (!f) notFound();

  const resultado = modelo.empresas.find((e) => e.distribuidora === id);
  const observaciones = modelo.observaciones.filter((o) => o.distribuidora === id).sort((a, b) => b.anio - a.anio);
  const ratios = ratiosDe(modelo.observaciones, id);
  const registrosDotacion = dotacion.filter((d) => d.distribuidora === id).sort((a, b) => b.anio - a.anio);
  const regResultado = registrosDotacion.find((d) => d.anio === resultado?.anio);
  const conContratistas = !!regResultado && (regResultado.incluye_contratistas || !!regResultado.contratistas);
  const registrosDrivers = drivers.filter((d) => d.distribuidora === id).sort((a, b) => b.anio - a.anio);

  return (
    <div className="space-y-10">
      <nav className="text-sm">
        <Link href="/">← Todas las distribuidoras</Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{f.nombre}</h1>
          <p className="text-ink-2">{f.jurisdiccion}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-3">Tipo</dt>
            <dd>
              <TipoEtiqueta tipo={f.tipo} verificado={f.tipo_verificado} />
            </dd>
            <dt className="text-ink-3">Regulador</dt>
            <dd className="text-ink-2">
              {f.regulador ?? "a verificar"}
              {f.regulador && !f.regulador_verificado && <span className="text-ink-3"> (a verificar)</span>}
            </dd>
            {f.sitio_web && (
              <>
                <dt className="text-ink-3">Sitio</dt>
                <dd>
                  <a href={f.sitio_web} target="_blank" rel="noopener noreferrer">
                    {new URL(f.sitio_web).host}
                  </a>
                </dd>
              </>
            )}
          </dl>
          {f.notas && <p className="mt-2 max-w-2xl text-sm text-ink-3">{f.notas}</p>}
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <Indice valor={f.indice.valor} verificados={f.indice.verificados} />
          {f.indice.valor === null && (
            <p className="mt-2 max-w-48 text-xs text-ink-3">El índice se muestra con al menos {MIN_VERIFICADOS} criterios verificados.</p>
          )}
        </div>
      </header>

      <section aria-labelledby="transparencia">
        <h2 id="transparencia" className="mb-3 text-lg font-semibold">
          Transparencia: 6 criterios
        </h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Criterio</th>
                <th scope="col">Estado</th>
                <th scope="col">Fuente y detalle</th>
              </tr>
            </thead>
            <tbody>
              {f.criterios.map((c) => (
                <tr key={c.criterio}>
                  <th scope="row" className="min-w-40 font-medium text-ink">
                    {CRITERIO_INFO[c.criterio].nombre}
                    <span className="block text-xs font-normal text-ink-3">{CRITERIO_INFO[c.criterio].descripcion}</span>
                  </th>
                  <td className="min-w-36">
                    <EstadoBadge estado={c.estado} />
                    {c.parcial && <span className="block text-xs text-ink-3">Cumplimiento parcial</span>}
                    {c.desactualizado && <span className="mt-1 block text-xs font-medium text-ink">⏱ Desactualizado</span>}
                  </td>
                  <td className="min-w-64 space-y-2">
                    {c.fuentes.map((fu) => (
                      <FuenteLink
                        key={fu.url}
                        fuente={fu}
                        extra={
                          <>
                            {fu.fecha_documento_efectiva && <> · Documento: {formatearFecha(fu.fecha_documento_efectiva)}</>}
                            {fu.ultimo_resultado && (
                              <>
                                {" "}
                                · Última verificación automática: {formatearFecha(fu.ultimo_resultado.fecha_consulta)},{" "}
                                {RESULTADO[fu.ultimo_resultado.resultado]}
                                {fu.ultimo_resultado.http_status ? ` (HTTP ${fu.ultimo_resultado.http_status})` : ""}
                              </>
                            )}
                          </>
                        }
                      />
                    ))}
                    {c.motivo && <p className="text-sm text-ink-2">{c.motivo}</p>}
                    {c.nota && <p className="text-sm text-ink-3">{c.nota}</p>}
                    {c.estado === "sin_relevar" && !c.nota && <p className="text-sm text-ink-3">Todavía no se revisó.</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="dotacion">
        <h2 id="dotacion" className="mb-3 text-lg font-semibold">
          Dotación
        </h2>
        {registrosDotacion.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface-2 p-4 text-sm text-ink-2">
            Sin dato de dotación. La empresa queda fuera del modelo hasta que se cargue una cifra con fuente.{" "}
            <Link href="/metodologia/#carga">Cómo se cargan los datos</Link>.
          </div>
        ) : (
          <div className="space-y-4">
            {resultado ? (
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="text-sm text-ink-2">
                  Dotación real {resultado.anio} ({conContratistas ? "personal propio + contratistas" : "solo personal propio"})
                </p>
                <p className="text-2xl font-semibold tabular-nums">{formatoNumero(resultado.real)}</p>
                <p className="mt-2 text-sm text-ink-2">
                  Esperada para una empresa similar: entre {formatoNumero(resultado.esperado_min)} y {formatoNumero(resultado.esperado_max)} (
                  {Math.round(CONFIANZA * 100)} % de confianza).
                </p>
                <p className="mt-1 font-medium">
                  {resultado.clasificacion === "por_encima" && "Por encima de lo esperado para empresas similares: "}
                  {resultado.clasificacion === "por_debajo" && "Por debajo de lo esperado para empresas similares: "}
                  {resultado.clasificacion === "dentro" && "Dentro del rango esperado para empresas similares: "}
                  entre {formatoPct(resultado.desvio_min_pct)} y {formatoPct(resultado.desvio_max_pct)}
                </p>
                {resultado.advertencias.length > 0 && (
                  <ul className="mt-3 space-y-1 rounded-md border p-3 text-sm" style={{ background: "var(--aviso-bg)", borderColor: "var(--aviso-border)" }}>
                    {resultado.advertencias.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-surface-2 p-4 text-sm text-ink-2">
                {observaciones.find((o) => o.exclusion)?.exclusion ?? modelo.motivoSinModelo ?? "La empresa no entra en el modelo con los datos actuales."}
              </div>
            )}

            {ratios.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Ratios simples</h3>
                <p className="mb-2 text-sm text-ink-3">
                  Engañosos entre empresas urbanas y rurales: una red rural dispersa necesita más personal por usuario. Usalos para ver la evolución de
                  una misma empresa, no para comparar.
                </p>
                <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th scope="col">Año</th>
                        <th scope="col" className="num">Usuarios por empleado</th>
                        <th scope="col" className="num">Km de red por empleado</th>
                        <th scope="col" className="num">MWh por empleado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratios.map((r) => (
                        <tr key={r.anio}>
                          <td>{r.anio}</td>
                          <td className="num">{r.usuarios_por_empleado ? formatoNumero(r.usuarios_por_empleado) : "—"}</td>
                          <td className="num">{r.km_por_empleado ? formatoNumero(r.km_por_empleado, 1) : "—"}</td>
                          <td className="num">{r.mwh_por_empleado ? formatoNumero(r.mwh_por_empleado) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 font-semibold">Datos cargados</h3>
              <ul className="space-y-3">
                {registrosDotacion.map((d) => (
                  <li key={d.anio}>
                    <p className="text-sm">
                      {d.anio}: {formatoNumero(d.empleados.valor)} ({d.definicion.replaceAll("_", " ")}
                      {d.incluye_contratistas ? ", incluye contratistas" : ", sin contratistas"})
                      {d.contratistas && <> + {formatoNumero(d.contratistas.valor)} de contratistas</>}
                    </p>
                    <FuenteLink fuente={d.empleados.fuente} />
                  </li>
                ))}
                {registrosDrivers.map((d) => (
                  <li key={`drv-${d.anio}`} className="text-sm text-ink-2">
                    {d.anio}: drivers —{" "}
                    {(
                      [
                        ["usuarios", d.usuarios_total],
                        ["km MT", d.km_red_mt],
                        ["km BT", d.km_red_bt],
                        ["MWh", d.mwh],
                        ["SAIDI (h)", d.saidi_horas],
                        ["SAIFI", d.saifi_veces],
                      ] as const
                    )
                      .filter(([, v]) => v)
                      .map(([k, v], i) => (
                        <span key={k}>
                          {i > 0 && " · "}
                          {k}:{" "}
                          <a href={v!.fuente.url} target="_blank" rel="noopener noreferrer" title={`${v!.fuente.descripcion}, consultado ${v!.fuente.fecha_consulta}`}>
                            {formatoNumero(v!.valor, Number.isInteger(v!.valor) ? 0 : 1)}
                          </a>
                        </span>
                      ))}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
