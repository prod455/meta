// Login com a Meta (Facebook Login / Login para Empresas): URL do diálogo, código -> token de longa duração e usuário.
// O client_secret vai no corpo do POST, nunca na URL (que aparece em log de proxy e de servidor).
import { ErroDaGraph } from "./erro.js";
import { appsecretProof, criarGraph } from "./graph.js";
export function criarOAuth(c) {
    const executar = c.fetch ?? fetch;
    const base = `https://graph.facebook.com/${c.versao}`;
    const graph = criarGraph({ versao: c.versao, appSecret: c.appSecret, fetch: executar });
    const tokenPorPost = async (campos) => {
        const resposta = await executar(`${base}/oauth/access_token`, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(campos),
            signal: AbortSignal.timeout(20_000),
        });
        const corpo = (await resposta.json().catch(() => null));
        if (!resposta.ok || !corpo?.access_token)
            throw new ErroDaGraph(resposta.status, corpo, "/oauth/access_token");
        return { access_token: corpo.access_token, expires_in: corpo.expires_in };
    };
    return {
        /**
         * Endereço do diálogo de login. Login para Empresas usa `configId`; o login comum usa `escopo`
         * (ex.: "instagram_basic,pages_show_list"). `estado` volta igual no retorno: confira antes de trocar o código.
         */
        urlDoLogin(o) {
            const url = new URL(`https://www.facebook.com/${c.versao}/dialog/oauth`);
            url.searchParams.set("client_id", c.appId);
            url.searchParams.set("redirect_uri", c.redirectUri);
            url.searchParams.set("response_type", "code");
            url.searchParams.set("state", o.estado);
            if ("configId" in o)
                url.searchParams.set("config_id", o.configId);
            else
                url.searchParams.set("scope", o.escopo);
            return url.toString();
        },
        /** Código do retorno -> token de curta duração -> token de longa duração (cerca de 60 dias). */
        async trocarCodigo(codigo) {
            const curto = await tokenPorPost({ client_id: c.appId, client_secret: c.appSecret, redirect_uri: c.redirectUri, code: codigo });
            // Com "Exigir segredo do app" ligado no app da Meta, a troca também precisa da prova do token curto.
            const longo = await tokenPorPost({
                grant_type: "fb_exchange_token",
                client_id: c.appId,
                client_secret: c.appSecret,
                fb_exchange_token: curto.access_token,
                appsecret_proof: await appsecretProof(curto.access_token, c.appSecret),
            });
            return { token: longo.access_token, expiraEmSegundos: longo.expires_in ?? null };
        },
        /** O id do usuário (por app) e o nome de quem conectou. */
        async usuario(token) {
            const u = await graph.get("/me", { fields: "id,name" }, token);
            return { id: u.id, nome: u.name ?? null };
        },
    };
}
