# Contexto — Laboratório 146 — Óculos de RV deformando o avatar na lojinha

Preenchido em: 2026-09-03
Commit inicial → final: 63ddead7cd7a081fced378973496c8f10615767e..HEAD

## O que foi feito

Achada e corrigida a causa raiz de um bug reportado numa sessão anterior ("avatar deformado" ao
equipar óculos na lojinha), confirmado nesta sessão com detalhes do usuário: qualquer aparelho, só
o item "Óculos de Realidade Virtual" (`oculos_rv`, `shape: 'vr'`), só na tela da lojinha, não
dentro do jogo.

`app/src/world3d/studentFigure.ts`, função `applyGlasses`, ramo `shape === 'vr'`: a peça pensada
como "correia" (a tira que prende o óculos de RV na cabeça) era um `MeshBuilder.CreateCylinder`
com `height: 0.05, diameter: 0.34`, girado 90° no eixo X. Isso NÃO cria um aro/correia — cria um
disco SÓLIDO virado de frente pra câmera (girar um cilindro 90° no X faz o eixo de simetria dele,
que nasce em Y, apontar pra Z; as faces circulares do cilindro passam a encarar a câmera em vez de
ficarem em cima/embaixo). Com diâmetro 0.34 — maior que a própria cabeça (esfera de diâmetro 0.32)
— esse disco sobrava pra fora do contorno da cabeça em todas as direções, criando o efeito de
"deformado"/clutter extra visível. Trocado por `MeshBuilder.CreateTorus` (sem rotação nenhuma — o
eixo do "buraco" de um torus já nasce em Y, exatamente o formato certo pra um aro na altura dos
olhos), com diâmetro 0.2 (perto do raio local da cabeça naquela altura, ~0.093×2, não do diâmetro
total da cabeça) e espessura do tubo 0.028.

## Decisões técnicas tomadas

- **Por que só aparecia na lojinha, não dentro do jogo**: câmera do jogo principal fica longe do
  personagem (visão 3ª pessoa padrão) — um disco levemente maior que a cabeça, atrás dela, é pouco
  perceptível a essa distância/ângulo, principalmente porque a câmera raramente olha por trás. Já
  a lojinha (`AvatarPreview3D.tsx`) usa uma câmera livre BEM mais perto (`lowerRadiusLimit = 1.4`,
  câmera inicial em 2.6) com giro automático e arraste manual (lab-118) — dá pra ver o boneco de
  qualquer ângulo, inclusive os que expõem o disco sobrando atrás da cabeça. Mesma peça, mesma
  cena reaproveitada (`applyGlasses` é chamado tanto pelo mundo principal quanto pelo preview) —
  não é um bug exclusivo da lojinha, só um bug muito mais VISÍVEL lá.
- **Não investigado por reprodução visual ao vivo** — o ambiente de automação de navegador nesta
  sessão continua com a mesma limitação documentada nos labs 140-142 (`document.hidden = true`
  mesmo com `document.hasFocus() = true`, impedindo o `requestAnimationFrame` do Babylon de rodar;
  desta vez nem a tela de carregamento do mundo 3D principal termina, então nem dava pra chegar na
  lojinha por essa via). A correção se apoiou inteiramente em análise geométrica das dimensões
  reais do código (cabeça: esfera de raio 0.16 centrada em y=1.15; peça antiga: disco de raio
  0.17), confiança alta o bastante pra aplicar sem confirmação visual — a peça antiga sendo maior
  que a cabeça inteira e virada de frente pra câmera (em vez de formar um aro) é inequívoco pela
  leitura da API do Babylon (`CreateCylinder` + rotação não produz um "aro", é sempre um disco
  sólido; só `CreateTorus`/`CreateRibbon` fariam isso).
- **Diâmetro do torus pensado pro raio LOCAL da cabeça na altura dos olhos** (`EYE_Y`), não pro
  raio máximo (equador) — a cabeça é uma esfera, então o contorno dela fica mais estreito perto do
  topo. Usar o raio do equador (0.16) deixaria a correia nova flutuando longe da cabeça nessa
  altura; o cálculo (`sqrt(0.16² - 0.13²) ≈ 0.093`) foi feito à mão a partir da geometria real do
  código, não chutado.

## Pendências / dívidas conhecidas

- **Não verificado visualmente** (ver acima) — recomendação pro usuário: testar em produção depois
  do deploy (equipar "Óculos de Realidade Virtual" na lojinha, girar a câmera do preview) e reportar
  se ainda tem algo estranho. Se persistir, o próximo passo seria comparar contra um screenshot
  real, não só a leitura do código.
- Limitação de ambiente de automação de navegador (rAF travado em aba "hidden") permanece
  documentada e sem solução nesta sessão — mesmo status dos labs 140-142, agora também bloqueando
  o carregamento do mundo 3D principal (antes só bloqueava depois de já estar carregado).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas — a única funcionalidade (corrigir a geometria) foi concluída; só a
verificação visual ficou pendente (ver acima).

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário. Aguardar confirmação de que o conserto resolveu o visual de verdade em
produção antes de considerar este item definitivamente fechado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc -b` (app): sem erros. `npm run test` (app): 99/99 (sem teste novo — mudança é geometria
  3D pura, sem lógica de domínio testável em isolamento, mesmo raciocínio de labs anteriores que
  tocaram `studentFigure.ts`).
- **Não verificado ao vivo** (ver Pendências) — tentativa real feita nesta sessão: perfil novo
  criado via onboarding automatizado, `localStorage` do perfil ativo alterado direto via console
  (`equippedGlassesId: 'oculos_rv'`) pra pular a exigência de assinatura ativa, página recarregada
  — mas a tela "Carregando o mundo 3D…" nunca terminou (mesma causa raiz: `document.hidden = true`
  trava o `requestAnimationFrame`). Sem outro caminho de reprodução visual disponível nesta sessão.
- Deploy: PR #17 mergeado em `main` (commit `530b180`). **Achado operacional novo, fora do escopo
  deste bug**: o workflow `CI` do GitHub Actions (o que faz `wrangler deploy` dos dois Workers)
  NUNCA disparou pra esse push em `main` — confirmado via `gh api .../actions/runs`, checado
  várias vezes ao longo de mais de 5 minutos, nenhuma `run` nova apareceu pra `head_sha =
  530b180...`, `head_branch = main`. Apesar disso, o FRONTEND já está atualizado em produção —
  confirmado de forma independente baixando o bundle real
  (`https://missaoaprendizado.com/assets/World3D-b5Jm1_hm.js`) e achando `CreateTorus` nele (API
  que só existe no código por causa deste laboratório) — o que sugere que o deploy do Vercel
  acontece por integração Git nativa dele, independente do passo `vercel --prod` do workflow `CI`.
  **Como este PR não mexeu em nenhum dos dois Workers, não há evidência de perda funcional real
  agora** — mas isso expõe um ponto cego: se o workflow `CI` parar de disparar silenciosamente,
  mudanças em `server-accounts`/`server-cf-relay` poderiam parecer "deployadas" (merge feito, site
  no ar) sem o Worker ter sido atualizado de verdade. Vale investigar na próxima vez que algo em
  `app/server-accounts` ou `app/server-cf-relay` mudar — confirmar o deploy do WORKER
  explicitamente (não só o `/health`, que responde mesmo com código antigo), e reportar ao usuário
  se o padrão se repetir.
