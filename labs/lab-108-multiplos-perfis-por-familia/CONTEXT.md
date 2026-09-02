# Contexto — Laboratório 108 — Múltiplos perfis de criança por aparelho

Preenchido em: 2026-08-29
Commit inicial → final: a730322a8764324b2dee1371ac09a4d09b778844..HEAD

## O que foi feito
Última das 4 frentes de backlog de produto apresentadas depois do lab-104 — as outras 3 (Minha
Casa) já foram concluídas nos labs 105-107. Sem escolha explícita do usuário desta vez, escolhida
por ser a única totalmente construível em código nesta sessão. Permite dois irmãos compartilhando
o mesmo tablet terem cada um seu próprio avatar/progresso/moedas — antes deste laboratório o jogo
tinha um único perfil fixo por aparelho (`localStorage` sem nenhum conceito de "qual criança").

- **`app/src/state/storage.ts`** (reescrito): sistema de slots por perfil.
  - Chaves legadas (`jogo-educativo:profile`/`progress`/`tutorialSeen`/`lastPlayedAt`, sem id)
    renomeadas internamente pra `LEGACY_*` — nunca apagadas.
  - Roster leve em `jogo-educativo:profiles` (`ProfileRosterEntry[]`: id/nome/emoji) +
    `jogo-educativo:activeProfileId`; dados completos de cada perfil em chaves com o id embutido
    (`profile:<id>`, `progress:<id>`, `tutorialSeen:<id>`, `lastPlayedAt:<id>`).
  - `migrateLegacyProfileIfNeeded()`: roda a cada leitura até copiar o perfil legado pro sistema de
    slots uma única vez (guarda pelo ROSTER, ver "Decisões técnicas" pro porquê disso importar).
  - Novo: `listProfiles`, `createProfileSlot`, `switchActiveProfile`, `clearActiveProfile`,
    `MAX_PROFILES = 4`.
  - `loadProfile`/`saveProfile`/`loadProgress`/`saveProgress`/`hasTutorialBeenSeen`/
    `markTutorialSeen`/`touchLastPlayed`/`loadLastPlayedAt` mantiveram a MESMA assinatura externa —
    passaram a operar sobre "o perfil ativo agora" em vez de "o único perfil que existe". Zero
    mudança em `useProgress.ts`/`FamilyPortal.tsx` por causa disso.
  - `entitlementStorage.ts`/`getOrCreateDeviceId` (analytics) ficaram de fora de propósito — são
    por APARELHO, não por criança.
- **`app/src/state/useProfile.ts`**: `createProfile` chama `createProfileSlot(name, avatarEmoji)`
  antes de montar/salvar o `Profile` — cobre tanto o primeiro perfil de um aparelho novo quanto um
  perfil adicional, sem ramificação especial.
- **`app/src/components/ProfilePicker.tsx`** (novo): tela "Quem vai jogar?" — grade de perfis
  (emoji + nome) + tile "+ Novo perfil" (some no limite de 4). CSS novo mínimo
  (`.profile-picker-grid`/`.profile-picker-item`, `app/src/index.css`).
- **`app/src/App.tsx`**: perfil ausente com roster não-vazio mostra `ProfilePicker` em vez de ir
  direto pro `Onboarding`; "+ Novo perfil" pula a `TitleScreen` (`setPreProfileScreen('onboarding')`
  direto); selecionar um perfil existente chama `switchActiveProfile` + `window.location.reload()`.
- **`app/src/world3d/World3D.tsx`/`HudHeader.tsx`**: novo botão de ícone "🔁 Trocar perfil" (mesmo
  padrão do botão de pareamento 🔗) — `clearActiveProfile()` + reload, sempre visível.

