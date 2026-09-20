# Laboratório 205 — Ranking sem fricção desnecessária

Status: em andamento
Início: 2026-09-19
Commit inicial: 12975a5b24908be71712baf2872ad6f47b84618e

## Objetivo do laboratório

Remover fricção desnecessária do ranking — hoje a única entrada de UI pra ver QUALQUER ranking
(incluindo o ranking 100% local entre perfis do mesmo aparelho, que não usa rede nenhuma) passa pelo
MESMO portão parental de multiplayer usado pelo chat, mesmo quando a criança só quer comparar
progresso com um irmão no mesmo tablet.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 195 - Ranking seguro sem fricção
excessiva" — escolhido em vez de "Lab 193 - Otimização de draw calls" (bloqueado por depender de
medição de FPS ao vivo indisponível nesta sessão, mesma limitação do Lab 191/lab-193 interno) e de
"Lab 196 - NPCs vivos" (decisão confirmada com o usuário via `AskUserQuestion`).

## Investigação prévia

- **`RankingPanel.tsx` tem 2 abas**: "Online agora" (lab-20, jogadores conectados no relé
  compartilhado) e "Neste aparelho" (lab-157, ranking local entre perfis do MESMO dispositivo, lido
  direto de `localStorage` via `loadProgressForProfileId` — **zero rede, zero exposição a
  estranhos**). A aba local só aparece com 2+ perfis no aparelho (`showLocalTab`).
- **Hoje as DUAS abas ficam atrás do MESMO portão** (`onOpenRanking={() => openMultiplayerFeature(()
  => setRankingOpen(true))}`, `World3D.tsx`) — o portão inteiro (`ParentalGateModal`) precisa ser
  resolvido só pra abrir o painel, mesmo que a criança só queira ver a aba local.
- **Auditoria do que o painel de verdade expõe** (`RankingPanel.tsx`): só `name` (apelido, já
  validado por whitelist, lab-89), `avatarEmoji`, nível/XP, moedas — nenhum PII, horário exato,
  localização, botão de contato/amizade ou chat. Confirma a premissa do backlog: o painel em si não
  expõe nada perigoso.
