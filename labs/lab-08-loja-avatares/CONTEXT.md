# Contexto — Laboratório 08 — Lojinha de avatares

Preenchido em: 2026-08-16
Commit inicial → final: d9db7cf (fim do lab-07) .. HEAD (commit deste wrap)

## O que foi feito

1. **Catálogo de avatares como dado de domínio puro** (`src/data/avatars.ts`): cada entrada tem
   `id`, `emoji`, `name`, `cost` e `colorRgb` (tupla 0-1, **não** um `Color3` do Babylon — esse
   arquivo não importa nada de engine, seguindo `docs/prompts/03-arquitetura-sistema.md` §1, o
   mesmo padrão já usado em `data/quests.ts`). 6 avatares gratuitos (os originais: raposa, gato,
   panda, sapo, unicórnio, tigre) + 6 novos bloqueados (coruja 12, coala 15, lobo 20, leão 25,
   dragão 35, polvo 45) — preços calibrados contra o total de moedas ganhável no jogo hoje
   (~64 de missões + 14 do mapa ≈ 78), pra ficar alcançável mas não trivial.
2. **Entitlement de avatares em `Progress`**: novo campo `unlockedAvatarIds: string[]`. Saves
   antigos (sem esse campo) recebem o default (os 6 gratuitos) automaticamente, porque
   `loadProgress` já fazia `{ ...emptyProgress, ...saved }` — nenhuma migração manual necessária,
   confirmado testando com um save real do lab-07 (só tinha `coins`, sem o campo novo).
3. **Regra de compra pura** (`unlockAvatar` em `state/progression.ts`): recebe `Progress` +
   `avatarId`, devolve um novo `Progress` com moeda descontada e o avatar desbloqueado — ou o
   mesmo `Progress` sem mudança se o avatar não existir, já estiver desbloqueado, ou faltar
   moeda. A decisão de "pode comprar" mora aqui, não no componente React.
4. **Lojinha** (`world3d/AvatarShop.tsx`, aberta pelo novo botão 🎭 no `HudHeader`): grade 3x4
   com todo o catálogo. Cada item mostra emoji + nome, e um de três estados: "Em uso" (avatar
   ativo agora), botão "Usar" (desbloqueado, mas não é o ativo) ou botão de preço (bloqueado,
   desabilitado se a moeda for insuficiente).
5. **Troca de avatar em tempo real, sem reconstruir a cena 3D**: a cor da camisa do personagem
   (`shirtMat`, agora exposto na interface `StudentFigure`) é recolorida ao vivo via um hook
   exposto na própria cena (`scene.__setAvatarShirtColor`, mesmo padrão já usado pelo
   `__refreshPortals` do lab-06/07) — evitado reconstruir a cena inteira (custoso: física, HDRI,
   ~440 meshes) só para trocar uma cor. Um novo `useEffect` observa `profile.avatarEmoji` e chama
   esse hook.
6. **Bug de closure obsoleta corrigido de passagem**: o `sendState` do multiplayer (dentro do
   `useEffect` de montagem única, `[]`) capturava `profile.avatarEmoji` do primeiro render pra
   sempre — antes deste laboratório isso não importava porque o avatar nunca mudava depois do
   onboarding, mas agora que dá pra trocar teria feito outros jogadores continuarem vendo o
   avatar antigo. Corrigido com `profileRef` (mesmo padrão já usado por `progressRef` etc.).
7. **`Onboarding.tsx`** passou a puxar a lista de avatares gratuitos do catálogo
   (`AVATAR_CATALOG.filter(a => a.cost === 0)`) em vez de uma lista separada e duplicada.

## Testado (Chrome automatizado, `npm run dev`)

- Compra: com 50 moedas, comprei "Coruja" (12) — moeda foi de 50 para 38 no HUD e na lojinha,
  item passou de preço pra "Usar" imediatamente.
- Equipar: cliquei "Usar" na Coruja — item passou a mostrar "Em uso", ícone do avatar no HUD
  trocou pra 🦉. Confirmado por **leitura direta do material na cena** (`shirtMat.albedoColor`
  mudou pra `[0.4, 0.55, 0.58]`, cor exata do catálogo) e por **amostragem de pixel do canvas**
  (`getImageData` no local do torso, retornou uma cor azul-acinzentada consistente, não mais
  laranja) — necessário porque a screenshot da própria ferramenta de automação mostrou uma
  imagem visualmente desatualizada (ver pendência abaixo).
