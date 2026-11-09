// Webhooks da Meta: o desafio da inscrição (GET) e a assinatura X-Hub-Signature-256 de cada entrega (POST).
import { hmacHex, iguaisEmTempoConstante } from "./cripto.ts";

/** "sha256=<hex>" do corpo cru, como a Meta manda em X-Hub-Signature-256. */
export async function assinatura(appSecret: string, corpoCru: string | Uint8Array): Promise<string> {
  return `sha256=${await hmacHex(appSecret, corpoCru)}`;
}

/**
 * A entrega veio da Meta? Confira com o corpo CRU (os bytes recebidos, antes de qualquer JSON.parse): reserializar
 * muda espaços e acentos e a assinatura não bate.
 */
export async function verificarAssinatura(appSecret: string, corpoCru: string | Uint8Array, cabecalho: string | null | undefined): Promise<boolean> {
  if (!cabecalho || !cabecalho.startsWith("sha256=")) return false;
  return iguaisEmTempoConstante(await assinatura(appSecret, corpoCru), cabecalho);
}

/** Inscrição do webhook (GET com hub.mode=subscribe): o `hub.challenge` a devolver, ou null se o token não confere. */
export function desafio(query: URLSearchParams | Record<string, unknown>, verifyToken: string): string | null {
  const ler = (k: string): unknown => (query instanceof URLSearchParams ? query.get(k) : query[k]);
  const modo = ler("hub.mode");
  const token = ler("hub.verify_token");
  const resposta = ler("hub.challenge");
  if (modo !== "subscribe" || typeof token !== "string" || typeof resposta !== "string") return null;
  return iguaisEmTempoConstante(token, verifyToken) ? resposta : null;
}
