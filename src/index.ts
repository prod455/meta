// @prod455/meta: Graph API da Meta (Instagram, Facebook, WhatsApp Cloud, Marketing) para Node e Workers, só com
// WebCrypto e fetch.
export { criarGraph, appsecretProof, type Graph, type ConfigGraph, type Parametros, type Pagina } from "./graph.ts";
export { criarOAuth, type ConfigOAuth, type TokenDeLongaDuracao } from "./oauth.ts";
export { assinatura, verificarAssinatura, desafio } from "./webhook.ts";
export { ErroDaGraph } from "./erro.ts";
export { GraphFalso, type ChamadaFalsa } from "./falso.ts";
