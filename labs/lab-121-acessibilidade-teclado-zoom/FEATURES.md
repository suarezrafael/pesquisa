# Laboratório 121 — Navegação por teclado e zoom de fonte (acessibilidade SHOULD)

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: 8e5d9c2f7b2b01c7ac4f09846837d2c50218cfdb

## Objetivo do laboratório

Escolhido pelo usuário entre 3 opções de backlog (as outras: reinvestigar o bug de morros
invisíveis do lab-95, sem informação nova pra avançar; explorar code-splitting de `studentFigure.ts`,
acoplamento interno do Babylon.js sem solução clara). Ataca os 2 itens `[SHOULD]` de
`docs/prompts/02-design-profissional.md` §3 explicitamente deixados de fora do lab-120 (que cobriu
só os `[MUST]`: contraste de cor e alvo de toque 44×44px): (1) navegação por teclado/leitor de tela
nos painéis 2D do jogo, (2) suporte a zoom de fonte do sistema sem quebrar layout.

## Investigado antes de planejar

**Zoom de fonte — já conforme, nenhuma mudança de código necessária.** Verificado por leitura
completa de `index.css` e do `viewport` de `index.html`:
- `<meta name="viewport">` é só `width=device-width, initial-scale=1.0` — sem `user-scalable=no`
  nem `maximum-scale`, então nem o zoom de pinça nem o zoom de texto do navegador estão bloqueados.
- Nenhum `font-size` em `px` cru em `index.css` — todo texto já usa `rem`/`em`/`clamp()` (herdado
  de correções de labs anteriores, ex. `READABILITY_SCALE` do lab-87).
- Os únicos `height:` fixos (não `min-height`) encontrados são controles decorativos sem texto
  dentro (botões de toque, barra de XP/vida, swatch de cor da lojinha) — nenhum contêiner de TEXTO
  tem altura fixa que arriscaria cortar conteúdo ao aumentar a fonte.
- Os modais com conteúdo mais longo (`.quest-list-modal`, `.avatar-shop-modal`) já usam
  `max-height: 80vh` + `overflow-y: auto` — o padrão correto pra zoom de texto (rola em vez de
  cortar), não uma altura fixa.
- **Conclusão**: a arquitetura de CSS já responsiva/fluida construída ao longo do projeto (clamp(),
  `vh` com scroll, `rem`/`em`) já satisfaz esse item `[SHOULD]` na prática. Documentado aqui como
  verificado, sem entrada na checklist de funcionalidades (nada a construir).

**Navegação por teclado/leitor de tela — gaps reais, confirmados por leitura de código**:
- **Nenhum painel fecha com Esc**: os ~12 painéis/modais do jogo (`QuestModal`, `MarsRewardToast`,
  `RewardToast`, `QuestListOverlay`, `AvatarShop`, `PairingScreen`, `PlanetPickerPanel`,
  `MyHousePanel`, `AchievementsPanel`, `ChatPanel`, `RankingPanel`, `WeaponBagPanel`) só fecham por
  clique no "×" ou em outro botão — nenhum tem listener de `keydown`/`Escape` (confirmado por
  grep em todo `app/src`, único uso de `keydown` no projeto inteiro é o `onKeyDown` de
  movimento/interação do avatar dentro de `World3D.tsx`).
- **Nenhum painel move o foco ao abrir nem devolve ao fechar**: nenhum `.focus()` chamado em
  nenhum componente de painel (só `autoFocus` em CAMPOS DE FORMULÁRIO específicos —
  `Onboarding.tsx`, `FamilyPortal.tsx`, `PairingScreen.tsx` — nunca no painel/diálogo em si). Um
  usuário de teclado que abre um painel não tem indicação de onde o foco foi parar, e ao fechar o
  foco não volta pro botão que abriu.
- **Sem trava de foco (focus trap) nem `inert`/`aria-hidden` no fundo**: `HudHeader.tsx` (9 botões
  reais, todos com `aria-label` — já bem feito) fica sempre montado e SEM `inert`, mesmo quando um
  painel está aberto por cima dele (confirmado em `World3D.tsx`: `HudHeader` e os painéis
  condicionais — `WeaponBagPanel`/`PlanetPickerPanel`/`ChatPanel`/`RankingPanel` — são irmãos no
  mesmo JSX, sem nenhum mecanismo que tire os botões do HUD da ordem de tabulação). Resultado: um
  usuário de teclado pode dar Tab por dentro de um modal visualmente aberto e cair nos botões do
  HUD escondidos atrás dele.
- **`ChatPanel`/`RankingPanel`/`WeaponBagPanel` sem `role`/`aria-label`**: diferente dos outros 9
  painéis (que já têm `role="dialog" aria-modal="true" aria-label="..."` desde algum laboratório
  anterior — achado positivo, já feito), esses 3 usam `className="chat-panel"` sem NENHUM atributo
  de acessibilidade — um leitor de tela não anuncia nada de útil quando abrem.
