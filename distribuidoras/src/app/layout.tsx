import type { Metadata } from "next";
import Link from "next/link";
import { BotonTema } from "@/components/BotonTema";
import { sitio } from "@/lib/data";
import { formatearFecha } from "@/lib/fechas";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Distribuidoras Argentinas", template: "%s · Distribuidoras Argentinas" },
  description:
    "Transparencia y dotación de las distribuidoras eléctricas de Argentina, con datos verificables: cada cifra muestra su fuente, su período y la fecha de consulta.",
};

// Evita el destello de tema incorrecto: aplica la preferencia guardada antes de pintar.
const scriptTema = `try{var t=localStorage.getItem("tema");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const NAV = [
  { href: "/", texto: "Inicio" },
  { href: "/dotacion/", texto: "Dotación" },
  { href: "/metodologia/", texto: "Metodología" },
  { href: "/fuentes/", texto: "Fuentes" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { ultimaCorrida, ultimoRelevamiento } = sitio();
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
          Ir al contenido
        </a>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold text-ink hover:no-underline">
              Distribuidoras Argentinas
            </Link>
            <nav aria-label="Principal" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-ink-2 hover:text-ink">
                  {n.texto}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <BotonTema />
            </div>
          </div>
        </header>
        <main id="contenido" className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-line text-sm text-ink-3">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-6">
            <p>
              Última actualización automática:{" "}
              {ultimaCorrida ? formatearFecha(ultimaCorrida.fecha_corrida) : "todavía no hubo corridas"}
              {ultimoRelevamiento && <> · Último relevamiento manual: {formatearFecha(ultimoRelevamiento)}</>}
            </p>
            <p>
              Datos abiertos y versionados. ¿Encontraste un error? <Link href="/fuentes/#reportar">Reportalo</Link>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
