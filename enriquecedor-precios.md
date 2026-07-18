# Enriquecedor de precios (Recambio Verde)

Herramienta para **subir un CSV de piezas** y obtener **precios de referencia de
[recambioverde.es](https://www.recambioverde.es)** con los que afinar la tasación.
Todo funciona **en el navegador**: el CSV no se sube a ningún servidor.

Forma parte de la suite `reciclaje-cat` (Limonada Web). Es un archivo independiente:
`enriquecedor-precios.html`. No sustituye a ninguna herramienta existente.

## Archivos de esta herramienta

- `enriquecedor-precios.html` — la herramienta (todo en un archivo).
- `enriquecedor-precios-proxy.js` — proxy CORS (Cloudflare Worker) para el modo automático.
- `ejemplo-enriquecedor.csv` — CSV de muestra.

## Publicar

Como la suite ya está desplegada en GitHub Pages (con dominio propio vía `CNAME`), basta
con **añadir `enriquecedor-precios.html` a la raíz del repo** y hacer commit/push. Quedará
accesible en `https://TU-DOMINIO/enriquecedor-precios.html`. Si quieres, enlázalo desde el
menú de tu `index.html`.

## Uso rápido

1. Abre `enriquecedor-precios.html` y **sube tu CSV** (autodetecta las columnas: articulo,
   marca, modelo, refvisual, refcatalogo, precio).
2. Elige la **estrategia**: 🎯 Referencia + respaldo (recomendado), 🔑 solo referencia o
   📝 solo descripción.
3. **Filtra por familia / solo con referencia / rango** y procesa **por lotes** (200–500).
4. **Asistido** (sin instalar nada): botones que abren la búsqueda en Recambio Verde; anotas
   el precio. **Automático**: rastrea solo, vía tu proxy Cloudflare (ver abajo).
5. **Exporta el CSV enriquecido**.

## Coincidencia por referencia

Recambio Verde admite búsqueda directa por referencia
(`/recambios-desguace/A2038200161` → *"47 resultados"*), lo que da la tasación más ajustada.
La estrategia por defecto busca por Ref. Visual (o Catálogo) y, si no hay resultados, cae a
la descripción. La columna **Método** indica de dónde salió cada precio.

## Modo automático (proxy Cloudflare Worker)

Una web estática no puede leer recambioverde.es directamente (CORS). Despliega el proxy:

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Worker** → nombre
   (p. ej. `rv-proxy`) → **Deploy**.
2. **Edit code** → pega todo `enriquecedor-precios-proxy.js` → **Deploy**.
3. En la herramienta, pega en "URL de tu proxy":
   `https://rv-proxy.TUCUENTA.workers.dev/?url=`

El proxy solo permite `recambioverde.es` (no es un proxy abierto) y cachea 10 min. Rastrea
con moderación (la app va de una en una y con pausa).

## Columnas que añade al CSV

`rv_metodo`, `rv_busqueda`, `rv_url_descripcion`, `rv_referencia`, `rv_url_referencia`,
`rv_n_resultados`, `rv_min`, `rv_media`, `rv_max`, `rv_precio_sugerido`.

## ⚠️ Nota

No subas tu CSV real de inventario (p. ej. `precios 0.csv`) al repositorio. Añade `*.csv`
al `.gitignore` (dejando solo `ejemplo-enriquecedor.csv` si quieres conservar la muestra).