- **Já está bem feito** (achado positivo, sem necessidade de mudança): todo elemento clicável do
  jogo já é um `<button type="button">` de verdade (confirmado por grep — zero `onClick` em `<div>`
  ou `<span>` em todo `app/src`) — ou seja, tudo já é operável por teclado via Enter/Espaço, o
  problema é só a NAVEGAÇÃO entre painel/fundo, não os controles individuais dentro de cada painel.
- **Sinal reaproveitável já existente**: `App.tsx` já computa `suspendTriggers` (`activeQuest !==
  null || ... || showMarsReward`), um booleano "algum modal do nível App está aberto" usado hoje só
  pra suspender gatilhos de proximidade do mundo 3D — dá pra reaproveitar esse mesmo sinal (mais os
  estados de painel internos do `World3D.tsx`: `chatOpen`/`rankingOpen`/`bagOpen`/
  `planetPickerOpen`) pra decidir quando o HUD deve ficar `inert`, sem duplicar lógica.

## Decisões técnicas tomadas

- **Um hook reutilizável, não 12 implementações separadas**: `app/src/state/useModalA11y.ts` novo
  — recebe `onClose` e devolve um `ref` pro elemento raiz do painel; internamente: (a) registra
  `keydown` de `Escape` chamando `onClose`; (b) ao montar, guarda `document.activeElement` e move o
  foco pra dentro do painel (`ref.current.focus()`, painel raiz ganha `tabIndex={-1}`); (c) ao
  desmontar, devolve o foco pro elemento guardado. Aplicado nos 12 componentes de painel.
- **`inert` no `HudHeader` em vez de um focus trap manual por painel**: mais simples e mais robusto
  que reimplementar ciclo de Tab em cada painel — como o HUD é a única coisa que fica montada por
  trás de QUALQUER painel (o `<canvas>` do jogo não é alcançável por Tab, não tem controles
  focáveis), bloquear só o HUD com `inert` já resolve o vazamento de foco em 100% dos casos, com
  uma única mudança central em `World3D.tsx` (calcula `hudInert = suspendTriggers || chatOpen ||
  rankingOpen || bagOpen || planetPickerOpen`, passa pro `HudHeader`).
- **`role="region"`/`aria-label` em `ChatPanel`/`RankingPanel`/`WeaponBagPanel`**, não
  `role="dialog"` — diferente dos 9 modais verdadeiros (que bloqueiam o jogo, `suspendTriggers`/
  gates internos), esses 3 são painéis não-bloqueantes (o jogador continua podendo se mover com o
  chat aberto, por exemplo) — `role="dialog"` seria semanticamente errado pra algo que não é modal.
- **Sem mudança de CSS para zoom de fonte** — já coberto, ver "Investigado antes de planejar".

## Funcionalidades planejadas
- [x] `app/src/state/useModalA11y.ts` novo: Esc fecha + foco entra no painel ao abrir + foco volta
      pro elemento anterior ao fechar.
- [x] Aplicar `useModalA11y` nos 12 painéis: `QuestModal`, `MarsRewardToast`, `RewardToast`,
      `QuestListOverlay`, `AvatarShop`, `PairingScreen`, `PlanetPickerPanel`, `MyHousePanel`,
      `AchievementsPanel`, `ChatPanel`, `RankingPanel`, `WeaponBagPanel`.
- [x] `World3D.tsx`: `HudHeader` ganha `inert` (via novo prop) quando qualquer painel/modal está
      aberto (`suspendTriggers` recebido de `App.tsx` OU algum painel interno do próprio
      `World3D.tsx` aberto). **Achado durante a verificação ao vivo, não previsto no planejamento**:
      o `<canvas>` do jogo também precisou de `inert` — o Babylon.js o torna focável (pra capturar
      teclado do jogo), então sem isso Tab escapava do modal direto pro canvas em vez de ficar
      preso no HUD. Corrigido junto, mesmo booleano `hudInert`.
- [x] `ChatPanel`/`RankingPanel`/`WeaponBagPanel` ganham `role="region"` + `aria-label` (paridade
      de acessibilidade com os outros 9 painéis, que já têm `role="dialog"`).
- [x] Verificação: `npm run build` sem erros; verificação ao vivo (dev server + browser automation
      ou teclado real) confirmando Esc fechando pelo menos 2-3 painéis representativos, Tab não
      alcançando mais os botões do HUD com um painel aberto, e sem regressão nos controles
      touch/mouse já existentes.

## Fora de escopo (explicitamente adiado)
- Zoom de fonte do sistema: investigado e considerado já conforme (ver acima) — sem funcionalidade
  planejada porque não há nada a corrigir.
- Navegação por teclado dentro do MUNDO 3D (mover o avatar, câmera, combate) — fora do escopo dos
  itens `[SHOULD]` de acessibilidade de painéis 2D; o jogo já é primariamente touch/mouse+WASD por
  design, não um requisito de acessibilidade citado em `02-design-profissional.md` §3.
- Leitor de tela para o CONTEÚDO 3D (nomes/posições de objetos no mundo) — fora de escopo, item não
  coberto por `02-design-profissional.md` §3 (que fala de contraste/toque/navegação, não de uma
  experiência 3D inteiramente não-visual).
