# Pocket Obras

O **Pocket Obras** é um aplicativo mobile desenvolvido como projeto de **Trabalho de Conclusão de Curso (TCC)**. Seu objetivo é ajudar pequenos empreendedores da construção civil a organizar melhor a rotina do negócio, reunindo em um único aplicativo informações sobre clientes, serviços, orçamentos, contas a receber e pagamentos.

## Objetivos

- Facilitar a organização de pequenos negócios da construção civil.
- Centralizar o cadastro de clientes e serviços.
- Auxiliar na criação e no acompanhamento de orçamentos.
- Acompanhar valores a receber e pagamentos.
- Oferecer uma solução simples e acessível para profissionais autônomos e pequenas empresas.

## Tecnologias

### Aplicativo mobile

- React Native
- Expo SDK 57
- React Native 0.86
- TypeScript
- React Navigation
- Supabase Auth
- React Native Gifted Charts

### API

- Node.js
- Express
- TypeScript
- Helmet
- CORS
- Supabase

## Estrutura do projeto

```text
pocket-obras/
├── api/       # API e servidor backend
├── mobile/    # Aplicativo mobile
├── supabase/  # Recursos relacionados ao Supabase
└── docs/      # Documentação complementar
```

## Pré-requisitos

- Node.js instalado
- npm instalado
- Expo Go ou um emulador Android/iOS
- Um projeto configurado no Supabase

O Expo SDK 57 utiliza React Native 0.86 e React 19.2.

## Configuração do ambiente

### Mobile

Crie o arquivo `mobile/.env` com as credenciais públicas do Supabase:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

A chave publicável pode ser utilizada no aplicativo mobile. Nunca coloque chaves secretas ou a chave `service_role` no código do aplicativo.

### API

Crie ou edite o arquivo `api/.env`:

```env
PORT=3000
```

A API utiliza a porta `3000` por padrão. Caso novas rotas passem a utilizar o Supabase diretamente, suas credenciais devem permanecer somente no backend.

## Instalação

Clone o repositório e acesse a pasta do projeto:

```bash
git clone https://github.com/VinicioLP/pocket-obras.git
cd pocket-obras
```

Instale as dependências da API:

```bash
cd api
npm install
```

Instale as dependências do aplicativo mobile:

```bash
cd ../mobile
npm install
```

## Executando a API

Em um terminal, execute:

```bash
cd api
npm run dev
```

A API será iniciada em `http://localhost:3000`.

Para validar os tipos TypeScript:

```bash
npm run typecheck
```

Para gerar a versão compilada:

```bash
npm run build
```

Para executar a versão compilada:

```bash
npm start
```

## Executando o aplicativo mobile

Em outro terminal, execute:

```bash
cd mobile
npx expo start
```

Para limpar o cache do Metro Bundler:

```bash
npx expo start --clear
```

Depois, utilize uma das opções exibidas pelo Expo:

- Pressione `a` para abrir no Android.
- Pressione `i` para abrir no iOS.
- Escaneie o QR Code usando o Expo Go.

Também estão disponíveis os comandos:

```bash
npm run android
npm run ios
npm run web
```

## Autenticação

A autenticação dos usuários é realizada pelo Supabase Auth. A sessão é persistida no dispositivo e o token de acesso pode ser obtido assim:

```ts
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;
```

Para enviar o token à API:

```ts
await fetch("http://localhost:3000/rota", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

O token deve ser validado no backend. Não confie apenas na leitura ou decodificação do token no aplicativo mobile.

## Status do projeto

O Pocket Obras está em desenvolvimento como parte de um Trabalho de Conclusão de Curso. O projeto poderá receber novas funcionalidades, melhorias de usabilidade e ajustes técnicos durante sua evolução.

## Licença

Projeto desenvolvido para fins acadêmicos.
