/** "sha256=<hex>" do corpo cru, como a Meta manda em X-Hub-Signature-256. */
export declare function assinatura(appSecret: string, corpoCru: string | Uint8Array): Promise<string>;
/**
 * A entrega veio da Meta? Confira com o corpo CRU (os bytes recebidos, antes de qualquer JSON.parse): reserializar
 * muda espaços e acentos e a assinatura não bate.
 */
export declare function verificarAssinatura(appSecret: string, corpoCru: string | Uint8Array, cabecalho: string | null | undefined): Promise<boolean>;
/** Inscrição do webhook (GET com hub.mode=subscribe): o `hub.challenge` a devolver, ou null se o token não confere. */
export declare function desafio(query: URLSearchParams | Record<string, unknown>, verifyToken: string): string | null;
