/**
 * Proxy CORS para el Enriquecedor de precios · Reciclaje CAT (Limonada Web)
 * -------------------------------------------------------------------------
 * POR QUÉ: una web estática (GitHub Pages) no puede leer el HTML de
 * recambioverde.es desde el navegador por la política CORS. Este pequeño
 * proxy hace la petición por ti y devuelve el HTML con la cabecera CORS
 * que el navegador necesita.
 *
 * SEGURO POR DISEÑO: solo permite proxiar dominios de la ALLOWLIST
 * (recambioverde.es). No es un proxy abierto.
 *
 * CÓMO DESPLEGARLO (gratis, ~3 min):
 *  1. Entra en https://dash.cloudflare.com  →  Workers & Pages  →  Create  →  Worker.
 *  2. Pon un nombre (p. ej. "rv-proxy") y pulsa Deploy.
 *  3. Abre "Edit code", BORRA lo que haya y PEGA todo este archivo. Deploy.
 *  4. Copia la URL del worker (algo como https://rv-proxy.TUCUENTA.workers.dev).
 *  5. En la herramienta, pega en "URL de tu proxy":
 *        https://rv-proxy.TUCUENTA.workers.dev/?url=
 *
 * Uso responsable: la herramienta consulta de una en una y con pausa.
 * No abuses del rastreo y respeta las condiciones de uso de terceros.
 */

const ALLOWLIST = ['recambioverde.es', 'www.recambioverde.es'];

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const reqUrl = new URL(request.url);
    const target = reqUrl.searchParams.get('url');
    if (!target) {
      return new Response('Falta el parámetro ?url=', { status: 400, headers: cors });
    }

    let parsed;
    try { parsed = new URL(target); }
    catch (e) { return new Response('URL no válida', { status: 400, headers: cors }); }

    const host = parsed.hostname.toLowerCase();
    const ok = ALLOWLIST.some(d => host === d || host.endsWith('.' + d));
    if (!ok) {
      return new Response('Dominio no permitido: ' + host, { status: 403, headers: cors });
    }

    try {
      const upstream = await fetch(parsed.toString(), {
        headers: {
          // Se identifica como navegador para obtener el HTML renderizado en servidor.
          'User-Agent': 'Mozilla/5.0 (compatible; ReciclajeCAT-PriceTool/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        cf: { cacheTtl: 600, cacheEverything: true }, // cachea 10 min para no repetir peticiones
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch (e) {
      return new Response('Error al obtener la página: ' + e.message, { status: 502, headers: cors });
    }
  },
};
