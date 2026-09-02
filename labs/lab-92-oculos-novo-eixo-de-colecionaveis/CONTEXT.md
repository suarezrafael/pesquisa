# Contexto — Laboratório 92 — óculos: novo eixo de colecionáveis (free + assinatura)

Preenchido em: 2026-08-25
Commit inicial → final: 7ca02c5410b4c5a49d3925b8d3a3a2a72dd86798..HEAD

## O que foi feito
- **`app/src/data/glasses.ts`** (novo): catálogo com 4 itens — Óculos de Sol 😎 e Óculos Colorido
  🕶️ (10 moedas cada, formato `sunglasses`), Óculos de Realidade Virtual 🥽 (formato `vr`) e
  Óculos Holográfico ✨ (formato `sunglasses`, roxo) exclusivos de assinante.
- Novo eixo `equippedGlassesId`/`unlockedGlassesIds` seguindo EXATAMENTE o mesmo padrão já
  estabelecido pelo chapéu (lab-24) em todos os pontos: `types.ts`, `state/storage.ts` (default +
  `emptyProgress`), `state/progression.ts`/`useProgress.ts` (`unlockGlasses` via `unlockGeneric`,
  reaproveitado sem mudança), `state/useProfile.ts` (`equipGlasses`).
- **`app/src/world3d/studentFigure.ts`**: `applyGlasses()` — geometria nova mas simples (2 lentes
  esféricas achatadas + ponte pra óculos de sol; um visor retangular + tira cilíndrica pro modelo
  de RV), posicionada na altura dos olhos (`EYE_Y = 1.28`, mesma referência Y do acessório `eyes`
  de `applyBonecoFeatures`), na frente do rosto.
- **`app/src/world3d/World3D.tsx`**: os 7 pontos onde `hatId` aparece (figura local na montagem,
  `__setPlayerHat`, `useEffect`, `RemotePlayer.lastHatId`, criação do jogador remoto,
  `applyRemoteAppearance`, `appearanceKey`/`sendState`) ganharam o equivalente em `glassesId` —
  confirmado por `grep` comparando as duas listas linha a linha antes de considerar completo.
- **`app/src/world3d/multiplayer.ts`**: `RemoteState.glassesId` e `sendState(...)` ganharam o
  campo — como a função já usa `...appearance` no `JSON.stringify`, nenhuma mudança na construção
  do payload além de declarar o campo no tipo.
- **`app/src/world3d/AvatarPreview3D.tsx`**: prop `glassesId` nova, aplicada no boneco do preview.
- **`app/src/world3d/AvatarShop.tsx`**: nova aba "Óculos" entre "Chapéus" e "Roupas", com opção
  "Nenhum" — mesma estrutura JSX da aba de chapéus, com `GLASSES_CATALOG` no lugar de
  `HAT_CATALOG`.
- **`app/src/App.tsx`**: `equipGlasses`/`unlockGlasses` conectados de `useProfile()`/`useProgress()`
  até as props do `AvatarShop`.
- **`app/src/state/progression.test.ts`**: 2 testes novos (recusa de item `subscriptionOnly` com
  moedas suficientes; compra normal desconta o custo certo) — suíte total 36 testes.
- **`app/src/world3d/multiplayer.test.ts`**: ajustado (campo `glassesId` obrigatório novo no
  objeto de aparência do `sendState` de teste) — sem isso o `tsc -b` falhava.
- **Deploy em produção** do frontend (`npx vercel --prod --yes`). Sem mudança no relay nem no
  Worker de contas.

