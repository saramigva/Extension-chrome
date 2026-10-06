# Análisis legal de Tramita

> Análisis preliminar hecho a partir de fuentes públicas (octubre 2026). **No es un dictamen jurídico.** Antes de cobrar a usuarios o publicar a gran escala, conviene una revisión de 1–2 horas con un abogado en España y otro en Portugal (o uno con práctica en ambos).

## Resumen

| Riesgo | Valoración | Medida en el diseño |
|---|---|---|
| Leer el buzón del propio usuario | Bajo | Solo lee la página que el usuario ya tiene abierta con su sesión; no automatiza accesos ni hace peticiones propias. |
| Protección de datos (RGPD) | Bajo mientras todo sea local | Sin servidores ni analítica; `connect-src 'none'` en la CSP. Si algún día hay sincronización en la nube, hará falta base jurídica, DPA y política de privacidad completa. |
| Ejercicio ilegal de la abogacía / consulta jurídica | Bajo-medio | Da información general y cálculos con fuente legal citada, no consejo para el caso concreto. Aviso visible de que no es asesoramiento. |
| Confusión con herramienta oficial / marcas | Medio si se descuida | Nombre neutro, sin logos ni colores oficiales, aviso "no es herramienta oficial". |
| Cálculo erróneo de un plazo | Medio (riesgo reputacional y de responsabilidad) | Criterio conservador (fecha más temprana), festivos solo nacionales con aviso, fuente legal en cada regla, tests. |
| Políticas de la Chrome Web Store | Bajo | Propósito único, permisos mínimos, dominios concretos, política de privacidad con la declaración de *Limited Use*. |
| AI Act (cuando se añada IA) | Bajo | Hoy no hay IA. Si se añade un asistente conversacional, hay que avisar de que es IA (art. 50, aplicable desde el 2/8/2026). |

## 1. Plazos que calcula la extensión

