// Cliente da Graph API: token no cabeçalho (nunca na URL), `appsecret_proof` em toda chamada, prazo, paginação e
// erro com `repetivel`.
import { hmacHex } from "./cripto.ts";
import { ErroDaGraph } from "./erro.ts";

export interface ConfigGraph {
  /** Versão fixa da Graph API, ex.: "v27.0". Confira a data de fim de cada versão no changelog da Meta. */
  versao: string;
  /** App secret: assina cada chamada com `appsecret_proof`. Sem ele, as chamadas saem sem prova. */
  appSecret?: string;
  fetch?: typeof fetch;
  /** Prazo de cada chamada (padrão 20 s). */
  prazoMs?: number;
}

export type Parametros = Record<string, string | number | boolean | undefined>;

export interface Pagina<T> {
  data: T[];
  paging?: { next?: string; cursors?: { before?: string; after?: string } };
}

export interface Graph {
  readonly versao: string;
  /** GET em `caminho` (ex.: "/me" ou "123/insights") ou numa URL completa da Graph (como `paging.next`). */
  get<T = Record<string, unknown>>(caminho: string | URL, params: Parametros, token: string): Promise<T>;
  /** POST com corpo JSON. */
  post<T = Record<string, unknown>>(caminho: string, corpo: unknown, token: string): Promise<T>;
  /** Todas as páginas de uma lista, seguindo `paging.next`. */
  todasAsPaginas<T>(caminho: string | URL, params: Parametros, token: string): Promise<T[]>;
}

/** `appsecret_proof` da Graph API: HMAC-SHA256 do token com o app secret, em hexadecimal. */
export function appsecretProof(token: string, appSecret: string): Promise<string> {
  return hmacHex(appSecret, token);
}

export function criarGraph(c: ConfigGraph): Graph {
  const base = `https://graph.facebook.com/${c.versao}`;
  const executar = c.fetch ?? fetch;
  const prazo = c.prazoMs ?? 20_000;

  const montar = async (caminho: string | URL, params: Parametros, token: string): Promise<URL> => {
    const url = caminho instanceof URL || /^https:\/\//.test(caminho) ? new URL(caminho) : new URL(`${base}/${caminho.replace(/^\//, "")}`);
    if (url.hostname !== "graph.facebook.com") throw new Error(`endereço fora da Graph API: ${url.hostname}`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
    // O token vai no cabeçalho; a `paging.next` da Meta pode trazê-lo na URL, e ele não fica lá.
    url.searchParams.delete("access_token");
    if (c.appSecret) url.searchParams.set("appsecret_proof", await appsecretProof(token, c.appSecret));
    return url;
  };

  const ler = async <T>(url: URL, init: RequestInit): Promise<T> => {
    const resposta = await executar(url, { ...init, signal: AbortSignal.timeout(prazo) });
    const corpo = (await resposta.json().catch(() => null)) as unknown;
    if (!resposta.ok) throw new ErroDaGraph(resposta.status, corpo, url.pathname);
    return corpo as T;
  };

  const graph: Graph = {
    versao: c.versao,
    async get(caminho, params, token) {
      return ler(await montar(caminho, params, token), { headers: { authorization: `Bearer ${token}` } });
    },
    async post(caminho, corpo, token) {
      return ler(await montar(caminho, {}, token), {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
    },
    async todasAsPaginas<T>(caminho: string | URL, params: Parametros, token: string): Promise<T[]> {
      const itens: T[] = [];
      let pagina = await graph.get<Pagina<T>>(caminho, params, token);
      itens.push(...pagina.data);
      while (pagina.paging?.next) {
        pagina = await graph.get<Pagina<T>>(pagina.paging.next, {}, token);
        itens.push(...pagina.data);
      }
      return itens;
    },
  };
  return graph;
}
