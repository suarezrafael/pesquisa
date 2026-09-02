# Contexto — Laboratório 82 — cosméticos da Fase E + expansão do quick-chat

Preenchido em: 2026-08-24
Commit inicial → final: df4de71..a24bab0

## O que foi feito

### Chat livre recusado, quick-chat expandido no lugar
O usuário pediu explicitamente "chat livre" pra crianças, argumentando que o chat de frases
fixas "não permite comunicação e engajamento". Antes de codificar, expliquei por que isso não
seria implementado como pedido: `docs/prompts/01-seguranca.md` §1 e `prompt.md` §11 têm isso como
requisito **[MUST]** ("nenhum chat de texto livre entre crianças no MVP") — chat livre entre
crianças desconhecidas é onde acontece assédio/bullying e vazamento de dado pessoal (telefone,
endereço, rede social digitados pra um estranho), com exposição jurídica real (LGPD/ECA) pro
produto que já cobra assinatura dos pais. O próprio Roblox (referência citada pelo usuário)
restringe esse tipo de chat pra contas de criança por padrão.

Resposta concreta ao problema real (catálogo antigo tinha só 10 frases, pouco pra interação de
verdade): `app/src/data/chatMessages.ts` ganhou um campo `category` e foi de 10 pra 35 frases em
5 categorias (saudações, reações, convites, elogios, no jogo). Continua sendo **impossível**
enviar qualquer coisa fora dessa lista fechada — a garantia de segurança não mudou, só a
variedade de expressão dentro dela.

- `app/src/world3d/ChatPanel.tsx` ganhou abas de categoria (a lista antiga cabia numa grade só;
  35 itens não cabem mais).
- `QUICK_CHAT_IDS` sincronizado nas duas cópias que existem fora do client (`app/server/relay.cjs`,
  relé legado, e `app/server-cf-relay/src/index.ts`, relé ativo) — ambos validam
  `messageId` server-side, então sem sincronizar essa lista as mensagens novas seriam
  silenciosamente descartadas pelo relé em produção. O relé v2 foi redeployado
  (`missao-aprender-relay-v2.rafaelvs.workers.dev`).

### Cosméticos exclusivos de assinante (Fase E)
Seguindo o catálogo já desenhado em `docs/plano-comercial-backend.md` (inspirado em Brookhaven
RP/Roblox, decidido numa sessão anterior) — mas escopo reduzido ao que dá pra construir
reaproveitando a geometria/vocabulário 3D já existente, sem escrever Babylon novo:

- `AvatarOption`/`HatOption`/`ColorOption` (`app/src/data/{avatars,hats,customization}.ts`)
  ganharam um campo opcional `subscriptionOnly?: boolean`.
- **3 criaturas novas**: Fênix 🔥 (`special: 'mane'`), Robô 🤖 (`special: 'eyes'`), Fantasma 👻
  (`special: 'none'`) — todas usando valores já existentes de `SpecialAccessory`, só com
  emoji/nome/cor novos. Nenhuma reaproveita uma criatura já comprável com moeda.
- **3 chapéus novos**: Coroa de Diamante 💎 (`shape: 'crown'`), Boné Holográfico 🧢
  (`shape: 'cap'`), Laço Estelar ✨ (`shape: 'bow'`) — mesmas formas primitivas já existentes,
  cores novas.
- **4 cores novas**: Camisa Holográfica, Calça Estelar, Tênis Neon, Mochila Dourada — uma em
  cada catálogo de cor já existente.
- `DEFAULT_UNLOCKED_HAT_IDS`/`DEFAULT_UNLOCKED_AVATAR_IDS` (filtros por `cost === 0`) corrigidos
  pra excluir `subscriptionOnly` — sem isso, os itens exclusivos apareceriam desbloqueados pra
  todo mundo desde o início, já que usam `cost: 0` como valor sentinela de "sem preço em moeda".
- `AvatarShop.tsx` ganhou a prop `entitlementActive` (de `useEntitlement()`, já existente desde
  o lab-81) — itens `subscriptionOnly` mostram 👑 no nome e "🔒 Assinantes" quando
  `entitlementActive` é falso, ou um botão "Usar" normal quando é verdadeiro. Diferente dos itens
  de moeda, nunca entram em `unlockedXxxIds` — o acesso é dinâmico (ativo enquanto a assinatura
  estiver ativa), não uma compra permanente.

