# Contexto — Laboratório 72 — Overlay de debug sobreposto ao HUD + fonte 1.6x no celular

Preenchido em: 2026-08-22
Commit inicial → final: f2447d8622e1fb16556624e01fe788644b904784..HEAD

## O que foi feito

1. **Overlay de debug corrigido** (`index.css`, `.world3d-debug`) — ganhou `max-width: min(60vw,
   320px)`, `white-space: normal` (quebra de linha normal) e `text-align: right`; `top` desceu de
   `0.5rem` pra `3.6rem` (abaixo da fileira de ícones do HUD, não mais na mesma linha).
2. **Fonte do celular subiu pra 1.6x** (`World3D.tsx`, `mobileFontSize`) — era 1.2x (lab-70).

## Decisões técnicas tomadas

- **Causa do bug do overlay identificada a partir de um screenshot real** — o usuário mandou uma
  foto do próprio celular mostrando o texto do overlay ("25 FPS · escala 1.40 · fraco=true
  telaP=true...") visualmente misturado/ilegível junto com o nome do jogador e as moedas no HUD.
  Análise: `.world3d-debug` sempre foi uma única linha de texto sem `max-width`, ancorada pela
  borda DIREITA (`right: 0.75rem`) — numa tela larga (desktop), isso nunca foi problema, porque
  sempre havia espaço de sobra à esquerda antes do HUD começar. Numa tela de celular estreita, a
  string (uma linha só, ~400-500px de largura) ficava mais larga que o viewport inteiro; como o
  elemento é ancorado pela direita, o excesso "vazava" pra esquerda até sobrepor o HUD, em vez de
  simplesmente cortar/estourar a tela. `max-width` + quebra de linha normal resolvem isso deixando
  o texto virar 2-3 linhas curtas dentro dos limites da tela.
- **`escala 1.40` no screenshot confirma que o lab-71 funcionou** — 1.40 É um valor real da
  tabela atual (`SCALING_TIERS` do lab-70: `[1.0, 1.15, 1.4, 1.6]`), diferente do "1.80"/"2.40"
  relatados antes da correção da trava de recarregamento. O aparelho finalmente está recebendo
  código atualizado.
- **1.6x em vez de tentar um valor intermediário** — depois de 1.2x (lab-70) já ter se mostrado
  insuficiente por evidência direta (screenshot), e com o próprio usuário confirmando que o FPS já
  está bom (25, com folga), pulei direto pra um aumento mais decisivo em vez de tentar 1.3x/1.4x
  incrementalmente — já foram três rodadas (labs 67, 68, 70) ajustando esse mesmo número.

## Pendências / dívidas conhecidas

- **Não foi possível confirmar ao vivo no aparelho real** — verificado só no caminho padrão
  (desktop, onde `isSmallScreen=false` e nem entra em `mobileFontSize`) + revisão de código. O
  próximo screenshot do usuário é que vai confirmar se 1.6x já é suficiente ou se ainda precisa
  de mais ajuste (ou uma auditoria de contraste do contorno do texto, ver "Fora de escopo" no
  `FEATURES.md`).
- **Contraste do texto não foi revisado** — mesmo com fonte maior, texto branco fino contra um céu
  claro pode continuar difícil de ler; se 1.6x não bastar, o próximo passo é aumentar
  `outlineWidth`/escurecer `outlineColor` nos `TextBlock` do jogo, mas isso toca dezenas de pontos
  espalhados pelo arquivo — fora de escopo por enquanto até saber se é realmente necessário.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as duas correções foram implementadas, com build/typecheck limpos e o caminho padrão
(desktop) confirmado ao vivo sem regressão (overlay quebrando em 2 linhas corretamente).

## O que o próximo laboratório deve desenvolver

1. Aguardar o próximo screenshot/teste do usuário no Poco C75 — confirmar se o overlay parou de
   sobrepor o HUD e se a fonte 1.6x já é legível o suficiente.
2. Se ainda não for suficiente, considerar uma auditoria de contraste (contorno do texto) em vez
   de continuar só aumentando o tamanho.
3. Itens antigos ainda pendentes, sem mudança: confirmar se a recompensa em moeda do combate
   atualiza o HUD; decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PR #5 (labs 58-61) ainda aberto —
  este laboratório continua no mesmo PR até o usuário mesclar.
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes` (feito ao final deste laboratório).
