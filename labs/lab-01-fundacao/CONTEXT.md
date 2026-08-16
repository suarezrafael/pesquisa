# Contexto — Laboratório 01 — Fundação

Preenchido em: 2026-08-15
Commit inicial → final: 77df10a4c2d451f36218267b6253ddee5585da5e..HEAD (commits 832a099, 6aa3524, e o commit deste wrap)

## O que foi feito

Esqueleto jogável completo, criado em `app/` (React + TypeScript + Vite — Opção A do `prompt.md`
seção 7, sem Phaser — ver decisão abaixo):

- **Onboarding** (`app/src/components/Onboarding.tsx`): escolha de avatar (6 emojis) + nome,
  1 tela só, sem fricção.
- **Loop principal** (`app/src/App.tsx` orquestra): Hub (mapa de missões) → `QuestModal` (desafio)
  → `RewardToast` (recompensa) → volta ao Hub com progresso atualizado.
- **Hub** (`app/src/components/Hub.tsx`): mostra avatar, nome, barra de XP, nível, moedas, badges
  conquistados, e um "mapa" com os 10 nós de missão — bloqueados/desbloqueados em sequência
  (só a próxima missão não concluída fica acessível).
- **10 quests** (`app/src/data/quests.ts`): 4 de lógica, 3 de matemática leve, 3 de
  leitura/interpretação, cada uma com pergunta de múltipla escolha, XP e moedas crescentes
  (10→20) conforme avança.
- **Progresso** (`app/src/state/progression.ts`, `useProgress.ts`, `storage.ts`): XP, nível
  (fórmula simples `xpForLevel(level) = level * 40`), moedas, badges com 3 marcos (primeira
  missão, metade do caminho, todas as 10) — persistido em `localStorage` (chaves
  `jogo-educativo:profile` e `jogo-educativo:progress`).
- **UI mobile-first + PWA** (`app/src/index.css`, `app/vite.config.ts`): CSS mobile-first
  (modais que sobem do rodapé em telas pequenas), `vite-plugin-pwa` configurado com manifest
  (nome "Missão Aprender", cor tema, ícone placeholder em `app/public/icon.svg`) — `npm run build`
  gera `sw.js` e `manifest.webmanifest` corretamente.

**Testado de ponta a ponta no navegador** (Chrome, via `npm run dev`): onboarding → hub → abrir
quest 1 → resposta errada mostra feedback e permite tentar de novo → resposta certa mostra
recompensa (+10 XP, +5 moedas, badge "Primeira Missão") → volta ao hub com quest 1 marcada como
concluída e quest 2 desbloqueada → **reload da página mantém o progresso** (persistência em
localStorage confirmada). Sem erros no console em nenhum passo.

## Decisões técnicas tomadas

- **Sem Phaser 3 nesta fatia**, ao contrário do que `prompt.md` seção 7 recomenda para "game
  engine". O "explorar" foi implementado como um mapa de missões em React/CSS (grid de cards),
  não um mundo 2D com sprite/física. Motivo: entregar o loop completo e testável rapidamente
  para validar o fluxo de laboratórios; Phaser adiciona bastante código (carregamento de assets,
  ciclo de vida de cena, sprites) sem mudar a mecânica core (explorar → desafio → recompensa).
  Os dados de quest são desacoplados da apresentação (`quests.ts` é só dados), então trocar o
  Hub por uma cena Phaser depois não exige tocar em lógica de progresso/recompensa.
- **Persistência local (`localStorage`), não Supabase.** Não há projeto Supabase real
  (URL/anon key) disponível nesta sessão. A camada de estado (`state/storage.ts`) já é isolada
  atrás de funções `load*/save*`, então trocar por chamadas Supabase depois é uma troca
  localizada, não um redesenho.
- **Sem penalidade por errar uma quest** — o jogador pode tentar de novo até acertar, sem
  perder XP/moedas. Alinhado com a hipótese de mercado #1 do `prompt.md` (feedback rápido
  aumenta retenção) e evita frustração numa criança de 10 anos.

## Pendências / dívidas conhecidas

- Ícones do PWA são placeholder (SVG genérico com emoji de troféu) — precisa de arte real antes
  de qualquer distribuição de verdade (prompt.md seção 9).
- Nenhum teste automatizado foi escrito (só verificação manual no navegador).
- Build gera 1 chunk JS de ~200KB — aceitável para MVP, sem necessidade de otimização agora.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as 5 funcionalidades do `FEATURES.md` foram concluídas, com a ressalva de que
"progresso salvo por conta" está local (não Supabase) — ver decisão acima e próximos passos.

## O que o próximo laboratório deve desenvolver

Ainda não decidido com o usuário — sugestões candidatas para levar à conversa do `lab start`:
- Trocar a persistência local por Supabase real (Auth + Postgres), o que exigiria o usuário
  criar um projeto Supabase e fornecer URL/anon key.
- Hub social simples (P1 do backlog): amigos + coop local/sala (prompt.md seção 6).
- Arte de verdade para os ícones do PWA e para o hub (hoje é só emoji + CSS).
- Deploy real num free tier (Cloudflare Pages/Vercel/Netlify — prompt.md seção 8) para testar
  a distribuição PWA fora do localhost.

## Estado do repositório ao final

- Branch: `copilot/pesquisa-mercado-jogo-educativo`
- Como rodar: `cd app && npm install && npm run dev` (dev) ou `npm run build && npm run preview`
  (build de produção com PWA).
