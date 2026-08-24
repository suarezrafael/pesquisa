# Laboratório 82 — cosméticos da Fase E + expansão do quick-chat

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: df4de71

## Objetivo do laboratório
Pedido do usuário: "continue a próxima fase, não esqueça de implementar as melhorias do jogo,
mas uma das coisas que as crianças pediram foi o chat livre... quero que abra pra chat livre."

Dois pedidos distintos:
1. Continuar a Fase E do plano comercial (cosméticos exclusivos de assinante, catálogo já
   desenhado em `docs/plano-comercial-backend.md`).
2. Abrir chat de texto livre entre crianças — **não implementado como pedido**: é um requisito
   `[MUST]` explícito de `docs/prompts/01-seguranca.md` §1 e `prompt.md` §11 ("nenhum chat de
   texto livre entre crianças no MVP"), com risco real de assédio/bullying/vazamento de dado
   pessoal de criança pra estranho e exposição jurídica (LGPD/ECA) pro usuário, que já está
   cobrando assinatura de pais de verdade. Decisão comunicada ao usuário antes de codificar:
   em vez de abrir texto livre, expandir bastante o catálogo fechado de quick-chat (10 → 35
   frases, organizadas em categorias) — resolve o problema real relatado ("pouca variedade pra
   engajamento") sem abrir a superfície de risco.

## Funcionalidades planejadas
- [x] Catálogo de quick-chat expandido (`app/src/data/chatMessages.ts`): 10 → 35 frases, 5
  categorias (saudações/reações/convites/elogios/jogo)
- [x] `ChatPanel.tsx` com abas de categoria (não cabia mais numa lista só)
- [x] `QUICK_CHAT_IDS` sincronizado nos dois relés (`server/relay.cjs` legado e
  `server-cf-relay/src/index.ts` ativo) — nenhuma mensagem nova funcionaria sem isso, o relé
  descartaria qualquer `messageId` fora da lista dele
- [x] Campo `subscriptionOnly?: boolean` adicionado a `AvatarOption`/`HatOption`/`ColorOption`
- [x] Itens novos exclusivos de assinante: 3 criaturas (Fênix/Robô/Fantasma), 3 chapéus (Coroa de
  Diamante/Boné Holográfico/Laço Estelar), 4 cores (Camisa Holográfica/Calça Estelar/Tênis
  Neon/Mochila Dourada) — todos reaproveitando formas/geometria já existentes, nenhum código 3D
  novo, nenhum item já comprável com moeda reclassificado
- [x] `AvatarShop.tsx` mostra itens exclusivos com 👑 e "🔒 Assinantes" quando a família não tem
  assinatura ativa, e libera "Usar" quando `useEntitlement().active` é verdadeiro
- [x] Deploy em produção (Vercel + relé Cloudflare) e testado ao vivo (loja mostrando bloqueado
  sem assinatura, liberado simulando entitlement ativo, chat com abas funcionando)

## Fora de escopo (explicitamente adiado)
- "Minha Casa" (feature de casa/mobília pra montar, também parte da Fase E no plano) — grande o
  suficiente pra ser seu próprio laboratório, como já registrado em
  `docs/plano-comercial-backend.md`.
- Chat de texto livre — não será implementado nesta forma; ver decisão acima.
