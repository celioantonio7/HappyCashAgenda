# Dados para avaliação do design

Criados em 23/10/2026 na barbearia `barbearia-celio-teste`, projeto Supabase `iurkuipmknkrupntnkdl`.

- Rafael Almeida (Teste): conta de cliente, foto e cinco agendamentos próprios.
- Lucas Martins (Teste): conta de profissional vinculada à barbearia, foto, bio e comissão de 40%.
- Quatro clientes adicionais na lista privada do administrador, sem conta de acesso.
- Quatro serviços entre R$ 35 e R$ 75.
- 14 agendamentos entre 11 e 27/10/2026: sete pendentes, seis concluídos e um cancelado.

Nomes, contatos, valores e atendimentos são fictícios. Os registros concluídos possuem pagamento de exemplo marcado como pago para avaliar os indicadores; nenhuma cobrança foi realizada. Os campos de telefone ficaram vazios para evitar contato com números reais. E-mails usam o domínio reservado `.example`.

Fotos ilustrativas obtidas de `https://randomuser.me/api/portraits/men/32.jpg` e `https://randomuser.me/api/portraits/men/46.jpg`, copiadas para o bucket público existente `barber-photos`, dentro de `design-tests/<storeId>/`. Não são fotos das pessoas fictícias nomeadas.

O arquivo `design-test-data.json` registra os IDs exatos para localizar os dados e permitir uma remoção futura restrita a essas fixtures. Não contém senhas ou chaves de API. Nenhuma tabela, política ou migração foi alterada.
