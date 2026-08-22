# Contexto — Laboratório 66 — Cortar piscina/lagoa em aparelho fraco (performance)

Preenchido em: 2026-08-22
Commit inicial → final: 93a6733c972545a6ba785e08ccfed2195a61c870..HEAD

## O que foi feito

1. **Lagoa removida em `isLowEndDevice`** (`World3D.tsx`) — `pondUp`/`pondCenterPos`/
   `pondForward`/`pondRight` viraram `let` com valor padrão (nunca lido de verdade) declarados
   FORA do `if`; a construção de verdade (disco d'água, 3 peixes, pato, tartaruga —
   `pondCritters.push(...)`) só roda dentro de `if (!isLowEndDevice)`. Como `pondCritters` fica
   vazio em aparelho fraco, o laço de animação mais abaixo (que já lia essas variáveis) nunca
   itera — não precisou duplicar nem condicionar esse laço separadamente.
2. **Piscina removida em `isLowEndDevice`** — mesmo padrão exato: `poolUp`/`poolCenterPos`/
   `poolForward`/`poolRight` hoisted com valor padrão; disco d'água, borda (torus) e os 5
   `buildStudentFigure` completos (a decoração mais cara do mapa — cada um é o mesmo boneco
   articulado do jogador, não uma malha simples feito peixe/pato) só constroem dentro do mesmo
   tipo de `if`.

## Decisões técnicas tomadas

- **Cortar conteúdo, não tentar thin-instancing agora** — antes de escrever qualquer código, revi
  o histórico do próprio arquivo: um comentário já existente no laço de props decorativos (linha
  ~3040) documenta que um refactor de thin-instancing pras árvores/rochas (a alavanca de
  performance mais forte, flagueada desde o lab-53) já foi CONSIDERADO e EXPLICITAMENTE REJEITADO
  numa sessão anterior, com a justificativa exata de "não dar pra testar num aparelho real". Nada
  mudou nessa limitação (ainda não tenho acesso a um Redmi Pad 2 físico), então seguir o mesmo
  raciocínio — e o pedido literal do usuário — de cortar conteúdo puramente decorativo em vez de
  arriscar uma mudança estrutural sem verificação real é a escolha consistente com a própria
  história do projeto, não uma decisão nova.
- **Variáveis "hoisted" com valor padrão em vez de condicionar o laço de animação também** — o
  laço de render que anima `pondCritters`/`poolPeople` já é escrito como `for (const x of array)`;
  como Babel a array fica vazio quando a construção é pulada, o laço vira um no-op automático sem
  precisar de nenhum `if` extra ali. A alternativa (declarar as variáveis só dentro do `if` de
  construção) não compilaria, porque TypeScript não permite referenciar um `const` de dentro de um
  bloco fora dele — daí `let` com um valor padrão nunca lido de verdade (`Vector3.Zero()`/
  `Vector3.Up()`/etc.), só pra satisfazer o escopo.
- **Nada mudou na cor/relevo do terreno** — `applyBasin(..., POND_CENTER_DIR, ...)` e
  `applyBasin(..., POOL_CENTER_DIR, ...)` continuam rodando pra QUALQUER aparelho (são cálculos
  puros de altura de terreno, independentes de construir ou não a água/gente) — em aparelho fraco,
  o resultado visual é uma depressão gramada suave onde a lagoa/piscina ficariam, não um buraco
  quebrado; a margem de terra ao redor (lab-28) já suaviza essa transição pra qualquer terreno
  rebaixado, então não fica parecendo um bug.

## Pendências / dívidas conhecidas

- **Efeito real no FPS do Redmi Pad 2 só se confirma quando o usuário testar** — sem acesso a um
  aparelho físico, não dá pra medir o ganho de verdade nesta sessão; a mudança reduz o número de
  malhas ativamente animadas (~65-90 malhas a menos, a maior parte do boneco completo das 5
  pessoas da piscina) mas isso é uma estimativa por contagem de código, não uma medição real.
- **Verificação ao vivo do caminho de aparelho fraco (`isLowEndDevice=true`) não foi possível
  nesta sessão** — só dá pra confirmar via `navigator.userAgent`, que é lido uma vez só dentro do
  componente ao montar; não havia uma forma direta de forçar esse caminho a partir da automação de
  navegador disponível. Verificado com confiança alta por revisão de código (o caminho "true" é
  estruturalmente mais simples que o "false", que testei ao vivo com sucesso) + `tsc`/build
  limpos, mas sem confirmação visual de verdade em modo `isLowEndDevice`.
- **Se cortar piscina/lagoa não for suficiente**, a alavanca que resta é o thin-instancing das
  props decorativas — ver "Fora de escopo" no `FEATURES.md` deste laboratório para o raciocínio
  completo de por que continua fora de escopo por enquanto.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as duas remoções pedidas (piscina/gente, lagoa/peixes) foram implementadas e o caminho
padrão (desktop) foi confirmado ao vivo sem regressão.

## O que o próximo laboratório deve desenvolver

1. Se o usuário testar no Redmi Pad 2 e o FPS continuar ruim, considerar o thin-instancing das
   props decorativas como o próximo passo sério — mas só com um plano de verificação melhor
   (idealmente algum jeito de forçar/simular `isLowEndDevice` de forma visível pra revisão, já que
   a automação de navegador desta sessão não conseguiu).
2. Itens antigos ainda pendentes, sem mudança: confirmar se a recompensa em moeda do combate
   atualiza o HUD; decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); confirmar se a
   correção do PWA (lab-65) resolveu o problema de versão antiga no celular do usuário.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PR #5 (labs 58-61) ainda aberto —
  este laboratório continua no mesmo PR até o usuário mesclar.
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes` (feito ao final deste laboratório).
