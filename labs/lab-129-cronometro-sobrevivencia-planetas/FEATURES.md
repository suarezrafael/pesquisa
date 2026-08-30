# Laboratório 129 — Cronômetro de sobrevivência em planetas extremos (Mercúrio/Netuno)

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: e20cd60bc41dabb093b936c3fde8c3efac4155f2

## Objetivo do laboratório

Item do backlog discutido em chat: *"se eu der o comando... planetas tem tempo de permanencias,
um cronometro onde voce precisa responder a perguntas durante a exploracao, mas o cronometro fica
regredindo se permanecer longe do foguete muito tempo voce morre e volta pra terra, pode ser
planetas quentes como mercurio e os mais longes como netuno."*

## Investigado antes de planejar

- **Precedente exato já existe**: o sistema de vida/morte de Marte (lab-60) já implementa
  exatamente o padrão pedido — uma barra que esvazia, "morre" (`respawnFromMarsDeath`), teleporta
  de volta pro planeta principal, sem perda de moeda/XP já ganho, precisa de foguete de novo pra
  tentar de novo. Trocar "dano de inimigo" por "tempo longe do foguete" é a mudança real.
- **`DESTINATION_PLANETS`** já é o registro genérico de planetas-destino (lab-110) — um campo
  booleano novo (`hasSurvivalTimer`) resolve "só planetas extremos" sem duplicar estrutura.
- **`returnRockets` (Map)** já guarda a posição do foguete de volta de CADA planeta-destino — é a
  referência de distância certa pro "longe do foguete" pedido pelo usuário.
- **Restaurar tempo ao responder perguntas** precisa de uma ponte da camada React (onde
  `completePlanetQuest`/`progress.completedPlanetQuestIds` vivem, em `App.tsx`/`useProgress.ts`)
  pro closure do `World3D.tsx` (onde o cronômetro em si vive) — o mesmo padrão de bridge já
  existente (`__refreshHouseFurniture`, lab-123, observado por um `useEffect` em
  `progress.unlockedFurnitureIds`) resolve isso sem inventar mecanismo novo.

## Decisões técnicas tomadas

- **`SURVIVAL_TIMER_MAX = 60` segundos, `SURVIVAL_TIMER_SAFE_RADIUS = 5`** (perto do foguete, sem
  pressa), **`SURVIVAL_TIMER_DRAIN_RATE = 1`** (1 segundo de cronômetro por segundo real fora do
  raio seguro), **`SURVIVAL_TIMER_RESTORE = 20`** por escolinha respondida certa — números de
  produto razoáveis sem dado de mercado mais específico (dá tempo real de explorar antes de
  precisar responder algo, mas cria pressão de verdade se o jogador ignorar as escolinhas).
- **Zero punição permanente** (mesmo espírito de Marte) — "morrer" só custa tempo de jogo, nunca
  moeda/XP já creditados; nem precisa de bloqueio adicional pra "precisa voltar de foguete", já que
  o único jeito de voltar ao planeta já é embarcar de novo.
- **`survivalPlanetId` (string | null), não um booleano** — guarda QUAL planeta, pro ícone certo
  na UI (calor em Mercúrio 🥵, frio nos demais 🥶) sem precisar de estado extra.
- **`Math.ceil` + só atualizar o `useState` quando o inteiro muda** — diferente da barra de vida de
  Marte (que só muda em eventos discretos de dano), este cronômetro dreia CONTINUAMENTE; sem esse
  cuidado, seria um `setState` a cada quadro (~60×/segundo), um desperdício de re-render real que
  a barra de Marte nunca teve esse problema por natureza.
- **Reaproveita a função de morte só parametrizada por planeta** (`respawnFromSurvivalTimeout
  (planetId)`), não uma função por planeta — mensagem muda (calor/frio) mas o teleporte/reset é
  idêntico pros dois.
- **`SurvivalTimerBar.tsx` reaproveita as classes CSS de `MarsHealthBar.tsx`** (`.mars-health-bar`
  etc.) — visualmente é a mesma barra, só o ícone muda; não vale criar CSS novo pra isso.

## Funcionalidades planejadas

- [x] `World3D.tsx`: `hasSurvivalTimer` novo em `DestinationPlanet`, marcado em Mercúrio e Netuno;
      constantes `SURVIVAL_TIMER_*`.
- [x] `World3D.tsx`: estado novo (`survivalTimeRef`/`survivalTimeDisplay`/`survivalPlanetId`/
      `survivalDeathMessage`), reset/inicialização em `landRocket()` (cheio a cada chegada,
      zerado/`null` ao sair pra qualquer planeta sem cronômetro ou pro planeta principal).
- [x] `World3D.tsx`: dreno por quadro fora do raio seguro do foguete de volta;
      `respawnFromSurvivalTimeout` ao zerar.
- [x] `World3D.tsx`: bridge `__onPlanetQuestCompleted` (observado por `useEffect` em
      `progress.completedPlanetQuestIds`) restaura tempo se o jogador estiver num planeta com
      cronômetro.
- [x] `world3d/SurvivalTimerBar.tsx` novo — barra + ícone por planeta.
- [x] Verificação: `npm run build`/`npm run test` sem erros; verificação ao vivo (dev server +
      browser automation) — viajar a Mercúrio, pousar, responder uma escolinha (recompensa
      creditada), deixar o cronômetro chegar a zero longe do foguete e confirmar teleporte de
      volta + mensagem "Você desmaiou de calor!..." exata, sem erro de console. Ver `CONTEXT.md`
      para o achado de verificação (cronômetros de tempo real são difíceis de capturar em valor
      intermediário via automação de navegador) e as pendências conhecidas (Netuno não testado ao
      vivo, só Mercúrio — mesmo código compartilhado).
