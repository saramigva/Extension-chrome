# Radar de webs

Extensión de Chrome para conseguir clientes de diseño web. Mientras navegas:

1. **Al abrir cualquier web**, el icono muestra su **nota de antigüedad (0–100)**. Si la web es mejorable, aparece un **aviso flotante**. Al pulsarlo se abre el informe completo.
2. **En Google**, cada resultado lleva una etiqueta (`Radar 85 · sin HTTPS · no móvil`), así ves los leads antes de entrar.
3. **El informe** incluye:
   - **Puntos de dolor** explicados como argumento de venta: sin HTTPS, no adaptada al móvil, © de hace años, Flash/marcos/marquesinas, maquetación con tablas, WordPress/Joomla/Drupal sin soporte, jQuery antiguo, sin descripción para Google, sin vista previa al compartir, lenta…
   - **Contactos**: emails (también los ofuscados y los de la página de contacto), teléfonos de España y Portugal, redes y formulario.
   - **Mensaje listo según el canal**: **email** completo con asunto (personalizado con el nombre, el tipo de negocio, sus fallos, los años que llevan y tu firma); si no hay email pero sí móvil o WhatsApp, un **pitch corto** que abre WhatsApp ya escrito; si solo hay fijo, un **guion de llamada**. En español o portugués según la web. Con la IA integrada de Chrome (Gemini Nano) aparece **«Reescribir con IA»**, gratis y en local (solo en español).
   - **Demo antes/después**: la captura de su web actual frente a una **versión moderna generada con su propio contenido** (nombre, textos, fotos, servicios, teléfono, WhatsApp, dirección). Se puede ver en ordenador o móvil y **descargar como HTML** para enviarla.
4. **Mis leads**: lista con estado, notas, demo y **exportación a CSV** (Excel). Incluye **análisis en lote** de una lista de webs.

Todo funciona en tu navegador: no hay servidores, cuentas ni analítica.

## Instalar (modo desarrollador)
```bash
npm install
npm run build
```
En `chrome://extensions`, activa el **Modo desarrollador**, pulsa **Cargar descomprimida** y elige `dist/`. Después abre **Ajustes** (desde el popup) y pon tu nombre, a qué te dedicas y tu teléfono para la firma.

## Permisos y privacidad
- **Leer todas las webs** (`<all_urls>`): hace falta para la nota automática, las etiquetas de Google y la captura del "antes". El análisis ocurre **en tu ordenador** y no se envía nada.
- En las grandes plataformas (Google, YouTube, Amazon, Idealista, Booking…) no sale el aviso flotante. Aun así puedes analizarlas desde el icono.
- Las etiquetas de Google descargan la portada de cada resultado (de 3 en 3, con caché de 7 días).

## Antes de contactar a nadie: lee [docs/LEGAL.md](docs/LEGAL.md)
**España**: nada de email ni WhatsApp comerciales sin consentimiento, ni siquiera a empresas (LSSI art. 21). Llama o ve en persona y envía la propuesta cuando te digan que sí. **Portugal**: a empresas sí, salvo que se hayan opuesto (lista de la DGC).

## Desarrollo
```bash
npm run check   # typecheck + tests + build
npm run watch
```
- `src/core/`: lógica pura y testeada: `analyze` (nota), `signals` (textos ES/PT), `contacts`, `profile` (ficha del negocio), `outreach` (mensajes), `demo` (web nueva), `scan`, `leads`, `ai`.
- `src/content/page.ts`: análisis automático y aviso flotante. `src/content/serp.ts`: etiquetas en Google.
- `src/background/`: nota en el icono, captura y cola de análisis. `src/offscreen/`: lee el HTML de los resultados de Google.
- `src/popup/`, `src/leads/`, `src/demo/`, `src/options/`: interfaz.
