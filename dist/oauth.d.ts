export interface ConfigOAuth {
    versao: string;
    appId: string;
    appSecret: string;
    /** Exatamente como cadastrado no app da Meta. */
    redirectUri: string;
    fetch?: typeof fetch;
}
export interface TokenDeLongaDuracao {
    token: string;
    /** Segundos até vencer; `null` quando a Meta não informa (token que não vence). */
    expiraEmSegundos: number | null;
}
export declare function criarOAuth(c: ConfigOAuth): {
    /**
     * Endereço do diálogo de login. Login para Empresas usa `configId`; o login comum usa `escopo`
     * (ex.: "instagram_basic,pages_show_list"). `estado` volta igual no retorno: confira antes de trocar o código.
     */
    urlDoLogin(o: {
        estado: string;
    } & ({
        configId: string;
    } | {
        escopo: string;
    })): string;
    /** Código do retorno -> token de curta duração -> token de longa duração (cerca de 60 dias). */
    trocarCodigo(codigo: string): Promise<TokenDeLongaDuracao>;
    /** O id do usuário (por app) e o nome de quem conectou. */
    usuario(token: string): Promise<{
        id: string;
        nome: string | null;
    }>;
};
