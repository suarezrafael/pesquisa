# Contexto — Laboratório 70 — Legendas maiores no celular, teto de resolução mais conservador e painel estreito

Preenchido em: 2026-08-22
Commit inicial → final: 5c02038eabdd5f2e49991150d8398ba315a48a73..HEAD

## O que foi feito

1. **Painel do HUD mais estreito em tela pequena** (`index.css`, `.hud-overlay .hub-header`) —
   `max-width: 420px` fixo virou `max-width: min(420px, 62vw)`: mantém o mesmo teto em telas
   largas (desktop/tablet), encolhe proporcionalmente em telas estreitas de celular.
2. **Fonte das legendas AUMENTA em tela pequena, não reduz mais** (`World3D.tsx`,
   `mobileFontSize`) — depois de duas tentativas de reduzir (labs 67, 68) sem sucesso, invertido
   pra `px * 1.2` em vez de `px * 0.85`.
3. **Teto do pior nível do auto-ajuste de resolução reduzido** — `SCALING_TIERS` (lab-69) mudou
   de `[1.0, 1.15, 1.6, 2.2]` pra `[1.0, 1.15, 1.4, 1.6]`.

## Decisões técnicas tomadas

- **Fonte: seguir o pedido direto do usuário em vez de insistir na teoria original** — a premissa
  dos labs 67/68 ("celular = tela física pequena = precisa de fonte MENOR pra não ficar
  desproporcional") nunca foi confirmada na prática; nas DUAS vezes que foi testada ao vivo no
  Poco C75, o resultado foi o oposto do esperado ("quase impossível ler"). Desta vez o usuário deu
  a instrução direta ("aumentar a escala das legendas também ajuda"), então implementei
  exatamente isso em vez de tentar mais uma variação da teoria de encolhimento.
- **Reduzir o teto de downscale em vez de só aceitar a escala alta** — o dado concreto que o
  usuário deu ("no C75 a escala é 1.80... FPS em 20 mesmo assim sem condição visual") mostra que,
  NESSE aparelho específico, o gargalo de FPS não é fill-rate/resolução (senão baixar mais a
  resolução teria ajudado o FPS visivelmente) — é mais provável ser CPU/física por quadro, que
  `hardwareScalingLevel` não afeta. Reduzir o teto do pior nível pra 1.6 aceita conscientemente um
  piso de FPS mais baixo nesse tipo de aparelho em troca de manter alguma legibilidade, em vez de
  continuar sacrificando qualidade por um ganho de FPS que os dados do próprio usuário mostram que
  não vem.
- **Painel do HUD com `min()` em vez de um breakpoint fixo** — mesmo padrão responsivo já usado
  em todo o resto do arquivo CSS (`clamp()`/`vmin` em vários lugares) — encolhe suavemente com a
  largura da tela em vez de um salto abrupto num breakpoint específico.

## Pendências / dívidas conhecidas

- **Nenhuma das três mudanças foi confirmada ao vivo no aparelho real** — o Poco C75/Redmi Pad 2
  não estão disponíveis nesta sessão; a verificação foi só o caminho padrão (desktop, onde
  `isSmallScreen`/`isLowEndDevice` são `false` e nenhuma dessas mudanças entra em ação) + revisão
  de código. A tentativa de simular uma janela estreita de celular via redimensionamento do
  navegador não funcionou nesta sessão (a ferramenta reportou sucesso, mas o viewport da aba não
  mudou) — a correção do painel do HUD é CSS padrão (`min()`/`vw`), comportamento bem estabelecido
  entre navegadores, então a falta dessa verificação específica é considerada baixo risco.
- **Gargalo real de CPU do Poco C75 continua sem investigar** — reduzir o teto de resolução e
  aumentar a fonte são paliativos que melhoram a experiência dentro da limitação atual, não
  resolvem a causa raiz (por que o FPS não sobe além de ~20 mesmo com resolução bem reduzida). As
  alavancas que resolveriam isso de verdade (thin-instancing, octree de seleção) continuam
  adiadas pelo mesmo motivo de sempre: risco de regressão sem conseguir testar num aparelho real.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as três correções foram implementadas, com build/typecheck limpos e o caminho padrão
(desktop) confirmado ao vivo sem regressão.

## O que o próximo laboratório deve desenvolver

1. Aguardar o próximo teste do usuário no Poco C75 e Redmi Pad 2 — confirmar se a legibilidade
   melhorou o suficiente e se o painel do HUD ficou num tamanho razoável.
2. Se o Poco C75 continuar inviável mesmo com essas mudanças, considerar que esse aparelho pode
   estar genuinamente abaixo do requisito mínimo pro jogo como está hoje — nesse ponto, valeria a
   pena revisitar as alavancas maiores (thin-instancing/octree) com mais cautela, ou aceitar que
   alguns aparelhos muito fracos ficam fora do público-alvo prático.
3. Itens antigos ainda pendentes, sem mudança: confirmar se a recompensa em moeda do combate
   atualiza o HUD; decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PR #5 (labs 58-61) ainda aberto —
  este laboratório continua no mesmo PR até o usuário mesclar.
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes` (feito ao final deste laboratório).
