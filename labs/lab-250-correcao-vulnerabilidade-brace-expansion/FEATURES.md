# Laboratório 250 — Corrigir vulnerabilidades de alta severidade (app + Workers)

Status: concluído
Início: 2026-10-03
Fim: 2026-10-03
Commit inicial: 37582e8610a91977509d4f017e36b956d699f4da
Prioridade: manutenção — segurança da cadeia de suprimentos, zero risco de comportamento

## Objetivo do laboratório

`npm audit` nos 3 pacotes do repositório (`app`, `app/server-accounts`, `app/server-cf-relay`)
reportava vulnerabilidades de alta severidade (classe DoS). Nenhuma delas dependia de dispositivo
físico, assinatura real ou playtest — era manutenção pura de dependências, igual em espírito ao
lab-249 (limpeza dos 2 avisos de lint). Escopo escolhido porque a sessão não tinha nenhum item de
backlog numerado nem feature pedida pelo usuário disponível para avançar (ver
`docs/backlog-status.md`, lab-248).

## Funcionalidades planejadas

- [x] `app`: corrigir a vulnerabilidade de `brace-expansion` (DoS por expansão quadrática/recursão
  descontrolada, GHSA-q2hr-2g5m-vwhr e relacionadas) via `npm audit fix` — sem `--force`, sem
  bump de versão maior em nenhuma dependência direta. `package.json` direto ficou intocado — só
  `package-lock.json`.
- [x] Confirmar `npm audit` limpo em `app` (0 vulnerabilidades, antes 1 de severidade alta).
- [x] Confirmar `npm run test` (366/366), `npm run lint` (zero avisos) e `npm run build` sem
  regressão.
- [x] `app/server-accounts` e `app/server-cf-relay` (4 vulnerabilidades de alta severidade cada,
  em `undici`/`sharp`/`miniflare`, transitivas de `wrangler`): corrigido com `npm install
  wrangler@latest` (4.125.0/4.124.0 → 4.147.0; `package.json` dos dois atualizado de
  `^4.124.0` pra `^4.147.0`, comportamento padrão do `npm install <pkg>@latest`). Achado do
  review automático do Copilot na PR #146: a conclusão original deste item ("já na última
  versão, sem correção disponível") estava errada — baseada em `npm ls`/`npm view`, não no que o
  `package-lock.json` committed de fato fixava. Ver "Achado real" no `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)

- Qualquer mudança de comportamento, UI ou regra de jogo/domínio.
- Qualquer dependência que exigisse bump de versão maior ou `--force` — nenhuma exigiu.
