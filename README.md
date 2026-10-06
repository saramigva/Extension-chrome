# Radar de webs

Extensión de Chrome para encontrar clientes de diseño web: abre la web de un negocio, pulsa el icono y obtienes:

- **Nota de antigüedad (0–100)** con los motivos explicados en lenguaje de cliente: sin HTTPS, no adaptada al móvil, © de hace años, Flash/marcos/marquesinas, maquetación con tablas, WordPress/Joomla/Drupal sin soporte, jQuery antiguo, analítica obsoleta, sin descripción para Google, sin vista previa al compartir, lenta…
- **Contactos públicos**: emails (incluidos los ofuscados tipo «info [arroba] web [punto] es»), teléfonos de España y Portugal, redes sociales y si tiene formulario. También revisa su página de contacto.
- **Guion de llamada** en español o portugués según el país, con los 3 motivos de más peso.
- **Mis leads**: lista con estado (nuevo, contactado, interesado…), notas y **exportación a CSV** (se abre directamente en Excel).
- **Análisis en lote**: pega una lista de webs y las analiza de 3 en 3.

Todo funciona en tu navegador: no hay servidores ni cuentas.

## Instalar (modo desarrollador)
```bash
npm install
npm run build
```
En `chrome://extensions`, activa el **Modo desarrollador**, pulsa **Cargar descomprimida** y elige `dist/`.

## Permisos
- `activeTab` + `scripting`: leen la pestaña **solo cuando pulsas el icono**.
- `storage`: guarda tus leads en local.
- Acceso a todas las webs: **opcional**. Solo se pide la primera vez que usas el análisis en lote.

## Antes de contactar a nadie: lee [docs/LEGAL.md](docs/LEGAL.md)
Resumen: en **España** no envíes emails comerciales sin consentimiento, ni siquiera a empresas (LSSI art. 21). En **Portugal** sí puedes escribir a empresas, salvo que se hayan opuesto (lista de la DGC).

## Desarrollo
```bash
npm run check   # typecheck + tests + build
npm run watch
```
- `src/core/analyze.ts`: señales y puntuación.
- `src/core/contacts.ts`: extracción de contactos.
- `src/core/scan.ts`: lectura de la pestaña y análisis en lote.
- `src/core/leads.ts`: almacenamiento y CSV.
- `src/popup/`, `src/leads/`: interfaz.
