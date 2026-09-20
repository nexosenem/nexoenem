# NEXO ENEM

Plataforma de estudos conectada a **Cloudflare + GitHub + Supabase**.

## Estrutura atual

- 500 questões reais extraídas dos cadernos ENEM enviados
- 125 questões em cada grande área
- 104 questões com recurso visual genuíno, revisado e armazenado
- login e cadastro via Supabase Auth
- progresso sincronizado por usuário
- gabaritos privados no banco
- correção de questão feita por RPC segura
- sessões fixas por área/matéria/dificuldade
- modo de questões visuais
- treino adaptativo pelos temas com maior taxa de erro
- redações salvas por usuário
- videoaulas com upload para Supabase Storage
- feedback integrado ao painel do administrador
- ranking sem exposição de e-mail
- modo claro/escuro
- layout desktop e mobile com navegação inferior
- manifesto de web app para uso no celular

## Banco de dados

Projeto Supabase: `xeesttjsvscuqkeytmdz`.

Tabelas principais:
`profiles`, `questions`, `question_keys`, `question_attempts`, `essays`, `videos`, `feedback`.

O gabarito não fica em `questions`. Ele é mantido em `question_keys`, sem permissão de leitura pelo cliente. O navegador envia a alternativa para `submit_answer()` e recebe somente o resultado após a resposta.

## Administração

A área administrativa só é renderizada para perfis com `role = 'admin'`.
A identidade do proprietário configurada no banco recebe esse papel no cadastro; os demais usuários entram como `student`.

## Recursos visuais

As 104 questões com recurso visual genuíno possuem uma imagem WebP revisada armazenada no Supabase. O front carrega essa imagem diretamente; PDF.js e a Edge Function `pdf-proxy` ficam apenas como fallback. Questões sem recurso gráfico verdadeiro são exibidas somente como texto e nenhuma questão avança automaticamente por falha de imagem.

## Deploy

Branch de produção: `main`.

O Cloudflare conectado ao GitHub deve publicar automaticamente os commits da branch principal.
