# Proposta de publicação no Feed

Status: análise, sem implementação ou alteração no banco.

## Administrador

Adicionar Publicações ao grupo Comercial. Conteúdo abre à direita no painel existente. Lista compacta com abas Publicados, Rascunhos e Arquivados; botão Nova publicação. Editor em folha inferior no mobile e diálogo no desktop: uma foto com prévia e recorte, texto alternativo, título, categoria e texto. Ações Salvar rascunho e Publicar; edição e arquivamento de posts existentes. Prévia reutiliza o card do Feed. Confirmar descarte de alterações pendentes.

## Cliente e funcionário

Cliente vê apenas publicações publicadas da barbearia resolvida pelo contexto da aplicação, ordenadas da mais recente para a mais antiga. Carrossel em leque existente, detalhes por toque e paginação incremental. Funcionário pode ler, sem poder publicar por padrão. Curtidas, comentários e notificações ficam fora da primeira versão.

## Persistência e acesso a implementar

Antes de qualquer migração, inspecionar o esquema e as políticas reais no projeto Supabase correto. Proposta de tabela dedicada com id, store_account_id, author_user_id, title, category, body, image_path, image_alt, status, published_at, created_at e updated_at. Referenciar a tabela de estabelecimentos existente. Backend valida vínculo do proprietário; store_account_id e autoria não podem ser usados como prova de autorização apenas por terem sido enviados no formulário.

RLS: somente proprietário da barbearia gerencia registros; leitores acessam somente status publicado e o estabelecimento autorizado pelo fluxo de leitura do aplicativo. Definir explicitamente se o Feed exige login; a rota de prévia atual não é evidência de uma política de acesso aprovada. Rascunhos e imagens de rascunho permanecem privados, com acesso assinado por usuário autorizado. Upload deve respeitar vínculo do proprietário e regras de caminho por estabelecimento; acesso a imagens publicadas segue o mesmo público dos posts. Validar formato, tamanho e decodificação de imagens. Nunca liberar o bucket inteiro para tornar um post público.

## Validação antes de liberar

Testar rascunho → publicação → edição → arquivamento; falha de upload e salvamento, exclusão de arquivos órfãos, isolamento entre duas barbearias, cliente sem acesso a rascunho, funcionário sem escrita, rolagem interna e toque em 360/390/430 px. Remover a coleção fictícia da tela normal quando a persistência real estiver pronta; manter demonstração somente em uma prévia explicitamente identificada.
