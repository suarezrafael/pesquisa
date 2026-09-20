# Laboratório 212 — Pulso de recompensa no HUD

Status: em andamento
Início: 2026-09-20
Commit inicial: ea14543b26e16c4243c16ee6d12f892bd9ff8a92

## Objetivo do laboratório

Backlog "Lab 198 - Efeitos visuais de recompensa, movimento e interacao": fecha a peça "pulso de
recompensa" — um pulso visual (escala + brilho) na barra de XP e no contador de moedas do HUD toda
vez que eles sobem de verdade, reforçando a sensação de resposta/prazer ao ganhar recompensa sem
exigir conteúdo novo.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 198 - Efeitos visuais de recompensa,
movimento e interacao" — continuação direta do lab-211 (mesma lab pai, peça "brilho em interativo"),
escolhida autonomamente (escopo pequeno, baixo risco, mesmo espírito de fatia única já aceito nas
labs anteriores deste item).

## Investigação prévia

- **HUD (`HudHeader.tsx`) é um componente React puro** — diferente das outras peças do Lab 198 já
  feitas nesta sessão (landing puff, brilho do baú), que vivem na cena 3D (Babylon.js). O "pulso de
  recompensa" pede uma reação a MUDANÇA de valor (XP/moedas subindo), não a um evento discreto
  disparado de dentro da cena 3D — mais simples e mais robusto detectar isso comparando o `progress`
  já recebido via prop a cada render, sem precisar de nenhuma ponte nova entre `World3D.tsx`/`App.tsx`
  e o HUD.
- **`usePulseOnIncrease(value)`**: hook local reutilizável, aplicado duas vezes (XP e moedas) —
  guarda o valor anterior num `useRef` (nasce já igual ao valor inicial, então a 1ª renderização
  nunca pulsa sozinha) e só marca `pulsing = true` quando o valor NOVO é MAIOR que o anterior —
  nunca ao cair (ex.: trocar de perfil pra um com menos moedas não deve "pulsar", só ganhos de
  verdade).
- **Puramente CSS (`transform`/`filter`), sem WebGL/partícula nova** — orçamento desprezível mesmo
  em aparelho fraco; diferente dos efeitos 3D já feitos nesta sessão (luas, brilho do baú), que
  precisam da guarda `isLowEndDevice` por rodarem dentro do orçamento de quadro da cena 3D, esta
  animação 2D do DOM não compete com esse orçamento — decisão deliberada de NÃO replicar a mesma
  guarda aqui, documentada explicitamente pra não parecer uma omissão.
- **Duração do pulso (650ms)** escolhida por analogia com outras transições já existentes no HUD
  (`.xp-bar-fill` já usa `transition: width 0.3s ease` pro preenchimento em si) — rápida o
  bastante pra não atrapalhar leitura repetida do HUD, longa o bastante pra ser percebida.

## Decisão de escopo

Sem pergunta ao usuário (escopo já reduzido — 1 hook pequeno + 1 classe CSS, sem geometria/estado
novo, mesmo espírito de baixo risco já aceito pro brilho do baú no lab-211). Fora de escopo: pulso
em qualquer OUTRO elemento de HUD além de XP/moedas (badges, série, etc.) e as 3 peças restantes do
Lab 198 (footstep dust, trail de foguete/cometa, feedback de puzzle) — cada uma merece sua própria
decisão de escopo/verificação numa lab futura.

## Funcionalidades planejadas

- [x] `usePulseOnIncrease(value)`: hook local em `HudHeader.tsx`, dispara só em AUMENTO genuíno.
- [x] Aplicado à barra de XP (`.xp-bar`) e ao contador de moedas (`.hub-coins`).
- [x] `.reward-pulse` (`index.css`): keyframe de escala (1 → 1.18 → 1) + brilho (`filter:
  brightness`), 0.65s, sem gating de `isLowEndDevice` (custo desprezível, ver Investigação prévia).
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (15ª lab seguida — mesma limitação exata). Documentado abaixo; confiado em `tsc`/testes/build +
  leitura de código cuidadosa.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` limpo; `npm run test -- --run`: 257/257 (sem mudança —
nenhuma lógica de domínio nova, só efeito visual de apresentação em componente React puro); `npm
run build` sem erros.

Pontos conferidos por leitura:

- **`usePulseOnIncrease` não pulsa na montagem inicial**: `useRef(value)` nasce com o MESMO valor
  que o `useEffect` compara no primeiro disparo (`value > prevRef.current` é `false` quando os dois
  começam iguais) — confirmado por leitura da ordem de inicialização de hooks do React (`useRef`
  roda antes do corpo do `useEffect`, sempre).
- **Limpeza do `setTimeout`**: o `useEffect` retorna uma função de limpeza que cancela o timeout
  pendente — se XP/moedas subirem de novo ANTES do pulso anterior terminar (2 recompensas rápidas
  seguidas), o timeout antigo é cancelado e um novo de 650ms começa do zero, sem timeout duplicado
  nem `pulsing` sendo desligado cedo demais pelo timeout antigo.
- **Troca de perfil não dispara pulso indevido na maioria dos casos**: como o hook só reage a
  AUMENTO, trocar pra um perfil com MENOS moedas/XP não pulsa. Um caso residual honesto: trocar pra
  um perfil com MAIS moedas/XP que o anterior TAMBÉM pulsa (o hook não distingue "ganhou recompensa"
  de "troquei pra um perfil com valor mais alto") — imprecisão pequena e aceita, mesmo espírito de
  outras aproximações já documentadas neste projeto (ex. `retry_without_quit_rate`, lab-180).

**Risco remanescente, honesto**: a intensidade/duração exata do pulso (escala 1.18x, brilho 1.35x,
650ms) não foi confirmada ao vivo — valores escolhidos por sensação de "juiciness" comum em jogos
casuais, sem playtest real.