- Persistência: recarreguei a página — `profile.avatarEmoji` continuou `🦉`,
  `progress.unlockedAvatarIds` continuou incluindo `coruja`, e o personagem já nasceu com a cor
  certa na reconstrução da cena (confirma que o `avatarColorFromEmoji` lendo do catálogo também
  funciona no caminho de montagem inicial, não só no de atualização ao vivo).
- Estado "sem moeda": com 5 moedas, todos os itens de 15+ apareceram com o botão visivelmente
  acinzentado/desabilitado (`disabled`, estilo `.avatar-shop-action:disabled`).
- Console: sem erros em nenhuma das recargas testadas.
- `npx tsc -b`: passou limpo depois de um ajuste (`applyQuestCompletion` não estava propagando
  `unlockedAvatarIds` pro novo `Progress` — precisou de um `...progress` no spread).

## Decisões técnicas tomadas

- **Diferenciação por cor de camisa, não por corpo/acessório diferente** — mesmo padrão que já
  existia pros 6 avatares originais (raposa/gato/etc. já eram só recolorações do mesmo boneco).
  Manter consistência e menor custo de implementação. Ver pendência abaixo — pode não ser
  suficiente pra "sentir" como personagens de verdade diferentes.
- **`id` como chave primária no catálogo, `emoji` como chave visível/de exibição** — evita
  depender de igualdade de string de emoji como identidade de domínio (poderia mudar/ter
  variantes de fonte no futuro); `Profile.avatarEmoji` continua sendo "o que está equipado agora"
  porque é o que já era usado em todo o resto do código (HUD, multiplayer, construção do
  personagem) — trocar isso pra `avatarId` em todo lugar seria um refactor maior, fora do escopo
  do pedido.
- **Preços calibrados contra o total de moedas ganhável hoje** (~78) — não é uma escolha
  arbitrária, testado mentalmente contra o que o jogo já paga.

## Pendências / dívidas conhecidas

- **Diferenciação visual é só cor** — a filha do usuário pediu "outros personagens"; uma
  recoloração pode não parecer personagem novo o suficiente pra uma criança de 10 anos. Se o
  feedback confirmar isso, o próximo passo natural é variar também cabelo/mochila/algum acessório
  por avatar (ex.: chifre pro unicórnio, capacete pro robô-se-existir), não só o `shirtColor`.
- **Ferramenta de screenshot da automação de browser mostrou uma imagem visualmente desatualizada
  logo depois de trocar de avatar** (continuou mostrando a cor antiga por várias capturas mesmo
  chamando `scene.render()` manualmente várias vezes) — **mas o estado real da cena (material
  reatribuído, pixel de fato no canvas) estava correto o tempo todo**, confirmado por
  `getMaterialByName`/`getImageData`. Não é um bug do jogo, é uma limitação/cache da própria
  ferramenta de screenshot usada pra QA — registrar como lição pra próximas sessões: se uma
  mudança visual não aparecer numa screenshot logo após a ação, preferir confirmar por inspeção
  direta do estado (JS `getImageData`/leitura da cena) antes de concluir que há um bug real.
- Continuam de pé, sem mudança neste laboratório: trilha "rádio" nunca escutada de verdade,
  chat sem moderação, deploy real pendente, servidor de relay precisa ser iniciado manualmente.

## O que o próximo laboratório deve desenvolver

Sem pedido novo específico do usuário além do que foi implementado aqui. Antes de abrir o
próximo laboratório, vale:
- Mostrar a lojinha pra filha do usuário e perguntar se a recoloração já "parece" personagem
  novo o suficiente, ou se precisa de mais variação visual (acessórios/corpo).
- Revisitar as pendências antigas já listadas (trilha ouvida de verdade, deploy, moderação de
  chat) se o usuário priorizar isso.

## Estado do repositório ao final

- Branch: `main`
- Como rodar: `cd app && npm install && npm run server` (num terminal) `&& npm run dev` (em
  outro).
