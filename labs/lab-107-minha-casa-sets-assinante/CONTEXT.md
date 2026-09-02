# Contexto — Laboratório 107 — Minha Casa (sets exclusivos de assinante)

Preenchido em: 2026-08-29
Commit inicial → final: 415311896b1d0d582976a5d3ea09e5bd1d9d8605..HEAD

## O que foi feito
Última peça de "Minha Casa" planejada em `docs/plano-comercial-backend.md` — os dois sets
temáticos exclusivos de assinante.

- **`app/src/data/furniture.ts`**: 6 itens novos, todos `cost: 0, subscriptionOnly: true` — "Quarto
  Espacial" 🚀 (`cama_nave`, `luminaria_planeta`, `tapete_estrelas`) e "Jardim Encantado" 🌷
  (`grama_florida`, `banco_madeira`, `borboletas_animadas`), nomes/itens exatamente como
  especificado no plano comercial (linhas 180-182).
- **`app/src/world3d/MyHousePanel.tsx`**: nova prop `entitlementActive: boolean`; lógica de
  "usável" trocada de `owned` puro pra `usable = subscriptionOnly ? entitlementActive : owned`
  (mesma expressão de `AvatarShop.tsx`) — itens de assinante mostram 👑 no nome e, sem assinatura,
  tag "🔒 Assinantes" (classe `subscription-lock`, já existente, zero CSS novo) em vez de botão de
  compra.
- **`app/src/App.tsx`**: `entitlementActive={entitlement?.active ?? false}` passado pro
  `MyHousePanel` — mesmo valor já usado pro `AvatarShop` (`useEntitlement()` já estava
  desestruturado no componente, nenhum import novo).
- **`app/src/state/progression.test.ts`**: 2 testes novos (`cama_nave` e `borboletas_animadas`
  recusados mesmo com 9999 moedas) — suite total 44/44. Nenhuma mudança em `progression.ts`:
  `unlockGeneric` já rejeitava `subscriptionOnly` desde que a função existe (lab-92), os itens só
  precisavam existir no catálogo.

## Decisões técnicas tomadas
- **Zero mudança de domínio** — `unlockFurniture`/`unlockGeneric` (lab-106) já tratavam
  `subscriptionOnly` corretamente; este laboratório foi 100% dado (catálogo) + apresentação
  (painel), confirmando que o design do lab-106 (reaproveitar `unlockGeneric` sem variação) já
  tinha essa extensão prevista desde o início.
- **Verificação ao vivo cobriu só o estado SEM assinatura** (o padrão/seguro de simular) — o estado
  COM assinatura ativa não foi simulado ao vivo neste laboratório. Simular exigiria um token de
  entitlement real (envolveria infraestrutura de pagamento por um cheque que é só um render
  condicional) ou adulterar `localStorage`/rede de um jeito que o PRÓPRIO lab-90 identificou como
  a categoria de atalho que esconde bugs reais (editar `active: true` manualmente é exatamente o
  bypass que aquele laboratório corrigiu). Confiança na correção vem de PARIDADE DE CÓDIGO: a
  expressão `usable = subscriptionOnly ? entitlementActive : ...` é uma cópia literal do que já
  roda em produção há vários laboratórios em `AvatarShop.tsx` (chapéus/óculos exclusivos,
  lab-82/92) — risco residual é o mesmo risco já aceito (e não observado) nesses eixos mais
  antigos, não uma lógica nova sem histórico.
- **Nota de cuidado com dados reais**: a verificação ao vivo deste laboratório usou um NOVO save
  local real encontrado sem querer (`localhost:5175`, perfil "Bia", criado em 2026-08-16) — ao
  contrário do lab-106, desta vez só LEITURA foi feita (nenhum campo sobrescrito), confirmado por
  leitura de `localStorage` antes de fechar a aba. Fica registrado que múltiplas portas de dev
  deste projeto (5173/5174/5175) já têm perfis reais de teste salvos de sessões anteriores — bom
  lembrete pra qualquer verificação futura conferir `localStorage` ANTES de escrever nele.

## Pendências / dívidas conhecidas
- Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório — todas as 6 concluídas (catálogo, painel, wiring,
  testes, build, verificação do estado bloqueado). O estado "com assinatura" não foi verificado ao
  vivo pela razão explicada acima (não é um item pendente, é uma decisão de escopo de verificação).

## O que o próximo laboratório deve desenvolver
- Com isso, **"Minha Casa" está completa** conforme especificado em
  `docs/plano-comercial-backend.md` (casa base grátis + mobília comprável + 2 sets exclusivos de
  assinante) — só falta o P2 explícito ("modo visita"), que segue fora de escopo até uma revisão de
  segurança infantil dedicada.
- Bug de morros invisíveis (lab-95) continua em aberto, esperando resposta do usuário.
- Secrets `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` e merge do PR `#8` continuam pendentes (lab-104,
  ação do usuário).
- Itens restantes do backlog de produto não escolhidos até agora: Fase F (Stripe produção/
  Cloudflare Pages/e-mail semanal via Resend), múltiplos perfis de criança por família.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 44 testes, incluindo os 2 novos de regressão de assinatura.
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev`, `window.__debugTeleport(-0.35, 1, 0.12)` (dev-only) — sem entitlement
    ativo, os 6 itens dos sets aparecem com 👑 e "🔒 Assinantes"; os 5 itens básicos continuam
    mostrando custo em moeda normalmente.
