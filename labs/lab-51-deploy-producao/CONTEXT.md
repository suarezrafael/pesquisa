# Contexto — Laboratório 51 — Publicação em produção (Vercel + relé de multiplayer)

Preenchido em: 2026-08-19

## O que foi feito

1. **Jogo publicado**: https://app-two-flax-92.vercel.app (deploy via `vercel --prod` a partir de
   `app/`). A sessão do ambiente já tinha uma credencial Vercel pronta pra conta do usuário
   (confirmado com `vercel whoami` → `suarezrafael` antes de fazer qualquer deploy) — não precisou
   de link de login como planejado inicialmente. Testado ao vivo: tela de título → seleção de
   avatar → tutorial (pulado) → mundo 3D completo carregando e rodando.
2. **Multiplayer publicado**: servidor de relé (`app/server/relay.cjs`) hospedado no Fly.io
   (`https://missao-aprender-relay.fly.dev`, região `gru`/São Paulo). `flyctl` instalado; login
   precisou de terminal interativo de verdade (headless não funciona — usuário rodou
   `flyctl auth login` no PowerShell dele).
3. **Bug real encontrado e corrigido durante o deploy do relé**: `fly launch` regenerou o
   `fly.toml` com `internal_port = 3000` (palpite padrão dele), mas o servidor escuta em 8080
   (`PORT` env var, já configurada em `fly.toml`) — o fly-proxy avisou explicitamente "app not
   listening on the expected address". Corrigido ajustando `internal_port` pra 8080 e rodando
   `flyctl deploy` de novo. Confirmado via SSH direto na máquina (`flyctl ssh console`): o
   processo `node relay.cjs` realmente escutava em 0.0.0.0:8080 (um teste manual de rodar de novo
   deu `EADDRINUSE`, prova de que já tinha um processo real ocupando a porta) e via `curl` externo
   (resposta `426 Upgrade Required` — exatamente o esperado de um servidor WebSocket puro
   recebendo uma requisição HTTP comum).
4. **Cliente do jogo apontado pro relé publicado**: `app/.env.production` com
   `VITE_RELAY_URL=wss://missao-aprender-relay.fly.dev`, rebuild, redeploy no Vercel.
5. **Segundo bug real, encontrado testando o multiplayer ao vivo**: depois do redeploy, o painel
   de Ranking mostrava "sem conexão" e nenhuma requisição pro Fly.io aparecia na rede — o bundle
   carregado ainda era o ANTIGO (`World3D-DpUMsk0O.js`, de antes do `VITE_RELAY_URL` existir), não
   o novo (`World3D-DfqWHKdF.js`). Causa: o service worker do PWA (`vite-plugin-pwa`) já tinha
   cacheado a versão antiga no navegador de teste, numa visita anterior a essa mesma URL, e
   continuava servindo os arquivos antigos por baixo do capô mesmo com o servidor já tendo os
   novos. Corrigido desregistrando o service worker e limpando o `caches` do navegador
   (`navigator.serviceWorker.getRegistrations()` + `caches.keys()`) antes de recarregar —
   confirmado depois: bundle novo carregado, Ranking mostrando "🟢 conectado".
6. **Multiplayer confirmado funcionando de verdade pela internet**: duas abas separadas do
   navegador, cada uma como uma sessão de jogo independente, conectadas ao MESMO relé publicado —
   o painel de Ranking de uma aba passou a listar a outra ("1º PAPI (você)" + "2º PAPI"),
   confirmando que a comunicação em tempo real atravessa de verdade Vercel → Fly.io → Vercel, não
   só localhost/rede local.

## Decisões técnicas tomadas

- **Deploy via CLI direto, não GitHub-linked continuous deployment** — mais rápido pra publicar
  agora; conectar o repositório GitHub ao projeto Vercel pelo painel deles (deploy automático a
  cada push) fica como passo opcional futuro, não bloqueia o "jogo no ar" de hoje.
- **`VITE_RELAY_URL` com fallback, não obrigatório** — `multiplayer.ts` só usa a URL fixa se ela
  existir (`import.meta.env.VITE_RELAY_URL`); sem ela, cai no comportamento original de mesma
  rede local — `npm run dev` continua funcionando exatamente como antes, sem precisar configurar
  nada pra desenvolvimento local.
- **Fly.io free tier com `auto_stop_machines`** — a máquina do relé desliga sozinha quando fica
  ociosa e liga de novo automaticamente na primeira conexão (`min_machines_running = 0`) — sem
  custo quando ninguém está jogando, ao preço de uma pequena demora (alguns segundos) na PRIMEIRA
  conexão depois de um período parado.
- **Confiar em evidência de rede/processo real, não só na ausência de erro no console** — os dois
  bugs reais deste laboratório (porta errada no Fly.io, service worker servindo bundle antigo)
  NÃO geravam nenhum erro visível no console do navegador — só apareciam checando: (a) o aviso
  explícito do `fly deploy` sobre a porta, confirmado via SSH direto na máquina; (b) qual arquivo
  JS de fato tinha sido carregado (`performance.getEntriesByType('resource')`), não só "a página
  carregou sem erro".

## Pendências / dívidas conhecidas

- **Domínio próprio** — não configurado (fora de escopo pedido). Pode ser adicionado depois pelo
  painel do Vercel se o usuário quiser (ex.: `missaoaprender.com.br`).
- **Deploy contínuo (CI/CD)** — hoje é manual via CLI (`vercel --prod` a partir de `app/`,
  `flyctl deploy` a partir de `app/server/`). Conectar o GitHub ao Vercel pelo painel deles
  automatiza isso pro app principal; o relé no Fly.io precisaria de um workflow do GitHub Actions
  separado se quiser o mesmo pro servidor.
- **Perfis compartilham `localStorage` por navegador, não por conta** — visto no teste (duas abas
  do mesmo Chrome mostraram o mesmo nome "PAPI" nas duas, porque progresso/perfil são salvos
  local, sem login) — comportamento esperado do design atual (sem conta/nuvem, documentado em
  `prompt.md`), não um bug, só uma limitação conhecida de quem testar em abas do MESMO navegador
  (jogadores de verdade, em aparelhos diferentes, não têm esse problema).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório — jogo e multiplayer publicados e confirmados ao
vivo.

## O que o próximo laboratório deve desenvolver

1. Nenhum pedido novo pendente no momento em que este laboratório foi encerrado.
2. Se o usuário quiser deploy automático a cada push (CI/CD), conectar o GitHub ao projeto Vercel
   pelo painel deles é o próximo passo natural.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu explicitamente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar. Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Jogo ao vivo: https://app-two-flax-92.vercel.app
- Relé de multiplayer ao vivo: https://missao-aprender-relay.fly.dev
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes`.
- Como redeployar o relé: `cd app/server && "C:\Users\rafae\.fly\bin\flyctl.exe" deploy`.
