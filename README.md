# EDGY Gym Logger

Aplicação web mobile-first para registar treinos de musculação, acompanhar cargas e medidas corporais e partilhar conquistas de forma voluntária.

## Tecnologia

- HTML, CSS e JavaScript, sem framework nem backend próprio.
- Supabase Auth partilhado com a EDGY Games.
- Tabelas `public.gym_*` próprias no projeto Supabase EDGY, com Row Level Security.
- GitHub Pages ou qualquer outro alojamento estático compatível.
- Manifesto PWA e ícone da aplicação.

## Navegação

**Feed · Histórico · Treino · Exercícios · Perfil**

### Treino
Começar/retomar treino, adicionar exercícios, criar séries com peso, repetições e RPE, alternar série normal/aquecimento/dropset, marcar séries concluídas e terminar a sessão. Ao adicionar um exercício a primeira série é preenchida com os valores da última sessão concluída, quando existem.

### Histórico
Cada sessão concluída apresenta duração, volume, séries, exercícios, detalhes e recordes calculados por exercício. Pode ser partilhada no Feed apenas por opção do utilizador.

### Exercícios
84 exercícios de base, filtros por grupo muscular, exercícios personalizados, histórico e gráfico de carga máxima por exercício, com estimativa de 1RM.

### Perfil
Fotografia/nome/@ associados à EDGY, totais, gráfico semanal, calendário, medidas e respetiva evolução. Medidas adicionais: peso, peito, cintura, abdómen, ombros, braços, coxa, gémeos e glúteo.

### Feed
Desativado por defeito. Ao aderir, o utilizador passa a ter um perfil de comunidade visível para outros utilizadores autenticados: nome e @. Permite seguir atletas, gostar de publicações, partilhar treinos e publicar objetivos. O histórico completo e as medidas nunca são tornados públicos automaticamente.

## Base de dados

Tabelas principais: `gym_exercises`, `gym_workouts`, `gym_workout_exercises`, `gym_sets`, `gym_measurements`.

Tabelas sociais: `gym_social_profiles`, `gym_follows`, `gym_feed_posts`, `gym_post_likes`.

**Importante:** o projeto Supabase já foi atualizado; estas tabelas são usadas pela aplicação em produção e não são criadas automaticamente pela publicação estática.

## Segurança

- A chave no cliente é **publishable**, não uma chave administrativa.
- Operações de treinos e medidas são restritas ao dono pelas políticas RLS.
- Os perfis do Feed só são públicos após ativação explícita.
- Uma publicação não concede acesso aos registos privados subjacentes.
- As tabelas da EDGY Games não foram modificadas.

## Estado / próximas melhorias

A validar no navegador: navegação completa, inserção de séries e RPE, PRs e interações sociais entre duas contas distintas.

Ainda não implementado: templates reutilizáveis, notificações, fotos de progresso, sincronização offline, temporizador de descanso, login por link de email e testes automatizados de ponta a ponta.

### Publicação

O repositório tem ficheiros estáticos na raiz, preparados para GitHub Pages. Confirmar o URL de publicação no painel do GitHub antes de o divulgar.
