# Contexto — Laboratório 152 — Consentimento parental pro multiplayer (G13)

Preenchido em: 2026-09-04
Commit inicial → final: b8a235de55c1fe131a698f2c769ea98c1912a630..HEAD

## O que foi feito

Fechou a última parte de G13 (`docs/prompts/05-escala-e-viabilidade.md`) — consentimento parental
pro multiplayer — que o lab-144 tinha deixado de fora por exigir desenho de produto.

- **`app/src/data/parentalGate.ts`** (novo): `generateGateChallenge`/`isGateAnswerCorrect` — um
  desafio de multiplicação de dois números entre 12 e 87 (produto até ~7500, difícil demais de
  fazer de cabeça pro público-alvo do jogo, ~10 anos). Testado em `parentalGate.test.ts` (6 casos:
  extremos do gerador, resposta certa, com espaços, errada, vazia, texto não numérico).
- **`app/src/state/storage.ts`**: `hasMultiplayerConsent()`/`recordMultiplayerConsent()`, chave
  nova `jogo-educativo:multiplayerConsentAt:${perfilId}` — por PERFIL, não por aparelho (mesmo
  padrão de `tutorialSeenKey`/`lastPlayedKey`; um aparelho pode ter vários perfis de irmãos desde
  o lab-108, cada um precisa do próprio consentimento).
- **`app/src/components/ParentalGateModal.tsx`** (novo): modal reaproveitando `useModalA11y` e as
  classes CSS já existentes (`.modal-overlay`, `.modal`, `.field`, `.field-hint`,
  `.primary-button`, `.nickname-generate-btn`) — explica o que o multiplayer expõe (posição/
  aparência pra jogadores desconhecidos, sala global, não rede local; chat só por catálogo
  fechado, nunca texto livre/dado pessoal) e pede a conta do desafio antes de liberar.
- **`app/src/world3d/World3D.tsx`**: `connectMultiplayer()` (efeito de setup) só roda se
  `hasMultiplayerConsent()` — antes rodava sempre, sem checagem nenhuma. Os dois únicos pontos de
  entrada de UI do multiplayer (ícones de chat e ranking no `HudHeader`) passaram por
  `openMultiplayerFeature`: sem consentimento, abre o portão (guardando a ação pendente num ref);
  com consentimento, abre o painel direto como antes. `handleParentalGateAuthorize` grava o
  consentimento, conecta (se ainda não conectado) e executa a ação pendente (abrir chat OU
  ranking, o que o jogador tinha clicado). `hudInert` (lab-121, a11y) ganhou `showParentalGate` na
  lista de condições que tornam o resto do HUD `inert`.
- **`app/src/components/LegalPage.tsx`**: Política de Privacidade (seção 1) ganhou uma frase sobre
  o portão parental; data de "última atualização" avançada.

## Decisões técnicas tomadas

- **Portão DENTRO do jogo, não só via `/familia`**: a maioria das famílias nunca cria conta
  (jogo é local-only pra quem não assina) — um consentimento só registrável no backend bloquearia
  multiplayer pra quem não paga, ferindo a regra de nunca gatear cooperação atrás de assinatura.
  Decisão confirmada com o usuário via `AskUserQuestion` antes de implementar.
- **Por PERFIL, não por aparelho**: `DEVICE_ID_KEY` (telemetria) é intencionalmente por aparelho;
  este consentimento é o oposto — cada criança/perfil que usa o mesmo tablet (lab-108) precisa da
  própria autorização, não uma só que libera todos os perfis daquele aparelho.
- **`connectMultiplayer()` é o único ponto de guarda necessário**: `sendState`/`sendChat`/
  `sendAttack` (`multiplayer.ts`) já são no-ops quando `socket` é `null` — não gatear cada
  chamada dessas separadamente, só a conexão inicial, já impede qualquer dado de sair pra rede
  sem consentimento.
