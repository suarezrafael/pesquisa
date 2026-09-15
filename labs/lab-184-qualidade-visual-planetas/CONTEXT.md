# Contexto — Laboratório 184 — Qualidade visual dos planetas e mundo

Preenchido em: 2026-09-15
Commit inicial → final: 2c8df5ab8867c5b0e581106dc2444350bdb0323e..(commit deste lab, ver PR)

## O que foi feito

Passe de art direction nos 7 planetas-destino (`World3D.tsx`), seguindo o escopo literal do
backlog ("materiais, escala, iluminação, landmarks, silhuetas... não redesenho completo, só
lacunas concretas"). Investigação prévia (leitura das 7 funções `build*IfNeeded`, documentada em
`FEATURES.md`) achou que 5 dos 7 já tinham identidade visual sólida (Marte, Mercúrio, Vênus,
Saturno, planeta principal) — só 2 gaps concretos justificavam código novo:

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
do anel de Saturno e das manchas existentes) e reaproveitam materiais/geometria já pagos no
arquivo — nenhuma textura nova, nenhum asset externo, nenhuma malha de alta contagem de triângulos.

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
  rasos) — o aumento de contagem de malha é uma fração do que already existe por planeta. Rodar o
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

- Nenhuma das planejadas — verificação mobile ficou como pendência registrada acima, não como
  item descartado (o `FEATURES.md` original já previa essa possibilidade dada a limitação
  conhecida de ferramental).

## O que o próximo laboratório deve desenvolver

Não há um próximo item numerado claro no `docs/growth-retention-monetization-backlog.md` além do
que já foi mapeado nos labs 176-184 (a "ordem sugerida" do documento, seção 12, termina em "Lab
186 - Playtest guiado criança + responsável", que é pesquisa com usuário real, fora de escopo de
laboratório de código). Sugestão: revisar `docs/growth-retention-monetization-backlog.md` (seções
7-8) e `docs/market-metrics-engagement-backlog.md` por qualquer item ainda não mapeado num lab, ou
perguntar ao usuário a próxima prioridade.

## Estado do repositório ao final

- Branch: `lab-184-qualidade-visual-planetas` (a mesclar em `main` via PR).
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (208/208, inalterado).
  - `cd app && npm run build` (build de produção limpo).
  - `cd app && npm run dev`, viajar de foguete pra Urano (anel), Júpiter (2 manchas) e Netuno
    (mancha escura + nuvem clara) — ou ver as capturas em
    `labs/lab-184-qualidade-visual-planetas/evidencias/`.
