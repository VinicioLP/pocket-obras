export type MainTabParamList = {
  Inicio: undefined;
  Clientes: undefined;
  Orcamentos: undefined;
  Servicos: undefined;
  Perfil: undefined;
};

export type RootStackParamList = {
  Principal: undefined;

  ClienteFormulario:
    | {
        clientId?: string;
      }
    | undefined;

  ServicoFormulario:
    | {
        serviceId?: string;
      }
    | undefined;

  OrcamentoFormulario:
    | {
        budgetId?: string;
      }
    | undefined;

  OrcamentoItens: {
    budgetId: string;
  };

  OrcamentoItemFormulario: {
    budgetId: string;
    itemId?: string;
  };

  OrcamentoDetalhes: {
    budgetId: string;
  };

  Cobrancas: undefined;
  CobrancaFormulario: undefined;
};
