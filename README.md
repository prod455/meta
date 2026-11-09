# meta

[![ci](https://github.com/prod455/meta/actions/workflows/ci.yml/badge.svg)](https://github.com/prod455/meta/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-zero%20deps-3178c6)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)

Graph API da Meta (Instagram, Facebook, WhatsApp Cloud e Marketing) do jeito seguro, escrito uma vez para todos os
sistemas. Roda no **Node** e no **Cloudflare Worker**: só `fetch` e WebCrypto, zero dependências.

- **Token fora da URL**: vai sempre em `Authorization: Bearer`, e o `access_token` que a Meta põe no `paging.next` é
  tirado antes da próxima chamada. URL aparece em log de proxy e de servidor; token não pode.
- **`appsecret_proof` em toda chamada**: token vazado não serve em outro app.
- **Segredo do app só no corpo do POST** no login, nunca na URL.
- **Erro que diz o que fazer**: `ErroDaGraph.repetivel` separa limite de uso e falha da Meta (tentar de novo mais
  tarde) de token vencido ou permissão faltando (avisar quem conectou).
- **Webhook conferido**: `X-Hub-Signature-256` em tempo constante, e o desafio da inscrição.
- **`GraphFalso`** para testes e homologação sem credencial.

## Instalar

```bash
npm install github:prod455/meta#v0.1.0
```

## Cliente

```ts
import { criarGraph, ErroDaGraph } from "@prod455/meta";

const graph = criarGraph({ versao: "v27.0", appSecret: env.META_APP_SECRET });

const eu = await graph.get("/me", { fields: "id,name" }, token);
const insights = await graph.todasAsPaginas("act_123/insights", { level: "campaign", limit: 500 }, token);
await graph.post(`${phoneNumberId}/messages`, { messaging_product: "whatsapp", to, type: "text", text: { body } }, token);

try {
  await graph.get("/me", {}, token);
} catch (e) {
  if (e instanceof ErroDaGraph && e.repetivel) agendarDeNovo();
  else if (e instanceof ErroDaGraph) avisar(e.mensagemDaMeta); // e.codigo, e.subcodigo, e.fbtrace
}
```

Fixe a versão (`versao`) e confira a data de fim de cada uma no changelog da Meta.

## Login com a Meta

```ts
import { criarOAuth } from "@prod455/meta";

const login = criarOAuth({ versao: "v27.0", appId, appSecret, redirectUri: "https://seu.site/meta/volta" });

login.urlDoLogin({ configId, estado });          // Login para Empresas
login.urlDoLogin({ escopo: "instagram_basic", estado }); // login comum

const { token, expiraEmSegundos } = await login.trocarCodigo(codigo); // token de longa duração (~60 dias)
const { id, nome } = await login.usuario(token);
```

Confira o `estado` que voltou contra o que você guardou (cookie) antes de trocar o código.

## Webhook

```ts
import { desafio, verificarAssinatura } from "@prod455/meta";

// GET da inscrição
const resposta = desafio(new URL(req.url).searchParams, env.META_VERIFY_TOKEN);
if (resposta === null) return new Response(null, { status: 403 });
return new Response(resposta);

// POST de cada entrega: o corpo CRU, antes do JSON.parse
const cru = await req.text();
if (!(await verificarAssinatura(env.META_APP_SECRET, cru, req.headers.get("x-hub-signature-256")))) {
  return new Response(null, { status: 401 });
}
const evento = JSON.parse(cru);
```

## Testes sem a Meta

```ts
import { GraphFalso } from "@prod455/meta";

const graph = new GraphFalso();
graph.respostas.set("me", { id: "1" });
graph.respostas.set("123/messages", (c) => ({ messages: [{ id: "wamid.teste" }] }));
graph.falharProximas = 1; // a próxima chamada falha com erro repetível
// graph.chamadas: tudo o que foi chamado, com parâmetros e corpo
```

## Mudar alguma coisa

`npm run check` (tipos e testes), `npm run build` (o `dist/` vai no commit: é o que o `npm install github:…` usa),
suba a versão no `package.json` e publique a release `vX.Y.Z`.

## Licença

MIT.
