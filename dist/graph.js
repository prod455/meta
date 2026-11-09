// Cliente da Graph API: token no cabeçalho (nunca na URL), `appsecret_proof` em toda chamada, prazo, paginação e
// erro com `repetivel`.
import { hmacHex } from "./cripto.js";
import { ErroDaGraph } from "./erro.js";
/** `appsecret_proof` da Graph API: HMAC-SHA256 do token com o app secret, em hexadecimal. */
export function appsecretProof(token, appSecret) {
    return hmacHex(appSecret, token);
}
export function criarGraph(c) {
    const base = `https://graph.facebook.com/${c.versao}`;
    const executar = c.fetch ?? fetch;
    const prazo = c.prazoMs ?? 20_000;
    const montar = async (caminho, params, token) => {
        const url = caminho instanceof URL || /^https:\/\//.test(caminho) ? new URL(caminho) : new URL(`${base}/${caminho.replace(/^\//, "")}`);
        if (url.hostname !== "graph.facebook.com")
            throw new Error(`endereço fora da Graph API: ${url.hostname}`);
        for (const [k, v] of Object.entries(params))
            if (v !== undefined)
                url.searchParams.set(k, String(v));
        // O token vai no cabeçalho; a `paging.next` da Meta pode trazê-lo na URL, e ele não fica lá.
        url.searchParams.delete("access_token");
        if (c.appSecret)
            url.searchParams.set("appsecret_proof", await appsecretProof(token, c.appSecret));
        return url;
    };
    const ler = async (url, init) => {
        const resposta = await executar(url, { ...init, signal: AbortSignal.timeout(prazo) });
        const corpo = (await resposta.json().catch(() => null));
        if (!resposta.ok)
            throw new ErroDaGraph(resposta.status, corpo, url.pathname);
        return corpo;
    };
    const graph = {
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
        async todasAsPaginas(caminho, params, token) {
            const itens = [];
            let pagina = await graph.get(caminho, params, token);
            itens.push(...pagina.data);
            while (pagina.paging?.next) {
                pagina = await graph.get(pagina.paging.next, {}, token);
                itens.push(...pagina.data);
            }
            return itens;
        },
    };
    return graph;
}
