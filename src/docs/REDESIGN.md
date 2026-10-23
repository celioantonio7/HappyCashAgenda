# Redesign do HappyCash Agenda

## Direção

Aplicativo de operação e agendamento, com fundo `#090B0A`, superfícies `#121614` e `#1B211D`, bordas `#2A332D` e destaque `#B9FF39`. Tokens compartilhados em `src/design-tokens.css`. Referências visuais em `public/referencia`.

O login usa o Mesh Gradient de Paper (`@paper-design/shaders-react`), carregado separadamente, com limite de pixels, pausa quando a aba fica oculta, redução de movimento e fundo estático para dispositivos sem WebGL2.

## Navegação e autenticação

O formulário de entrada é único. Supabase Auth e as permissões do banco identificam dono, funcionário vinculado ao Auth ou cliente. Proprietários continuam sendo provisionados por uma rotina administrativa segura; o cadastro público é de cliente.

A autenticação profissional antiga por usuário e senha continua funcionando no mesmo formulário para preservar as contas existentes. Ela é validada pela RPC `authenticate_barber`; não há seletor de perfil. Vincular todas as contas profissionais antigas a Supabase Auth, inclusive para Google, exige uma migração de identidade separada. O redesign não modifica esse backend nem promete Google para credenciais profissionais legadas.

A raiz abre o login ou a área autorizada. O slug da barbearia abre o agendamento, sem hero promocional ou splash obrigatório. As rotas existentes e os aliases foram preservados. A última barbearia visitada é lembrada apenas pelo slug, sem dados pessoais.

Clientes: Agendar, Histórico, Assinatura, Feed e Perfil. Proprietário: menu nos quatro grupos Operação, Equipe, Comercial e Configurações, preservando as 14 áreas. Funcionário: painel operacional existente, com o mesmo design system.

## Componentes de terceiros

- Ícones: fontes oficiais MIT de `lucide-animated.com` / `pqoqubbw/icons`, em `src/components/icons`; adaptador em `animated-icons.tsx`. O catálogo não tem todos os nomes do Lucide tradicional: o adaptador utiliza equivalentes do catálogo disponível. A única alteração estrutural nos ícones é o wrapper semântico `span` para composição com textos e controles.
- Gráficos: fontes oficiais do registry Bklit UI, em `src/components/bklit`. Imports foram adaptados à pasta local, formatos a `pt-BR`, e um tipo de accessor foi compatibilizado com TypeScript/Visx. O adaptador operacional preserva os cálculos originais e disponibiliza alternativa textual aos gráficos.
- Feed: efeito Card Fan adaptado para React web com Motion, tendo como referência MIT o exemplo de `dohooo/react-native-reanimated-carousel`. Funciona com toque, botões e teclado.

## Limites funcionais preservados

- Não há tabelas/endpoints de posts ou de assinaturas de serviços do cliente. Essas áreas exibem estados vazios explícitos; sem cobranças, planos, curtidas, comentários ou botões de contratação fictícios.
- O Card Fan pode ser visto com exemplos apenas no modo demo local identificado. Não há gravação de conteúdo fictício no Supabase.
- As funções existentes de agenda, cancelamento, remarcação, produtos, estoque, comissões, fidelidade e personalização continuam usando a lógica anterior.
- Especialidades profissionais, repasses de comissão, avaliações, favoritos, folgas individuais e outros elementos das imagens só devem ser adicionados quando houver implementação real correspondente.
- Personalização visual da empresa permanece armazenada; os controles do aplicativo usam a paleta compartilhada. Os valores de marca são expostos separadamente como `--brand-primary` e `--brand-accent`.

## PWA

Manifesto e service worker são gerados pelo `vite-plugin-pwa`. Há ícones próprios em 192/512 px, maskable e Apple Touch, modo standalone e safe areas. O registro ocorre inclusive na página de login. O botão de instalação só aparece quando o navegador fornece o evento de instalação.

O cache contém apenas os arquivos estáticos da interface. Não há cache de respostas do Supabase, tokens ou registros de usuários no service worker. A mensagem offline informa que consultas e confirmações exigem conexão. Atualizações aguardam ação do usuário para não interromper formulários em andamento.

Teste o PWA no build de produção (`npm run build` e `npm run preview`) em localhost ou HTTPS. O service worker não é ativado no servidor Vite de desenvolvimento. A publicação em um domínio HTTPS continua necessária para instalação fora de localhost.

## Verificação

Use `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit` e `npm run build`. O relatório final deve distinguir as verificações feitas no navegador dos fluxos externos não exercitados, como confirmação por e-mail, Google OAuth e cobrança.

O snapshot anterior ao redesign está em `/tmp/agenda-before-redesign.tgz` nesta máquina. Não foram movidas migrations nem alteradas tabelas remotas nesta etapa.

## Resultado da verificação nesta sessão

- TypeScript e build de produção executados; manifesto e service worker gerados.
- Login conferido em viewport de 390 px, com shader WebGL ativo e sem overflow horizontal.
- Conta do dono encaminhada ao painel; um funcionário temporário entrou pelo mesmo formulário e chegou ao painel profissional. O cadastro temporário foi excluído após a verificação.
- Gráficos Bklit de barras e rosca renderizados no navegador com fixtures apenas em memória, sem gravação no banco.
- Service worker registrado no preview de produção e manifesto standalone validado. Emulação offline bloqueou o acesso ao Supabase e exibiu o aviso de falta de conexão. Nenhuma resposta privada foi encontrada no cache.
- Google OAuth, confirmação de e-mail e envio de recuperação não foram acionados nesta sessão.

O login e as rotas são carregados separadamente para não incluir os gráficos administrativos na entrada. A fonte Inter é servida localmente e incluída no cache estático do PWA. O histórico recebeu filtros visuais por status e a ação de agendar novamente abre um novo rascunho, sem reutilizar data/horário nem confirmar automaticamente.

As 14 áreas do proprietário foram percorridas no navegador, sem erros nas consultas observadas. O cliente temporário entrou por e-mail e senha no formulário único e foi encaminhado ao agendamento do slug, sem navegação administrativa. As contas temporárias foram removidas. A checagem de lint ignora os arquivos transitórios `*.timestamp-*.mjs` gerados pelo Vite para evitar uma corrida durante builds concorrentes.
