# Laboratório 210 — Missões físicas em Vênus

Status: em andamento
Início: 2026-09-20
Commit inicial: 0353ccdd3d00fd0068eaf278772dc16bea5440e3

## Objetivo do laboratório

Backlog "Lab 200 - Extensao de missoes fisicas por planeta": depende do "Lab 180 - Missões
ambientais de aprendizagem" (`docs/growth-retention-monetization-backlog.md`), já implementado
(`labs/lab-180-missoes-ambientais/`, 3 landmarks no planeta principal: ponte/lógica,
posto-abastecimento/matemática, placa/leitura). Amplia com 3 missões físicas ADICIONAIS — o item do
backlog é explícito que **não deve repetir** a implementação do lab-180 — num planeta priorizado:
empurrar/alinhar objeto, ligar circuito/ordem lógica, coletar leitura ambiental.

Origem: `docs/growth-retention-monetization-backlog.md`, "Lab 200 - Extensao de missoes fisicas por
planeta" — escolhido com o usuário via `AskUserQuestion` entre "mais uma peça do Lab 198" e "Lab
200" depois do lab-209; usuário escolheu Lab 200. Plano concreto (3 mecânicas + planeta) confirmado
numa segunda pergunta, depois de investigar o lab-180 e a base de física do jogo.

## Investigação prévia

- **Lab 180 já existe e cobre 3 dos 4 temas do backlog original** ("alinhar pontes por lógica,
  abastecer foguete com matemática, decifrar placas por leitura, abrir portas por padrões" — o 4º
  ficou fora de escopo lá). Pipeline reaproveitado 100%: `selectEnvironmentalChallengeQuest`
  (`state/progression.ts`, pura/testável) sorteia uma pergunta do tipo certo;
  `onOpenEnvironmentalChallengeRef.current(quest, kind)` abre o `QuestModal`; acertar credita
  XP/moeda REAIS via `completeQuest` (`App.tsx`, `handleEnvironmentalChallengeCorrect`) — é uma
  missão normal do pool de sempre, só alcançada por um caminho físico novo.
- **`kind` era um union FECHADO** (`'bridge' | 'rocket_fuel' | 'plaque'`) em 3 lugares
  (`App.tsx` ×2, `World3D.tsx` ×1) — estendido com 3 valores novos (`push_object`/`circuit_order`/
  `reading_collect`). Um comentário já existente no código (`World3D.tsx`, gatilho do
  `ponte-logica` do hub de mini-jogos) documentava a convenção OPOSTA — reaproveitar um `kind`
  existente quando a distinção não carrega sinal real — mas aqui a distinção TEM sinal real (são
  mecânicas fisicamente diferentes, o próprio backlog pede rastrear a extensão), então um `kind`
  novo é a escolha certa, não uma violação dessa convenção.
- **Achado crítico da investigação de física**: este jogo NUNCA teve um corpo físico dinâmico
  (`mass > 0`) além do próprio avatar (`mass: 1`) — busca por `PhysicsAggregate.*mass: [1-9]` no
  arquivo inteiro só retorna o avatar. Todo o resto (paredes, plataformas, colisores de props) é
  `mass: 0` (estático). Isso confirma o risco que o PRÓPRIO item do backlog já sinalizava
  ("Riscos: puzzle dificil demais; fisica instavel") — "empurrar objeto" seria a PRIMEIRA vez que
  este jogo usa um corpo dinâmico não-avatar.
- **Como o avatar "cai" numa esfera**: a gravidade do motor Havok fica em 0 globalmente; o avatar
  aplica sua PRÓPRIA força radial a cada quadro (`body.applyForce(localUp.scale(-GRAVITY), pos)`,
  laço de física principal) — sem isso ele flutuaria. Uma caixa física precisa da MESMA técnica pra
  não flutuar. Reaproveitada aqui com `down` FIXO (não recalculado pela posição atual da caixa) —
  aproximação deliberada, válida porque a caixa só se move numa área pequena e plana (mesmo
  raciocínio já aceito pros bichos da lagoa: "a curvatura do planeta nessa escala é desprezível").
- **Decisão de reduzir o risco da caixa, sem abandoná-la**: distância de empurrão curta (~2,1
  unidades, ângulo de 0,3 rad × `VENUS_RADIUS=7`), massa maior que o avatar (3× — precisa de esforço
  deliberado pra mover, reduz chance de a caixa "voar" com um esbarrão acidental), fricção alta
  (0,8) e restituição zero (sem quique). Gatilho de conclusão é automático (a caixa chegando na
  zona-alvo), não tecla E — a própria física resolvendo o puzzle já é a confirmação.
