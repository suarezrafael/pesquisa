# Laboratório 108 — Múltiplos perfis de criança por aparelho

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: a730322a8764324b2dee1371ac09a4d09b778844

## Objetivo do laboratório
Última das 4 frentes de backlog de produto apresentadas depois do lab-104 (Minha Casa/Fase F
Stripe/e-mail semanal/múltiplos perfis) — as outras 3 já foram atendidas (Minha Casa completa nos
labs 105-107). Sem escolha explícita do usuário desta vez ("continue proximo lab" sem especificar),
escolhida por ser a única das opções restantes totalmente construível em código, sem precisar de
credencial nova de terceiro (Stripe produção) nem decisão que só o usuário pode tomar (bug de
morros invisíveis, secrets do lab-104).

## Investigado antes de planejar
- **O que "múltiplos perfis" significa de verdade neste projeto**: não há nada em `prompt.md`/
  `docs/plano-comercial-backend.md` detalhando esta feature (só foi citada de passagem como opção
  de backlog na sessão anterior). Investigação da arquitetura atual revelou o problema real: o
  perfil/progresso do jogo é 100% local (`localStorage`, chaves fixas sem id —
  `app/src/state/storage.ts`), então DOIS IRMÃOS jogando no MESMO tablet/navegador hoje
  compartilham OBRIGATORIAMENTE um único perfil — não tem como a Duda e o Léo, digamos, terem cada
  um seu próprio avatar/progresso/moedas no mesmo aparelho. Isso é ortogonal ao "aparelhos por
  família" do lab-97/100 (que é sobre QUANTOS APARELHOS uma assinatura paga cobre, não sobre
  QUANTOS PERFIS cabem num aparelho só).
- `app/src/state/storage.ts`: confirmado que `loadProfile`/`saveProfile`/`loadProgress`/
  `saveProgress`/`hasTutorialBeenSeen`/`markTutorialSeen`/`touchLastPlayed`/`loadLastPlayedAt`
  usam chaves fixas (`jogo-educativo:profile`, etc.) sem nenhum conceito de "qual criança".
  `DEVICE_ID_KEY` (analytics anônimo, lab-99) e a entitlement (`entitlementStorage.ts`, pareamento
  de assinatura) já são corretamente GLOBAIS por aparelho — não fazem parte deste problema e não
  precisam mudar (a assinatura da família cobre o APARELHO, não uma criança específica).
- `app/src/components/FamilyPortal.tsx` (linha 632, 4): chama `loadProfile()`/`loadProgress()`/
  `loadLastPlayedAt()` direto — assume o mesmo dispositivo do jogo (lab-91). Se essas funções
  passarem a operar sobre "o perfil ATIVO no momento" (em vez de um único perfil fixo), o portal
  continua funcionando sem nenhuma mudança de código — mostra o perfil que estiver ativo no
  aparelho quando o responsável abrir `/familia` nele.
- `app/src/components/TitleScreen.tsx`/`Onboarding.tsx`: fluxo de criação de perfil já existente
  (emoji + apelido) — reaproveitado tal e qual pra criar QUALQUER perfil novo (o primeiro ou o
  quinto), não só o primeiro.
- `app/src/world3d/HudHeader.tsx`: padrão de botão de ícone (`onOpenPairing` 🔗) — mesmo padrão
  reaproveitado pro botão novo de trocar perfil.

## Decisões técnicas tomadas (antes de implementar)
- **Sem toque em `entitlementStorage.ts`/pareamento** — assinatura continua por APARELHO, nunca por
  perfil de criança; um dispositivo pareado libera cosméticos de assinante pra QUALQUER perfil
  criado nele, sem duplicar entitlement por criança.
- **Migração aditiva, nunca destrutiva**: perfil "legado" (de antes deste laboratório, chaves sem
  id) é copiado pra um slot novo na primeira leitura pós-atualização — as chaves antigas NUNCA são
  apagadas, só deixam de ser lidas depois da migração. Zero risco de perda de progresso real de
  família já jogando.
- **Troca de perfil recarrega a página** (`window.location.reload()`) em vez de tentar sincronizar
  `useProfile`/`useProgress`/todo o resto do estado do React manualmente — muito mais simples e
  confiável pra uma ação rara e deliberada (poucas vezes por sessão), evita uma classe inteira de
  bug de estado parcialmente trocado.
