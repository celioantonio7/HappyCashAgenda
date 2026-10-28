# Notificações de agendamentos

A migração `20261027144000_appointment_notifications.sql` grava eventos novos de confirmação, remarcação, cancelamento e conclusão. Destinatários: cliente, proprietário e profissional vinculado ao atendimento. Uma conta que acumula os papéis de dono e profissional recebe uma entrada. Na troca de profissional, o anterior também recebe o evento de remarcação.

A caixa de entrada usa RLS por destinatário. Apenas `read_at` pode ser atualizado pelo cliente autenticado. Os eventos são criados pelo trigger privado; o navegador não pode inserir notificações. A leitura sincroniza entre aparelhos. Não há recriação do histórico anterior à migração.

`python3 scripts/test-appointment-notifications.py` verifica eventos, deduplicação e permissões num PostgreSQL descartável via Docker. O teste não usa credenciais de produção.

O sino atualiza por Realtime, ao retornar à aba e a cada 30 segundos como recuperação. `usePushNotifications` entrega pelo service worker quando disponível e trata navegadores sem suporte. Permissão de notificações não equivale a assinatura Web Push: notificações com o aplicativo fechado dependem de implantação de um emissor no servidor, assinaturas dos aparelhos e configuração VAPID.

## Entrega com o aplicativo fechado

A migração `20261027145000_native_web_push.sql` cria assinaturas privadas por aparelho, uma fila por destinatário e funções de inscrição, leitura de lotes com bloqueio/lease e confirmação do resultado. Inscrições de profissionais sem conta Auth usam a sessão de profissional validada no banco. O dispositivo deve permitir notificações; no iOS, o aplicativo precisa estar instalado.

Configure a mesma chave pública em `VITE_AGENDA_VAPID_PUBLIC_KEY` no build e `AGENDA_VAPID_PUBLIC_KEY` na Edge Function. A chave privada fica somente no segredo `AGENDA_VAPID_PRIVATE_KEY`. Outros segredos do emissor:

- `AGENDA_VAPID_SUBJECT`: contato VAPID, por exemplo `mailto:suporte@dominio.com`.
- `AGENDA_PUBLIC_APP_URL`: URL base com o subdiretório da aplicação.
- `AGENDA_PUSH_CRON_SECRET`: valor aleatório usado apenas pelo agendador e pela função.

Implante `dispatch-agenda-push`. A configuração `verify_jwt=false` é intencional: a função exige `x-agenda-cron-secret` e rejeita requisições sem o segredo. Agende um POST para `/functions/v1/dispatch-agenda-push` a cada minuto com esse cabeçalho. O corpo não aceita mensagens nem destinatários. O worker usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` fornecidos pelo ambiente da Edge Function.

`public/push-sw.js` recebe o evento push, mostra o aviso do sistema e abre o destino validado dentro do escopo do aplicativo. O worker envia eventos novos de agendamento e cadastro de cliente. Antes de ler a fila, gera lembretes habilitados de 24 horas, 2 horas e 30 minutos usando `America/Sao_Paulo`. Chaves únicas impedem duplicação por atendimento, horário, antecedência e destinatário. O processamento tolera atraso de até cinco minutos na janela do lembrete. Remarcações geram nova chave; lembretes ainda não enviados para o horário antigo deixam de ser entregues.

A entrega ao sistema depende da rede, das permissões e das regras de bateria do aparelho. O teste SQL verifica geração e segurança da fila, mas a entrega nativa deve ser confirmada em um PWA instalado após configurar e implantar o emissor. O desligamento da sessão deve chamar `removeNativePushForSession` antes de remover a identidade autenticada.
