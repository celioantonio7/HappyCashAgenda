# Acesso do dono da barbearia

O login usa a mesma conta Supabase de clientes e donos. A permissão administrativa vem de `user_roles`, nunca dos metadados enviados no cadastro público. O dono também precisa de `store_accounts` vinculado ao produto `happycashagenda`, com assinatura ativa ou acesso de teste ainda válido.

A conta `celioantonio.dev@gmail.com` foi vinculada à empresa `barbearia-celio-teste`. O acesso de teste termina em 30/10/2026 às 15:13, no horário de Brasília. A senha existente foi preservada. Não houve cobrança ou assinatura marcada como paga.

## Fluxo de login

- `/login`: clientes e donos usam a aba Minha conta.
- Dono autorizado: redirecionamento automático para `/painel`.
- Cliente: retorno à página da empresa ou ao agendamento em andamento.
- Funcionário: usa o acesso profissional já existente, com sessão expirada após 12 horas.
- Ausência de empresa, erro de consulta ou assinatura vencida bloqueia o painel e não muda o papel do usuário.

As políticas do banco restringem os dados administrativos à empresa do dono. Clientes não podem editar permissões, empresa, assinatura ou prazo de teste. Os hashes das senhas profissionais não são expostos na API.

## Alterações de banco

`20261023180635_agenda_owner_access.sql` é uma migration aditiva para a estrutura antiga que já existia no projeto `iurkuipmknkrupntnkdl`. As migrations anteriores foram mantidas nos caminhos originais. `20261023181622_agenda_profile_recovery_fix.sql` corrige a compatibilidade da recuperação de conta com o alias `profiles.user_id`. As tabelas antigas `clients` e `products` e seus dados foram preservados, sem atribuir registros antigos a uma empresa por suposição.

A migration nova incorpora os recursos de fila de `20260525124500`, incluindo a correção do identificador SQL reservado `position`. No banco existente, as duas versões foram registradas na mesma transação após executar as operações. O histórico local e remoto foi conferido com `supabase migration list --linked`.

Para instalar do zero, aplique primeiro as migrations anteriores a `20260525124500` e depois `20261023180635_agenda_owner_access.sql`, que já incorpora a fila. Não execute a migration antiga de fila antes de criar suas tabelas de pré-requisito. Esse histórico legado não é uma sequência autossuficiente para `db reset` sem essa ordenação.

`scripts/provision-test-owner.sql` é uma operação restrita ao operador para a conta de teste acima. Executá-la novamente renova o teste por sete dias; ela não deve ser executada pelo navegador nem durante o cadastro público.

## Verificações

- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run lint`
- `npm run build`
- `supabase/tests/owner_access.sql`, executado como operador num banco com a migration aplicada. As fixtures são revertidas por `ROLLBACK`.

O teste SQL cobre dono, cliente, isolamento entre empresas, impedimento de autopromoção, proteção dos hashes, sessão profissional, agendamento, remarcação, estoque, preço calculado no servidor e expiração do teste.

`.env.local` é suportado pelo Vite e permanece ignorado pelo Git. `VITE_AGENDA_DEMO=false` permite testar dados reais. A conexão do CLI foi usada porque o conector do chat estava autorizado em outra organização. Nenhuma chave de serviço deve receber prefixo `VITE_`.
