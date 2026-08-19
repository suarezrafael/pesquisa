# Laboratório 51 — Publicação em produção (Vercel + relé de multiplayer)

Status: concluído
Início: 2026-08-18
Fim: 2026-08-19
Commit inicial: a0dd3f5

## Objetivo do laboratório
Pedido do usuário: "o joguinho tá perfeito, agora quero publicar ele na internet pra outros
poderem jogar." Duas partes, confirmadas com o usuário via perguntas: (1) publicar o jogo em si
(hospedagem estática — Vercel, escolhida pelo usuário) e (2) resolver o multiplayer pra funcionar
pela internet de verdade, não só rede local (o usuário pediu pra resolver os dois agora).

## Funcionalidades planejadas
- [x] **Jogo publicado no Vercel** — deploy direto via CLI (`vercel --prod`), sem precisar de
      link de login: o ambiente já tinha uma sessão Vercel pré-autorizada pra conta do usuário
      (`suarezrafael`, confirmado com `vercel whoami` antes de fazer qualquer deploy). URL de
      produção: https://app-two-flax-92.vercel.app — confirmado ao vivo (tela de título, seleção
      de avatar, tutorial e o jogo 3D completo carregando e renderizando corretamente).
- [x] **Cliente de multiplayer preparado pra relé remoto** (`app/src/world3d/multiplayer.ts`) —
      `relayUrl()` agora usa `import.meta.env.VITE_RELAY_URL` quando definida (build de
      produção), com fallback pro comportamento original (mesma rede local, mesmo hostname da
      página) quando a variável não existe — não quebra o fluxo de `npm run dev` já existente.
- [x] **Servidor de relé (`app/server/relay.cjs`) preparado pra hospedagem própria** — já lia
      `process.env.PORT` e escutava em `0.0.0.0` (sem mudança necessária no próprio relay.cjs).
      Criado `app/server/package.json` (dependência `ws` isolada, deploy independente do app
      principal) e `app/server/fly.toml` (Fly.io, região `gru`/São Paulo, `auto_stop_machines`
      ligado pra não gastar recursos parado).
- [x] flyctl instalado (`C:\Users\rafae\.fly\bin\flyctl.exe`); usuário rodou
      `flyctl auth login` no PowerShell dele (a sessão desta ferramenta é headless, não consegue
      fazer login interativo sozinha — diferente do Vercel, que já tinha sessão pronta).
- [x] Relé publicado em https://missao-aprender-relay.fly.dev — bug real encontrado e corrigido
      no caminho (`fly launch` regenerou `fly.toml` com a porta errada, 3000 em vez de 8080;
      corrigido e confirmado via SSH + `curl` externo que o processo real escuta na porta certa).
- [x] `app/.env.production` com `VITE_RELAY_URL=wss://missao-aprender-relay.fly.dev`, rebuild e
      redeploy no Vercel.
- [x] Teste ao vivo do multiplayer entre duas abas do navegador contra o relé publicado — segundo
      bug real encontrado (service worker do PWA servindo o bundle antigo, sem a URL do relé;
      corrigido desregistrando o service worker/limpando cache) e confirmado depois: as duas abas
      se enxergam no painel de Ranking, "🟢 conectado", pela internet de verdade (Vercel ↔
      Fly.io), não só rede local.

## Fora de escopo (explicitamente adiado)
- Domínio próprio (o usuário pode adicionar depois pelo painel do Vercel se quiser, não pedido
  agora).
- CI/CD automático (deploy a cada push) — feito por CLI direto por enquanto; conectar o
  repositório GitHub ao projeto Vercel pelo painel deles é um passo futuro opcional.
