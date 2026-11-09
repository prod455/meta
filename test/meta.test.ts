import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { ErroDaGraph, GraphFalso, appsecretProof, assinatura, criarGraph, criarOAuth, desafio, verificarAssinatura } from "../src/index.ts";

interface Pedido { url: URL; init: RequestInit }

function fetchFalso(respostas: ((p: Pedido) => { status?: number; corpo: unknown })[]) {
  const pedidos: Pedido[] = [];
  const f = (async (url: string | URL, init: RequestInit = {}) => {
    const p = { url: new URL(String(url)), init };
    pedidos.push(p);
    const r = respostas.shift()!(p);
    return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { f, pedidos };
}

const hmac = (k: string, m: string) => createHmac("sha256", k).update(m).digest("hex");

test("appsecret_proof é o HMAC-SHA256 do token com o app secret", async () => {
  assert.equal(await appsecretProof("TOKEN", "SEGREDO"), hmac("SEGREDO", "TOKEN"));
});

test("GET: token no cabeçalho, nunca na URL; appsecret_proof e parâmetros na URL", async () => {
  const { f, pedidos } = fetchFalso([() => ({ corpo: { id: "1" } })]);
  const g = criarGraph({ versao: "v27.0", appSecret: "SEGREDO", fetch: f });
  assert.deepEqual(await g.get("/me", { fields: "id,name", vazio: undefined }, "TOKEN"), { id: "1" });
  const p = pedidos[0]!;
  assert.equal(p.url.origin + p.url.pathname, "https://graph.facebook.com/v27.0/me");
  assert.equal(p.url.searchParams.get("fields"), "id,name");
  assert.equal(p.url.searchParams.has("vazio"), false);
  assert.equal(p.url.searchParams.has("access_token"), false);
  assert.equal(p.url.searchParams.get("appsecret_proof"), hmac("SEGREDO", "TOKEN"));
  assert.equal(new Headers(p.init.headers).get("authorization"), "Bearer TOKEN");
});

test("todas as páginas: segue paging.next e tira dele o access_token que a Meta põe", async () => {
  const next = "https://graph.facebook.com/v27.0/act_1/insights?after=abc&access_token=VAZOU";
  const { f, pedidos } = fetchFalso([() => ({ corpo: { data: [1, 2], paging: { next } } }), () => ({ corpo: { data: [3] } })]);
  const g = criarGraph({ versao: "v27.0", appSecret: "S", fetch: f });
  assert.deepEqual(await g.todasAsPaginas<number>("act_1/insights", { limit: 500 }, "T"), [1, 2, 3]);
  assert.equal(pedidos[1]!.url.searchParams.get("after"), "abc");
  assert.equal(pedidos[1]!.url.searchParams.has("access_token"), false);
});

test("endereço fora da Graph API é recusado (o token não vai para outro host)", async () => {
  const g = criarGraph({ versao: "v27.0", fetch: fetchFalso([]).f });
  await assert.rejects(g.get("https://evil.example/me", {}, "T"), /fora da Graph API/);
});

test("POST: corpo JSON e token no cabeçalho", async () => {
  const { f, pedidos } = fetchFalso([() => ({ corpo: { messages: [{ id: "wamid.1" }] } })]);
  const g = criarGraph({ versao: "v27.0", fetch: f });
  await g.post("123/messages", { to: "5562999990001" }, "T");
  assert.equal(pedidos[0]!.init.method, "POST");
  assert.equal(pedidos[0]!.init.body, JSON.stringify({ to: "5562999990001" }));
  assert.equal(pedidos[0]!.url.searchParams.has("appsecret_proof"), false);
});

test("erro da Graph: mensagem da Meta, códigos e se dá para tentar de novo", async () => {
  const casos: [number, unknown, boolean][] = [
    [400, { error: { message: "Invalid OAuth access token.", code: 190, fbtrace_id: "Abc" } }, false],
    [400, { error: { message: "(#4) Application request limit reached", code: 4 } }, true],
    [400, { error: { message: "Service temporarily unavailable", code: 1 } }, true],
    [503, null, true],
    [429, {}, true],
  ];
  for (const [status, corpo, repetivel] of casos) {
    const g = criarGraph({ versao: "v27.0", fetch: fetchFalso([() => ({ status, corpo })]).f });
    const e = await g.get("/me", {}, "T").catch((x: unknown) => x);
    assert.ok(e instanceof ErroDaGraph);
    assert.equal(e.repetivel, repetivel, JSON.stringify(corpo));
  }
  const g = criarGraph({ versao: "v27.0", fetch: fetchFalso([() => ({ status: 400, corpo: { error: { message: "Token vencido", code: 190, error_subcode: 463, fbtrace_id: "X1" } } })]).f });
  const e = (await g.get("/me", {}, "T").catch((x: unknown) => x)) as ErroDaGraph;
  assert.deepEqual([e.mensagemDaMeta, e.codigo, e.subcodigo, e.fbtrace, e.caminho], ["Token vencido", 190, 463, "X1", "/v27.0/me"]);
});

test("login: URL do diálogo, código -> token longo com o segredo só no corpo do POST", async () => {
  const { f, pedidos } = fetchFalso([
    () => ({ corpo: { access_token: "CURTO" } }),
    () => ({ corpo: { access_token: "LONGO", expires_in: 5183944 } }),
    () => ({ corpo: { id: "99", name: "Paulo" } }),
  ]);
  const o = criarOAuth({ versao: "v27.0", appId: "APP", appSecret: "SEGREDO", redirectUri: "https://x.test/volta", fetch: f });
  const login = new URL(o.urlDoLogin({ configId: "CFG", estado: "E1" }));
  assert.equal(login.searchParams.get("config_id"), "CFG");
  assert.equal(login.searchParams.get("state"), "E1");
  assert.equal(new URL(o.urlDoLogin({ escopo: "instagram_basic", estado: "E" })).searchParams.get("scope"), "instagram_basic");
  assert.deepEqual(await o.trocarCodigo("COD"), { token: "LONGO", expiraEmSegundos: 5183944 });
  for (const p of pedidos.slice(0, 2)) {
    assert.equal(p.init.method, "POST");
    assert.equal(p.url.search, "");
    assert.equal(new URLSearchParams(String(p.init.body)).get("client_secret"), "SEGREDO");
  }
  assert.equal(new URLSearchParams(String(pedidos[1]!.init.body)).get("fb_exchange_token"), "CURTO");
  assert.equal(new URLSearchParams(String(pedidos[1]!.init.body)).get("appsecret_proof"), hmac("SEGREDO", "CURTO"));
  assert.deepEqual(await o.usuario("LONGO"), { id: "99", nome: "Paulo" });
});

test("webhook: assinatura do corpo cru e desafio da inscrição", async () => {
  const corpo = '{"object":"page","entry":[{"id":"1","changes":[{"field":"leadgen","value":{"nome":"João"}}]}]}';
  const cabecalho = `sha256=${hmac("SEGREDO", corpo)}`;
  assert.equal(await assinatura("SEGREDO", corpo), cabecalho);
  assert.equal(await verificarAssinatura("SEGREDO", corpo, cabecalho), true);
  assert.equal(await verificarAssinatura("SEGREDO", new TextEncoder().encode(corpo), cabecalho), true);
  assert.equal(await verificarAssinatura("OUTRO", corpo, cabecalho), false);
  assert.equal(await verificarAssinatura("SEGREDO", corpo + " ", cabecalho), false);
  assert.equal(await verificarAssinatura("SEGREDO", corpo, null), false);
  assert.equal(await verificarAssinatura("SEGREDO", corpo, hmac("SEGREDO", corpo)), false);
  assert.equal(desafio(new URLSearchParams("hub.mode=subscribe&hub.verify_token=VT&hub.challenge=42"), "VT"), "42");
  assert.equal(desafio({ "hub.mode": "subscribe", "hub.verify_token": "errado", "hub.challenge": "42" }, "VT"), null);
  assert.equal(desafio({ "hub.mode": "unsubscribe", "hub.verify_token": "VT", "hub.challenge": "42" }, "VT"), null);
});

test("GraphFalso: guarda as chamadas, responde o combinado e simula falha passageira", async () => {
  const g = new GraphFalso();
  g.respostas.set("me", { id: "1" });
  g.respostas.set("123/messages", (c) => ({ para: (c.corpo as { to: string }).to }));
  assert.deepEqual(await g.get("/me", {}, "T"), { id: "1" });
  assert.deepEqual(await g.post("123/messages", { to: "55" }, "T"), { para: "55" });
  assert.deepEqual(await g.todasAsPaginas("x", {}, "T"), []);
  g.falharProximas = 1;
  const e = await g.get("/me", {}, "T").catch((x: unknown) => x);
  assert.ok(e instanceof ErroDaGraph && e.repetivel);
  assert.equal(g.chamadas.length, 4);
});
