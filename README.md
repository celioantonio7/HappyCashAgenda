# HappyCash Agenda

Aplicativo de agenda e servicos extraido da base atual do HappyCash.

Este repositorio foi separado para manter o foco do monorepo principal somente no HappyCash ERP e no HappyCashSite. A Agenda fica aqui como produto independente, sem variaveis de ambiente, sem vinculo automatico com Vercel e sem apontar para o banco de producao do HappyCash.

## Status

- Codigo extraido da pasta `happycashagenda` do monorepo HappyCash.
- Repositorio preparado para ser publico.
- Arquivos `.env`, `.env.local`, `.vercel`, `dist`, `build`, `node_modules` e capturas locais foram removidos da publicacao.
- O `supabase/config.toml` foi deixado neutro para uso em um projeto Supabase proprio.
- As migrations e functions da Agenda ficam neste repositorio como referencia para reativacao independente.

## O que existe aqui

- Agenda de atendimentos e servicos.
- Cadastro de clientes, profissionais, horarios e disponibilidade.
- Fluxos de agendamento, cancelamento e historico.
- Estrutura opcional de Supabase com migrations e functions da Agenda.
- Interface React + Vite + Tailwind.

## Requisitos

- Node.js 20 ou superior.
- npm 10 ou superior.
- Projeto Supabase proprio, caso queira usar banco/auth/functions.

## Rodando localmente

```bash
npm install
npm run dev
```

O Vite vai abrir uma URL local, normalmente `http://localhost:8080` ou a proxima porta livre.

## Build

```bash
npm run build
npm run preview
```

## Variaveis de ambiente

Nenhum arquivo `.env` deve ser commitado. Para rodar conectado a um Supabase proprio, crie localmente um `.env.local` com:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Para Edge Functions, configure secrets diretamente no Supabase CLI ou no painel do Supabase. Nao coloque secrets no repositorio.

## Supabase

A pasta `supabase/` foi mantida para documentar a estrutura original da Agenda. Antes de usar:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Depois disso, configure as functions e secrets no projeto independente da Agenda.

## Deploy

Este repositorio nao vem conectado a Vercel. Se precisar publicar:

1. Crie um projeto separado na hospedagem desejada.
2. Configure as variaveis no painel da hospedagem.
3. Use `npm run build` como comando de build.
4. Use `dist` como pasta de saida.

## Seguranca

- Nao committe `.env` ou chaves privadas.
- Nao reutilize o banco de producao do HappyCash ERP.
- Crie um Supabase independente para Agenda.
- Revise secrets de WhatsApp, pagamento e webhooks antes de ativar functions.

## Separacao do HappyCash ERP

O HappyCash ERP e o HappyCashSite continuam no monorepo principal. A Agenda fica aqui separada para manutencao futura, sem interferir no ERP.
