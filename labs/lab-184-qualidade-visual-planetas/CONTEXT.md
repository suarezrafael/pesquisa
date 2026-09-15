# Contexto — Laboratório 184 — Qualidade visual dos planetas e mundo

Preenchido em: 2026-09-15
Commit inicial → final: 2c8df5ab8867c5b0e581106dc2444350bdb0323e..(commit deste lab, ver PR)

## O que foi feito

Passe de art direction nos 7 planetas-destino (`World3D.tsx`), seguindo o escopo literal do
backlog ("materiais, escala, iluminação, landmarks, silhuetas... não redesenho completo, só
lacunas concretas"). Investigação prévia (leitura das 7 funções `build*IfNeeded`, documentada em
`FEATURES.md`) achou que 4 dos 7 planetas-destino já tinham identidade visual sólida (Marte,
Mercúrio, Vênus, Saturno) — o planeta principal (onde a criança nasce, FORA da lista de 7
"destino") também já estava conforme, mas não faz parte dessa contagem. Isso deixou 3 dos 7
planetas-destino com um achado real: Urano (sem landmark 3D nenhum) e o par Júpiter/Netuno
(morfologicamente quase gêmeos) — 2 gaps concretos justificaram código novo:

- **Urano ganhou um anel** (`ring`/`ringMat`, dentro de `buildUranusIfNeeded`) — antes deste lab,
  Urano era o único planeta-destino sem NENHUM landmark 3D, só uma rotação sutil de textura (o
  chão girado 90° pra sugerir o eixo "deitado" real de Urano, do lab-114) que exige conhecimento
  astronômico prévio pra notar em 5 segundos. Reaproveita EXATAMENTE a técnica do anel de Saturno
  (`CreateTorus` achatado em `scaling.y`), com raio/opacidade menores e cor mais escura/acinzentada
  — real pra Urano (que tem anéis finos e escuros, bem menos icônicos que os de Saturno, mas
  reais). O anel recebe a MESMA `rotationQuaternion` já aplicada ao chão (eixo "deitado"), pra
  aparecer quase vertical/de perfil em vez de horizontal — de Urano de verdade, os anéis aparecem
  assim por causa do mesmo tombamento de eixo de ~98°.
- **Júpiter ganhou a Oval BA** ("Pequena Mancha Vermelha" — tempestade real formada em 2000, ainda
  visível hoje, oficialmente batizada como companheira mais jovem da Grande Mancha Vermelha) e
  **Netuno ganhou a nuvem clara "Scooter"** (cirros branco real, fotografado pela Voyager 2 em 1989
  viajando ao lado da Grande Mancha Escura) — antes deste lab, os dois gigantes gasosos "decalque
  only" eram morfologicamente quase gêmeos (faixas + 1 mancha oval fixa cada, diferindo só em
  cor/tamanho). A combinação final (Júpiter: 2 manchas avermelhadas; Netuno: 1 mancha escura + 1
  nuvem clara) dá uma silhueta bem mais distinguível entre os dois num relance rápido. Ambos
  reaproveitam a MESMA técnica de decalque (`PBRMaterial` + `CreateCylinder` raso alinhado à
  superfície) já usada pelas manchas principais — nenhuma técnica nova.

Todos os 3 landmarks novos são estritamente decorativos (sem `PhysicsAggregate`, mesma convenção
do anel de Saturno e das manchas existentes) e reaproveitam a MESMA TÉCNICA/TIPO de geometria já
paga no arquivo (`PBRMaterial` + `CreateTorus`/`CreateCylinder`, os mesmos tipos usados pro anel
de Saturno e pelas manchas existentes) — cada um É um `PBRMaterial` e uma malha NOVOS (instâncias
próprias, não reaproveitadas de outro planeta), mas nenhuma textura nova, nenhum asset externo,
nenhuma malha de alta contagem de triângulos.

