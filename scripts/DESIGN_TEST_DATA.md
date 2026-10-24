# Dados para avaliação do design

Criados em 23/10/2026 na barbearia `barbearia-celio-teste`, projeto Supabase `iurkuipmknkrupntnkdl`.

- Rafael Almeida (Teste): conta de cliente, foto e cinco agendamentos próprios.
- Lucas Martins, Gabriel Oliveira e Matheus Souza (Teste): três contas de profissionais vinculadas à barbearia, com foto, bio e comissão fixa de exemplo.
- Cinco clientes na lista privada, todos com foto. Rafael, Bruno e André também têm conta de cliente para testar o aplicativo.
- Cinco serviços entre R$ 20 e R$ 75, com fotos ilustrativas no Storage existente. Quatro produtos ilustrados, incluindo estoque baixo e esgotado.
- 27 agendamentos fictícios. Há 15 reservas para amanhã, 24/10/2026, incluindo uma confirmação feita pela interface no teste de ponta a ponta.

Nomes, contatos, valores e atendimentos são fictícios. Os registros concluídos possuem pagamento de exemplo marcado como pago para avaliar os indicadores; nenhuma cobrança foi realizada. Os telefones de exemplo usam DDD 00, inválido para contato real. Endereços são identificados como fictícios. E-mails usam o domínio reservado `.example`.

Fotos ilustrativas obtidas de `https://randomuser.me/api/portraits/men/32.jpg` e `https://randomuser.me/api/portraits/men/46.jpg`, copiadas para o bucket público existente `barber-photos`, dentro de `design-tests/<storeId>/`. Não são fotos das pessoas fictícias nomeadas.

O arquivo `design-test-data.json` registra os IDs exatos para localizar os dados e permitir uma remoção futura restrita a essas fixtures. Não contém senhas ou chaves de API. Nenhuma tabela, política ou migração foi alterada.

As fontes das novas fotos estão em `public/test-design/sources.json`. Fotos de serviços e clientes ficam em `product-images/<storeId>/services/<id>.webp` e `product-images/<storeId>/clients/<id>.webp`. O proprietário pode alterá-las nos editores existentes. As senhas de teste não são armazenadas neste documento.
