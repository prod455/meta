// HMAC-SHA256 e comparação em tempo constante só com WebCrypto: roda no Node, no Worker e no navegador.

const texto = new TextEncoder();

function bytes(v: string | Uint8Array): Uint8Array {
  return typeof v === "string" ? texto.encode(v) : v;
}

/** HMAC-SHA256 de `mensagem` com `segredo`, em hexadecimal minúsculo. */
export async function hmacHex(segredo: string, mensagem: string | Uint8Array): Promise<string> {
  const chave = await crypto.subtle.importKey("raw", texto.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = new Uint8Array(await crypto.subtle.sign("HMAC", chave, bytes(mensagem) as BufferSource));
  let hex = "";
  for (const b of assinatura) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** Igualdade sem vazar, pelo tempo, onde as duas diferem. */
export function iguaisEmTempoConstante(a: string, b: string): boolean {
  const x = texto.encode(a);
  const y = texto.encode(b);
  let diferenca = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diferenca |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diferenca === 0;
}