- **Retroativo pra todo mundo, sem migração/grandfather**: confirmado com o usuário — famílias que
  já jogavam multiplayer antes desta mudança nunca deram consentimento real (o recurso nunca
  perguntou), então veem o portão na próxima vez que abrirem chat/ranking, igual quem nunca jogou.
- **Desafio de matemática (não um simples botão "Sou responsável")**: mesmo padrão de "parental
  gate" usado por apps infantis — uma pergunta que o público-alvo do jogo tipicamente não resolve
  de cabeça, difícil o bastante sem virar fricção séria pra um adulto com calculadora no bolso.

## Achado real do review automático do Copilot (PR #23)

**Achado de acessibilidade real**: o joystick (`TouchJoystick.tsx`) e os 5 botões de toque
(`TouchActionButton.tsx`, pulo/correr/girar câmera/interagir) ficam FORA do `<div>` que
`hudInert` cobre — só `canvas`/`HudHeader` recebiam `inert={hudInert}`. Com o portão parental (ou
qualquer outro modal — `bagOpen`, `planetPickerOpen`, etc.) aberto, um toque nesses controles
continuava movendo/pulando o personagem por baixo do modal. Corrigido propagando um novo prop
`inert?: boolean` até o `<button>`/`<div>` de cada um, passado como `hudInert` nas 6 chamadas em
`World3D.tsx`. Verificado ao vivo: com o portão aberto, `joystick.inert`/todos os
`touch-action-button.inert` confirmados `true` via DOM. Achados menores de comentário (número de
laboratório errado, path do README do relay sem o prefixo `app/`) também corrigidos.

## Pendências / dívidas conhecidas

- Consentimento não é sincronizado pro backend — famílias assinantes não têm um jeito centralizado
  de gerenciar isso pelo `/familia` (não pedido; fora de escopo, ver `FEATURES.md`).
- Não existe forma de revogar um consentimento já dado (não pedido).
- Conexão de verdade ao relay (`missao-aprender-relay-v2.rafaelvs.workers.dev`) não foi confirmada
  ao vivo neste ambiente (painel de chat mostrou "sem conexão" no dev server local, sem erro de
  console) — mesma classe de limitação de ambiente de outras sessões (rede/relay externo); a parte
  testada e confirmada foi exatamente o que este laboratório mudou: o portão e o gatilho de
  `connectMultiplayer()`, não o relay em si (que não foi tocado).

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Sem prioridade única — restam do backlog: G15 (DNS/rotação de chave, precisa confirmação
explícita), verificar domínio próprio no Resend (opcional, lab-148), schema de backup multi-perfil
(opcional, lab-149), e confirmar com o usuário se o bug de morros/platôs (lab-151) sumiu de vez no
aparelho Android/Chrome dele.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc -b` (app): sem erros. `npm run test` (app): 107/107 (6 novos, `parentalGate.test.ts`).
- Verificado ao vivo (dev server local + navegador, Chrome desktop): portão aparece ao clicar no
  ícone de chat sem consentimento prévio; resposta errada mostra "Resposta incorreta, tente de
  novo." sem fechar o modal; resposta certa fecha o portão, grava
  `jogo-educativo:multiplayerConsentAt:<id>` no `localStorage` do perfil ativo, e abre o painel de
  chat automaticamente (a ação que o jogador tinha pedido originalmente); recarregando a página
  com o mesmo perfil, o ícone de chat abre o painel direto, sem portão de novo. Sem erro de
  console em nenhum passo.
- Como verificar de novo: `cd app && npm run dev`, abrir o jogo com um perfil qualquer, clicar no
  ícone de chat (💬) ou ranking (🏆) no HUD — deve aparecer "🔒 Portão dos responsáveis" com uma
  conta de multiplicação antes de qualquer painel de multiplayer abrir.
- **Deploy**: PR #23 mergeado em `main`, os 3 jobs de CI/CD verdes, app ao vivo
  (`https://app-two-flax-92.vercel.app`) respondendo `200` pós-deploy.