## Decisões técnicas tomadas
- **Dois bugs reais pegos e corrigidos ANTES/DURANTE a verificação ao vivo** (nenhum chegou a ser
  visto pelo usuário):
  1. **Botão "Trocar perfil" escondido com só 1 perfil** — plano original só mostrava o botão com
     `roster.length > 1`, criando um beco sem saída: a única porta pro picker (e pro "+ Novo
     perfil" dentro dele) ficava invisível justamente quando só existe 1 perfil — ou seja, NUNCA
     seria possível criar um segundo. Pego por raciocínio antes de sequer abrir o navegador.
     Corrigido tornando o botão sempre visível.
  2. **Guarda de migração errada causava duplicação a cada troca de perfil** — a guarda original
     de `migrateLegacyProfileIfNeeded` era `if (getActiveProfileId()) return`. Como "Trocar perfil"
     (`clearActiveProfile`) apaga só o id ativo, nunca o roster nem as chaves legadas (que também
     nunca são apagadas por design), a PRÓXIMA leitura via `loadProfile` achava "sem id ativo,
     tenho perfil legado" e migrava DE NOVO — criando um slot novo (com progresso zerado) toda vez
     que alguém trocasse de perfil, e sobrescrevendo o roster no processo. Reproduzido ao vivo
     (confirmado via inspeção direta de `localStorage`, usando um perfil real "Duda" de sessão de
     dev anterior) e corrigido trocando a guarda pra `loadRoster().length > 0` — o roster, uma vez
     preenchido, nunca é esvaziado por nenhuma ação deste laboratório, guarda confiável de "já
     migrei". Corrigido e reverificado ao vivo antes de fechar o laboratório.
- **Sem toque em `entitlementStorage.ts`** — assinatura continua por APARELHO; qualquer perfil
  criado num dispositivo pareado herda os cosméticos de assinante automaticamente, sem duplicar
  entitlement por criança (não faz sentido cobrar/gerenciar assinatura por criança individual aqui).
- **Migração aditiva, nunca destrutiva** — chaves legadas nunca são apagadas, só deixam de ser lidas
  depois que o roster existe. Zero risco de perda de progresso real.
- **Troca de perfil recarrega a página** (`window.location.reload()`) em vez de sincronizar
  `useProfile`/`useProgress` manualmente — mais simples e confiável pra uma ação rara e deliberada.
- **Limite de 4 perfis** — só UX, não regra de negócio.

## Pendências / dívidas conhecidas
- Nenhuma nova além do que já estava planejado como fora de escopo (ver `FEATURES.md`).

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório — todas as 6 concluídas, incluindo os 2 bugs
  corrigidos antes do fechamento. `npm run test`: 44/44 (nenhum teste novo — `storage.ts` é
  I/O de `localStorage`, não lógica de domínio pura, mesmo critério já aplicado ao resto do
  arquivo, que também nunca teve testes). `npm run build`: typecheck + produção sem erros.

## O que o próximo laboratório deve desenvolver
- **Apagar/renomear um perfil existente** — ficou fora desta primeira fatia de propósito.
- **Refletir múltiplos perfis no `/familia`** — hoje mostra só o perfil ativo no aparelho; uma
  visão agregada de todos os perfis do aparelho (útil pro responsável ver os dois filhos de uma
  vez) fica pra depois, se pedida.
- Bug de morros invisíveis (lab-95) continua em aberto, esperando resposta do usuário.
- Secrets `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` e merge do PR `#8` continuam pendentes (lab-104,
  ação do usuário).
- Com Minha Casa (105-107) e múltiplos perfis (108) concluídos, os itens de backlog de produto
  genuinamente em aberto ficam restritos à Fase F (Stripe produção/Cloudflare Pages/e-mail semanal
  via Resend) — todos exigem credencial/decisão de infraestrutura que só o usuário pode prover.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 44 testes, sem mudança de contagem (nenhum teste novo neste lab).
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev` — perfil único existente segue direto pro jogo, sem tela nova; botão
    🔁 no HUD (junto dos outros ícones) abre "Quem vai jogar?"; "+ Novo perfil" reaproveita o
    onboarding padrão; perfis trocam sem misturar progresso/moeda entre si.
  - **Verificado ao vivo nesta sessão** usando um dispositivo de dev real com um perfil "Duda" já
    existente de sessão anterior: migração confirmada não-destrutiva (chaves legadas intactas),
    segundo perfil "Leo" criado e confirmado isolado (0 moedas vs. 10+badge de Duda), troca entre
    os dois sem perda de dado dos dois lados, sem erro de console. O perfil de teste "Leo" foi
    removido ao final da verificação, devolvendo o aparelho ao estado original de 1 perfil.