- **Achado importante da auditoria, que MUDA o escopo original**: a aba "Online agora" não é
  independente de "ficar visível pra estranhos" — os jogadores reais que aparecem nela vêm de
  `remotePlayers`, populado só depois de `connectMultiplayer()` (que exige o MESMO consentimento já
  usado pro chat — conectar ao relé compartilhado torna a posição/aparência do jogador visível e
  aproximável por QUALQUER estranho conectado, não só "mostra um placar"). Ou seja: remover o portão
  da aba ONLINE de verdade equivaleria a remover o portão do multiplayer inteiro — não é seguro, e
  não é isso que a hipótese do backlog pedia (ela mesma cita "se ranking não expuser... horário,
  localização" como condição). **Decisão de escopo**: o portão continua exatamente como está pra
  habilitar presença online de verdade; o que muda é que ABRIR o painel (e ver a aba local) não
  precisa mais passar por ele — só a aba online, se ainda sem consentimento, mostra um convite
  específico pra ativar o modo online (reaproveitando o MESMO portão existente), em vez de bloquear
  o painel inteiro de cara.
- **`connected` (prop já existente do `RankingPanel`) reflete conexão de verdade, não consentimento**
  — sem uma prop separada pra "já autorizou mas ainda conectando" vs. "nunca autorizou", a aba online
  não teria como escrever o convite certo. `hasMultiplayerConsent()` (já exportada de
  `state/storage.ts`, usada em `openMultiplayerFeature`) é chamada direto na renderização de
  `World3D.tsx` — sem precisar de estado novo, já reavalia sozinha a cada re-render (que já acontece
  quando `handleParentalGateAuthorize` atualiza outro estado).

## Decisão de escopo (confirmada com o usuário)

Entre 4 opções levantadas (Lab 195 pequeno recomendado; Lab 196 NPCs vivos; Lab 193 drawcalls mesmo
bloqueado; outro item da lista), o usuário escolheu Lab 195 — a peça pequena e segura, não bloqueada
por medição ao vivo.

## Funcionalidades planejadas

- [x] Abrir o painel de ranking (`setRankingOpen(true)`) direto, sem passar por
  `openMultiplayerFeature`/`ParentalGateModal` — o portão continua existindo, só não guarda mais a
  abertura do painel em si.
- [x] Aba padrão inteligente: com 2+ perfis E sem consentimento de multiplayer ainda, abre direto na
  aba "Neste aparelho" (a única que já tem dado real pra mostrar) em vez de "Online agora" vazia.
- [x] Aba "Online agora" sem consentimento: mostra um convite específico ("ative o modo online, mesma
  autorização do chat") com botão que abre o MESMO portão parental já existente — nunca finge que
  "ranking online" é mais seguro que multiplayer completo, porque não é.
- [x] `docs/prompts/01-seguranca.md`/regras de segurança infantil: nenhuma mudança na regra real (o
  portão pro multiplayer de verdade continua intacto) — só a UI de QUANDO ele aparece muda.
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (8ª lab seguida — mesma limitação exata, confirmado com uma aba nova). Documentado abaixo;
  confiado em `tsc`/testes/build + leitura de código cuidadosa.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run`: 257/257 (sem mudança — nenhuma
lógica de domínio nova, só UI/gating); `npm run build` sem erros.

Pontos conferidos por leitura:

- **`hasMultiplayerConsent()` chamada direto na renderização** (não um `useState` próprio) —
  reavalia sozinha a cada re-render de `World3D`, que já acontece quando
  `handleParentalGateAuthorize` muda `showParentalGate`; confirmado que não existe nenhum caminho
  onde o painel de ranking re-renderiza sem que ALGUM estado do componente pai mude (o React não
  teria motivo pra re-renderizar `RankingPanel` sozinho sem um pai também re-renderizando, já que
  `rankingOpen` controla a própria montagem do componente).
- **`entries` nunca depende de consentimento** — `refreshRanking()` roda incondicionalmente desde o
  mount (`window.setInterval`), sempre incluindo pelo menos o próprio jogador (`isSelf: true`); sem
  consentimento, `remotePlayers` simplesmente nunca é populado (não há conexão pra receber estados
  remotos), então a aba online mostraria só o próprio jogador SE fosse renderizada — mas agora nem
  chega a renderizar a lista, mostra o convite em vez disso.
- **Nenhuma outra tela assume que `rankingOpen` implica consentimento** — `hudInert` já incluía
  `rankingOpen` independente de qualquer condição de multiplayer; nenhum outro código lido depende
  de "ranking aberto ⇒ conectado".

## Rodada de review — Copilot (PR #88)

1 achado real (confirmado e corrigido) + 1 achado de acessibilidade suprimido (barato, corrigido
junto):

1. **Médio — o portão parental renderizava ATRÁS do painel de ranking**: `.chat-panel`/
   `.ranking-panel` têm `z-index: 20`, `.modal-overlay` (usado por `ParentalGateModal`) tinha
   `z-index: 10`. Isso nunca importou antes porque nenhum `.modal-overlay` abria enquanto um desses
   painéis já estava montado (o portão sempre abria ANTES do chat, nunca junto — `handleParentalGateAuthorize`
   fecha o portão e abre o chat na MESMA função, batched pelo React numa render só). O convite novo
   de "Ativar modo online" quebra essa premissa de propósito: agora o portão abre com o painel de
   ranking JÁ montado por baixo — e, com o z-index antigo, o painel (mais alto) ficava
   visível/clicável por cima do fundo escurecido do modal, quebrando a exclusividade que um modal
   deveria garantir. Corrigido subindo `.modal-overlay` pra `z-index: 25` (acima de qualquer painel
   HUD interativo) — afeta todo modal do app (efeito pretendido: nenhum modal deveria renderizar
   atrás de painel nenhum), não só este caminho novo.
2. **Baixo (suprimido, corrigido por ser barato) — alvo de toque abaixo de 44×44px**: o botão
   "Ativar modo online" reaproveitava `.chat-category-btn` (pensado pras abas compactas lado a
   lado), bem abaixo do piso de 44×44px já estabelecido (`docs/prompts/02-design-profissional.md`
   §3). Corrigido com uma classe própria (`.ranking-online-gate-btn`) só pra este botão — não muda
   `.chat-category-btn` (usado pelas abas online/local, que continuam compactas de propósito).

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` continuam limpos depois das
correções.

## Fora de escopo (explicitamente adiado)

- Remover o portão parental da presença online de verdade — a auditoria concluiu que isso NÃO é
  seguro (ver "Achado importante" acima), diferente do que a hipótese original do backlog sugeria.
- Métricas novas de `ranking_open_rate`/guardrails de denúncia citadas no backlog — fora do escopo
  desta peça pequena, candidata a lab futuro se o produto quiser medir o efeito da mudança de fricção.
- Lab 193 (drawcalls)/Lab 196 (NPCs vivos) — adiados por decisão explícita do usuário nesta escolha.
