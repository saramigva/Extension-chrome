import { analyzeDocument } from "../src/core/analyze";

export const now = new Date("2026-10-06T12:00:00Z");
export const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

export const OLD = `<html><head><title>Restaurante Casa Pepe - Bienvenidos</title>
<meta name="generator" content="WordPress 4.9.8">
<script src="/wp-includes/js/jquery/jquery-1.12.4.min.js"></script>
<script src="http://www.google-analytics.com/ga.js"></script></head>
<body><table width="800" bgcolor="#fff"><tr><td><table><tr><td>
<img src="/img/logo-casapepe.jpg" alt="logo"><img src="/img/comedor.jpg" width="600"><img src="/img/paella.jpg">
<h2>Nuestra carta</h2><h2>Menú del día</h2><h2>Celebraciones</h2>
<p>Desde 1998 cocinamos con producto de la huerta de Granada y pescado fresco de Motril cada mañana para nuestros clientes.</p>
<center><font face="Comic Sans MS">Tapas</font></center><font>Tapas</font><font>Vinos</font>
<marquee>¡Ofertas!</marquee></td></tr></table></td></tr></table>
<a href="mailto:info@casapepe.es">Escríbenos</a> · Tel. 958 12 34 56 · <a href="/contacto.html">Contacto</a>
<a href="https://www.facebook.com/casapepe">Facebook</a> <a href="https://www.facebook.com/sharer.php?u=x">Compartir</a>
<p>C/ Real 12, 18001 Granada</p><p>© 2004-2014 Casa Pepe</p></body></html>`;

export const MODERN = `<html lang="es"><head><title>Estudio Luz | Fotografía</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Estudio de fotografía en Lisboa">
<meta property="og:site_name" content="Estudio Luz"><link rel="icon" href="/f.svg"></head>
<body><form><input type="email" name="email"><textarea></textarea></form><footer>© 2026 Estudio Luz</footer></body></html>`;

export function oldSite() {
  return analyzeDocument(parse(OLD), OLD, "http://www.casapepe.es/", { now });
}

