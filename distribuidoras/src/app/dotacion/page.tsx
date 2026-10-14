import type { Metadata } from "next";
import Link from "next/link";
import { Dispersion, type PuntoDispersion } from "@/components/Dispersion";
import { COLOR_TIPO, TipoEtiqueta } from "@/components/Estado";
import { TIPO_INFO } from "@/lib/criterios";
import { sitio } from "@/lib/data";
import { CONFIANZA, VARIABLES } from "@/lib/modelo";
import { formatoNumero, formatoPct, nombreDe } from "@/lib/vistas";

export const metadata: Metadata = { title: "Dotación" };

export default function DotacionPage() {
  const { modelo, distribuidoras } = sitio();
  const { especificacion, ajuste, empresas } = modelo;

  // Último año de cada empresa con dotación y usuarios.
  const ultimas = new Map<string, (typeof modelo.observaciones)[number]>();
  for (const o of modelo.observaciones) {
    if (!o.usuarios || o.dotacion_efectiva <= 0) continue;
    const prev = ultimas.get(o.distribuidora);
    if (!prev || prev.anio < o.anio) ultimas.set(o.distribuidora, o);
  }
  const puntos: PuntoDispersion[] = [...ultimas.values()].map((o) => ({
    id: o.distribuidora,
    nombre: nombreDe(o.distribuidora),
    tipo: o.tipo,
    anio: o.anio,
    usuarios: o.usuarios!,
    dotacion: o.dotacion_efectiva,
    esperado: empresas.find((e) => e.distribuidora === o.distribuidora && e.anio === o.anio)?.esperado ?? null,
  }));
  const sinDato = distribuidoras.filter((d) => !modelo.observaciones.some((o) => o.distribuidora === d.id));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Dotación</h1>
        <p className="mt-2 max-w-3xl text-ink-2">
          Compara la cantidad de personal de cada distribuidora con la que tendría una empresa parecida haciendo el mismo trabajo: misma cantidad de
          usuarios, kilómetros de red y energía distribuida. El resultado se muestra como un rango, nunca como un número único.{" "}
          <Link href="/metodologia/#dotacion">Cómo se calcula</Link>.
        </p>
      </header>

      {!especificacion && (
        <div className="rounded-lg border p-4 text-sm" style={{ background: "var(--aviso-bg)", borderColor: "var(--aviso-border)" }}>
          <p className="font-medium">El modelo todavía no se puede calcular.</p>
          <p className="mt-1 text-ink-2">{modelo.motivoSinModelo}</p>
          <p className="mt-1 text-ink-2">
            Los datos de dotación, usuarios, km de red y MWh se cargan a mano desde memorias, balances y entes reguladores, siempre con su fuente.{" "}
            <Link href="/metodologia/#carga">Cómo colaborar con la carga</Link>.
          </p>
        </div>
      )}

      {puntos.length > 0 ? (
        <>
          <Dispersion puntos={puntos} tendencia={modelo.tendencia} />
          <p className="-mt-6 text-xs text-ink-3">
            Dotación = personal propio más contratistas cuando se conocen. La tendencia es una regresión simple contra usuarios; la dotación esperada
            de cada empresa sale del modelo completo, que también tiene en cuenta red, energía y densidad.
          </p>
          <details className="rounded-lg border border-line bg-surface p-4">
            <summary className="cursor-pointer font-medium">Ver los datos del gráfico como tabla</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Distribuidora</th>
                    <th scope="col">Tipo</th>
                    <th scope="col" className="num">Año</th>
                    <th scope="col" className="num">Usuarios</th>
                    <th scope="col" className="num">Dotación</th>
                  </tr>
                </thead>
                <tbody>
                  {puntos.map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/distribuidoras/${p.id}/`}>{p.nombre}</Link></td>
                      <td>{TIPO_INFO[p.tipo].nombre}</td>
                      <td className="num">{p.anio}</td>
                      <td className="num">{formatoNumero(p.usuarios)}</td>
                      <td className="num">{formatoNumero(p.dotacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-line bg-surface-2 p-4 text-center text-sm text-ink-3">
          El gráfico de dispersión aparece cuando haya al menos una empresa con dotación y usuarios cargados.
        </div>
      )}

      {especificacion && ajuste && (
        <section aria-labelledby="resultados" className="space-y-4">
          <h2 id="resultados" className="text-lg font-semibold">
            Dotación real vs. esperada
          </h2>
          <p className="text-sm text-ink-2">
            {especificacion.nombre}: log(empleados) = a + {especificacion.variables.map((v) => VARIABLES[v]).join(" + ")}. {ajuste.n} observaciones,
            R² = {formatoNumero(ajuste.r2, 2)}, errores {ajuste.errores === "cluster" ? "robustos agrupados por empresa" : "clásicos"}. Rangos al{" "}
            {Math.round(CONFIANZA * 100)} % de confianza.
          </p>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Distribuidora</th>
                  <th scope="col">Tipo</th>
                  <th scope="col" className="num">Real</th>
                  <th scope="col" className="num">Esperada</th>
                  <th scope="col">Desvío</th>
                </tr>
              </thead>
              <tbody>
                {[...empresas]
                  .sort((a, b) => b.desvio_central_pct - a.desvio_central_pct)
                  .map((e) => (
                    <tr key={e.distribuidora}>
                      <td>
                        <Link href={`/distribuidoras/${e.distribuidora}/`}>{nombreDe(e.distribuidora)}</Link>
                        {e.advertencias.length > 0 && <span className="block text-xs text-ink-3">{e.advertencias.length} advertencia(s)</span>}
                      </td>
                      <td><TipoEtiqueta tipo={e.tipo} /></td>
                      <td className="num">{formatoNumero(e.real)}</td>
                      <td className="num">
                        {formatoNumero(e.esperado_min)}–{formatoNumero(e.esperado_max)}
                      </td>
                      <td>
                        entre {formatoPct(e.desvio_min_pct)} y {formatoPct(e.desvio_max_pct)}
                        <span className="block text-xs text-ink-3">
                          {e.clasificacion === "por_encima" ? "por encima de lo esperado" : e.clasificacion === "por_debajo" ? "por debajo de lo esperado" : "dentro de lo esperado"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <h3 className="pt-4 font-semibold">Desvíos por tipo de empresa</h3>
          <TiraPorTipo grupos={modelo.porTipo} />
        </section>
      )}

      <section aria-labelledby="sin-dato">
        <h2 id="sin-dato" className="mb-2 text-lg font-semibold">
          Sin dato de dotación ({sinDato.length})
        </h2>
        <p className="mb-3 text-sm text-ink-3">Quedan en gris y fuera del modelo hasta que se cargue una cifra con fuente.</p>
        <ul className="flex flex-wrap gap-2">
          {sinDato.map((d) => (
            <li key={d.id}>
              <Link href={`/distribuidoras/${d.id}/`} className="inline-block rounded-md border border-line bg-surface-2 px-2 py-1 text-sm text-ink-3">
                {d.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TiraPorTipo({ grupos }: { grupos: { tipo: keyof typeof TIPO_INFO; n: number; mediana_pct: number; desvios_pct: number[] }[] }) {
  const todos = grupos.flatMap((g) => g.desvios_pct);
  const lim = Math.max(50, ...todos.map(Math.abs)) * 1.1;
  const x = (v: number) => 200 + (v / lim) * 190;
  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
      {grupos.map((g) => (
        <div key={g.tipo} className="grid grid-cols-[7rem_1fr] items-center gap-3 text-sm">
          <span className="text-ink-2">
            {TIPO_INFO[g.tipo].plural} <span className="text-ink-3">(n={g.n})</span>
          </span>
          <svg viewBox="0 0 400 24" className="h-auto w-full" aria-label={`Mediana ${formatoPct(g.mediana_pct)}`}>
            <line x1="200" x2="200" y1="0" y2="24" stroke="var(--ink-3)" strokeWidth="1" />
            {g.desvios_pct.map((d, i) => (
              <circle key={i} cx={x(d)} cy="12" r="3.5" fill={COLOR_TIPO[g.tipo]} stroke="var(--surface)" strokeWidth="1.5" />
            ))}
            <line x1={x(g.mediana_pct)} x2={x(g.mediana_pct)} y1="2" y2="22" stroke="var(--ink)" strokeWidth="2" />
          </svg>
        </div>
      ))}
      <p className="text-xs text-ink-3">
        Cada punto es una empresa; la línea oscura es la mediana del grupo; la línea central es «igual a lo esperado». Escala: ±{formatoNumero(lim)} %.
      </p>
    </div>
  );
}
