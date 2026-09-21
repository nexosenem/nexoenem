# NEXO ENEM

Plataforma de estudos para o ENEM conectada a **Cloudflare + GitHub + Supabase**.

## Estado atual

- acervo bruto com 3.060 registros de questões, cobrindo 2009 a 2025
- 2.891 questões ativas após a quarentena automática de itens com alternativas inválidas
- 160 questões visuais ativas com imagem associada
- gabaritos privados no banco e correção de respostas por RPC
- sessões por área, matéria, dificuldade e foco adaptativo
- NEXO Core com recomendação de estudo baseada em desempenho
- Radar ENEM e priorização de conteúdos
- revisão espaçada, caderno de erros, questões salvas e anotações pessoais
- simulados, plano semanal, modo foco e grupos de estudo
- redações salvas com análise automática orientativa das cinco competências
- 51 materiais NEXO publicados em HTML, com expansão de cobertura em andamento
- feedback, comentários, denúncias e painel administrativo
- gamificação, avatar, missões, loja e ranking
- modo claro/escuro, PWA e layout responsivo para desktop e mobile

A antiga área de videoaulas está aposentada da navegação atual. O foco de conteúdo é **Aulas NEXO + PDFs/resumos + treino ligado às questões**.

## Qualidade do banco de questões

Itens com menos de cinco alternativas utilizáveis ficam fora da rotação até serem recuperados a partir da fonte oficial. Eles não são apagados, para preservar rastreabilidade.

O frontend também ignora questões inativas ao retomar sessões antigas ou abrir revisões. Questões visuais exigem uma fonte de imagem válida antes de serem tratadas como visuais.

Ainda existe uma fila de normalização do acervo histórico para reconciliar duplicações entre diferentes cadernos/cores do ENEM sem perder itens válidos.

## Redação

A nota exibida pelo sistema é uma **estimativa automática de treino**, não uma correção oficial do Inep. A análise usa sinais de estrutura, aderência ao tema, argumentação, coesão, variedade lexical e elementos da proposta de intervenção, com penalidades para repetição excessiva e textos curtos.

O objetivo do recurso é orientar a próxima revisão. Uma camada de correção humana pode ser adicionada futuramente para avaliações mais próximas da correção oficial.

## Conteúdo

Os materiais publicados atualmente cobrem principalmente Matemática e um conjunto inicial de Português, Literatura, Língua Estrangeira, História, Geografia, Biologia, Física e Química.

A expansão prioritária inclui Filosofia, Sociologia, Artes, Educação Física, Tecnologia e Comunicação e conteúdos interdisciplinares de Humanas e Natureza.

## Segurança

- Row Level Security (RLS) está habilitado nas tabelas sensíveis.
- O gabarito não é legível diretamente pelo cliente.
- RPCs administrativas verificam privilégio de administrador.
- Funções internas de trigger não são expostas ao cliente.
- Views internas do Radar não ficam disponíveis para leitura direta pelo navegador.
- Edge Functions administrativas e de arquivos exigem autenticação.

## PWA e cache

O Service Worker usa estratégia network-first para HTML/CSS/JavaScript principal e stale-while-revalidate para recursos estáticos. O cache de produção é versionado junto dos assets do deploy para evitar servir uma versão antiga do aplicativo depois de uma atualização.

## Deploy

Branch de produção: `main`.

O Cloudflare conectado ao GitHub deve publicar automaticamente os commits da branch principal.