**Verificado ao vivo, com screenshot real, os 3 planetas alterados** — ver
`labs/lab-184-qualidade-visual-planetas/evidencias/`:
- `urano-anel.jpg` — anel fino escuro visível arqueando sobre o planeta, no plano vertical certo.
- `jupiter-grande-mancha-vermelha.jpg` / `jupiter-oval-ba.jpg` — as duas manchas avermelhadas,
  separadas, com a Oval BA visivelmente menor que a principal.
- `netuno-nuvem-scooter.jpg` / `netuno-nuvem-scooter-2.jpg` — a nuvem branca clara, bem distinta
  do fundo azul-marinho escuro do planeta. A Grande Mancha Escura em si (existente desde lab-114,
  não alterada por este lab) ficou confirmada por posição/cor via `scene.getMeshByName(...)`, mas
  não apareceu claramente distinguível a olho nu nos ângulos fotografados — sua própria cor escura
  (`albedoColor` quase preto-azulado) se camufla contra a superfície igualmente escura de Netuno
  nesses ângulos, o que é, na verdade, consistente com a dificuldade real de fotografar a Grande
  Mancha Escura original (a Voyager 2 precisou de processamento de imagem especial em 1989) — não
  é um bug introduzido por este lab, e a mancha em si não foi tocada.

`npx tsc -b` limpo; testes: app 208/208 (inalterado — mudança é geometria/material 3D puro, sem
lógica de domínio isolável, mesma classe de mudança dos labs 113/114 que criaram esses planetas).
`npm run build` sem regressão de bundle.

## Decisões técnicas tomadas

- **Zero achado nos 5 planetas já conformes (Marte/Mercúrio/Vênus/Saturno/principal) — não
  mexidos.** O backlog pede corrigir lacunas concretas, não redesenhar o que já funciona; mexer
  neles sem um achado real seria escopo além do que a auditoria prévia justificou.
- **Reaproveitar a técnica do anel de Saturno pro anel de Urano, incluindo a MESMA rotação já
  aplicada ao chão de Urano.** Alternativa considerada e descartada: um anel "genérico" alinhado
  ao `landingUp` padrão (como o de Saturno) — ficaria astronomicamente errado (os anéis de Urano
  são conhecidos por aparecerem quase de perfil por causa do tombamento extremo do eixo), e mais
  importante, ficaria DESALINHADO com a orientação vertical das faixas já implementada no chão,
  quebrando a coerência visual entre chão e anel.
- **Achados de tempestades REAIS (Oval BA, Scooter) em vez de elementos inventados.** Ambos são
  fenômenos documentados de verdade (Oval BA: NASA/Hubble desde 2000; Scooter: Voyager 2, 1989) —
  mantém a mesma linha educativa do resto do jogo (astronomia real, não fantasia), e dá um motivo
  concreto e verificável pra cada escolha de cor/posição.
- **Não medir o benchmark de FPS de novo.** Os landmarks novos são do MESMO tipo/custo exato de
  elementos decorativos que já existiam nesses planetas (mais 1 torus decorativo, mais 2 decalques
  rasos) — o aumento de contagem de malha é uma fração do que já existe por planeta. Rodar o
  benchmark sintético de novo não testaria nada de relevante (ele mede a cena de SPAWN, não os
  planetas-destino, que só carregam sob demanda ao visitar) — análise de código já é suficiente
  confiança pra essa escala de mudança.

## Pendências / dívidas conhecidas

- **Verificação em viewport mobile não feita** — mesma limitação conhecida de labs anteriores
  (177/178): as ferramentas de automação de navegador desta sessão não expõem emulação de
  dispositivo/viewport móvel de forma confiável para este jogo (canvas WebGL). Os 3 landmarks
  novos são geometria simples (torus/decalque raso) sem dependência de resolução de tela, então o
  risco de regressão específica de mobile é baixo, mas fica registrado como não verificado.
