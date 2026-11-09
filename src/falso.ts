// Graph de mentira para testes e homologação sem credencial: guarda as chamadas e devolve o que você combinar.
import { ErroDaGraph } from "./erro.ts";
import type { Graph, Pagina, Parametros } from "./graph.ts";

export interface ChamadaFalsa {
  metodo: "GET" | "POST";
  caminho: string;
  params: Parametros;
  corpo?: unknown;
}

type Resposta = unknown | ((c: ChamadaFalsa) => unknown);

export class GraphFalso implements Graph {
  readonly versao = "falso";
  readonly chamadas: ChamadaFalsa[] = [];
  /** Respostas por caminho ("/me", "123/insights"); o que não estiver aqui volta `{}` (ou `{ data: [] }` em lista). */
  readonly respostas = new Map<string, Resposta>();
  /** Quantas das próximas chamadas falham com erro passageiro (500, repetível). */
  falharProximas = 0;

  private responder(c: ChamadaFalsa, padrao: unknown): unknown {
    this.chamadas.push(c);
    if (this.falharProximas > 0) {
      this.falharProximas--;
      throw new ErroDaGraph(500, { error: { message: "falha passageira simulada", code: 2 } }, c.caminho);
    }
    const r = this.respostas.get(c.caminho.replace(/^\//, "")) ?? this.respostas.get(c.caminho);
    if (r === undefined) return padrao;
    return typeof r === "function" ? (r as (c: ChamadaFalsa) => unknown)(c) : r;
  }

  async get<T>(caminho: string | URL, params: Parametros): Promise<T> {
    return this.responder({ metodo: "GET", caminho: String(caminho), params }, {}) as T;
  }

  async post<T>(caminho: string, corpo: unknown): Promise<T> {
    return this.responder({ metodo: "POST", caminho, params: {}, corpo }, {}) as T;
  }

  async todasAsPaginas<T>(caminho: string | URL, params: Parametros): Promise<T[]> {
    const p = this.responder({ metodo: "GET", caminho: String(caminho), params }, { data: [] }) as Pagina<T>;
    return p.data;
  }
}