## Bug real encontrado e corrigido durante o teste ao vivo
Um item `subscriptionOnly` com `cost: 0` disparava a MESMA condição usada pra detectar "esse é o
item padrão do catálogo" (`equippedId === null && opt.cost === 0`), fazendo a Camisa Holográfica
(por exemplo) aparecer com a tag "Em uso" AO MESMO TEMPO que "🔒 Assinantes", mesmo sem estar
equipada. Corrigido adicionando `&& !opt.subscriptionOnly` a essa condição em `ColorSection`.
Foi encontrado testando ao vivo no navegador (não só lendo o código), e revelou um segundo caso
relacionado (uma família com assinatura vencida que já tinha equipado um item exclusivo veria
"Em uso" e "🔒 Assinantes" juntos) — corrigido nas três seções (avatares/chapéus/cores)
adicionando `!equipped &&` antes de mostrar o cadeado.

## Decisões técnicas tomadas
- **Nenhum item já comprável com moeda foi reclassificado como exclusivo** — critério já
  registrado em `docs/plano-comercial-backend.md`: mudar a regra de algo que já era grátis/
  comprável seria visto como "downgrade" por quem já jogava.
- **"Minha Casa" (feature de casa/mobília) ficou de fora deste laboratório** — como o próprio
  plano já registrava, é grande o suficiente pra ser seu próprio laboratório (geometria nova,
  sistema de posicionamento de móveis, etc.), diferente das extensões de catálogo aqui, que só
  reaproveitam o que já existe.
- **Item exclusivo de assinante não usa `unlockedXxxIds`** — é um "aluguel" (ativo só enquanto a
  assinatura estiver ativa), não uma compra permanente como os itens de moeda. Ver pendência
  abaixo sobre o que acontece quando a assinatura vence com o item já equipado.

## Pendências / dívidas conhecidas
- **Sem gate em tempo real na renderização 3D**: se uma família cancela a assinatura com um item
  exclusivo já equipado, o boneco continua VISUALMENTE usando esse item (o `World3D.tsx` só lê
  `profile.equippedXxxId`, sem checar `entitlementActive`). A loja já impede equipar de NOVO sem
  assinatura ativa — só não força um "despir" automático de quem já tinha equipado antes de
  cancelar. Resolver isso exigiria passar `entitlementActive` também pro código de renderização
  (`World3D.tsx`), escopo maior que o resto deste laboratório; documentado aqui como decisão
  consciente de simplicidade, não uma lacuna descoberta por acidente.
- **`ChatPanel.tsx` não lembra a última categoria aberta** — sempre reabre em "Saudações". Baixo
  impacto, não reportado como problema por ninguém.

## Funcionalidades planejadas que NÃO foram concluídas
Nenhuma das planejadas para este laboratório — "Minha Casa" e "chat livre" foram explicitamente
excluídos do escopo (ver `FEATURES.md`), não abandonados no meio.

## O que o próximo laboratório deve desenvolver
- **"Minha Casa"**: feature de casa/terreno pessoal com mobília pra montar (grátis) + 1-2 sets
  temáticos exclusivos de assinante (ver `docs/plano-comercial-backend.md`) — a peça que falta
  do catálogo de cosméticos original, deliberadamente adiada por ser grande demais pra este
  laboratório.
- Se o usuário voltar a pedir mais comunicação entre jogadores, considerar emotes/animações
  visuais (aceno, dança) como mais uma camada de expressão sem texto livre, antes de qualquer
  outra ideia que reabra a discussão de chat aberto.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`.
- Jogo em produção: `https://app-two-flax-92.vercel.app` e `https://missaoaprendizado.com` (chat
  expandido + lojinha com itens exclusivos, ambos deployados).
- Relé de multiplayer em produção: `https://missao-aprender-relay-v2.rafaelvs.workers.dev`
  (redeployado com o catálogo de chat sincronizado).
- Como verificar: abrir o jogo, clicar no chat (💬) e ver as abas de categoria; abrir a lojinha
  (🎭) e ver os itens com 👑 bloqueados ("🔒 Assinantes") sem assinatura ativa.
