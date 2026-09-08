# Laboratório 161 — Home inicial dupla (criança + responsável)

Status: concluído
Início: 2026-09-08
Fim: 2026-09-08
Commit inicial: d32659a12d9f285e03e12c71cf1a9e18139bb6bf

## Objetivo do laboratório

Pedido explícito do usuário, seguindo a recomendação do próprio
`docs/business-analyst-prompt-backlog.md` §4 (P0, item 1 — "Primeira tela dupla criança/
responsável"): transformar `TitleScreen` numa primeira impressão que fala com dois públicos sem
misturar fluxos.

1. **Criança**: em até 10 segundos, entender que pode jogar, explorar planetas, customizar
   avatar, cuidar de pet, fazer amigos e ganhar recompensas — não só "responder quiz".
2. **Responsável**: em até 10 segundos, entender que o jogo é educativo, seguro (sem chat livre),
   sem anúncios/compras abusivas, e que a assinatura é só cosméticos — nunca bloqueia aprendizagem.

Este é um lab de produto/UX/copy, não de arquitetura nova — reaproveita `/familia` (já existe,
lab-79) e `productAnalytics.ts` (já existe, lab-99) como estão.

## Funcionalidades planejadas

- [x] `app/src/components/TitleScreen.tsx`: reescrever a proposta pra criança (explorar planetas,
      customizar avatar, cuidar de pet, fazer amigos, ganhar recompensas — não só "resolver
      desafios"), mantendo o botão "Jogar" como ação mais forte da tela (sem mudar seu
      comportamento — só o texto ao redor).
- [x] Adicionar sinais de confiança visíveis (badges/linha de texto curto, não um bloco de texto
      longo): "Aprendizado sempre grátis", "Sem chat livre", "Assinatura só pra itens visuais",
      "Feito pra jogar no navegador".
- [x] Adicionar CTA secundário — link real pra `/familia` (mesmo padrão já usado em
      `PairingScreen.tsx`: `<a href="/familia" target="_blank" rel="noreferrer">`), com texto
      dirigido ao responsável ("Área dos responsáveis"), visualmente mais discreto que o botão
      principal (faixa separada por uma linha divisória, registro de cor neutro).
- [x] CSS novo em `app/src/index.css` (`.title-trust-signals`, `.title-parent-band`) — sem tocar
      em nada fora do escopo de `.title-screen`/classes novas.
- [x] `app/src/productAnalytics.ts`: dois eventos novos exportados (`trackPlayClick`/
      `trackParentAreaClick`), chamados no clique de cada CTA da `TitleScreen`.
- [x] `app/server-accounts/src/domain.ts`: adicionado os dois tipos novos (`play_click`,
      `parent_area_click`) na allowlist `PRODUCT_EVENT_TYPES` — sem isso, `POST /events`
      recusaria os eventos novos silenciosamente (mesmo mecanismo do lab-99). Único ponto deste
      lab que toca `server-accounts`; nenhuma rota/schema/entitlement novo. Testado (1 teste novo).
- [x] `npx tsc -b` / `npm run test` (app e server-accounts) sem erros.
- [x] Verificado visualmente no navegador (`npm run dev` + `npm run build`): tela inicial não
      carrega Babylon.js antes de "Jogar" ser clicado — `World3D-*.js` continua um chunk lazy
      separado de `index-*.js` no build de produção, nenhuma mudança na estratégia de
      `lazy()`/`Suspense` já existente em `App.tsx`. Fluxo completo testado ao vivo: "Jogar" leva
      ao onboarding normalmente (comportamento intocado); "Área dos responsáveis" abre `/familia`
      numa aba nova sem navegar a aba atual pra longe da tela inicial (mesmo padrão já usado em
      `PairingScreen.tsx`).
- [x] `CONTEXT.md` registra explicitamente qual pergunta de mercado este lab ajuda a responder
      (`docs/business-analyst-prompt-backlog.md` §6): "A primeira impressão faz a criança querer
      jogar e o responsável confiar o suficiente para permitir ou assinar?"

## Fora de escopo (explicitamente adiado)

- Stripe, backend de contas/entitlement além da allowlist de evento acima, amigos, ranking,
  quests, novos cosméticos, teste de preço — nada disso muda neste lab.
- Não abrir checkout direto pela tela inicial (nenhum fluxo de pagamento parte daqui).
- Não criar pop-up de venda pra criança.
- Não mudar a regra de monetização: conteúdo educativo, progressão e cooperação continuam nunca
  gateados por assinatura (`docs/plano-comercial-backend.md`, "Regra inegociável").
- Teste de 5 segundos com crianças/responsáveis de verdade, dashboard de funil, onboarding
  jogável de 3 minutos — outros itens do backlog P0 do `business-analyst-prompt-backlog.md`,
  cada um seu próprio lab futuro.
