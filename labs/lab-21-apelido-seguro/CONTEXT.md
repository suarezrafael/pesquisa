# Contexto — Laboratório 21 — Apelido seguro no onboarding

Preenchido em: 2026-08-17
Commit inicial → final: 6729272f239f41226fac142b57fb522dec067efa..0d38e9cc001acc5f61a298d5ccf0033a21f45d9f

## O que foi feito

1. **`Onboarding.tsx`** — o campo antes rotulado "Seu nome" (placeholder "Digite seu nome") virou
   "Seu apelido de explorador(a)" com placeholder de exemplo ("Ex: RaposaCorajosa42") e um aviso
   explícito abaixo do campo: "Use um apelido, não seu nome real — outros jogadores podem ver!".
   Linguagem voltada à criança (~10 anos), não texto legal/formal.
2. **`src/data/nicknames.ts`** (novo) — `generateNickname()` combina adjetivo + bicho/tema de
   aventura + número de 2 dígitos (ex. "EspertoTigre49"), mesmo padrão de catálogo simples de
   `chatMessages.ts`. Botão "🎲 Gerar" no onboarding preenche o campo com um apelido novo a cada
   clique; o campo continua editável — a criança pode digitar o próprio apelido, só não é mais
   convidada a digitar o nome real.
3. **CSS** (`index.css`) — `.nickname-row` (input + botão lado a lado), `.nickname-generate-btn`,
   `.field-hint` (aviso de segurança, tipografia menor/discreta).

## Decisões técnicas tomadas

- **Correção de segurança, não feature nova** — motivado por um item **[MUST]** de
  `docs/prompts/01-seguranca.md` §1 ("Nome de exibição pode ser um apelido gerado, não nome
  real"), que CLAUDE.md trata como bloqueador de merge. Não foi um pedido explícito do usuário
  nesta sessão — encontrado numa revisão de `prompt.md`/critérios de segurança contra o código
  atual (sugerida como próximo passo em `labs/lab-20-ranking-local/CONTEXT.md`).
- **Não é uma dívida teórica** — confirmado que um nome digitado no onboarding hoje já vaza pra
  qualquer outro jogador conectado na mesma rede: aparece na nametag flutuante do multiplayer
  local (lab-06), no painel de ranking (lab-20) e em cada mensagem de chat (lab-12). O gap
  existia desde o lab-05 (onboarding original) e só ficou com blast radius real depois do
  multiplayer (lab-06) e do ranking (lab-20) existirem.
- **Gerador sugere, não obriga** — o campo continua sendo texto livre editável (não virou um
  `<select>` travado). O objetivo do MUST é "não pedir/incentivar nome real", não impedir
  qualquer personalização; travar completamente seria uma regressão de UX desproporcional ao
  requisito real.
- **Sem sanitização adicional de conteúdo do apelido** — fora de escopo deste lab (não foi o
  problema identificado); o nome de exibição já passa só por escaping padrão do React em todo
  lugar que é renderizado (nametag, chat, ranking), que já previne XSS por padrão.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção).
- Testado ao vivo no navegador: perfil salvo (`localStorage`) temporariamente removido (com
  backup/restauração — não foi perdido nenhum progresso de teste), fluxo completo de onboarding
  refeito do zero. Confirmado via DOM: label/placeholder/aviso novos renderizam; clique no botão
  "Gerar" preenche o campo com um apelido plausível (`"EspertoTigre49"`, lido direto do
  `input.value`, não só por screenshot); clique em "Começar aventura" cria o perfil com esse
  apelido (confirmado lendo `localStorage.getItem('jogo-educativo:profile')` depois do clique).
  Perfil de teste original restaurado ao final.

## Pendências / dívidas conhecidas

- Perfis já criados antes deste lab (com um nome já salvo, possivelmente real) não são migrados
  — o fix só afeta onboarding de perfil novo daqui pra frente. Documentado como fora de escopo em
  `FEATURES.md` (não há como saber, a partir de um nome salvo, se era um nome real ou não; forçar
  reset perderia progresso de jogadores existentes sem necessidade).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as duas funcionalidades planejadas (rótulo/aviso do campo, gerador de apelido) foram
concluídas e verificadas.

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Mais conteúdo, se o usuário continuar pedindo.
2. Backend/conta — ainda exige decisão de infraestrutura do usuário (não pode começar sozinho).
   Quando isso avançar, revisitar os itens **[MUST]** de `docs/prompts/01-seguranca.md` §2–4
   (autenticação delegada, RLS, parental gate antes de qualquer tela de preço) — nenhum deles se
   aplica hoje porque não existe conta/pagamento ainda, mas viram bloqueadores de merge assim que
   esse trabalho começar.
3. Se o usuário voltar a reportar o "morro/prédio invisível" (curvatura de horizonte, ver
   `labs/lab-19-colisao-npc-neblina/CONTEXT.md`): considerar aumentar `PLANET_RADIUS`.
4. Não há mais nenhum outro item **[MUST]** de segurança pendente conhecido no código atual (sem
   conta) — o restante de `01-seguranca.md` que ainda não é aplicável está listado no item 2
   acima, pra não esquecer quando o backend entrar em cena.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001).
