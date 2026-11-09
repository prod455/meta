import type { Graph, Parametros } from "./graph.ts";
export interface ChamadaFalsa {
    metodo: "GET" | "POST";
    caminho: string;
    params: Parametros;
    corpo?: unknown;
}
export declare class GraphFalso implements Graph {
    readonly versao = "falso";
    readonly chamadas: ChamadaFalsa[];
    /** Respostas por caminho ("/me", "123/insights"); o que não estiver aqui volta `{}` (ou `{ data: [] }` em lista). */
    readonly respostas: Map<string, unknown>;
    /** Quantas das próximas chamadas falham com erro passageiro (500, repetível). */
    falharProximas: number;
    private responder;
    get<T>(caminho: string | URL, params: Parametros): Promise<T>;
    post<T>(caminho: string, corpo: unknown): Promise<T>;
    todasAsPaginas<T>(caminho: string | URL, params: Parametros): Promise<T[]>;
}
