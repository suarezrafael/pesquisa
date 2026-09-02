# Contexto — Laboratório 129 — Cronômetro de sobrevivência em planetas extremos

Preenchido em: 2026-08-30
Commit inicial → final: e20cd60bc41dabb093b936c3fde8c3efac4155f2..HEAD

## O que foi feito

Pedido do backlog discutido em chat: *"alguns planetas tem tempo de permanencias, um cronometro
onde voce precisa responder a perguntas durante a exploracao, mas o cronometro fica regredindo se
permanecer longe do foguete muito tempo voce morre e volta pra terra, pode ser planetas quentes
como mercurio e os mais longes como netuno."*

Tudo em `app/src/world3d/World3D.tsx` + novo `app/src/world3d/SurvivalTimerBar.tsx`:

- `hasSurvivalTimer?: boolean` novo em `DestinationPlanet`, marcado `true` em Mercúrio e Netuno
  (`DESTINATION_PLANETS`) — os demais planetas-destino (Vênus, Júpiter, Saturno, Urano, Marte)
  ficam sem cronômetro.
- Constantes: `SURVIVAL_TIMER_MAX = 60` (segundos), `SURVIVAL_TIMER_SAFE_RADIUS = 5` (unidades,
  perto do foguete de volta = sem dreno), `SURVIVAL_TIMER_DRAIN_RATE = 1` (segundo de cronômetro
  por segundo real fora do raio seguro), `SURVIVAL_TIMER_RESTORE = 20` (por escolinha respondida
  certa naquele planeta).
- Estado novo: `survivalTimeRef`/`lastSurvivalTimeDisplayRef` (refs, valor real por quadro) +
  `survivalTimeDisplay` (`useState`, só atualizado quando o segundo inteiro exibido muda — evita
  ~60 re-renders/segundo) + `survivalPlanetId: string | null` (qual planeta, define o ícone) +
  `survivalDeathMessage`.
- `landRocket()`: ao chegar num planeta com `hasSurvivalTimer`, cronômetro reinicia cheio
  (`SURVIVAL_TIMER_MAX`) e `survivalPlanetId` é setado; ao chegar em Marte ou em qualquer planeta
  sem cronômetro, ou ao voltar pra Terra, `survivalPlanetId` volta a `null` (barra some).
- Dreno por quadro: se `currentPlanetId` tem `hasSurvivalTimer` e a distância até o foguete de
  volta daquele planeta (`returnRockets`) é maior que `SURVIVAL_TIMER_SAFE_RADIUS`, o cronômetro
  dreia `dt * SURVIVAL_TIMER_DRAIN_RATE`; ao chegar a zero, `respawnFromSurvivalTimeout(planetId)`
  dispara.
- `respawnFromSurvivalTimeout(planetId)`: teleporta de volta ao ponto de chegada padrão na Terra
  (mesmo destino usado pra "voltar da viagem"), reseta o cronômetro pra próxima expedição, limpa
  `survivalPlanetId`, toca o som de nocaute (`playKnockedOut`, reaproveitado de Marte) e mostra uma
  mensagem transitória (4s) com a causa certa — "calor" em Mercúrio, "frio" nos demais planetas com
  cronômetro (hoje só Netuno). **Sem punição**: nenhuma moeda/XP já ganho é perdido, o único custo é
  precisar embarcar de novo pra continuar explorando.
- Restauração ao responder escolinha: bridge `(scene as any).__onPlanetQuestCompleted`, observado
  por um `useEffect` novo que dispara sempre que `progress.completedPlanetQuestIds` muda — se o
  jogador está atualmente num planeta com cronômetro, soma `SURVIVAL_TIMER_RESTORE` (capado em
  `SURVIVAL_TIMER_MAX`). Reaproveita o padrão de ponte já usado por `__refreshHouseFurniture`
  (lab-123).
- `SurvivalTimerBar.tsx` (novo): mesmo visual da barra de vida de Marte (reaproveita as classes CSS
  `.mars-health-bar`/`.mars-health-fill`/etc. de `index.css`, sem CSS novo), só troca o ícone por
  planeta — 🥵 em Mercúrio, 🥶 nos demais (padrão "frio" pra qualquer planeta futuro com
  `hasSurvivalTimer` que não seja Mercúrio).

## Decisões técnicas tomadas

Ver `FEATURES.md` (seção "Decisões técnicas tomadas") para o racional completo dos números
escolhidos e por quê. Resumo das decisões de arquitetura:
- Reaproveitar quase integralmente o padrão de vida/morte de Marte (lab-60) — só trocando "dano de
  inimigo" por "tempo longe do foguete" como gatilho de drenagem, e uma função de respawn
  parametrizada por planeta (mensagem calor/frio) em vez de duplicar código por planeta.
- `survivalPlanetId` como string (não booleano) pra saber qual ícone mostrar sem estado extra.
- Throttle de re-render (`Math.ceil` + só `setState` quando o inteiro muda) — necessário aqui
  porque, ao contrário da vida de Marte (eventos discretos de dano), este cronômetro dreia
  CONTINUAMENTE a cada quadro.

## Achado real na verificação ao vivo (lição nova, generaliza as de lab-127/128)

Diferente de testar a viagem de foguete (onde forçar quadros com `engine._deltaTime` acelera o
PROGRESSO SIMULADO da animação), o cronômetro de sobrevivência é um relógio de **tempo real**
(`dt` vem do loop de render automático do Babylon, que continua rodando via
`requestAnimationFrame` o tempo todo, independente de eu forçar quadros extras manualmente). Isso
significa que **cada chamada de ferramenta de automação de navegador (screenshot, execução de JS,
clique) consome segundos reais de parede — e esses segundos contam contra o próprio cronômetro
sendo testado.**