- **Circuito em ordem NÃO usa proximidade pura** (diferente da 1ª versão considerada) — usa tecla
  E, mesmo padrão "Pressione E" já usado pelos 3 landmarks do lab-180 (hint próprio, alpha
  0/1 por proximidade, checado dentro de `handleInteractPress`). Só o hint do PRÓXIMO pedestal
  esperado acende — reduz a chance de a criança apertar E no pedestal errado sem entender por quê.
  Pisar/apertar fora de ordem reseta o progresso (feedback visual, sem punir recompensa nenhuma,
  mesmo espírito de "erro não pune" do lab-180).
- **Coleta de pergaminhos reaproveita 100% o padrão de moedas** (`coins`) — array PRÓPRIO
  (`scrollMarkers`, não currency), mesma coleta por proximidade ao andar por cima.
- **Planeta priorizado: Vênus** — nível 3 (bem cedo na progressão, mas depois de Mercúrio pra não
  competir com o timer de sobrevivência de lá), sem timer de sobrevivência próprio, sem mecânica
  especial dedicada ainda (diferente de Marte/combate, Mercúrio/Netuno/timer). Posições dos 3
  landmarks continuam a MESMA espiral de ângulo de ouro das escolinhas (índices 0-5)/baú (índice
  6) — índices 7/8/9, phi escolhido por inspeção (mesma convenção informal já aceita pelo lab-180,
  sem varredura exaustiva de colisão contra rochas/moedas espalhadas).

## Decisão de escopo

Confirmada com o usuário via `AskUserQuestion` (2 perguntas): Lab 200 (não mais uma peça do Lab
198), depois o plano concreto (3 mecânicas específicas + Vênus como planeta, mantendo a caixa
física em vez de trocar por uma versão sem física de verdade). Fora de escopo: repetir a
implementação do lab-180; "abrir portas por padrões" (não pedido pelo Lab 200); estender a
mecânica pra mais de 1 planeta (o item pede "planeta priorizado", singular).

## Funcionalidades planejadas

- [x] Tipo `kind` estendido com `push_object`/`circuit_order`/`reading_collect` (`App.tsx` ×2,
  `World3D.tsx` ×1) + allowlist do servidor (`server-accounts/src/domain.ts`,
  `LEARNING_CHALLENGE_KINDS`) + testes novos (`domain.test.ts`).
- [x] Empurrar/alinhar objeto: caixa física dinâmica + zona-alvo, gravidade radial manual
  reaproveitando a técnica do avatar, conclusão automática ao chegar na zona.
