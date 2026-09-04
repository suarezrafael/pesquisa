# Laboratório 152 — Consentimento parental pro multiplayer (G13)

Status: concluído
Início: 2026-09-04
Fim: 2026-09-04
Commit inicial: b8a235de55c1fe131a698f2c769ea98c1912a630

## Objetivo do laboratório

Resolver a última parte de G13 (`docs/prompts/05-escala-e-viabilidade.md`) deixada de fora pelo
lab-144: "registro de consentimento parental para o multiplayer". Hoje `connectMultiplayer()`
roda sem NENHUMA checagem, expondo apelido/posição/aparência da criança pra qualquer outro
jogador conectado (relay é uma sala global só, não rede local — ver `server-cf-relay/README.md`).

## Investigado antes de planejar

- **A maioria dos jogadores não tem conta de responsável** — o jogo é local-only
  (`localStorage`) pra quem não assina; só famílias assinantes passam pelo portal `/familia`.
  Exigir consentimento só ali bloquearia multiplayer pra quem não paga, o que fere a regra de
  nunca gatear cooperação atrás de assinatura (`docs/prompts/03-arquitetura-sistema.md`). Decisão
  confirmada com o usuário via `AskUserQuestion`: portão parental DENTRO do jogo (desafio de
  matemática que só um adulto resolve), funciona pra todo mundo.
- **Retroatividade**: confirmado com o usuário que TODA família (mesmo quem já jogava
  multiplayer antes desta mudança) deve ver o portão na próxima vez que tentar — ninguém tinha
  consentimento real registrado até agora.

## Funcionalidades planejadas

- [x] `data/parentalGate.ts`: desafio de multiplicação de dois dígitos (12-87 × 12-87, difícil
      demais de cabeça pro público-alvo de ~10 anos) + verificação da resposta. Testado
      (`parentalGate.test.ts`).
- [x] `state/storage.ts`: `hasMultiplayerConsent`/`recordMultiplayerConsent`, por PERFIL (não por
      aparelho — cada criança/perfil precisa do próprio consentimento, lab-108).
- [x] `components/ParentalGateModal.tsx`: modal explicando o que o multiplayer expõe + o desafio,
      reaproveitando `useModalA11y`/classes CSS existentes (`.modal-overlay`, `.field`,
      `.primary-button`).
- [x] `World3D.tsx`: `connectMultiplayer()` só roda se `hasMultiplayerConsent()`; os dois pontos
      de entrada de UI do multiplayer (ícones de chat/ranking) abrem o portão em vez do painel
      quando ainda não há consentimento, e disparam a ação pendente (abrir o painel) assim que
      autorizado.
- [x] `LegalPage.tsx`: Política de Privacidade atualizada mencionando o portão parental.
- [x] Verificação ao vivo (Chrome, dev server): portão aparece ao abrir chat sem consentimento;
      resposta errada mostra erro sem fechar; resposta certa grava consentimento + conecta + abre
      o painel pedido; perfil já consentido não vê o portão de novo depois de recarregar.
- [x] `npx tsc -b` / `npm run test` sem erros (107/107, 6 testes novos).

## Fora de escopo (explicitamente adiado)

- Sincronizar o consentimento pro backend (`family_accounts`) pra famílias assinantes gerenciarem
  centralmente pelo `/familia` — não pedido, e o portão no jogo já cobre o requisito de G13
  sozinho pra todo mundo.
- Revogar consentimento já dado (não pedido).
