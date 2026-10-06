// Textos de cada señal en español y portugués.
// `long`: explicación para ti / el informe. `short`: frase para el email o el WhatsApp.

export type Lang = "es" | "pt";
type P = Record<string, string | number>;

interface Text {
  long: (p: P) => string;
  short: (p: P) => string;
}

const CATALOG: Record<string, Record<Lang, Text>> = {
  "no-https": {
    es: {
      long: () => "No tiene candado (HTTPS): Chrome la marca como «No segura» y asusta a los clientes.",
      short: () => "Chrome la muestra como «No segura» (no tiene certificado HTTPS)",
    },
    pt: {
      long: () => "Não tem cadeado (HTTPS): o Chrome marca-o como «Não seguro» e afasta clientes.",
      short: () => "o Chrome mostra-o como «Não seguro» (não tem certificado HTTPS)",
    },
  },
  "no-mobile": {
    es: {
      long: () => "No está adaptada al móvil, desde donde llegan más de la mitad de las visitas; Google la posiciona peor.",
      short: () => "no se ve bien en el móvil, que es desde donde os busca la mayoría",
    },
    pt: {
      long: () => "Não está adaptado ao telemóvel, de onde chegam mais de metade das visitas; o Google posiciona-o pior.",
      short: () => "não se vê bem no telemóvel, que é de onde vos procura a maioria",
    },
  },
  "stale-copyright": {
    es: { long: (p) => `El pie de página dice © ${p.year}: parece abandonada.`, short: (p) => `el pie de página sigue en ${p.year}, y da sensación de web abandonada` },
    pt: { long: (p) => `O rodapé diz © ${p.year}: parece abandonado.`, short: (p) => `o rodapé ainda diz ${p.year}, o que dá ideia de site abandonado` },
  },
  "obsolete-tags": {
    es: {
      long: () => "Usa elementos de los 2000 (Flash, marcos o textos animados) que los navegadores ya no muestran.",
      short: () => "usa elementos antiguos (Flash, marcos o textos en movimiento) que los navegadores ya no muestran",
    },
    pt: {
      long: () => "Usa elementos dos anos 2000 (Flash, molduras ou texto animado) que os navegadores já não mostram.",
      short: () => "usa elementos antigos (Flash, molduras ou texto animado) que os navegadores já não mostram",
    },
  },
  "table-layout": {
    es: { long: () => "Está maquetada con tablas, una técnica de hace 20 años que rompe el diseño en pantallas modernas.", short: () => "el diseño se descuadra en pantallas actuales" },
    pt: { long: () => "Está paginado com tabelas, uma técnica de há 20 anos que desconfigura o design em ecrãs modernos.", short: () => "o design desconfigura-se nos ecrãs atuais" },
  },
  "legacy-markup": {
    es: { long: () => "Su código usa etiquetas obsoletas: difícil de mantener y de actualizar.", short: () => "está hecha con tecnología obsoleta, difícil de actualizar" },
    pt: { long: () => "O código usa etiquetas obsoletas: difícil de manter e atualizar.", short: () => "está feito com tecnologia obsoleta, difícil de atualizar" },
  },
  "mixed-content": {
    es: { long: () => "Carga imágenes o estilos sin cifrar: el navegador puede bloquearlos y la web se ve rota.", short: () => "algunas imágenes pueden no cargar por seguridad" },
    pt: { long: () => "Carrega imagens ou estilos sem encriptação: o navegador pode bloqueá-los e o site parece partido.", short: () => "algumas imagens podem não carregar por segurança" },
  },
  "no-description": {
    es: { long: () => "No tiene descripción para Google: aparece en los resultados con un texto poco atractivo.", short: () => "en Google aparece sin una descripción que invite a entrar" },
    pt: { long: () => "Não tem descrição para o Google: aparece nos resultados com um texto pouco apelativo.", short: () => "no Google aparece sem uma descrição que convide a entrar" },
  },
  "no-social-preview": {
    es: { long: () => "Al compartirla por WhatsApp o redes no muestra imagen ni título.", short: () => "al compartirla por WhatsApp no sale ni foto ni título" },
    pt: { long: () => "Ao partilhá-lo no WhatsApp ou redes não mostra imagem nem título.", short: () => "ao partilhá-lo no WhatsApp não aparece foto nem título" },
  },
  "no-favicon": {
    es: { long: () => "No tiene icono en la pestaña del navegador.", short: () => "no tiene ni el icono de la marca en la pestaña" },
    pt: { long: () => "Não tem ícone no separador do navegador.", short: () => "não tem o ícone da marca no separador" },
  },
  slow: {
    es: { long: (p) => `Tarda ${p.secs} s en cargar: más de la mitad de la gente se va antes de 3 s.`, short: (p) => `tarda ${p.secs} segundos en cargar y mucha gente se va antes` },
    pt: { long: (p) => `Demora ${p.secs} s a carregar: mais de metade das pessoas sai antes dos 3 s.`, short: (p) => `demora ${p.secs} segundos a carregar e muita gente sai antes` },
  },
  "old-wordpress": {
    es: { long: (p) => `Usa WordPress ${p.v}, una versión sin soporte de seguridad: riesgo de hackeo.`, short: () => "funciona con una versión de WordPress sin actualizaciones de seguridad" },
    pt: { long: (p) => `Usa WordPress ${p.v}, uma versão sem suporte de segurança: risco de ataque.`, short: () => "usa uma versão do WordPress sem atualizações de segurança" },
  },
  "old-cms": {
    es: { long: (p) => `Usa ${p.cms}, una versión sin soporte de seguridad.`, short: () => "funciona con un gestor de contenidos sin actualizaciones de seguridad" },
    pt: { long: (p) => `Usa ${p.cms}, uma versão sem suporte de segurança.`, short: () => "usa um gestor de conteúdos sem atualizações de segurança" },
  },
  "old-jquery": {
    es: { long: (p) => `Usa jQuery ${p.v}, una librería de hace más de 8 años con fallos de seguridad conocidos.`, short: () => "usa librerías de hace años con fallos de seguridad conocidos" },
    pt: { long: (p) => `Usa jQuery ${p.v}, uma biblioteca com mais de 8 anos e falhas de segurança conhecidas.`, short: () => "usa bibliotecas antigas com falhas de segurança conhecidas" },
  },
  "old-analytics": {
    es: { long: () => "Su analítica es un sistema antiguo de Google que ya no recoge datos: no saben cuántas visitas tienen.", short: () => "la analítica que tiene instalada ya no funciona, así que no sabéis cuántas visitas os llegan" },
    pt: { long: () => "A análise de visitas é um sistema antigo da Google que já não recolhe dados.", short: () => "a análise de visitas instalada já não funciona, por isso não sabem quantas visitas recebem" },
  },
};

export function signalText(id: string, lang: Lang, params: P = {}, kind: keyof Text = "long"): string {
  const entry = CATALOG[id]?.[lang] ?? CATALOG[id]?.es;
  return entry ? entry[kind](params) : id;
}