- [x] Ligar circuito em ordem: 3 pedestais, tecla E, ordem 1→2→3, reset sem punição se errar.
- [x] Coletar leitura ambiental: 3 pergaminhos, coleta por proximidade (mesmo padrão de moedas).
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (13ª lab seguida — mesma limitação exata). Documentado abaixo; confiado em `tsc`/testes/build +
  leitura de código cuidadosa — risco HONESTAMENTE elevado nesta lab especificamente por causa da
  caixa física (primeiro corpo dinâmico não-avatar do jogo, nunca testado ao vivo).

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` (app) limpo; `npm run test -- --run` (app): 257/257 (sem
mudança — nenhuma lógica de domínio nova no cliente, só objetos físicos/gatilho de proximidade);
`npm run test` (server-accounts): 169/169 (3 novos, `isValidLearningChallengeKind` pros 3 kinds
novos); `npm run build` (app) sem erros; `npm run lint` (oxlint) sem warning novo (os 2 warnings
existentes são anteriores a esta lab).

Pontos conferidos por leitura:

- **`body.applyForce` já usado pelo avatar com a mesma assinatura** — `PhysicsBody.applyForce(force,
  contactPoint)`, confirmado por uso já existente no arquivo (avatar, `mass: 1`,
  `force = down.scale(-GRAVITY)`). Pra massa 3, força escalada por `GRAVITY * mass` reproduz a
  MESMA aceleração gravitacional (16 m/s²) independente da massa do corpo — física newtoniana
  básica (F=ma), consistente com o comportamento do avatar.
- **`onOpenEnvironmentalChallengeRef`/`selectEnvironmentalChallengeQuest` acessíveis de fora de
  `handleInteractPress`**: confirmado que ambos vivem no mesmo escopo de `setup()`, já usados em
  outros pontos do arquivo fora do dispatcher de tecla E (ex. o gatilho do `ponte-logica` do hub de
  mini-jogos) — meu gatilho automático da caixa física (fora de `handleInteractPress`, no laço de
  física principal) segue o mesmo padrão já estabelecido.
- **`handleEnvironmentalChallengeCorrect` (`App.tsx`) não precisou de nenhuma mudança**: o bônus de
  troféu do centro de jogos (backlog "Lab 217") só dispara quando `kind === 'bridge'` — meus 3
  kinds novos NÃO entram nessa checagem de propósito (são uma feature separada, não alimentam o
  sistema de troféu de Lógica do centro de jogos).
- **`trackLearningChallengeStarted`/`trackLearningChallengeCompleted` já aceitavam `kind: string`**
  (não um union estreito) — nenhuma mudança de assinatura necessária no lado de analytics do
  cliente, só a allowlist do servidor.

## Rodada de review — Copilot (PR #93)

**Rodada 1**: 3 achados reais (2 comentários inline formais + 1 achado só no resumo em texto),
confirmados e corrigidos:

1. **Médio — pressionar E de novo num pedestal JÁ ativado não fazia nada**: confirmado contra o
   código — `if (ped.activated) continue` pulava pedestais já feitos SEM checar distância, então
   apertar E de novo num pedestal já ativado (esperando um índice diferente) não caía nem no ramo
   de acerto (não é o próximo) nem no de erro (pulado pelo `continue`) — nada acontecia, ao
   contrário da regra declarada ("qualquer fora de ordem reseta"). Corrigido removendo o `continue`:
   `i === circuitNextIndex` já distingue certo/errado sozinho, sem precisar checar `activated`.
2. **Médio — comentários descreviam ativação por proximidade, código usa tecla E**: confirmado —
   a declaração de `circuitPedestals` (e mais 2 lugares) ainda dizia "ativados por PROXIMIDADE (não
   tecla E)", sobra da primeira versão do design (trocada por E durante a implementação, sem
   atualizar todos os comentários). Corrigido, confirmado por busca que não sobrou nenhuma menção.
3. **Médio (só no resumo) — gatilho da caixa física podia disparar com outro modal já aberto**:
   confirmado — a checagem de conclusão da caixa vivia no mesmo bloco INCONDICIONAL das luas
   (backlog "Lab 197", roda sempre, mesmo suspenso — decisão correta PRA ANIMAÇÃO COSMÉTICA, mas
   errada pro GATILHO de recompensa). `activeEnvironmentalChallenge !== null` já faz parte de
   `suspendTriggers` (`App.tsx`) — sem guarda, a caixa podia assentar na zona-alvo enquanto outro
   desafio ambiental já estava aberto (ex. a placa), e `onOpenEnvironmentalChallengeRef`
   sobrescreveria `activeEnvironmentalChallenge` por baixo do modal em uso, arrancando a pergunta
   que a criança já respondia. Corrigido: a FORÇA da caixa continua incondicional (mantê-la
   "assentada" é inofensivo), só o GATILHO da recompensa ganhou `!suspendRef.current`.
4. **Baixo — documentação de analytics desatualizada**: `docs/event-catalog.md` e o comentário de
   `productAnalytics.ts` perto de `trackLearningChallengeStarted` ainda só citavam
   `bridge`/`rocket_fuel`/`plaque`. Atualizados pra incluir os 3 kinds novos.

`npx tsc -b`, `npm run test -- --run` (app, 257/257), `npm run test` (server-accounts, 169/169) e
`npm run build` seguem limpos depois das 4 correções.

**Risco remanescente, honesto (mais alto que labs anteriores desta sessão)**: a caixa física é o
PRIMEIRO corpo dinâmico não-avatar deste jogo — nunca testada ao vivo, nem aqui nem em nenhum lab
anterior. Cenários de falha possíveis não descartáveis só por leitura de código: a caixa pode
tombar/girar de um jeito visualmente estranho ao ser empurrada (é uma caixa retangular, não uma
esfera — rotação em torno de eixos além do "down" fixo não é impedida); a caixa pode ficar "presa"
contra uma rocha vizinha não verificada por varredura exaustiva (mesma classe de risco de colisão
já aceita pelos outros landmarks); a distância de conclusão (0,7 unidade) pode ser generosa ou
apertada demais sem confirmação visual. Mitigado (não eliminado) pela distância de empurrão curta,
massa/fricção altas, e restituição zero — mas o critério de aceite do próprio item ("fisica
instavel" como risco nomeado) só seria totalmente resolvido com teste ao vivo, indisponível nesta
sessão.
