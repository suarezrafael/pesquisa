# Contexto — Laboratório 13 — Bonecos 3D na lojinha (não só cor de avatar)

Preenchido em: 2026-08-16
Commit inicial → final: 405153d..312f15d

## O que foi feito

Pedido do usuário: "crie uma lojinha pra trocar moedas de opções de bonecos 3d pra trocar não só
de avatar." A lojinha já existia (lab-08), mas cada item do catálogo só recolorria a camisa do
mesmo boneco humano — não mudava a forma.

1. **`src/data/avatars.ts`** — cada `AvatarOption` ganhou um campo `features: BonecoFeatures`
   (`earStyle`, `tailStyle`, `special`, `accentColorRgb`), dado puro sem tipo do Babylon (mesmo
   padrão do resto do arquivo, `docs/prompts/03-arquitetura-sistema.md` §1). Definido pra cada um
   dos 12 avatares já existentes, combinando com o tema do emoji/nome:
   - raposa: orelhas triangulares + rabo peludo
   - gato: orelhas triangulares + rabo fino
   - panda: orelhas redondas pretas
   - sapo: olhos grandes no topo da cabeça
   - unicórnio: chifre + rabo peludo dourado/creme
   - tigre: orelhas triangulares + rabo com tufo
   - coruja: orelhas em tufo + bico
   - coala: orelhas redondas grandes
   - lobo: orelhas triangulares + rabo peludo branco
   - leão: juba (10 espigões ao redor da cabeça) + rabo com tufo
   - dragão: 2 chifres + rabo com tufo
   - polvo: 3 tentáculos pendurados da cabeça
2. **`World3D.tsx`** — `applyBonecoFeatures(figure, features, scene, shadowGenerator)`: descarta
   peças antigas (`figure.accessories`) e monta as novas a partir de primitivas (cone/cilindro/
   esfera/cápsula), parentadas em `figure.root` (mesmo padrão de mochila/cabelo — offset absoluto,
   não aninhado na cabeça). `StudentFigure` ganhou o campo `accessories: Mesh[]` pra rastrear o que
   descartar na próxima troca.
3. **Fio até a UI** — aplicado na criação do boneco do jogador e dos jogadores remotos
   (multiplayer local, `ensureRemotePlayer`), e no hook `__setAvatarShirtColor` (que já existia
   pra recolorir a camisa ao trocar de avatar em cena — agora também remonta as peças).
   `AvatarShop.tsx` não precisou mudar: já chama `onEquip(avatar.emoji)`, que já disparava esse
   hook.

## Decisões técnicas tomadas

- **Reaproveitar a lojinha/fluxo de compra existente** (lab-08), não criar um sistema novo —
  o pedido do usuário foi "trocar não só de avatar", não "criar uma segunda loja"; o catálogo já
  era temático de animais, só faltava a forma 3D bater com o tema.
- **Peças descartáveis e remontáveis** (`figure.accessories`), não um boneco por avatar construído
  do zero — mais barato (não reconstrói torso/pernas/braços/animação a cada troca) e mantém uma
  única fonte de verdade pro "rig" base (`buildStudentFigure`), com as peças de tema como uma
  camada por cima.
- **NPCs sem avatar de jogador** (professor, gente da piscina, pedestres) não ganharam
  `applyBonecoFeatures` — o pedido é sobre o boneco que O JOGADOR escolhe, não sobre variar todo
  personagem da cena; manter isso fora do escopo evita inflar o trabalho sem necessidade.

## Pendências / dívidas conhecidas

- Jogadores remotos: se alguém trocar de avatar NO MEIO da sessão multiplayer, o boneco remoto
  só reflete isso quando reconecta/é visto pela primeira vez — `ensureRemotePlayer` só monta a
  figura uma vez. Essa é uma limitação PRÉ-EXISTENTE (a cor da camisa já tinha o mesmo
  comportamento antes deste lab), não algo introduzido aqui; documentando porque agora fica mais
  perceptível (peças 3D chamam mais atenção que só cor).
- Não testei especificamente o fluxo "comprar um avatar bloqueado → equipar" nesta sessão (o
  perfil de teste já tinha alguns avatares desbloqueados de sessões anteriores) — mas a lógica de
  compra (`onUnlock`) não foi tocada por este lab, só a de equipar (`onEquip`/
  `__setAvatarShirtColor`), que é a mesma independente de como o avatar foi desbloqueado. Vale um
  playtest humano confirmando o fluxo de compra do zero.
- Sem pré-visualização 3D dentro do grid da lojinha (só o emoji) — explicitamente fora de escopo.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as 4 planejadas em `FEATURES.md` foram concluídas e verificadas.

## O que o próximo laboratório deve desenvolver

Nenhum pedido novo surgiu nesta sessão além do que já estava na fila. Segue pendente (nenhum
tocado neste lab):
1. Ruas e carros andando no mundo.
2. Uma loja que dá pra entrar (interior navegável).
3. Trovão/raio como parte do clima dinâmico.

Mais os itens de backend/conta (auth, parental gate, pagamento) identificados na revisão de
`prompt.md` feita numa sessão anterior — ver `labs/lab-12-chat-seguro/CONTEXT.md`.

Confirmar com o usuário a prioridade antes de começar o próximo.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` — PR
  aberto: https://github.com/suarezrafael/pesquisa/pull/new/worktree-abstract-wobbling-owl).
- Como rodar/verificar: `cd app && npm install && npm run dev`, abrir a lojinha de avatares (ícone
  no HUD) e trocar entre avatares — o boneco em cena deve mudar de forma (orelhas/rabo/etc.), não
  só de cor. `window.__playerFigure.accessories` (build de DEV) lista as peças atuais do boneco.
