export declare class ErroDaGraph extends Error {
    /** Status HTTP da resposta. */
    readonly status: number;
    /** `error.code` da Meta, quando veio. */
    readonly codigo: number | null;
    /** `error.error_subcode` da Meta, quando veio. */
    readonly subcodigo: number | null;
    /** `error.fbtrace_id`: o que o suporte da Meta pede. */
    readonly fbtrace: string | null;
    /** A mensagem da Meta, para mostrar a quem conectou a conta. */
    readonly mensagemDaMeta: string;
    /** O caminho chamado (sem token nem parâmetros). */
    readonly caminho: string;
    /** Falha passageira (limite de uso, 5xx, 429): tentar de novo mais tarde pode dar certo. */
    readonly repetivel: boolean;
    constructor(status: number, corpo: unknown, caminho: string);
}
