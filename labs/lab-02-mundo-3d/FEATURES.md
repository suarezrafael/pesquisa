# Laboratório 02 — Mundo 3D

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: 8188d82e267ed88289474ef0599444fdc7ce7307

## Objetivo do laboratório
Substituir o hub 2D (grid de cards) por um mundo 3D navegável, estilizado e de baixo custo
computacional, com física real (não simulação cosmética) — para se conectar melhor com crianças
de 10 anos, mantendo os requisitos de custo zero, PWA mobile e desempenho em aparelho modesto já
definidos em `prompt.md` e em `docs/prompts/02-design-profissional.md` §6. A camada de domínio
(quests, progressão, recompensas) não deve mudar — só a apresentação.

## Funcionalidades planejadas
- [x] Integrar `docs/prompts/` (segurança, design, arquitetura, clean code) como padrão de
      qualidade do projeto, referenciado em `CLAUDE.md` — origem: pedido do usuário
- [x] Cena 3D navegável (Babylon.js) substituindo o `Hub` 2D, mantendo `quests.ts`,
      `progression.ts` e `storage.ts` sem alteração — prova a separação de camadas de
      `docs/prompts/03-arquitetura-sistema.md` §1
- [x] Física real via Havok (plugin oficial gratuito da Babylon.js): avatar com corpo físico
      rígido, colisão com o chão/cenário, movimento por impulso — não uma imitação visual
- [x] Qualidade visual alta dentro do orçamento zero: materiais PBR, sombras dinâmicas, SSAO,
      tonemapping ACES, glow — geometria baixo-poli estilizada (sem assets 3D pagos ou
      licenciados). IBL/HDRI real e texturas com normal/AO map ficaram pendentes (dependem de
      baixar asset CC0, ver `prompt.md` §7.1 e `CONTEXT.md`)
- [x] Controles: teclado (desktop) e joystick touch (mobile) movendo o avatar por física
- [x] Portais de missão em 3D (1 por quest, 10 no total) que abrem o `QuestModal` existente ao
      o avatar se aproximar — reaproveitar o modal sem modificar sua lógica
- [x] Testado de ponta a ponta no navegador (golden path completo) e métricas reais de
      desempenho capturadas (não estimadas) antes de fechar o laboratório — ver `CONTEXT.md`

## Fora de escopo (explicitamente adiado)
- Hub social / cooperação em sala, Supabase real, deploy em hosting real (candidatos já
  registrados em `labs/lab-01-fundacao/CONTEXT.md`, ficam para um laboratório futuro)
- Assets 3D externos (comprados ou baixados) — só geometria/materiais gerados via código
- Animação de personagem com esqueleto/rig — avatar é um corpo físico simples (esfera/cápsula)
- Efeitos de pós-processamento pesados (ray tracing, SSAO caro) — só o que rodar bem em
  aparelho médio/fraco
