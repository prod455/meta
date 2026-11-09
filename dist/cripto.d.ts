/** HMAC-SHA256 de `mensagem` com `segredo`, em hexadecimal minúsculo. */
export declare function hmacHex(segredo: string, mensagem: string | Uint8Array): Promise<string>;
/** Igualdade sem vazar, pelo tempo, onde as duas diferem. */
export declare function iguaisEmTempoConstante(a: string, b: string): boolean;
