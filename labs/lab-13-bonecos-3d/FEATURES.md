# Laboratório 13 — Bonecos 3D na lojinha (não só cor de avatar)

Status: em andamento
Início: 2026-08-16
Fim: -
Commit inicial: 405153db59dcac6b1c73de5c0652e44f174db70b

## Objetivo do laboratório
Pedido direto do usuário: "crie uma lojinha pra trocar moedas de opções de bonecos 3d pra trocar
não só de avatar." Hoje a lojinha (lab-08, `AvatarShop.tsx`) já troca moedas por itens do catálogo
em `src/data/avatars.ts`, mas cada item só recolore a camisa do mesmo boneco humano
(`buildStudentFigure`) — não muda a forma do personagem. O catálogo já é temático de animais (🦊🐱🐼
🐸🦄🐯🦉🐨🐺🦁🐲🐙, nome + emoji), então a forma mais direta de atender o pedido é dar a cada avatar
peças 3D de verdade que combinem com o tema (orelhas, rabo, chifre, juba, bico...), não só uma cor
— reaproveitando a mesma lojinha/fluxo de compra já existentes, sem inventar um sistema novo do
zero.

## Funcionalidades planejadas
- [ ] `src/data/avatars.ts`: cada `AvatarOption` ganha um campo `features` (orelhas/rabo/acessório
      especial/cor de acessório) descrevendo as peças 3D do boneco daquele avatar.
- [ ] `World3D.tsx`: função que monta as peças 3D (orelhas, rabo, chifre, juba, bico, olhos,
      tentáculos — conforme o avatar) e anexa ao boneco base (`buildStudentFigure`), reaproveitando
      primitivas no mesmo estilo do resto do jogo (sem asset externo).
- [ ] Trocar de avatar na lojinha atualiza as peças 3D do personagem em cena (não só a cor da
      camisa) — tanto pro próprio jogador quanto pros jogadores remotos (multiplayer local), já que
      ambos já reaproveitam `buildStudentFigure` e resolvem cor a partir do emoji.
- [ ] Verificação end-to-end: rodar o dev server, equipar pelo menos 3 avatares diferentes (um já
      desbloqueado desde o início, um que precise comprar) e confirmar visualmente que o boneco em
      cena muda de forma (não só de cor) a cada troca.

## Fora de escopo (explicitamente adiado)
- Ruas e carros, loja navegável (interior), trovão/raio — pendências de labs anteriores, sem
  relação com este pedido.
- Pré-visualização em miniatura 3D de cada boneco dentro do grid da lojinha (hoje é só o emoji) —
  não pedido explicitamente; o emoji já indica bem o tema do boneco.
- Novos avatares além dos 12 já existentes no catálogo.
