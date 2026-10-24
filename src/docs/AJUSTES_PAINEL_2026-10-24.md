# Ajustes do painel em 24/10/2026

## Onde encontrar

- `/painel?tab=commissions`: gráfico Bklit de comissões por profissional, entre os indicadores e a lista. Usa o mesmo cálculo da lista, considerando os serviços concluídos do mês. Não existe informação de baixa/pagamento da comissão; o gráfico não simula esse dado.
- `/painel?tab=product-sales`: comparação de pagamentos confirmados de produtos, entre indicadores e pedidos recentes. Seleção de 7 ou 30 dias. Busca também o período anterior, respeitando empresa e pagamentos confirmados, com ordenação estável e páginas de 500 registros. Pedidos cancelados são excluídos. Estados de carregamento, vazio e erro com nova tentativa.
- `/painel?tab=overview`, seção Desempenho: desempenho por profissional em barras verticais segmentadas Bklit. Descrição corrigida para atendimentos concluídos.
- `/painel?tab=branding`: cores principal e de destaque agora aplicadas aos controles, navegação e gráficos. Sugestões de cores e seletor livre. Texto de botões e item ativo ajusta o contraste conforme a luminância da cor escolhida. Alterações usam a prévia e o salvamento da empresa já existentes.

Os gráficos novos começam recolhidos no mobile. Os dados de Comissões continuam vindo da consulta de agendamentos já usada pelo painel; a migração futura desse histórico para paginação deve separar os agregados financeiros da lista, conforme a auditoria anterior.

## Interações

Os oito indicadores de Visão geral/Desempenho agora são links de toda a superfície, acessíveis por teclado. Abrem agendamentos por hoje/semana/mês, concluídos, cancelados, Pix pendente ou produtos com estoque baixo. Os filtros abertos pelo card ficam visíveis e podem ser limpos.

Fila e Agendamentos: posições e quantidades estáticas; animação preservada em preços e durações. Inclui os indicadores da área Meus agendamentos e a contagem do componente Carregar mais.

A área de conteúdo usa uma seta verde flutuante clicável em vez da barra visível. A seta aponta para baixo enquanto há conteúdo abaixo e para cima ao chegar ao fim. Some quando não há conteúdo excedente. Toque, roda do mouse e teclado continuam usando a rolagem nativa. Movimento reduzido desativa a animação. O conteúdo externo dos painéis deixa de competir com as abas; as grades de horários de agendamento/remarcação não têm mais rolagem própria.

## Limpeza da landing

Removidos nove componentes sem importação em `components/landing`, o Header antigo e duas imagens sem consumidores. Campos de capa, imagens e títulos da landing e mensagem de fechado foram retirados do formulário administrativo. Logotipo, tamanho, contato, regras de atendimento, Pix e texto Sobre nós permanecem. A imagem usada no Feed foi preservada. Campos de compatibilidade do armazenamento não foram apagados do banco.

## Verificação

Build e TypeScript aprovados; lint sem erros, mantendo 58 avisos existentes. Testes locais no navegador verificaram aplicação da cor azul e contraste branco, barra escondida e seta invertida no final. Em uma consulta interceptada só no navegador de teste, 502 registros em duas páginas incluíram um pedido cancelado: o gráfico exibiu R$ 502,00, excluindo o cancelado de R$ 1.000,00. Análise inicialmente recolhida em 390 × 844 e sem transbordamento horizontal.

Não foi realizada gravação de tema nem validação financeira com uma sessão administrativa do banco ativo nesta rodada. Não houve migration de banco.
