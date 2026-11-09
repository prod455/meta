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
    paging?: {
        next?: string;
        cursors?: {
            before?: string;
            after?: string;
        };
    };
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
export declare function appsecretProof(token: string, appSecret: string): Promise<string>;
export declare function criarGraph(c: ConfigGraph): Graph;
