# Laboratório 04 — Imersão: controle, vegetação, rios, clima e som

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: 180d32a7a388a332b4edeae8f30d07c2e0348032

## Objetivo do laboratório
Feedback do usuário depois de jogar o lab-03: bug real de controle (esquerda/direita
"extremamente sensível"/"não funciona", seta pra trás não funciona, não conseguiu alcançar os
portais), mundo ainda "sem graça" mesmo com mais props, sem indicação do que as missões são, e
sem áudio nenhum. Prioridade: primeiro consertar o bug de controle (bloqueador — sem ele o resto
não é nem testável), depois vegetação/clima/água pra imersão visual, depois som.

## Funcionalidades planejadas
- [x] **Corrigir o modelo de controle** — trocado pra estilo carrinho: esquerda/direita giram a
      bola a uma taxa fixa (`TURN_RATE`), cima/baixo aceleram/freiam na direção atual. Bug raiz
      confirmado e corrigido: `facing` era redefinido instantaneamente pra qualquer `moveDir`,
      o que degenerava quando só esquerda/direita (sem cima/baixo) era pressionado
- [x] Lista/visão geral das missões (`QuestListOverlay.tsx`, botão 🗺️ no HUD) — mostra os 10
      títulos/tipos, com "???" pras ainda bloqueadas
- [x] Nuvens flutuando sobre o planeta, com deriva lenta ao redor do eixo polar
- [x] Rio — tubo seguindo a curvatura do planeta, material azul distinto da grama
- [x] Grama com deformação por vento (shader customizado via `ShaderMaterial` + thin instances,
      não textura estática)
- [x] Som ambiente de vento (sintetizado via Web Audio, ruído filtrado com rajadas) + trilha
      suave de fundo (também sintetizada, acorde com osciladores) — nenhum asset externo
      baixado, ver decisões sobre por que optei por sintetizar em vez de baixar um arquivo
- [x] Botão de mute (🔊/🔇) no HUD — controle acessível em 1 toque, critério
      `docs/prompts/02-design-profissional.md` §5
- [x] Testado de ponta a ponta com verificação real: virar sozinho não desloca (esperado),
      acelerar/frear funcionam com a magnitude esperada, e um portal foi alcançado por
      navegação de verdade (não teleporte) segurando teclas reais

## Fora de escopo (explicitamente adiado)
- Deploy real — segue pendente de o usuário criar conta em um provedor (ver resposta da sessão
  anterior)
- Suporte ao polo sul do planeta (herdado do lab-03)
- Texturas PBR completas (normal/AO map)
