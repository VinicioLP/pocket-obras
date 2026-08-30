export type RootStackParamList = {
  Home: undefined;
  Clientes: undefined;

  ClienteFormulario:
    | {
        clientId?: string;
      }
    | undefined;
};
