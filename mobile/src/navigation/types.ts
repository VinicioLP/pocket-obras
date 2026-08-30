export type MainTabParamList = {
  Inicio: undefined;
  Clientes: undefined;
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
};
