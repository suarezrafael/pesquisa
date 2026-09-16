# Laboratório 191 — Troca segura de nickname

Status: em andamento
Início: 2026-09-16
Fim: -
Commit inicial: 11871b3ab94168282b08b7c097670b897576f40d

## Objetivo do laboratório

Deixar a criança trocar o apelido depois do onboarding (arrependimento do nick inicial ou vontade
de renovar a identidade), sem expor dado pessoal e sem precisar de conta adulta — reaproveitando o
gerador/filtro já usado na criação de perfil.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 207 - Troca segura de nickname" —
próximo item da "Recomendação priorizada" (seção 7) depois do lab-190 (a ordem exata do documento
é 201→202→203→204→205→207→206; 207 vem antes de 206 porque "Pets premium" (206) está marcado
como dependente de 203/pet já estar confiável, já resolvido no lab-188).

## Investigação prévia (leitura do código, antes de codar)

- **O gerador/filtro do backlog JÁ EXISTE, só pro onboarding**: `data/nicknames.ts`
  (`generateNickname`, adjetivo+bicho, sem número desde o lab-89) e `data/nicknameFilter.ts`
  (`sanitizeNicknameChars`/`isNicknameAllowed` — só letra/espaço + lista de bloqueio, mesma checagem
  duplicada no servidor) já cobrem os critérios "gerador seguro"/"bloquear PII e palavra
  inadequada" do backlog. `Onboarding.tsx` já usa os três. **O que falta de verdade é só a
  capacidade de TROCAR depois** — não existe hoje nenhuma função `renameNickname`/`updateName` em
  `state/useProfile.ts` (só `equipAvatar`/`equipHat`/etc., nenhuma mexe em `profile.name`), nem
  nenhuma UI depois do onboarding pra isso. O botão "🔁 Trocar perfil" do HUD (`HudHeader.tsx`) troca
  entre PERFIS diferentes no mesmo aparelho (multi-perfil, lab-108) — não é o mesmo caso, não edita
  o nickname do perfil atual.
- **Achado real, propagação já é de graça em 2 dos 3 lugares citados pelo backlog**:
  - **HUD**: `<h1>{profile.name}</h1>` (`HudHeader.tsx`) já lê `profile.name` reativo — qualquer
    troca aparece na hora, sem código novo.
  - **Ranking**: `RankingPanel.tsx:35` já faz `name: isSelf ? profile.name : r.name` — o PRÓPRIO
    jogador sempre vê seu nick mais atual no ranking, mesmo que o resto da lista venha de um
    snapshot do relay. Sem código novo.
  - **Multiplayer**: `world3d/multiplayer.ts`'s `sendState(name, ...)` é chamado a cada broadcast
    de estado (não só na conexão) com o `profile.name` corrente lido em `World3D.tsx` — outros
    jogadores conectados veem o nick novo no próximo broadcast. Sem código novo.
- **Achado real, a lacuna genuína que este lab precisa fechar**: `usePlayerIdentity.ts`'s
  `ensureRegistered(nickname, ...)` só chama `POST /players/register` **UMA VEZ por perfil**
  (`if (playerId) return playerId`, guarda síncrona) — o nickname enviado ali fica GRAVADO PRA
  SEMPRE em `player_identities.nickname` no Neon, e NUNCA é atualizado depois, mesmo que
  `profile.name` mude localmente. Isso significa: `GET /players/search?nickname=` (achar amigo),
  `FriendsPanel.tsx`'s `f.nickname`/`r.nickname` (o que os amigos veem de você) e
  `GET /players/:id/public-profile` (perfil público visitável) ficariam PRESOS no nick antigo pra
  sempre — o critério de aceite "ranking/amigos/multiplayer mostram o novo nick" só está
  genuinamente em risco pro pedaço de AMIGOS (backend Neon), não pros outros dois. Confirmado
  lendo `server-accounts/src/index.ts`: `handlePlayerRegister` faz um `INSERT` simples (chamar de
  novo criaria um jogador DUPLICADO, não atualiza o existente) — não existe hoje nenhuma rota que
  atualize `nickname` num `player_identities` já criado.