- **Achado ambiental desta sessão, não deste lab**: a automação de navegador via extensão Chrome
  reporta `document.visibilityState` como `"hidden"` mesmo com a aba em foco real, o que trava a
  configuração inicial do jogo (`benchmarkIsWeakGpu`/`gpuTier` preso em `'pending'` pra sempre, sem
  isso). Contornado nesta sessão sobrescrevendo `document.visibilityState`/`document.hidden` via
  `Object.defineProperty` + `dispatchEvent(new Event('visibilitychange'))` antes de cada carga de
  página. Depois disso, o loop de render do Babylon.js (`engine.runRenderLoop`, baseado em
  `requestAnimationFrame`) continua efetivamente pausado por trás das cenas mesmo com a aba
  "visível" pra JS — não avança sozinho com o tempo real. Contornado chamando `scene.render()`
  manualmente em laço, com `engine.getDeltaTime` sobrescrito pra um valor fixo, pra simular
  quadros/tempo decorrido sem depender do `rAF` real (viagens de foguete, coleta de moeda,
  animações). Isso já tinha sido documentado antes nesta sessão num comentário de código
  (`World3D.tsx`, `refreshRanking`) — não é um achado novo, mas a técnica de contorno (forçar
  `scene.render()` com `getDeltaTime` sobrescrito) não estava documentada em lugar nenhum antes
  desta verificação e vale registrar pra sessões futuras de QA visual: **cuidado ao "avançar o
  tempo" assim em planetas com `hasSurvivalTimer` (Mercúrio/Netuno)** — um único quadro REAL que
  escape do throttle do Chrome depois de ficar muito tempo suspenso pode chegar com um
  `getDeltaTime()` real gigante (acumulado), drenando o cronômetro de sobrevivência inteiro de uma
  vez; a mitigação usada foi sobrescrever `engine.getDeltaTime = () => 0` (congelando todo avanço
  de tempo, inclusive de quadros reais que escapem) durante a janela entre teleportar o avatar pra
  longe do foguete de retorno e capturar a screenshot.

## Funcionalidades planejadas que NÃO foram concluídas

- **Verificação em viewport mobile** (item do `FEATURES.md` original, `[ ]` — continua não
  concluída) — as ferramentas de automação de navegador desta sessão não expõem emulação de
  dispositivo/viewport móvel de forma confiável pra este jogo (canvas WebGL), mesma limitação
  conhecida dos labs 177/178. Não migra pro próximo lab como item de escopo (os 3 landmarks são
  geometria simples sem dependência de resolução, risco de regressão mobile considerado baixo) —
  fica só registrada como não verificada, não como pendência ativa a resolver.

## O que o próximo laboratório deve desenvolver

Não há um próximo item numerado claro no `docs/growth-retention-monetization-backlog.md` além do
que já foi mapeado nos labs 176-184 (a "ordem sugerida" do documento, seção 12, termina em "Lab
186 - Playtest guiado criança + responsável", que é pesquisa com usuário real, fora de escopo de
laboratório de código). Sugestão: revisar `docs/growth-retention-monetization-backlog.md` (seções
7-8) e `docs/market-metrics-engagement-backlog.md` por qualquer item ainda não mapeado num lab, ou
perguntar ao usuário a próxima prioridade.

## Review automático do Copilot (PR #65)

