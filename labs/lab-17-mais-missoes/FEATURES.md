# Laboratório 17 — Mais missões (conteúdo educativo)

Status: em andamento
Início: 2026-08-17
Fim: -
Commit inicial: c28c6259c407d573882fa6a1b7990ed9da876736

## Objetivo do laboratório
Com toda a fila de "trabalho de jogo autocontido" concluída (labs 11-16) e o item de backend
exigindo decisão do usuário antes de virar laboratório, o usuário pediu "mais conteúdo de jogo"
como próximo passo (pergunta direta desta sessão, ver `labs/lab-16-loja-navegavel/CONTEXT.md`).

O loop principal do jogo (`prompt.md` seção 5) é "explorar → resolver desafio educativo → ganhar
recompensa", mas o conteúdo educativo de verdade (as 10 missões em `src/data/quests.ts`) não
cresce desde os primeiros laboratórios, enquanto o mundo ganhou bastante conteúdo ao redor (bichos,
NPCs, parkour, loja, ruas). Dobrar o número de missões é o "mais conteúdo" mais alinhado ao
propósito educativo do produto (`prompt.md` seção 1: "diversão + aprendizado") — e, por já ser
totalmente orientado a dados (`quests.forEach` em `World3D.tsx` gera as escolinhas no mapa a
partir do array `quests`), novas missões aparecem automaticamente como prédios novos no mundo sem
precisar tocar em código de motor 3D.

## Funcionalidades planejadas
- [ ] 10 novas missões em `src/data/quests.ts` (q11-q20), mantendo o ciclo lógica/matemática/
      leitura já usado, com dificuldade/recompensa crescente (mesmo padrão das 10 primeiras) e
      conteúdo adequado pra criança de ~10 anos (`prompt.md` seção 1).
- [ ] Renomear o título da q10 (era "Missão Final", deixa de ser a última) pra algo que combine
      com seu conteúdo real; a nova última missão (q20) herda o papel de "missão final" com um
      bônus de recompensa.
- [ ] Verificação: `npm run build` (typecheck) passa, e as 20 escolinhas aparecem no mundo sem
      sobreposição óbvia (mesma distribuição por ângulo dourado já usada, agora com 20 pontos em
      vez de 10 — checar visualmente via automação de navegador).

## Fora de escopo (explicitamente adiado)
- Backend/conta — pendência que exige decisão de infraestrutura do usuário, não tocada aqui.
- Novos tipos de missão além de lógica/matemática/leitura (ex.: ortografia, ciência) — não pedido
  explicitamente; os 3 tipos já existentes cobrem o que `prompt.md` seção 5 pede.
- Mudar o sistema de desbloqueio sequencial de missões — mantém como está (completar N-1 pra
  desbloquear N), só adiciona mais itens à mesma fila.