- **Ponto de extensão já existente, reaproveitável**: `handleHeartbeat`
  (`POST /players/heartbeat`, chamado a cada ~60s por `useHeartbeat.ts` E também sob demanda via
  `sendImmediateHouseVisibility` pro caso "a mudança precisa valer AGORA, não esperar o próximo
  tick") já faz UPDATE parcial com `coalesce` em `equipped_look`/`badges`/campos de casa — o mesmo
  padrão serve pra `nickname`, sem precisar inventar uma rota nova.
- **Cooldown/limite de frequência (critério de aceite explícito do backlog)**: não existe hoje
  nenhum campo de "quando foi a última troca de nickname" nem no `Profile` (client) nem em
  `player_identities` (Neon). Precisa de um campo novo dos dois lados, seguindo o padrão já
  estabelecido de instante ISO + guarda anti-recuo (mesmo espírito de
  `weeklyEventObjectiveRewardedAtIso`/`applyPetDailyChallengeCompleted`, embora ali seja por DIA
  civil e aqui precise ser uma janela rolante de N dias, não um dia calendário).
- **Regra de segurança já estabelecida neste repo, aplicável aqui**: `docs/prompts/01-seguranca.md`
  §3 — "nunca confia só na validação do lado do cliente". A validação de formato/lista de bloqueio
  E o cooldown de frequência precisam ser reforçados no servidor também, não só na UI (um cliente
  adulterado não pode trocar de nick em loop pra assediar/confundir amigos, risco citado no próprio
  item do backlog).

## Funcionalidades planejadas

- [ ] `types.ts`: novo campo `Profile.nicknameChangedAt: string | null` (instante ISO da última
  troca; `null` = nunca trocou, inclusive todo perfil salvo antes deste lab).
- [ ] `state/progression.ts`: nova função pura `canChangeNickname(nicknameChangedAt, nowIso)` +
  constante `NICKNAME_CHANGE_COOLDOWN_DAYS` (7 dias) — testada (`progression.test.ts`).
- [ ] `state/useProfile.ts`: nova função `renameNickname(name)` — valida local primeiro
  (`isNicknameAllowed` + `canChangeNickname`, falha rápida sem rede se bloqueado), atualiza
  `profile.name`+`nicknameChangedAt` e persiste, dispara sincronização imediata com o backend
  (best-effort, ver abaixo).
- [ ] Novo componente `NicknamePanel.tsx` (modal, mesmo padrão `useModalA11y` dos outros painéis):
  mostra nick atual, campo com o MESMO filtro/gerador do onboarding, mensagem de cooldown restante
  quando bloqueado, botão salvar.
- [ ] `HudHeader.tsx`: nome (`<h1>{profile.name}</h1>`) ganha um botão "✏️" ao lado, abre o
  `NicknamePanel` — novo prop `onOpenNicknamePanel`, plumbing por `App.tsx` igual aos outros
  painéis (`useModalA11y`, `AskUserQuestion`-free, é ação reversível/local).
- [ ] `state/useHeartbeat.ts`: nova função `sendImmediateNicknameChange(nickname)` (mesmo padrão de
  `sendImmediateHouseVisibility`), MAS com resultado observável (`Promise<{ok:boolean; error?:
  string}>`, diferente do fire-and-forget das outras) — o painel precisa mostrar "só pode trocar de
  novo em N dias" se o SERVIDOR recusar (defesa real, não só a checagem local otimista).
- [ ] `server-accounts/migrations/0014_player_nickname_changed_at.sql`: nova coluna
  `nickname_changed_at timestamptz` em `player_identities` (`null` = nunca trocou).
- [ ] `server-accounts/src/domain.ts`: mesma função pura `canChangeNickname` do client (mesma
  constante de dias) — testada (`domain.test.ts`).
- [ ] `server-accounts/src/index.ts`: `handleHeartbeat` ganha um campo opcional `nickname` no corpo
  — quando presente e DIFERENTE do nickname já salvo, valida formato (`isNicknameAllowed`,
  reaproveitado) + cooldown (`canChangeNickname` contra o `nickname_changed_at` atual da linha);
  se aprovado, `UPDATE ... SET nickname = ..., nickname_changed_at = now()`; se recusado, resposta
  de erro dedicada (não deixa os outros campos do MESMO heartbeat de badges/equipped_look/casa
  falharem por causa disso — mesmo princípio já usado pro `houseVisible` malformado).
- [ ] Verificação ao vivo (Chrome real, banco de PRODUÇÃO real via `wrangler dev` local, mesma
  técnica dos labs 175/185): registrar 2 jogadores de teste, trocar o nickname de um deles,
  confirmar que o outro consegue achar o nick NOVO via busca/perfil público, e que tentar trocar de
  novo antes do cooldown é recusado com mensagem clara.
- [ ] Confirmar ao vivo que HUD/ranking(próprio jogador)/multiplayer refletem o nick novo
  IMEDIATAMENTE, sem depender do heartbeat (já é o comportamento hoje, por construção — só
  confirmar que a troca local não quebra isso).

## Fora de escopo (explicitamente adiado, conforme o próprio item do backlog)

- Nome real, bio livre, imagem enviada, nickname totalmente livre sem filtro algum.
- Histórico público de nomes antigos (nenhum registro do nick anterior é exposto a terceiros).
- Detecção de PII além do que `nicknameFilter.ts` já faz (decisão de produto já tomada no lab-89,
  não revisitada aqui).
- Sincronizar a troca de nickname pelo heartbeat PERIÓDICO (a cada 60s) — só pela chamada imediata
  disparada pelo próprio painel de troca; se a chamada imediata falhar por estar offline no
  momento exato da troca, a mudança fica só local até uma tentativa futura (mesma postura já
  aceita em outros pontos deste app pra telemetria/sincronização sem conta — não crítico pro
  público-alvo, disclosed se acontecer na verificação ao vivo).
