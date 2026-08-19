# Laboratório 51 — Publicação em produção (Vercel + relé de multiplayer)

Status: em andamento
Início: 2026-08-18
Fim: -
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
- [x] flyctl instalado (`C:\Users\rafae\.fly\bin\flyctl.exe`).
- [ ] **Bloqueado esperando o usuário**: `flyctl auth login` precisa rodar num terminal
      interativo de verdade (a sessão desta ferramenta é headless — confirmado com o erro real
      `fly auth login requires an interactive terminal`, diferente do Vercel, que já tinha sessão
      pronta). Pedido ao usuário rodar esse comando no PowerShell dele.
- [ ] Depois do login: `flyctl deploy` a partir de `app/server/`, pegar a URL pública
      (`https://missao-aprender-relay.fly.dev` ou parecido), gravar em `app/.env.production`
      como `VITE_RELAY_URL=wss://<url>`, rebuild e redeploy no Vercel.
- [ ] Teste ao vivo do multiplayer entre duas abas/dispositivos diferentes contra o relé
      publicado.

## Fora de escopo (explicitamente adiado)
- Domínio próprio (o usuário pode adicionar depois pelo painel do Vercel se quiser, não pedido
  agora).
- CI/CD automático (deploy a cada push) — feito por CLI direto por enquanto; conectar o
  repositório GitHub ao projeto Vercel pelo painel deles é um passo futuro opcional.