- **Limite de 4 perfis por aparelho** — só limite de UX (lista não cresce sem controle numa tela de
  criança), não ligado a nenhuma regra de negócio/entitlement.
- **Perfil único continua invisível** — se só existe um perfil no aparelho (o caso comum, quase
  todo mundo), a tela de escolha NUNCA aparece; o jogo se comporta exatamente como antes deste
  laboratório. A tela só aparece quando há 2+ perfis OU o responsável pede pra trocar.

## Funcionalidades planejadas
- [x] `app/src/state/storage.ts`: sistema de slots por perfil (`jogo-educativo:profiles` roster +
      `jogo-educativo:activeProfileId` + chaves `profile:<id>`/`progress:<id>`/
      `tutorialSeen:<id>`/`lastPlayedAt:<id>`), migração preguiçosa e aditiva do perfil legado,
      `listProfiles`/`createProfileSlot`/`switchActiveProfile`/`clearActiveProfile`, limite
      `MAX_PROFILES = 4`.
- [x] `app/src/state/useProfile.ts`: `createProfile` cria o slot (`createProfileSlot`) antes de
      salvar o perfil — cobre tanto o primeiro perfil de um aparelho novo quanto um perfil
      adicional.
- [x] `app/src/components/ProfilePicker.tsx` (novo): tela "Quem vai jogar?" — reaproveita
      `.screen`/`.primary-button`, grade de perfis (emoji + nome), tile "+ Novo perfil" (escondida
      no limite).
- [x] `app/src/App.tsx`: mostra `ProfilePicker` quando `!profile && perfis.length > 0`; "+ Novo
      perfil" reaproveita `Onboarding` sem passar pela `TitleScreen` de novo; botão de trocar
      perfil no HUD limpa o perfil ativo e recarrega, voltando pro picker.
- [x] `app/src/world3d/World3D.tsx`/`HudHeader.tsx`: novo botão de ícone "🔁 Trocar perfil" —
      **decisão revisada durante a implementação**: o plano original escondia este botão quando só
      havia 1 perfil (`roster.length > 1`), mas isso criava um beco sem saída — a ÚNICA porta de
      entrada pro picker (e pro "+ Novo perfil" nele) era esse botão, então um aparelho com um
      único filho nunca teria como criar o segundo. Corrigido ANTES de qualquer verificação ao
      vivo: o botão fica sempre visível (mesmo peso visual dos outros ícones do HUD, não atrapalha
      quem nunca precisa dele).
- [x] Verificação ao vivo (dev server + browser automation, num dispositivo de dev real com um
      perfil "Duda" pré-existente de sessão anterior): perfil único migra sem tela nova nenhuma
      (dados legados confirmados intactos, cópia migrada bate byte a byte); criado um segundo
      perfil "Leo" no mesmo aparelho — progresso de cada um confirmado isolado (Leo com 0 moedas
      vs. Duda com 10 + badge), trocar entre os dois preserva o estado de cada lado sem perda.
      **Um segundo bug real pego durante essa mesma verificação** (não só o do botão, ver acima):
      a guarda de migração usava `ACTIVE_PROFILE_ID_KEY` (que "Trocar perfil" apaga de propósito)
      em vez do roster — trocar de perfil disparava uma SEGUNDA migração do perfil legado (que
      nunca é apagado), duplicando o perfil antigo num slot novo toda vez que alguém trocasse.
      Corrigido trocando a guarda pra `loadRoster().length > 0` (nunca esvaziado por nenhuma ação
      deste laboratório) — reproduzido e confirmado corrigido ao vivo antes de fechar o laboratório.

## Fora de escopo (explicitamente adiado)
- Apagar/renomear um perfil existente — só criar e trocar nesta primeira fatia.
- Qualquer controle parental sobre QUAL perfil pode ser criado/usado (ex.: PIN do responsável) —
  mesma decisão de manter a criança sem login/senha, já estabelecida no resto do projeto.
- Refletir múltiplos perfis no `/familia` (hoje mostra só o perfil ativo no aparelho) — o portal já
  funciona sem mudança nenhuma (mostra o que estiver ativo), uma visão agregada de todos os perfis
  do aparelho fica pra depois, se pedida.