- **Rodada 1** (2 reviews consecutivas do mesmo pedido, tratadas juntas): 4 achados reais. (1) O
  mais sério: `spot2Dir` (Oval BA de Júpiter) ficava a ~158° da direção da Grande Mancha Vermelha
  (praticamente no hemisfério oposto do planeta) — como a câmera em terceira pessoa só mostra o
  hemisfério local ao redor do jogador, um pouso normal em Júpiter só revelava UMA das duas
  manchas por vez, quebrando o objetivo de uma silhueta "2 manchas" reconhecível de relance.
  Corrigido reposicionando `spot2Dir` de `(-0.35, 0.55, -0.6)` pra `(0.85, 0.2, 0.4)` — agora ~39°
  de separação da mancha principal, longe o bastante pra não sobrepor os dois decalques, perto o
  bastante pra aparecerem juntos numa exploração normal a partir do pouso. (2) Uma palavra em
  inglês ("already") no meio de uma frase em português no `CONTEXT.md` — corrigida pra "já". (3)
  O checklist do `FEATURES.md` marcava "[x] verificação dos 7 planetas" mas só 3 foram
  fotografados de verdade — dividido em 2 itens separados (3 alterados = feito com evidência; os
  outros 4, não tocados por este lab, explicitamente marcados como não re-verificados, com a
  justificativa de que o critério do backlog se aplica a um lab que mexe nos 7, não a este). (4)
  O item de performance dizia "conferir... contra o benchmark de FPS real", mas o texto logo
  abaixo já deixava claro que nenhum benchmark foi rodado de novo, só análise de código —
  reescrita a frase do próprio checklist pra bater com o que foi realmente feito.
- **Rodada 2**: 2 achados reais, ambos de precisão da própria documentação da rodada 1. (1) A
  seção "Funcionalidades planejadas que NÃO foram concluídas" dizia "Nenhuma das planejadas" mas
  o `FEATURES.md` continua com a verificação mobile marcada `[ ]` — contradição real entre as
  duas seções; corrigido listando a verificação mobile explicitamente aqui como não concluída
  (mas não migrada como pendência ativa, pelo mesmo motivo já registrado: risco baixo, limitação
  de ferramental já conhecida). (2) O parágrafo de abertura contava "5 dos 7" planetas conformes
  incluindo o planeta principal na lista — mas o planeta principal está EXPLICITAMENTE fora da
  contagem de "7 planetas-destino" (é o planeta de nascimento, não um destino de viagem), então a
  conta certa é 4 dos 7 destinos conformes (Marte/Mercúrio/Vênus/Saturno) + o planeta principal
  separadamente (já conforme, mas fora dessa lista de 7). Corrigido o parágrafo de abertura pra
  separar as duas contagens.
- **Rodada 3**: 2 achados reais. (1) A frase "reaproveitam materiais/geometria já pagos no
  arquivo" era enganosa — o código cria, sim, 3 `PBRMaterial`/malhas NOVOS (`uranusRing`,
  `jupiterOvalBA`, `neptuneScooterCloud`), só a TÉCNICA/TIPO é reaproveitada (mesmo padrão
  `PBRMaterial` + `CreateTorus`/`CreateCylinder` já usado pro anel de Saturno e pelas manchas
  existentes), não os objetos em si; corrigido pra deixar essa distinção explícita. (2) A
  descrição da PR no GitHub ainda não tinha sido atualizada com a contagem corrigida da rodada 2
  ("5 dos 7" incluindo o planeta principal) — reconciliada junto com a mesma correção de
  materiais/malhas novos vs. técnica reaproveitada.
- **Rodada 4**: 0 achados novos — veredito "precisa de revisão humana" repetindo só a pendência
  já registrada (verificação mobile), sem nenhum comentário novo (0 inline, 0 no corpo). Mesmo
  padrão já visto em labs anteriores (ex. lab-177/PR #52, rodadas 4/6) quando a única pendência
  restante é uma limitação de ferramental já disclosed — tratado como convergido, sem ação nova.

## Estado do repositório ao final

- Branch: `lab-184-qualidade-visual-planetas` (a mesclar em `main` via PR).
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (208/208, inalterado).
  - `cd app && npm run build` (build de produção limpo).
  - `cd app && npm run dev`, viajar de foguete pra Urano (anel), Júpiter (2 manchas) e Netuno
    (mancha escura + nuvem clara) — ou ver as capturas em
    `labs/lab-184-qualidade-visual-planetas/evidencias/`.
