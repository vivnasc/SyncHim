export interface DbUser {
  id: string;
  email: string;
  nome: string | null;
  locale: 'pt' | 'en';
  tier: 0 | 1 | 2;
  no_comprado: string | null;
  nos_comprados_adicionais: string[];
  paypal_payer_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface DbDiagnostico {
  id: string;
  user_id: string;
  no_dominante: string;
  no_secundario: string | null;
  pontuacoes: Record<string, number>;
  respostas: Record<string, number>;
  created_at: string;
}

export interface DbProgresso {
  id: string;
  user_id: string;
  no: string;
  sessao_numero: number;
  iniciada_em: string | null;
  completada_em: string | null;
  desbloqueada_em: string;
}