Na prática: em três pousos separados em Mercúrio durante a verificação, o cronômetro de 60s expirou
sozinho (teleportando de volta pra Terra com a mensagem "Você desmaiou de calor! Volte de foguete
pra continuar explorando Mercúrio.") simplesmente pelo tempo real gasto entre pousar e fazer a
próxima chamada de screenshot/JS pra checar o estado — não por um bug, mas porque cada
round-trip de ferramenta (rede + renderização pesada da cena, ~2000+ meshes) levou dezenas de
segundos reais. Isso na verdade SERVIU como confirmação end-to-end genuína do pipeline completo
(dreno → morte → mensagem certa → teleporte pra casa → mensagem some sozinha depois de 4s) sem
precisar forçar nada artificialmente — mas tornou impossível capturar uma screenshot da barra
`SurvivalTimerBar` mostrando um valor intermediário (ex.: 35/60) antes de expirar.

**Lição pra próximas verificações envolvendo cronômetros/timers de tempo real** (diferente de
progresso de animação): minimizar o número de chamadas de ferramenta entre o evento que inicia o
timer e a checagem que se quer capturar, ou aceitar que testar o "meio do caminho" exige um timer
bem mais longo que o de produção (ex.: subir `SURVIVAL_TIMER_MAX` temporariamente só during
verificação, revertendo depois) — não tentado aqui por já haver confirmação suficiente do
comportamento de ponta a ponta.

## Pendências / dívidas conhecidas

- **A barra `SurvivalTimerBar` não foi vista visualmente com um valor intermediário** (só o efeito
  final — expiração — foi observado, por conta do problema de tempo real descrito acima). O
  componente foi revisado por código (é uma cópia direta e simples do padrão de `MarsHealthBar`,
  já usado e comprovado) e a lógica de estado que o alimenta (`survivalTimeDisplay`) foi confirmada
  correta por leitura de código + pelo comportamento indireto observado (a barra aparece/desaparece
  nos momentos certos, avaliado via ausência/presença de `.mars-health-bar` no DOM antes/depois de
  pousar e depois de expirar). Se o usuário reportar que a barra não aparece durante a exploração
  normal (sem os efeitos colaterais da automação), esse é o primeiro lugar a checar.
- **Netuno (o segundo planeta com `hasSurvivalTimer`) não foi testado ao vivo** — só Mercúrio.
  Ambos compartilham exatamente o mesmo código (`hasSurvivalTimer` genérico, mesma função de
  respawn parametrizada só pela string de causa "calor"/"frio"), então a confirmação em Mercúrio
  cobre a lógica compartilhada, mas a mensagem específica de Netuno ("frio") e a posição/raio do
  foguete de retorno de Netuno não foram verificadas na prática.
- **Restauração de tempo ao responder escolinha foi confirmada indiretamente**, não com uma leitura
  exata do valor antes/depois — o quiz foi respondido corretamente (recompensa de XP/moeda
  confirmada via "Missão concluída! +30 XP · +16 moedas"), e o cronômetro não expirou
  imediatamente após, mas expirou algumas chamadas de ferramenta depois (consistente com "recebeu
  +20s de tempo extra, que depois também se esgotou" — mas não é uma prova matemática exata do
  valor de +20).

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas (implementação + build +
testes + verificação ao vivo do fluxo principal).

## O que o próximo laboratório deve desenvolver

Do backlog maior discutido em chat, ainda não formalizado em labs: mobília desbloqueada por
planeta conquistado, persistência de "Minha Casa" pra assinante (arquitetural, G6 do doc de
escala — precisa de conversa de produto/privacidade antes de qualquer implementação), e as demais
ideias de engajamento discutidas (login diário/streak, baús de tesouro escondidos, bônus por
limpar um planeta inteiro, combo de respostas certas seguidas, mini-desafios temáticos por
planeta, corrida/parkour temático, colecionável exclusivo por planeta, segundo "chefe" em Júpiter,
vitrine de troféus mais visual, emotes/danças, evento sazonal, mascote/pet colecionável,
cartão-postal colecionável, boletim/certificado do explorador, clima ativo por planeta, "distress
call" de NPC perdido). Sem prioridade única — perguntar ao usuário antes de escolher o próximo.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 52/52 passando (sem teste novo — construção 3D + cronômetro em
  tempo real, sem lógica de domínio pura nova pra testar isoladamente).
- `npm run build` (em `app/`): typecheck + build de produção sem erros (confirmado em log
  completo, `✓ built in 1m 13s`).
- Verificação ao vivo (dev server local + browser automation): viagem de foguete real até
  Mercúrio (3 pousos), escolinha respondida corretamente com recompensa creditada, cronômetro
  expirando corretamente com a mensagem exata "Você desmaiou de calor! Volte de foguete pra
  continuar explorando Mercúrio.", teleporte de volta à Terra confirmado por posição
  (`avatarCollider`), mensagem some sozinha depois de ~4s, sem erro de console em nenhum momento.
- Como verificar de novo: `cd app && npm run dev`, viajar de foguete até Mercúrio ou Netuno,
  ficar longe do foguete de volta por mais de 60s reais sem responder nenhuma escolinha do
  planeta, confirmar teleporte de volta + mensagem; responder uma escolinha do planeta antes de
  60s pra confirmar que o cronômetro ganha tempo extra em vez de expirar.
