# Contexto — Laboratório 158 — Grupo B do backlog social: plano de arquitetura

Preenchido em: 2026-09-08
Commit inicial → final: dcf1712039800ee56f728db2e28fef4715f75f23..HEAD

## O que foi feito

Laboratório de planejamento, sem código — as 3 perguntas de arquitetura/segurança do Grupo B
(registradas no lab-154) foram respondidas pelo usuário nesta sessão via `AskUserQuestion`:
identidade persistente por perfil (sim), busca de amigo (livre por nickname, não código), e
consentimento (o portão do lab-152 já cobre, sem portão novo).

Como o usuário escolheu a opção de busca MAIS ARRISCADA das duas oferecidas (livre por nickname,
não código trocado fora do jogo), este laboratório também define as salvaguardas concretas antes
de qualquer código: rate limit agressivo, só correspondência exata (nunca substring/wildcard, que
permitiria varrer o diretório inteiro), e resultado de busca nunca expõe mais que nickname+emoji.

Escrito `FEATURES.md` com: schema novo (`player_identities`/`friendships`/
`player_search_attempts`, migração `0005`), 7 endpoints novos em `app/server-accounts` (mesmo
Worker, sem exigir assinatura — igual à telemetria anônima já existente), e um sequenciamento em
4 labs menores (lab-159 a lab-162) em vez de tentar tudo de uma vez.

## Decisões técnicas tomadas

- **Estender `server-accounts`, não o relay de multiplayer nem um serviço novo**: é o único
  backend hoje que já fala com QUALQUER jogador sem exigir assinatura (`/events`, telemetria por
  `device_id`) — identidade de jogador tem a MESMA exigência (nunca pode depender de pagamento,
  regra já registrada em `docs/prompts/03-arquitetura-sistema.md`). O relay (`server-cf-relay`)
  não persiste nada em disco de propósito (é só uma sala em memória) — não serve pra dado
  relacional como amizade.
- **"Online agora" derivado de `last_seen_at` + heartbeat, não integrado ao relay em tempo
  real**: mais simples, e continua funcionando mesmo se o relay de multiplayer cair ou estiver
  sobrecarregado — a lista de amigos e o status online são preocupações independentes do
  multiplayer em si.
- **Reaproveitar o `device_id` já existente da telemetria anônima** em vez de inventar outro
  identificador de aparelho — mesmo raciocínio de minimização de dado já seguido em
  `product_events`.
- **Sequenciar em 4 labs, não um só**: cada peça (identidade+busca, pedidos, lista+presença,
  perfil público) é testável e útil isoladamente, e mexe em produção (banco Neon compartilhado)
  — mesmo cuidado incremental já usado nos labs de G13/G14/G15 anteriores.

## Pendências / dívidas conhecidas

- Nenhum código foi escrito — o plano em si é o entregável deste laboratório.
- "Remover/bloquear amigo" e "denunciar" ficaram fora de escopo do plano — precisam de decisão
  antes do lab-160 (pedidos de amizade) ir pra produção de verdade, não antes de codar o plano.

## Funcionalidades planejadas que NÃO foram concluídas

Não se aplica — este laboratório não tinha funcionalidades de código planejadas, só o mapeamento
técnico.

## O que o próximo laboratório deve desenvolver

lab-159 (primeiro passo do sequenciamento acima): migração `0005_player_identities.sql` +
`POST /players/register` + `GET /players/search` com rate limit — mexe em produção (banco Neon
compartilhado, Worker já em uso por assinantes), por isso pede confirmação explícita do usuário
antes de começar, mesmo já com o plano aprovado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- Sem mudança de código — só `labs/lab-158-.../FEATURES.md`+`CONTEXT.md` e `labs/CURRENT.md`.
- `npx tsc -b`/`npm run test` não rodados neste laboratório (nada de código mudou).