### España
- **Ley 39/2015, art. 43.2**: la notificación electrónica se entiende **rechazada a los 10 días naturales** desde la puesta a disposición si no se accede, y el trámite sigue adelante como si se hubiera notificado. [BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565#a43)
- **Ley 39/2015, art. 41.6**: que no llegue el aviso por email/SMS **no invalida** la notificación. Por eso tiene sentido una herramienta como esta.
- **Ley 39/2015, art. 30**: días hábiles excluyen sábados, domingos y festivos; los plazos por meses se cuentan de fecha a fecha; si el último día es inhábil, se pasa al siguiente hábil.
- **LGT (Ley 58/2003), art. 223**: recurso de reposición tributario, **1 mes**. [BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186#a223)
- Sanciones por no atender requerimientos: desde 150 € ([Lladó](https://lladogrup.com/es/sanciones-por-no-consultar-notificaciones-electronicas/), [Info-Trámites](https://info-tramites.es/dehu/)).

### Portugal
- **CPPT, art. 39.º, n.º 10**: las notificaciones en el domicilio fiscal electrónico (ViaCTT o servicio público de notificaciones electrónicas) se consideran hechas el **15.º día** tras la puesta a disposición; el cómputo empieza el **primer día hábil siguiente**. Las **citações** se consideran hechas el **5.º día**. Es una presunción *iuris tantum* (se puede rebatir). Fuentes: [AT, folleto](https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/Folheto_Notificacoes_Eletronicas.pdf), [CRN Contabilidade](https://crncontabilidade.pt/blog/viactt-e-notificacoes-das-financas-quando-comeca-a-contar-o-prazo-para-responder/), [informador.pt](https://informador.pt/legislacao/lexit/codigos/direito-fiscal/codigo-de-procedimento-e-de-processo-tributario/titulo-i-disposicoes-gerais/capitulo-ii-dos-sujeitos-procedimentais-e-processuais/seccao-iv-dos-actos-procedimentais-e-processuais/subseccao-iii-das-notificacoes-e-citacoes/artigo-39-o-perfeicao-das-notificacoes/).
  - ⚠️ **Pendiente de verificar**: algunas fuentes secundarias dicen 5 días para las notificaciones del propio buzón del Portal das Finanças. La extensión aplica 15 días y el usuario puede elegir "citação" (5 días). **Hay que comprobarlo con la redacción vigente del CPPT** (publicada en el Diário da República) antes de publicar.
- **CPPT, art. 20.º → Código Civil, art. 279.º**: plazos del procedimiento tributario continuos; si el último día cae en domingo o festivo, pasa al siguiente día hábil.
- Reclamação graciosa: **120 días** (CPPT, art. 70.º). Audição prévia: el plazo lo indica el oficio (habitualmente 15 días, LGT art. 60.º).

### Limitaciones conocidas (se avisan en la interfaz)
- Solo festivos **nacionales**. Un festivo autonómico o municipal puede alargar el plazo real un día, nunca acortarlo.
- No contempla la suspensión de agosto en los plazos procesales ni regímenes especiales (DGT/DEV, Seguridad Social PT, tribunales).

## 2. ¿Puede una extensión leer el buzón de notificaciones?
- El usuario accede a **sus propios datos** con **su propia sesión**; la extensión solo lee el HTML que ya se muestra en pantalla. No reutiliza credenciales ni hace peticiones automáticas a la administración, así que no es *scraping* ni acceso automatizado.
- No se han encontrado condiciones de uso del Portal das Finanças ni de la AEAT que prohíban las extensiones del navegador. Las restricciones conocidas apuntan a robots que hacen accesos masivos (p. ej. en Brasil, [CFC](https://cfc.org.br/noticias/gov-br-limitara-acesso-robotizado-para-garantir-a-disponibilidade-dos-servicos-publicos-digitais/)), que no es este caso. **Acción**: revisar los avisos legales de cada sede antes de publicar.
- La extensión **nunca** debe tocar el certificado, el PIN, Cl@ve, Chave Móvel Digital ni campos de contraseña.

## 3. Información frente a asesoramiento jurídico
- **Portugal**: la Lei 49/2004 fue sustituida por la **Lei 10/2024** (régimen jurídico de los actos de abogados y solicitadores). La *consulta jurídica* (interpretar y aplicar normas al caso concreto de un tercero) sigue reservada a profesionales cualificados. [Lei 10/2024 (OA)](https://portal.oa.pt/media/142630/lei-n%C2%BA-10-2024-de-19-01-regime-juridico-dos-atos-de-advogados-e-solicitadores.pdf). Dar información general y hacer un cálculo mecánico con la norma citada no es consulta jurídica, pero un asistente de IA que diga "en tu caso debes recurrir" se acercaría al límite. **Regla de producto**: explicar qué dice la norma y qué opciones existen, nunca recomendar una acción concreta para el caso del usuario.
- **España**: no hay un monopolio equivalente para el asesoramiento fiscal, pero aplica la normativa de consumidores (no prometer resultados, no inducir a error).

## 4. Datos personales (RGPD)
- Mientras todo se guarde en `chrome.storage.local` y no haya servidores, el desarrollador **no trata** datos personales (no los recibe). Aun así, la Chrome Web Store exige política de privacidad: ver [PRIVACY.md](../PRIVACY.md).
- Si en el futuro se añade sincronización, cuentas o IA en la nube: base jurídica, registro de actividades, encargados de tratamiento, y probablemente una evaluación de impacto, porque los datos fiscales pueden revelar datos económicos sensibles.

## 5. Chrome Web Store
- Política de *Limited Use*: usar los datos solo para la función declarada e incluir una declaración afirmativa en la política de privacidad. [Chrome Developers](https://developer.chrome.com/docs/webstore/program-policies/limited-use/)
- Permisos mínimos: `storage`, `alarms`, `notifications` y content scripts limitados a 7 dominios oficiales. Sin `<all_urls>`.
- Propósito único: "seguimiento de plazos de notificaciones administrativas". El asistente de errores encaja como función relacionada.

## 6. IA (fase 2)
- Si se añade explicación con IA, usar **Gemini Nano en local** (Prompt API, estable para extensiones desde Chrome 138, con español desde Chrome 140) para que no salgan datos del equipo.
- **AI Act, art. 50** (en vigor desde el 2/8/2026): informar al usuario de que interactúa con una IA. [Baker Botts](https://www.bakerbotts.com/thought-leadership/publications/2026/september/eu-ai-act-article-50-transparency-obligations-go-live)

## Checklist antes de publicar
- [ ] Verificar el art. 39.º CPPT vigente (15 frente a 5 días según el canal).
- [ ] Revisar avisos legales y condiciones de uso de DEHú, AEAT, Portal das Finanças y ViaCTT.
- [ ] Publicar PRIVACY.md en una URL pública (GitHub Pages sirve).
- [ ] Revisión con abogado ES + PT, sobre todo de los textos de la interfaz y el aviso legal.
- [ ] Nombre y marca: comprobar en EUIPO que "Tramita" está libre en la clase 9/42.
