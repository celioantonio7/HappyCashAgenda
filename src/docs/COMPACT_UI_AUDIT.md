# Auditoria e plano de compactação, 23/10/2026

## Escopo e restrições

Refatoração das telas existentes em React/Vite. Sem mudanças de schema, migrations, políticas RLS, autenticação, cálculos financeiros ou regras de agenda. Dados fictícios restritos à empresa de teste do proprietário celioantonio.dev@gmail.com. Snapshot antes das alterações: /tmp/agenda-before-compact-20261023.tgz.

## Rotas e estrutura proposta

| Rota/tela | Problema encontrado | Estrutura proposta |
| --- | --- | --- |
| / e /:businessSlug | Redirecionam para entrada/agenda; landing já não existe | Preservar redirecionamentos e links de empresa |
| /login, /auth, /:slug/login | Card adaptado à referência anterior | Preservar fluxo e altura natural |
| /reset-password | Formulário de recuperação | Preservar formulário, toque e foco |
| /agendamento, /booking, /:slug/agendamento | Introdução, margem de 48px no progresso, itens altos, calendário inteiro antes dos horários | Progresso compacto, linhas de serviço, datas rápidas + calendário opcional, barra de ações acessível |
| /meus-agendamentos, /my-appointments, /:slug/meus-agendamentos | Histórico inteiro e cards com detalhes expandidos | Próximos horários primeiro, resumo compacto, carregamento incremental e detalhes sob demanda |
| /painel, /admin: visão geral | KPIs, mais KPIs, alertas, gráficos e só depois agenda | Operação e Desempenho separados, agenda prioritária e resumo de até cinco itens |
| Painel: agendamentos | Três cards de resumo e cinco filtros abertos | Indicadores horizontais, filtros adicionais recolhíveis, linhas compactas, paginação |
| Painel: fila | Todos os cartões e ações expandidos | Linhas compactas, detalhes e ações preservados |
| Painel: profissionais | Cards mobile duplicam textos, credenciais e ações | Lista com foto, status e ações; campos completos no editor |
| Painel: comissões | Indicadores altos e múltiplos blocos por profissional | Indicadores compactos, detalhes por profissional sob demanda |
| Painel: serviços | Cards altos, sem campo de foto no schema | Linhas com preço/duração; foto opcional no Storage existente, sem coluna nova |
| Painel: produtos | Grade com imagens altas | Lista compacta no administrativo; grade de catálogo para cliente |
| Painel: vendas | Pedidos com todos os itens expostos | Resumo do pedido, itens em detalhes; confirmação de pagamento visível |
| Painel: clientes | Lista sem paginação; sem coluna de foto | Paginação, foto no Storage existente e edição contextual |
| Painel: fidelidade | Listas e programas abertos | Seções compactas, progresso e ações preservados |
| Painel: localizações | Cards e formulários longos | Linhas de contato com edição em diálogo |
| Painel: horários | Sete dias em coluna | Grade responsiva, controles existentes |
| Painel: identidade | Configurações longas | Grupos de configuração recolhíveis |
| Painel: public-page | Nome sugere landing removida, mas contém contatos/Pix/notificações usados | Renomear para Agendamento e contato, preservar todos os campos em grupos |
| /painel-profissional, /painel-barbeiro, /professional | Gráficos antecedem agenda, textos de abas somem em 360px | Agenda/Desempenho, três indicadores compactos e listas incrementais |
| /perfil e /:slug/perfil | Nome/telefone apenas, sem alterar foto, proprietário sai do shell administrativo | Mesmo shell por papel, foto editável e dados agrupados; contato/endereço nos metadados pessoais existentes |
| /produtos, /products, /:slug/produtos | Hero promocional alto e animação depende de produtos | Título de aplicativo, filtros horizontais, catálogo sem conteúdo invisível |
| /feed, /assinatura e versões com slug | Estados vazios por ausência de backend específico | Estados compactos, sem simular contratação ou posts reais |
| Aliases /barber/* e NotFound | Compatibilidade e recuperação de rota | Preservar destinos e links |

## Responsividade e componentes

Inspeção inicial no navegador em 360, 390 e 430px. Página de agendamento com os quatro serviços de teste chegou a 1147px de altura em 430px. Progresso inicia perto de 190px; a lista e o botão seguinte ficam abaixo da dobra. Sem overflow horizontal observado nesta entrada. Repetir medidas após carregar dados completos e comparar o painel antes/depois.

Menu administrativo já usa position:fixed no desktop, mas o conteúdo e abas devem continuar no painel à direita inclusive no perfil. Drawer acessível no mobile. Controles com alvos de 44px, cabeçalho compacto persistente, rodapé do cliente preservado. Diálogos mobile passam a folhas inferiores com altura limitada e rolagem interna, sem remover campos.

## Verificações de dados e concorrência

A publicação Realtime existente inclui appointments e appointment_services. Outras tabelas não estão publicadas: não alterar a publicação nesta tarefa. A disponibilidade pública não deve expor eventos com dados de outros clientes. Validar atualização da agenda entre sessões autorizadas e usar reconsulta limitada de disponibilidade para manter a seleção atualizada.

A RPC de agendamento existente usa pg_advisory_xact_lock por profissional/dia e assert_no_appointment_overlap. Testar duas confirmações concorrentes com credenciais de teste e limpar somente os registros dessa verificação. Não alterar a regra de conflito.

Fotos de serviços e cadastros privados de clientes podem usar caminhos estáveis no bucket product-images já existente; perfis pessoais possuem avatar_url, e fotos compactadas podem ser gravadas nesse campo sem conceder acesso de upload a clientes/profissionais. Endereço pessoal não tem coluna dedicada; os metadados pessoais existentes do usuário podem armazená-lo sem participar da autorização.

## Implementação e evidências

- Shell com altura dinâmica da janela, documento sem rolagem ao fundo, cabeçalho/menu/rodapé estáveis. Conteúdo administrativo e profissional rola nos painéis ativos; o assistente de agendamento rola dentro do card. Formulários em folhas inferiores no celular mantêm foco e rolagem próprios.
- Operação do proprietário usa três indicadores; indicadores financeiros e gráficos ficaram em Desempenho. Resumo diário limita cinco itens e mantém acesso à listagem completa. Listagens têm carregamento incremental, filtros avançados recolhidos e menus contextuais com nomes acessíveis.
- Profissional usa Agenda/Desempenho, filtro Hoje/Amanhã/Todos, status acessível, linhas de atendimento e detalhes com as ações originais. O profissional continua sem permissão para concluir um atendimento, conforme a regra anterior.
- Cliente usa serviços com fotos, datas rápidas, calendário completo opcional, horários compactos, revisão e contato recolhível. Forma de pagamento e confirmação ficam fora da área rolável do card. A confirmação continua chamando os mesmos handlers de pagamento local/Pix.
- A consulta de barbeiros do agendamento pedia `*`, incluindo uma coluna restrita, causando HTTP 403 e equipe vazia. A tela passou a solicitar apenas id, nome, telefone, foto e bio, sem alterar permissões.
- Atualização de disponibilidade não apaga os horários durante a consulta; respostas antigas são descartadas. Consulta inicial com erro bloqueia a seleção até tentar novamente. A regra de conflito permanece no banco.
- Perfil pessoal permite foto, nome, telefone e endereço opcional nos três papéis. Fotos compactadas ficam em profiles.avatar_url, fora dos JWTs. Endereço usa metadados pessoais e nunca é consultado para conceder acesso. Fotos públicas dos profissionais continuam sendo gerenciadas pelo proprietário no cadastro da equipe.
- Não foram alterados schema, migrations, publicação Realtime, RLS, autenticação, pagamento ou assinatura. Cadastros e reservas fictícios foram inseridos somente na barbearia de teste autorizada.

### Responsividade

42 combinações de área administrativa e largura (14 áreas em 360/390/430px) inspecionadas no navegador. Três casos de overflow interno foram identificados e corrigidos; os três foram novamente verificados. Outras 24 combinações de cliente/profissional e largura foram verificadas no build de produção. Em todas essas telas, o documento ficou com a altura da janela e sem overflow horizontal do conteúdo principal. Menu fixo e conteúdo à direita também conferidos em 1440px.

### Fluxos e dados

- Concorrência real: duas RPCs autenticadas, simultâneas, para o mesmo profissional/intervalo. Uma reserva aceita e uma recusada com a mensagem de horário indisponível. Reserva temporária removida.
- Realtime com três sessões autenticadas: proprietário, cliente e funcionário receberam UPDATE da remarcação. A disponibilidade pública refletiu o bloqueio sem expor dados de outro cliente.
- Três interfaces abertas em contextos isolados receberam uma mudança de 09:00 para 12:30 sem recarregar as páginas. Horário original restaurado após a verificação.
- Foto e complemento de endereço do cliente de teste foram salvos pela interface e persistiram após reload. Confirmado que os bytes da foto permanecem fora dos metadados/JWT.
- Foto de serviço enviada pelo editor administrativo com as políticas existentes; gravação concluída sem erros.
- Fluxo completo de reserva pela interface, incluindo confirmação de pagamento no local. Uma reserva fictícia às 12:30 de 24/10 permaneceu como dado de teste; uma segunda reserva de verificação às 13:00 foi removida.
- Atualização do PWA exercitada pelo botão Atualizar aplicativo. A versão antiga só é substituída após essa ação, preservando formulários em andamento.
- Google OAuth, envio de mensagens, cobrança Pix e assinaturas externas não foram acionados.

O catálogo não publicado no Realtime é reconsultado a cada 30 segundos com a tela visível e ao recuperar foco. A disponibilidade de horários é reconsultada a cada 10 segundos, pois eventos privados de outros clientes não devem ser expostos. As alterações de agendamentos autorizadas chegam por Realtime.

Dados finais de teste: três barbeiros com conta, cinco clientes privados com foto (três com conta), cinco serviços ilustrados, quatro produtos ilustrados e 27 agendamentos, dos quais 15 em 24/10/2026. IDs em scripts/design-test-data.json, sem senhas nem chaves de API.

## Ajustes adicionais solicitados nas referências

No profissional, os três contadores são botões que filtram a agenda. A barra duplicada Abertos/Concluídos/Cancelados/Metas e o seletor de status foram removidos. Agenda, Desempenho e Metas são três áreas do mesmo componente e mantêm a URL. O gauge oficial de https://bklit.com/docs/components/gauge-chart foi integrado em Metas para mostrar a taxa de conclusão dos atendimentos do mês, usando contagens reais já consultadas. Não há objetivo financeiro nem meta de produtividade inventados. A fidelidade existente continua respeitando o acesso atual do banco.

O código MIT do registry gauge-chart foi isolado em src/components/bklit/gauge, sem substituir os gráficos existentes. Dependências já estavam instaladas; valores foram localizados para pt-BR.

A tela do cliente passou a seguir a imagem Meus agendamentos: Novo Agendamento, indicadores clicáveis, Próximos/Histórico/Fidelidade, três linhas iniciais com data/hora, foto do profissional, duração, preço e status, além de Ver todos os agendamentos. Detalhes, remarcação, cancelamento e agendar novamente permanecem disponíveis no diálogo contextual. A aba de fidelidade não abre outra página.

As seis áreas internas de cliente/profissional foram conferidas em 360/390/430px (18 combinações), verificando que não mudam a rota e não rolam o documento. Um overflow de 6px no painel de gráficos em 360px foi identificado e corrigido com trilhas de grid minmax(0,1fr). Os contadores de status foram exercitados e o gauge SVG renderizado. O detalhe do cliente manteve os botões Remarcar e Cancelar.

Verificação final: TypeScript sem erros, build de produção e PWA gerados. Lint terminou com zero erros e 58 avisos, incluindo os avisos já existentes e exports do componente oficial Bklit. A correção do painel de desempenho foi novamente conferida no build final, sem CSS de teste. Arquivos temporários contendo credenciais de provisionamento foram removidos.

### Feed visual preview

The Feed route now shows five explicitly fictional posts with existing local illustrative photos. The circular fan supports swipe, previous/next buttons, direct pagination and keyboard arrows; selecting the central card opens a Radix details dialog. No publications, likes, metrics or offers are persisted. A real owner publishing workflow and store-scoped content persistence remain future work, not part of this preview.

Staff weekly chart weekday labels use explicit three-letter Portuguese abbreviations to avoid overlapping full names on mobile. The Bklit bar axis retains seven labels at its smallest breakpoint.
