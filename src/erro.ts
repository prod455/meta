// Erro que a Graph API devolveu, com o que precisa para decidir: mostrar ao dono, tentar de novo ou desistir.

/** Códigos de limite de uso da Meta: tentar de novo mais tarde resolve. */
const LIMITE = new Set([
  4, // limite do app
  17, // limite do usuário
  32, // limite da página
  613, // limite de chamadas
  80007, // limite da conta do WhatsApp Business
  130429, // limite de envio do WhatsApp
  131056, // limite de mensagens para o mesmo número
]);

export class ErroDaGraph extends Error {
  /** Status HTTP da resposta. */
  readonly status: number;
  /** `error.code` da Meta, quando veio. */
  readonly codigo: number | null;
  /** `error.error_subcode` da Meta, quando veio. */
  readonly subcodigo: number | null;
  /** `error.fbtrace_id`: o que o suporte da Meta pede. */
  readonly fbtrace: string | null;
  /** A mensagem da Meta, para mostrar a quem conectou a conta. */
  readonly mensagemDaMeta: string;
  /** O caminho chamado (sem token nem parâmetros). */
  readonly caminho: string;
  /** Falha passageira (limite de uso, 5xx, 429): tentar de novo mais tarde pode dar certo. */
  readonly repetivel: boolean;

  constructor(status: number, corpo: unknown, caminho: string) {
    const e = (corpo as { error?: { message?: string; code?: number; error_subcode?: number; fbtrace_id?: string } } | null)?.error ?? {};
    const mensagem = e.message ?? `HTTP ${status}`;
    super(`Meta: HTTP ${status} em ${caminho}: ${mensagem}`);
    this.name = "ErroDaGraph";
    this.status = status;
    this.codigo = e.code ?? null;
    this.subcodigo = e.error_subcode ?? null;
    this.fbtrace = e.fbtrace_id ?? null;
    this.mensagemDaMeta = mensagem;
    this.caminho = caminho;
    this.repetivel =
      status >= 500 ||
      status === 429 ||
      (this.codigo !== null && LIMITE.has(this.codigo)) ||
      (this.codigo === 1 && status === 400 && /temporarily/i.test(mensagem));
  }
}
