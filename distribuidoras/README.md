# Distribuidoras Argentinas

Sitio estático (Next.js, `output: "export"`) sobre la **transparencia** y la **dotación** de las 28 distribuidoras eléctricas de Argentina. Cada cifra muestra su fuente, su período y la fecha de consulta.

Es un proyecto independiente de la app que está en la raíz del repositorio: tiene su propio `package.json`.

## Comandos

```bash
npm ci
npm run dev        # desarrollo
npm run validate   # valida /data contra los esquemas
npm test           # pruebas (node:test)
npm run update     # corrida semanal: consulta las fuentes y escribe data/snapshots/AAAA-MM-DD.json
npm run build      # genera el sitio estático en out/ (recalcula el modelo de dotación)
```

## Estructura

| Ruta | Qué hay |
|---|---|
| `data/distribuidoras.json` | Las 28 distribuidoras. Tipo y regulador están marcados `*_verificado: false` hasta confirmarlos. |
| `data/transparencia.json` | Relevamiento manual de los 6 criterios (seed: 14/10/2026). |
| `data/dotacion.json` | Dotación por empresa y año: definición, contratistas, integración vertical. |
| `data/drivers.json` | Usuarios, km de red, MWh, superficie, SAIDI y SAIFI por empresa y año. |
| `data/snapshots/` | Una corrida semanal por archivo. Nunca se pisan. |
| `src/lib/schema.ts` | Esquemas (zod) de todos los archivos de datos. |
| `src/lib/transparencia.ts` | Estado efectivo de cada criterio e índice. |
| `src/lib/modelo.ts`, `src/lib/stats.ts` | Ratios y regresión log-log con errores robustos por empresa. |
| `scripts/update.ts` | Job semanal: robots.txt, descarga, hash, fecha del documento y changelog. |

## Reglas de datos

- Cuatro estados: `publica`, `no_publica`, `no_verificable`, `sin_relevar`. El esquema rechaza un `no_publica` sin búsqueda registrada en el sitio de la empresa, el ente regulador y el boletín oficial, y un `publica` sin fuente oficial.
- El job semanal **nunca** genera `no_publica`. Si una fuente que respondía deja de hacerlo, el criterio pasa a `no_verificable` y se abre un issue de alerta.
- No se eluden protecciones: se respeta robots.txt (si no responde, no se consulta) y un desafío anti-bot queda como `no_verificable`.
- Toda cifra numérica es un objeto `{ valor, fuente }`, con la fuente completa: URL, descripción, si es oficial, período, fecha del documento y fecha de consulta.

## Cómo cargar un dato de dotación

Agregá un registro a `data/dotacion.json` (y el correspondiente en `drivers.json`) y corré `npm run validate`:

```json
{
  "distribuidora": "edenor",
  "anio": 2024,
  "empleados": {
    "valor": 0,
    "fuente": {
      "url": "https://…/memoria-2024.pdf",
      "descripcion": "Memoria y estados financieros 2024, p. 37",
      "oficial": true,
      "periodo": "Ejercicio 2024",
      "fecha_documento": "2024-12-31",
      "fecha_consulta": "2026-10-14"
    }
  },
  "definicion": "personas",
  "incluye_contratistas": false,
  "contratistas": null,
  "integracion_vertical": { "generacion": false, "transmision": false, "obras_con_personal_propio": false, "separado": true }
}
```

El modelo se estima solo cuando hay suficientes observaciones (8 para el reducido y 15 para el completo). Mientras tanto, el sitio lo explica en lugar de mostrar números.

## Actualización automática

`.github/workflows/distribuidoras-semanal.yml` corre los lunes. Valida, prueba, consulta las fuentes, commitea el snapshot, abre un issue si hay alertas y reconstruye el sitio. Para publicarlo en GitHub Pages, definí estas variables del repositorio: `DISTRIBUIDORAS_DEPLOY_PAGES=true` y `DISTRIBUIDORAS_BASE_PATH=/practice-aws`.
