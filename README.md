# EDGY Gym Logger

Aplicação web mobile-first para registar treinos de musculação, acompanhar cargas e medidas corporais e partilhar conquistas de forma voluntária.

## Tecnologia

- HTML, CSS e JavaScript, sem framework nem backend próprio.
- Supabase Auth partilhado com a EDGY Games.
- Tabelas `public.gym_*` próprias no projeto Supabase EDGY, com Row Level Security.
- GitHub Pages ou qualquer outro alojamento estático compatível.
- Manifesto PWA e ícone da aplicação.

## Identidade visual

A aplicação segue a identidade EDGY Game Hub: fundo roxo-escuro, gradiente rosa/magenta, marca **EDGY** com subtítulo **GYM LOGGER**, monograma **EG** no ícone PWA, avatar e sino de notificações no cabeçalho, e navegação inferior com botão central destacado.

## Navegação

**Feed · Histórico · Treino · Exercícios · Perfil**

### Treino
Começar/retomar treino, adicionar exercícios, criar séries com peso, repetições e RPE, alternar série normal/aquecimento/dropset, marcar séries concluídas e terminar a sessão. Ao adicionar um exercício a primeira série é preenchida com os valores da última sessão concluída, quando existem.

Temporizador de descanso ajustável (45–180 segundos), com contagem preservada após recarregar a página. Modelos reutilizáveis permitem iniciar sessões com exercícios e séries predefinidos.

### Histórico
Cada sessão concluída apresenta duração, volume, séries, exercícios, detalhes e recordes calculados por exercício. Pode ser partilhada no Feed apenas por opção do utilizador. Sessões concluídas podem ser guardadas como modelos.

### Exercícios
84 exercícios de base, filtros por grupo muscular, exercícios personalizados, histórico e gráfico de carga máxima por exercício, com estimativa de 1RM.

### Perfil
Fotografia/nome/@ associados à EDGY, totais, gráfico semanal, calendário, medidas e respetiva evolução. Medidas adicionais: peso, peito, cintura, abdómen, ombros, braços, coxa, gémeos e glúteo.

### Feed
Desativado por defeito. Ao aderir, o utilizador passa a ter um perfil de comunidade visível para outros utilizadores autenticados: nome e @. Permite seguir atletas, gostar de publicações, partilhar treinos e publicar objetivos. Os treinos concluídos aparecem no perfil público do atleta (incluindo treinos antigos não publicados), com top sets no resumo e todas as séries num painel expansível. Treinos em curso e medidas continuam privados. O Feed apenas recebe treinos publicados voluntariamente.

## Base de dados

Tabelas principais: `gym_exercises`, `gym_workouts`, `gym_workout_exercises`, `gym_sets`, `gym_measurements`.

Modelos: `gym_templates`, `gym_template_exercises`.

Tabelas sociais: `gym_social_profiles`, `gym_follows`, `gym_feed_posts`, `gym_post_likes`.

**Importante:** o projeto Supabase já foi atualizado; estas tabelas são usadas pela aplicação em produção e não são criadas automaticamente pela publicação estática.

## Segurança

- A chave no cliente é **publishable**, não uma chave administrativa.
- Operações de treinos e medidas são restritas ao dono pelas políticas RLS. Uma RPC de leitura permite a utilizadores autenticados ver apenas treinos concluídos de perfis públicos; as tabelas base não recebem permissões de leitura indiscriminadas.
- Os perfis do Feed só são públicos após ativação explícita.
- Uma publicação não concede acesso aos registos privados subjacentes.
- As tabelas da EDGY Games não foram modificadas.

## Estado / próximas melhorias

A validar no navegador: navegação completa, inserção de séries e RPE, PRs e interações sociais entre duas contas distintas.

Ainda não implementado: fotos de progresso, sincronização offline, personalização avançada dos modelos, login por link de email e testes automatizados de ponta a ponta.

As notificações da Gym Logger mostram novos seguidores, gostos e PRs; o estado de leitura é guardado localmente por dispositivo, sem sincronização entre dispositivos nesta versão.

### Publicação

O repositório tem ficheiros estáticos na raiz, preparados para GitHub Pages. Confirmar o URL de publicação no painel do GitHub antes de o divulgar.

## Testes manuais prioritários

1. Entrar com conta EDGY já existente, confirmar avatar/nome/@.
2. Iniciar treino, adicionar exercício e séries, marcar repetições/cargas, verificar persistência após atualização.
3. Experimentar série de aquecimento, dropset, RPE e temporizador de descanso.
4. Concluir treino, verificar volume e PRs, guardar modelo no Histórico e iniciar novo treino pelo modelo.
5. Adicionar medidas em duas datas e verificar calendário e gráficos.
6. Com segunda conta, ativar Feed e testar seguir, gostar, partilhar e notificações.
7. Confirmar que o histórico completo e medidas não ficam visíveis na outra conta.