## Como o escopo foi decidido
Continuação do item 2 do pedido maior do usuário (lab-91: "mais itens colecionáveis, free +
assinatura"). Antes de escrever qualquer código, foi lido `docs/plano-comercial-backend.md` —
seção "Catálogo de cosméticos (Fase E)" já listava um plano completo de conteúdo novo, com boa
parte já construída ao longo dos labs 78-87 (criaturas, chapéus cobrindo todos os formatos, cores
de roupa) mas com alguns itens NUNCA implementados: chapéus com formato geométrico novo (mago,
headset, chifres de dragão), roupas com padrão/efeito emissive, mochila voadora animada, e
**óculos** (eixo de customização inteiro, nunca começado). Óculos foi escolhido como o item deste
laboratório por ser o único da lista que cabe inteiro numa iteração sem abrir uma frente de
trabalho nova (mesmo padrão já usado 5 vezes no projeto — chapéu/camisa/calça/sapato/mochila/
cabelo — só mais uma instância, zero abstração nova); os outros itens da lista (formato geométrico
novo, material com padrão/emissive, animação) cada um abriria uma frente de trabalho genuinamente
nova, maior que uma iteração — ficaram documentados como próximos passos possíveis.

## Como foi verificado
Verificação combinou UI e inspeção direta da cena 3D, não só captura de tela — a câmera do preview
3D da lojinha (`AvatarPreview3D.tsx`) gira automaticamente (`camera.alpha += 0.006` por quadro),
mas o `requestAnimationFrame` desse motor separado parece throttled no ambiente de automação do
navegador (screenshots segundos apart mostraram o mesmo ângulo, sem girar) — em vez de insistir
tentando capturar o ângulo certo, a verificação real foi feita consultando
`window.__playerFigure.glassesMeshes` diretamente via `javascript_tool` (esse debug hook já existe
desde antes, exposto só em `import.meta.env.DEV`): confirmado exatamente 3 malhas (2 lentes + 1
ponte) na posição (`x: ±0.09, y: 1.28, z: 0.14`) e cor (`[0.1, 0.1, 0.12]`, preto) esperadas depois
de equipar "Óculos de Sol", e `glassesMeshes.length === 0` depois de voltar pra "Nenhum" — mais
preciso que confiar só numa captura de tela do ângulo certo. Confirmado também na UI: compra
desconta moeda corretamente (500→490), os dois itens de assinante aparecem `🔒 Assinantes` sem
nenhum botão clicável (idêntico ao comportamento já existente dos outros eixos exclusivos).

**Não testado ao vivo**: visibilidade multiplayer (um segundo jogador conectado vendo os óculos do
primeiro). Isso exigiria duas abas do navegador + o relay local rodando (`VITE_RELAY_URL` não
configurado em dev, cai pra `localhost:3001`, que precisa do processo `npm run server` de pé) —
setup mais pesado que o resto da verificação deste laboratório. Confiança nesse ponto vem de
paridade de código com o mecanismo do chapéu (já comprovado funcionando ao vivo no lab-73) e do
tipo `RemoteState.glassesId` sendo obrigatório (não opcional) — uma chamada de `sendState` que
esquecesse o campo não compilaria, e o `tsc -b` está limpo. Registrado como pendência de
verificação explícita, mesmo padrão já usado no projeto pra outros efeitos visuais (ver
`labs/lab-73-.../CONTEXT.md`, que tem a mesma ressalva pra arma/efeito de ataque).

## Decisões técnicas tomadas
- **Geometria de óculos reaproveita só primitivas simples** (esfera achatada, caixa, cilindro) —
  mesmo vocabulário visual já usado em chapéu/acessórios, sem importar nenhum asset externo, no
  mesmo espírito "cartoon low-poly" documentado em `docs/plano-comercial-backend.md`.
- **Óculos posicionados usando a MESMA referência Y do acessório `eyes`** (`HEAD_Y + 0.13`) em vez
  de inventar uma constante nova — garante alinhamento visual consistente com criaturas que já têm
  olhos como acessório especial (sapo, robô) sem precisar testar caso a caso.
- **Nenhum item free "starter" (`cost: 0`) no catálogo de óculos** — diferente de chapéu/cores
  (que têm um item grátis desde o onboarding), óculos é 100% opcional por design: "Nenhum" já é o
  padrão gratuito, os dois itens compráveis custam moeda igual aos outros itens não-iniciais dos
  demais catálogos. `DEFAULT_UNLOCKED_GLASSES_IDS` fica sempre `[]` como consequência direta disso
  — mantido como constante (não hardcoded `[]` em `storage.ts`) só por consistência de padrão com
  os outros catálogos, mesmo sabendo que hoje sempre avalia vazio.

## Pendências / dívidas conhecidas
- Visibilidade multiplayer dos óculos não confirmada ao vivo (ver "Como foi verificado" acima).
- Resto do backlog de Fase E documentado em `docs/plano-comercial-backend.md` continua em aberto:
  chapéus com formato novo (mago/headset/chifres de dragão), roupas com padrão/emissive, mochila
  voadora animada.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo definido no `FEATURES.md` deste laboratório ficou de fora.

## O que o próximo laboratório deve desenvolver
Pela ordem do pedido maior do usuário (`labs/CURRENT.md`): item 3, o móvel "centro de estudo"/
carteira onde o boneco senta + acessa um catálogo de conquistas dedicado (não existe hoje — só a
lista de badges dentro do `RankingPanel`/`QuestListOverlay`). Depois: item 4, o brinde do chefe de
Marte (vira um colecionável exclusivo in-game, pesquisa de mercado já feita no lab-91). Se o
usuário não redirecionar, essa é a sequência.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Frontend deployado em produção (`https://missaoaprendizado.com`,
  `app-two-flax-92.vercel.app`) com o eixo de óculos.
- Como verificar: `cd app && npm run test` (36 testes) e `npx tsc -b` (limpo). Pra reproduzir a
  inspeção ao vivo: abrir o dev server, injetar um perfil/progresso com moedas via `localStorage`,
  abrir a lojinha → aba "Óculos", comprar/equipar, e consultar
  `window.__playerFigure.glassesMeshes` no console (disponível em `import.meta.env.DEV`).
