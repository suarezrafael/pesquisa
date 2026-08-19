# Contexto — Laboratório 17 — Mais missões (conteúdo educativo)

Preenchido em: 2026-08-17
Commit inicial → final: c28c625..fbbf0e9

## O que foi feito

1. **10 novas missões** (`src/data/quests.ts`, q11-q20) — continuam o ciclo lógica → matemática →
   leitura já usado nas 10 primeiras, com recompensa crescente (xp 22→35, moedas 11→18,
   continuando a escala de q01-q10). Conteúdo variado (frações leves de divisão de pizza, soma de
   grupos, dias da semana, sequências numéricas, divisão igualitária, comprensão de texto curto
   com temas neutros e positivos — planta, desenho, foguete, ônibus).
2. **q10 renomeada** de "Missão Final" pra "Números Ímpares" (título que já combinava com o
   conteúdo — sequência 1,3,5,7 — mas o nome antigo não fazia mais sentido deixando de ser a
   última). **q20** herda o papel de encerramento com um bônus de recompensa (35 xp / 18 moedas,
   acima da progressão linear das demais).

Nenhuma mudança em `World3D.tsx` foi necessária — a geração das "escolinhas" no mundo 3D já é
totalmente orientada pelo array `quests` (`quests.forEach` com espaçamento por ângulo dourado), e
o sistema de progressão (`src/state/progression.ts`: desbloqueio sequencial, badges por fração de
`quests.length`) já lê o tamanho do array dinamicamente. Passar de 10 pra 20 missões foi só dado.

## Decisões técnicas tomadas

- **Manter o ciclo lógica/matemática/leitura e o desbloqueio sequencial** — o pedido era "mais
  conteúdo", não "mudar a mecânica"; alterar o sistema de progressão seria escopo bem maior e não
  foi pedido.
- **Recompensa em progressão linear crescente, com bônus só na última** — mesmo padrão já
  estabelecido nas primeiras 10 missões (10→20 xp), só estendido; o bônus final (35 vs. a
  progressão esperada de ~32) marca a "missão de encerramento" sem quebrar o padrão de forma
  brusca.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as 3 planejadas em `FEATURES.md` foram concluídas e verificadas (build/typecheck limpo,
20 escolinhas visíveis no mundo sem sobreposição — distância mínima 4.23 unidades entre qualquer
par —, estado locked/unlocked visual correto).

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário além de "mais conteúdo de jogo" (atendido aqui). Opções em aberto pra
próxima sessão, na mesma linha do que foi levantado no lab-16:
1. Mais uma rodada de conteúdo (mais missões, mais variedade no mundo) se o usuário continuar
   pedindo "mais conteúdo" sem especificar.
2. Backend/conta — ainda pendente, exige decisão de infraestrutura do usuário antes de virar lab.
3. Nova revisão de `prompt.md` contra o código (mesmo exercício do lab-12) — não feita desde
   aquele lab, e bastante conteúdo novo foi adicionado desde então (labs 13-17).

Confirmar com o usuário antes de escolher.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main; comando de merge/PR em
  `labs/lab-14-trovao-raio/CONTEXT.md`).
- Como rodar/verificar: `cd app && npm install && npm run dev`. As 20 escolinhas aparecem
  espalhadas pela faixa caminhável do planeta; completar sequencialmente desbloqueia as próximas.
