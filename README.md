# Tramita

Extensión de Chrome que **calcula y avisa de los plazos de tus notificaciones electrónicas** de la administración en **España** (DEHú, Carpeta 060, AEAT, Seguridad Social, DGT) y **Portugal** (Portal das Finanças, ViaCTT). Todo funciona en local: sin servidores ni analítica.

## Qué hace (v0.1)
- **Plazos**: a partir de la fecha de puesta a disposición calcula cuándo se considera notificada (ES: 10 días naturales, art. 43 Ley 39/2015; PT: 15.º/5.º día, art. 39.º CPPT) y, si eliges un plazo de respuesta, el último día para responder (hábiles, naturales o meses, con festivos nacionales).
- **Avisos**: contador en el icono, notificación del sistema 3 días antes, el día del vencimiento y si ya ha vencido; exportación a calendario (.ics).
- **Detector**: en el buzón de una sede compatible propone las notificaciones que ve en pantalla; tú confirmas cuáles seguir.
- **Errores técnicos**: reconoce errores habituales (AutoFirma SAF_09/SAF_20, sesión caducada, plugin Autenticação.gov) y muestra la solución con su fuente.
- Interfaz en español y portugués (según el idioma del navegador).

Criterio de diseño: ante la duda, se calcula la fecha **más temprana** posible. Ver [docs/LEGAL.md](docs/LEGAL.md).

## Probarla en tu Chrome
```bash
npm install
npm run build        # genera dist/
```
1. Abre `chrome://extensions` y activa el **Modo desarrollador**.
2. Pulsa **Cargar descomprimida** y elige la carpeta `dist/`.
3. Entra en tu buzón (p. ej. Portal das Finanças → Notificações) o añade una notificación a mano desde el icono.

## Desarrollo
```bash
npm run check   # typecheck + tests + build
npm run watch   # recompila al guardar
python3 scripts/locales.py  # regenera las traducciones (fuente: scripts/locales.py)
python3 scripts/icons.py    # regenera los iconos
```

Estructura:
- `src/core/`: lógica pura y testeada (fechas, festivos, reglas legales, detector, errores conocidos).
- `src/background/`: alarmas, contador del icono y notificaciones.
- `src/content/`: lectura de la página y panel propio (Shadow DOM). Nunca rellena ni pulsa nada.
- `src/popup/`: lista de notificaciones y alta manual.

## Próximos pasos
- Probar el detector con los buzones reales (el HTML de cada sede es distinto) y añadir adaptadores específicos.
- Verificar el art. 39.º CPPT vigente y revisar los avisos legales de cada sede (checklist en `docs/LEGAL.md`).
- Fase 2: explicación de campos y lista de documentos por trámite con Gemini Nano en local.
