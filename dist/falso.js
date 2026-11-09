// Graph de mentira para testes e homologação sem credencial: guarda as chamadas e devolve o que você combinar.
import { ErroDaGraph } from "./erro.js";
export class GraphFalso {
    versao = "falso";
    chamadas = [];
    /** Respostas por caminho ("/me", "123/insights"); o que não estiver aqui volta `{}` (ou `{ data: [] }` em lista). */
    respostas = new Map();
    /** Quantas das próximas chamadas falham com erro passageiro (500, repetível). */
    falharProximas = 0;
    responder(c, padrao) {
        this.chamadas.push(c);
        if (this.falharProximas > 0) {
            this.falharProximas--;
            throw new ErroDaGraph(500, { error: { message: "falha passageira simulada", code: 2 } }, c.caminho);
        }
        const r = this.respostas.get(c.caminho.replace(/^\//, "")) ?? this.respostas.get(c.caminho);
        if (r === undefined)
            return padrao;
        return typeof r === "function" ? r(c) : r;
    }
    async get(caminho, params) {
        return this.responder({ metodo: "GET", caminho: String(caminho), params }, {});
    }
    async post(caminho, corpo) {
        return this.responder({ metodo: "POST", caminho, params: {}, corpo }, {});
    }
    async todasAsPaginas(caminho, params) {
        const p = this.responder({ metodo: "GET", caminho: String(caminho), params }, { data: [] });
        return p.data;
    }
}
