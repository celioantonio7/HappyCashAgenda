# Auditoria do HappyCash Agenda

Inspeção em 24/10/2026 do código local. Banco ativo, índices instalados e fluxos autenticados não foram consultados nesta rodada. Recomendações de índices dependem de examinar o esquema real e executar EXPLAIN (ANALYZE, BUFFERS) com dados representativos.

## Landing page antiga

`src/pages/Index.tsx` agora somente redireciona para login, painel ou agendamento. Não renderiza landing page.

| Elemento | Situação no código | Encaminhamento |
| --- | --- | --- |
| `src/components/landing/` | HeroSection, AboutSection, ServicesSection, LocationSection, BarberGallery, SectionNav, SwipeSections, PublicPageInlineEditor e FooterSection sem integração com as rotas atuais | Candidatos a remoção após decidir se a landing será retomada |
| `src/components/layout/Header.tsx` | Cabeçalho antigo sem importação nas telas atuais; Layout renderiza seu próprio cabeçalho | Candidato a remoção; funções exclusivas devem ser avaliadas antes |
| PublicPageSettingsTab | Ainda oferece foto de fundo hero, imagem Sobre nós, ajustes de posição/escala, título da página inicial, subtítulo e título Sobre nós | Campos sem consumidor nas telas atuais, fora dos componentes legados e do próprio editor |
| Texto Sobre nós | `Perfil.tsx` usa `settings.aboutText` | Preservar |
| Logo, nome, frase curta, atendimento, Pix e contato | Compartilhados com identidade, perfil e operação | Preservar; não remover toda a aba Agendamento e contato |
| `hero-barbershop.jpg` | Ainda importada pelo Feed de demonstração | Não excluir como arquivo sem uso |
| `public/referencia/` | Aproximadamente 9,9 MB de capturas; copiados para dist por estarem em public | Mover referências para fora de public; já estão excluídas do precache, mas continuam no deploy |
| `public/test-design/` | Imagens usadas pelo Feed e pelo catálogo fictício | Não excluir sem ajustar esses consumidores |

Código sem importação não implica custo de execução: o bundler pode excluí-lo. Já os campos legados no formulário continuam adicionando interface e manutenção; arquivos de public continuam sendo publicados.

## Rolagem

O CSS bloqueia o documento quando existe `.app-frame`. Portanto, não há evidência de que todas as telas tenham rolagem externa do navegador mais interna. Há contêineres aninhados que precisam de validação com conteúdo longo e teclado móvel.

| Local | Evidência | Avaliação |
| --- | --- | --- |
| Painel do dono | `.app-content` usa overflow auto e `.owner-tabs > [role=tabpanel]` também | Risco de duas áreas de rolagem no conteúdo quando cabeçalhos e rodapés excedem a altura; escolher um responsável |
| Painel profissional | `.app-content`, seções com aria-label e tabpanels possuem overflow auto | Mesmo risco; cabeçalho e indicadores ficam fora da lista |
| Menu lateral | `.owner-sidebar` é fixo com overflow-y auto | Área independente do conteúdo; não confundir com rolagem aninhada da página |
| Agendamento, horários | `Agendamento.tsx` limita a grade a 300px com overflow-y auto dentro de `.booking-step-card`, que também rola | Rolagem aninhada definida no código; preferir que o card inteiro role |
| Remarcação | `MeusAgendamentos.tsx` tem diálogo rolável e grade de horários limitada a 320px com overflow-y auto | Rolagem aninhada dentro do diálogo |
| Fidelidade | Lista de clientes max-h-48 com overflow-y auto no editor | Lista interna; avaliar busca paginada para evitar navegar por todos os clientes |
| Feed | Resumo com max-height 130px e overflow auto; conteúdo externo bloqueado | Rolagem interna intencional do texto; avaliar leitura de posts longos |
| Carrinho | Lista flex-1 com overflow-y auto | Separação intencional entre itens e ações do carrinho |
| Login | Browser sem autenticação, viewport 1432×693: documento rolável e nenhum elemento interno com overflow vertical efetivo | Uma rolagem, não duas; não extrapolar este resultado para os painéis |

O botão Carregar mais do dono fica fora do tabpanel rolável; no profissional também fica depois das abas. Verificar sua acessibilidade em telas baixas ao ajustar o responsável pela rolagem.

## Paginação e consultas

`ListMore` recebe total, shown e onMore; não busca no servidor. `.slice(0, listLimit)` reduz o DOM, mas não reduz os registros transferidos. Consultas sem paginação explícita ainda podem ser truncadas pelo limite configurado na API, deixando filtros e totais incompletos.