## Atualização — comunidade e identidade EDGY

- As publicações podem receber **gostos e respostas**. O autor da resposta pode eliminá-la, e o autor do post pode moderar respostas. A política RLS impede acesso a comentários de posts privados.
- O **Feed pessoal** aparece no Perfil, e os perfis públicos de outros atletas mostram as respetivas publicações. Seguidores e A seguir aparecem no Perfil.
- O botão **+ Publicar** abre um modal para metas ou frases livres; a privacidade configura-se em Editar Perfil.
- O Perfil mostra o dia de criação da **conta EDGY** e o **XP/nível partilhado**. O email não aparece na área pública; é visível apenas ao próprio na edição de perfil.
- **XP Gym:** por agora não atribui XP novo; apenas apresenta o saldo partilhado com a EDGY Games. Antes de ativar ganhos por treino, definir limites que evitem spam e duplicação.
- Imagens de perfil com enquadramento corrigido no cabeçalho; para ajustar a fotografia original, usar o editor de recorte do Perfil.
- Modais EDGY para criar exercícios/treinos e confirmar eliminação, partilha e conclusão.

### Testes recomendados

1. Com duas contas públicas, publicar uma frase, gostar, responder, apagar uma resposta e confirmar a notificação ao autor.
2. Consultar o Feed individual no Perfil e abrir o perfil de outro atleta.
3. Confirmar que o email não aparece ao visitar perfis públicos e que o XP corresponde ao da EDGY Games.
4. Editar foto e verificar o avatar no PC e no telemóvel; confirmar que a foto não fica cortada.
5. Iniciar treino, escolher exercício e concluir sessão sem caixas nativas do browser.

## XP EDGY — Recompensas de treino (novembro de 2026)

O XP é único no ecossistema: o XP da Gym Logger soma-se diretamente a `profiles.xp`, utilizado também pela EDGY Games. O cálculo é feito **na base de dados**, quando o utilizador termina uma sessão. Não é suficiente criar uma publicação nem preencher séries por concluir.

| Critério | Recompensa |
| --- | ---: |
| Sessão válida (mín. 15 min desde o início real; 3 séries de trabalho concluídas; 2 exercícios diferentes; 300 kg de volume) | +20 XP |
| Volume de trabalho (sem aquecimento) | +5 XP por 1.000 kg, até +30 XP por sessão |
| Novo PR de carga (comparado com sessões anteriores, com subida mínima de 2,5 kg) | +15 XP por exercício, até 3 PR por sessão |
| Limites | Até 100 XP/sessão, 120 XP e 2 sessões recompensadas em qualquer período de 24 h |

Não são atribuídos XP retroativos por treinos terminados antes da migração. A tabela `gym_xp_awards` guarda uma entrada por treino, com detalhamento e política RLS de leitura própria. Triggers na base de dados impedem reabrir treinos concluídos ou alterar as respetivas séries. As cargas/repetições que entram no cálculo são limitadas para reduzir abusos. Um treino que não cumpra os requisitos pode ser concluído normalmente, mas recebe 0 XP.

## Marca e navegação

- Nome de aplicação e separador: **EDGY — Gym Logger**.
- Símbolo **E** no logótipo e ícone, com **GYM LOGGER** em letras pequenas e gradiente EDGY.
- A lista completa de exercícios tem deslocação independente no desktop; no telemóvel continua a deslocação normal da página, sem limite artificial de 150 exercícios.
- Os dados de treino continuam privados e apenas o utilizador vê o detalhe e o XP atribuído em cada sessão.

### Testes após publicação

1. Na biblioteca de Exercícios, percorrer até ao último item com rato e no telemóvel.
2. Iniciar um treino, registar séries normais, completar e verificar se o XP surge no Histórico.
3. Para testar XP positivo, cumprir os requisitos mínimos. Testar também uma sessão inferior a 15 min, que deve receber 0 XP.
4. Atualizar a página e confirmar que a recompensa não se repete.
5. Verificar na EDGY Games que o total de XP e nível reflete a recompensa quando atualizar os dados da conta.

### Top sets e histórico público (novembro de 2026)
Os posts de treinos mostram no texto apenas a melhor série de trabalho por exercício (maior carga, desempate por repetições), com opção de expandir e consultar todas as séries. Os perfis públicos listam todos os treinos concluídos, mesmo sem publicação, com paginação de 12 sessões. Tornar o perfil privado oculta estes treinos de outros utilizadores; as medidas e os treinos ativos não são públicos.
