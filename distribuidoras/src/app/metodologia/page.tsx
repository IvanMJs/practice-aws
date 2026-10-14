import type { Metadata } from "next";
import { CRITERIO_INFO } from "@/lib/criterios";
import { DATOS_URL } from "@/lib/config";
import { CONFIANZA, ESPECIFICACIONES, VARIABLES } from "@/lib/modelo";
import { CRITERIOS } from "@/lib/schema";
import { MIN_VERIFICADOS } from "@/lib/transparencia";

export const metadata: Metadata = { title: "Metodología" };

export default function Metodologia() {
  return (
    <article className="prose-sitio max-w-3xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Metodología</h1>
      <p>
        Este sitio busca mostrar, con datos verificables, qué información publican las distribuidoras eléctricas y si su dotación es razonable
        para el trabajo que hacen. Cada cifra guarda su fuente (URL), su período, la fecha de consulta y su definición.
      </p>

      <h2 id="estados">Los cuatro estados</h2>
      <ul>
        <li><strong>Publica:</strong> verificado en una fuente oficial, con URL y fecha.</li>
        <li><strong>No publica:</strong> se buscó en el sitio de la empresa, en el ente regulador y en el boletín oficial, y no está. Sin las tres búsquedas registradas, el dato no se puede cargar con este estado.</li>
        <li><strong>No verificable:</strong> el sitio bloqueó el acceso (403, anti-bot, robots.txt) o no respondió. No suma ni resta.</li>
        <li><strong>Sin relevar:</strong> todavía no se revisó.</li>
      </ul>
      <p>
        <strong>Que falte un dato no significa que la empresa no lo publique.</strong> Un fallo de descarga nunca se registra como «no publica». No se eluden protecciones como Cloudflare o robots.txt: si un sitio bloquea, el estado es «no verificable».
      </p>

      <h2 id="indice">Índice de transparencia</h2>
      <p>Seis criterios con el mismo peso (1/6 cada uno):</p>
      <ul>
        {CRITERIOS.map((c) => (
          <li key={c}>
            <strong>{CRITERIO_INFO[c].nombre}:</strong> {CRITERIO_INFO[c].descripcion}
            {CRITERIO_INFO[c].vigenciaMeses && <> Se considera desactualizado después de {CRITERIO_INFO[c].vigenciaMeses} meses.</>}
          </li>
        ))}
      </ul>
      <pre>índice = 100 × publica / (publica + no_publica)</pre>
      <p>
        El índice se calcula solo sobre los criterios verificados. Con menos de {MIN_VERIFICADOS} criterios verificados no se muestra un
        índice, sino «N de 6 verificados». Las fuentes no oficiales (prensa, terceros) se muestran marcadas como tales y no cuentan. Que un
        documento esté desactualizado se marca aparte, pero no cambia el índice.
      </p>

      <h2 id="actualizacion">Actualización semanal</h2>
      <ul>
        <li>Una vez por semana, un proceso automático consulta cada fuente respetando robots.txt, con un user-agent que identifica al proyecto.</li>
        <li>De cada consulta se guarda un snapshot fechado: resultado, URL, código HTTP, hash del contenido y fecha de consulta. Las corridas anteriores nunca se pisan.</li>
        <li>La fecha del documento se toma de la carga manual o, si no hay, de los metadatos del PDF, de la URL o del encabezado Last-Modified.</li>
        <li>Si una fuente que antes respondía ahora falla, el criterio pasa a «no verificable» y se abre una alerta para revisarlo. Nunca baja a «no publica» por un fallo técnico.</li>
        <li>Se publica un registro de cambios: documento nuevo o modificado, fuente caída o recuperada, documento que superó su plazo de vigencia.</li>
        <li>Después de cada corrida se recalcula el modelo de dotación y se reconstruye el sitio.</li>
      </ul>

      <h2 id="dotacion">Análisis de dotación</h2>
      <h3>Nivel 1: ratios simples</h3>
      <p>
        Usuarios, km de red y MWh por empleado. Se muestran en cada ficha para ver la evolución de una misma empresa, pero son engañosos para
        comparar empresas urbanas con rurales: una red rural dispersa necesita más personal por usuario.
      </p>
      <h3>Nivel 2: dotación esperada por regresión log-log (modelo principal)</h3>
      <pre>log(empleados) = a + b·log(usuarios) + c·log(km_red) + d·log(MWh) + e·densidad</pre>
      <ul>
        <li>
          Se estima por mínimos cuadrados. La densidad (usuarios por km) entra en nivel, no en logaritmo: su logaritmo sería la resta exacta
          de log(usuarios) y log(km), y el modelo no podría estimarse.
        </li>
        <li>
          Especificaciones, en orden de preferencia:{" "}
          {ESPECIFICACIONES.map((e, i) => (
            <span key={e.id}>
              {i > 0 && "; "}
              <em>{e.nombre}</em> ({e.variables.map((v) => VARIABLES[v]).join(", ")}; mínimo {e.minObs} observaciones)
            </span>
          ))}
          . Se usa la primera que tenga datos suficientes.
        </li>
        <li>
          Con 28 empresas la muestra es chica, así que se usa un panel de varios años. Como los años de una misma empresa no son independientes,
          los errores se agrupan por empresa (errores robustos por cluster, con G−1 grados de libertad).
        </li>
        <li>
          El residuo indica cuánto se aparta cada empresa de lo esperado. Se muestra como un rango al {Math.round(CONFIANZA * 100)} % de confianza
          (por ejemplo, «entre +20 % y +45 %»), calculado con el intervalo de la predicción media para su último año. Si el rango incluye el 0,
          la empresa está «dentro de lo esperado».
        </li>
        <li>Se compara la distribución de desvíos por tipo de empresa: estatal, privada y cooperativa.</li>
        <li>
          Calidad: si una empresa está por debajo de lo esperado y sus cortes duran más que la mediana (SAIDI), se advierte que puede tratarse
          de subinversión y no de eficiencia.
        </li>
      </ul>
      <h3>Nivel 3: DEA (frontera de eficiencia)</h3>
      <p>
        Previsto como opcional: puntaje de 0 a 1 contra las mejores empresas comparables, con empleados, contratistas y gasto operativo como
        insumos y usuarios, km, MWh y calidad como productos. Se implementará cuando haya datos de gasto operativo suficientes.
      </p>

      <h2 id="trampas">Trampas que se corrigen</h2>
      <ul>
        <li>
          <strong>Tercerización:</strong> las privadas suelen tercerizar cuadrillas, call center y lecturas. La variable modelada es personal
          propio más contratistas cuando se conocen. Si no hay dato de contratistas, la empresa se marca: su dotación efectiva puede estar subestimada.
        </li>
        <li>
          <strong>Integración vertical:</strong> si la empresa hace generación, transmisión u obras con personal propio y la cifra no lo separa, se
          marca, porque puede aparecer por encima de lo esperado por esa razón.
        </li>
        <li>
          <strong>Definiciones distintas:</strong> cada cifra guarda si cuenta personas, equivalentes a tiempo completo o cargos. Las cifras en cargos
          (pueden incluir vacantes) quedan fuera del modelo.
        </li>
        <li><strong>Sin dato de dotación:</strong> la empresa queda en gris y fuera del modelo.</li>
        <li>
          <strong>Lenguaje neutral:</strong> se dice «por encima de lo esperado para empresas similares». Un desvío no es una acusación: puede
          reflejar tareas, geografía o calidad que el modelo no captura.
        </li>
      </ul>

      <h2 id="carga">Carga manual de datos</h2>
      <p>
        Los datos que no se pueden descargar automáticamente (dotación en PDFs, km de red de las revisiones tarifarias) se cargan a mano en
        archivos JSON versionados y validados con un esquema. Cada número lleva su fuente, período y fecha de consulta. Los archivos están en{" "}
        <a href={DATOS_URL}>el repositorio</a>:
      </p>
      <ul>
        <li><code>distribuidoras.json</code>: tipo, regulador y jurisdicción (la carga inicial está marcada «a verificar»).</li>
        <li><code>transparencia.json</code>: relevamiento de los 6 criterios.</li>
        <li><code>dotacion.json</code>: empleados por año, definición, contratistas e integración vertical.</li>
        <li><code>drivers.json</code>: usuarios, km de red, MWh, superficie, SAIDI y SAIFI por año.</li>
        <li><code>snapshots/</code>: una corrida semanal por archivo.</li>
      </ul>
      <p>
        Fuentes candidatas: memorias y balances (Edenor y Edesur publican por cotizar en la CNV), la Cuenta de Inversión provincial para las
        estatales, CAMMESA, los informes estadísticos de la Secretaría de Energía, los entes reguladores y las revisiones tarifarias integrales.
      </p>
    </article>
  );
}
