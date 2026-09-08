# Contexto — Laboratório 154 — Backlog social: pets, amigos, ranking, séries

Preenchido em: 2026-09-07
Commit inicial → final: 8a49c05e01d4a0968c04fad18064051c06f18eb2..HEAD

## O que foi feito

Laboratório de planejamento, sem código — pedido explícito do usuário. Investigado o estado real
do código (não só memória da conversa) pra cada item pedido:
- `AchievementsPanel`/`achievements.ts`: só 3 conquistas hoje (primeira missão, metade, todas),
  100% locais por perfil.
- `RankingPanel`: mostra só quem está CONECTADO AGORA no relay global (`app/server-cf-relay`),
  sem histórico, sem conceito de "semana".
- `nicknames.ts`/`Profile.name`: apelido é só local, gerado ou digitado livremente, nunca único,
  nunca sai do aparelho — não existe diretório de jogadores buscável.
- `Progress.loginStreak` (lab-138) e `Progress.currentStreak` (lab-132) já existem como números
  reais por perfil — base pronta pra "séries", falta só a camada de apresentação.
- Gatos (`__perchedCats`) existem só como decoração estática, não são pets adotáveis.

Escrito `FEATURES.md` com o detalhamento completo, dividindo o pedido em Grupo A (constrói na
arquitetura de hoje: pets, séries, ranking local entre perfis do mesmo aparelho) e Grupo B (exige
identidade de jogador buscável pra todo mundo: lista de amigos, busca por nick, status online,
convites) — e 3 perguntas em aberto pro usuário antes do Grupo B começar.

## Decisões técnicas tomadas

- **Não implementar nada neste laboratório**: o pedido foi literalmente "montar um lab de
  backlog", e metade dos itens tem uma implicação de arquitetura/segurança grande demais pra
  decidir sozinho no meio de uma sessão — registrar o achado e perguntar é o certo aqui, mesmo
  padrão já seguido pra G13/G15 nesta sessão.
- **Separar Grupo A de Grupo B explicitamente**: sem essa separação, o backlog inteiro pareceria
  "uma feature grande", quando na verdade metade é rápida e sem risco (pets, séries, ranking
  local) e a outra metade é um pivô de produto real (identidade buscável pra criança).

## Pendências / dívidas conhecidas

- Nenhum código foi escrito — as pendências são as 3 perguntas registradas em `FEATURES.md` §
  "Perguntas em aberto pro usuário", que bloqueiam o Grupo B.
- O "painel de uso pros pais" que o usuário mencionou ao esclarecer o que entende por "problema"
  não foi endereçado — não pedido explicitamente ainda, registrado como candidato a lab futuro.

## Funcionalidades planejadas que NÃO foram concluídas

Não se aplica — este laboratório não tinha funcionalidades de código planejadas, só o mapeamento.

## O que o próximo laboratório deve desenvolver

Depende da resposta do usuário:
- Se quiser começar pelo Grupo A: séries (Bronze/Prata/Ouro/Diamante) é o menor e mais rápido —
  só falta escolher a métrica (login streak, combo de acertos, ou XP semanal) e definir limiares.
- Se quiser destravar o Grupo B: responder as 3 perguntas de arquitetura/segurança antes de
  qualquer código.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- Sem mudança de código — só `labs/lab-154-.../FEATURES.md`+`CONTEXT.md` e `labs/CURRENT.md`.
- `npx tsc -b`/`npm run test` não rodados neste laboratório (nada de código mudou).