| Prioridade | Local | Problema | Proposta |
| --- | --- | --- | --- |
| Alta | Painel.tsx / appointments | Busca histórico da empresa sem período ou página; busca extras de todos os IDs; totais e gráficos calculados sobre o array | Separar agregados do dashboard de lista paginada; filtro por período/status/profissional no servidor |
| Alta | PainelBarbeiro.tsx / get_barber_appointments | RPC recebe profissional e sessão, sem período ou cursor; SQL local retorna todo o histórico | Nova versão paginada da RPC, validando a mesma sessão; agenda do dia separada do histórico |
| Alta | MeusAgendamentos.tsx | Busca todo o histórico do cliente e todos os extras | Próximos atendimentos separados do histórico por status/período; buscar extras somente da página |
| Alta | ClientsTab.tsx | Busca todos os clientes, pesquisa e paginação apenas locais | Busca com debounce, filtro no servidor e páginas |
| Alta | LoyaltyTab.tsx | Busca todos os programas, progressos e clientes simultaneamente | Paginar progressos; procurar cliente sob demanda; agregados separados |
| Média | Produtos.tsx / produtos do dono | Catálogo completo e filtros locais | Página por categoria e busca; seleção explícita de colunas |
| Média | ProductSalesTab.tsx | limit(20) sem continuação; pendências Pix calculadas só sobre esses pedidos | Página/cursor e consulta específica para pendências; não apresentar os 20 recentes como total global |
| Média | Serviços e profissionais | ListMore local no dono | Paginar gerenciamento quando necessário; manter opções operacionais suficientes para não esconder serviços/profissionais no agendamento |
| Baixa | Horários e localizações | Dados menores de configuração | Cache e carregamento sob demanda antes de adicionar paginação |

Sugestão inicial: páginas de 25 registros, com ordenação estável incluindo id. Para históricos grandes, usar cursor composto por data, horário e id; para clientes, nome e id. Reiniciar a página ao alterar empresa ou filtros. No app, prever carregamento, erro, vazio e fim da lista. Realtime deve invalidar a página/indicadores afetados, preservando posição de rolagem.

Não adicionar simplesmente limit às consultas atuais: isso deixaria receita, comissões, gráficos, fila e buscas calculados sobre uma fração dos dados.

## Banco

As migrations locais contêm índices por store_account_id e índice específico de fila. Isso não comprova a presença desses índices no banco ativo nem elimina a necessidade de índices compostos.

Candidatos para avaliar com os filtros finais e EXPLAIN:

- appointments: (store_account_id, appointment_date, appointment_time, id).
- Histórico do cliente: (store_account_id, client_id, appointment_date, appointment_time, id).
- Agenda profissional: (barber_id, appointment_date, appointment_time, id).
- Clientes: (store_account_id, name, id); busca por trecho pode exigir índice específico, conforme a estratégia de pesquisa.
- Pedidos: (store_account_id, created_at, id); avaliar índice parcial para Pix pendente.
- Fidelidade: índices correspondentes ao estabelecimento, cliente e filtro efetivamente utilizado.

Manter RLS e validação de sessão nas RPCs. Agregar faturamento, contagens e comissões no servidor com período e empresa autorizados. Não usar uma chave privilegiada no navegador para acelerar consultas.

## Carregamento e atualização

- Build verificado nesta sessão anterior à mudança de cor: maior chunk de aproximadamente 860,55 kB minificado (249,20 kB gzip); aviso de chunk acima de 500 kB. Precisa de análise de composição antes de atribuir o peso a uma biblioteca.
- As rotas já usam lazy. Painel.tsx importa todos os componentes administrativos e gráficos estaticamente: carregar abas pesadas sob demanda pode reduzir o download inicial do painel.
- QueryClientProvider está instalado, mas não foram encontrados useQuery/useInfiniteQuery nas telas: as buscas manuais não compartilham automaticamente o cache do React Query. Centralizar chaves por empresa, filtros e página antes de habilitar cache.
- useVisibleRefresh refaz consultas a cada 30 segundos com aba visível e ao recuperar foco/visibilidade. O painel refaz profissionais, serviços e produtos mesmo em outras abas. Restringir ao dado visível, deduplicar eventos e evitar requisições concorrentes.
- Realtime de agendamentos e serviços extras dispara recargas do histórico. Com paginação, atualizar/invalidate apenas lista e agregados afetados; não refazer todo o histórico a cada evento.
- Workbox faz precache de JS das rotas, incluindo telas ainda não abertas. Avaliar precache mínimo e cache das demais rotas sob demanda, preservando o comportamento offline desejado.

Ordem recomendada: separar indicadores das listas; paginação e filtros no servidor; cache e atualização seletiva; revisão de rolagem com dados longos; carregamento das abas sob demanda; limpeza de legado e referências públicas. Medir tempo até a tela utilizável, requisições e bytes com o mesmo usuário e volume de dados antes/depois. Não há medição de latência de produção nesta auditoria.

## Alteração aplicada

Botão Sair da conta do menu lateral com texto e ícone na cor destructive, incluindo fundo discreto ao passar o mouse. Nenhuma migration ou exclusão de legado aplicada nesta auditoria.
