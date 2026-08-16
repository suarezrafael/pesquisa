# Laboratório 08 — Lojinha de avatares (moedas trocam por personagens)

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: d9db7cf

## Objetivo do laboratório
Pedido do usuário: "minha filha comentou o que fazer com a moedas bom eh trocar por avatares
outros personagens" — feedback real de playtest da filha, dona (jogadora-alvo) do jogo. Resolve
a pendência em aberto do lab-07 ("mais coisas pra interagir" não tinha um destino concreto pras
moedas coletáveis).

## Funcionalidades planejadas
- [x] Catálogo de avatares como dado de domínio (`src/data/avatars.ts`), desacoplado do motor
      3D — 6 avatares gratuitos (os mesmos de sempre, disponíveis desde o onboarding) + 6 novos
      avatares bloqueados, com preço crescente em moedas (12 a 45)
- [x] `Progress.unlockedAvatarIds` — entitlement persistido em `localStorage`, com os 6 avatares
      gratuitos desbloqueados por padrão (migração automática de saves antigos via spread)
- [x] Regra de compra (`unlockAvatar` em `state/progression.ts`): desconta moeda e desbloqueia,
      só se o avatar existir, não estiver já desbloqueado, e o jogador tiver moeda suficiente
- [x] Lojinha (`world3d/AvatarShop.tsx`, botão 🎭 no HUD): grade com todos os avatares, mostra
      "Em uso" no equipado, "Usar" nos desbloqueados, preço com botão desabilitado nos que
      faltam moeda
- [x] Trocar de avatar equipado (`useProfile().equipAvatar`) recolore o personagem já em cena
      (sem reconstruir o mundo 3D inteiro) — feito e verificado por leitura direta do material
      na cena e amostragem de pixel do canvas
- [x] `Onboarding.tsx` passa a ler a lista de avatares gratuitos do mesmo catálogo (fonte única),
      em vez de uma lista hard-coded separada
- [x] Testado de ponta a ponta: compra desconta moeda certo, equipar troca a cor do personagem
      em tempo real, estado persiste após recarregar a página, botão de compra fica desabilitado
      sem moeda suficiente, sem erros no console

## Fora de escopo (explicitamente adiado)
- Diferenciação visual além da cor da camisa (acessórios, corpo diferente por avatar) — ver
  pendências no `CONTEXT.md`
- Escutar a trilha "estilo rádio" de ouvido de verdade (pendência herdada do lab-07)
- Deploy real, moderação de chat (pendências antigas, sem mudança neste laboratório)
