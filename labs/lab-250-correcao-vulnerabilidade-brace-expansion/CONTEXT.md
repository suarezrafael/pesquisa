# Contexto — Laboratório 250 — Corrigir vulnerabilidade de `brace-expansion` (app)

Preenchido em: 2026-10-03
Commit inicial → final: 37582e8610a91977509d4f017e36b956d699f4da..(ver PR)

## O que foi feito

- `app/package-lock.json`: `npm audit fix` (sem `--force`) bumpou `brace-expansion` de `2.1.4`
  para `2.1.7` e de `5.0.9` para `5.0.12` — as duas cópias transitivas que o `npm audit`
  apontava (GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p: DoS por expansão
  quadrática/recursão descontrolada em padrões `{a,b}`). `npm audit` em `app` agora reporta 0
  vulnerabilidades (antes: 1 de severidade alta). `package.json` não mudou — é dependência
  transitiva, nenhuma dependência direta precisou de bump.
- Investigados `app/server-accounts` e `app/server-cf-relay`: cada um reporta 4 vulnerabilidades
  de alta severidade (`undici`), todas puxadas transitivamente por `wrangler`/`miniflare`/`sharp`.
  `wrangler` já está na última versão publicada no npm (`4.147.0`, confirmado com `npm view
  wrangler version`); `npm audit fix --force --dry-run` não propôs nenhuma mudança real —
  significa que a Cloudflare ainda não publicou uma versão do `wrangler` com essas dependências
  transitivas corrigidas. Nada foi alterado nesses dois pacotes.

## Decisões técnicas tomadas

- **Só `npm audit fix` sem `--force`.** O objetivo era eliminar risco, não introduzir risco novo
  — `--force` pode forçar downgrades/bumps maiores que quebram compatibilidade sem aviso. Como o
  fix sem `--force` já resolveu 100% do que era resolvível em `app`, não havia motivo pra ir além.
- **Não tentar "resolver" `server-accounts`/`server-cf-relay` manualmente** (ex.: instalar
  `undici`/`sharp` numa versão fixa por fora da resolução do `wrangler`). `wrangler` já embute
  essas dependências como parte do seu próprio bundle de build/dev; sobrescrever a versão
  resolvida sem saber se o `wrangler` atual é compatível arriscaria quebrar `wrangler dev`/
  `wrangler deploy` por uma vulnerabilidade que é de ferramenta de BUILD (não roda no Worker
  publicado em produção) — risco maior que o benefício, sem evidência de exploração real.
- **`sharp`/`undici`/`miniflare`/`wrangler` são devDependencies, não vão para o bundle publicado.**
  Confirmado com `npm audit --omit=dev` em `app` (0 vulnerabilidades mesmo antes do fix) — a
  vulnerabilidade de `brace-expansion` também era só de toolchain de dev/CI, nunca alcançava o
  jogo publicado. A urgência real aqui é reduzir superfície de ataque no pipeline de CI/máquinas
  de desenvolvimento, não um risco ao jogador.

## Pendências / dívidas conhecidas

- `app/server-accounts` e `app/server-cf-relay` continuam com 4 vulnerabilidades de alta
  severidade cada (`undici`, via `wrangler`/`miniflare`), sem correção disponível hoje. Reavaliar
  rodando `npm audit` de novo quando o Cloudflare publicar uma versão nova do `wrangler` —
  nenhuma ação a tomar até lá além de monitorar.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — as 4 funcionalidades planejadas em `FEATURES.md` foram concluídas (a 4ª foi
  justamente investigar e documentar por que `server-accounts`/`server-cf-relay` não têm correção
  disponível agora, não deixá-los pendentes sem explicação).

## O que o próximo laboratório deve desenvolver

- Sem novo insumo (dispositivo físico, assinatura real validada, playtest, ou pedido explícito do
  usuário), a sessão já esgotou os itens de manutenção/limpeza sem risco que conseguiu encontrar
  por leitura de código e auditoria de dependências (labs 248, 249 e 250). Reavaliar `npm audit`
  em `server-accounts`/`server-cf-relay` periodicamente; fora isso, o próximo passo real depende
  do usuário.

## Estado do repositório ao final

- Branch: `lab-250-correcao-vulnerabilidade-brace-expansion`.
- `npm audit` (app): 0 vulnerabilidades (era 1 alta). `npm audit` (server-accounts,
  server-cf-relay): inalterado, 4 vulnerabilidades altas cada, sem correção disponível — ver
  "Pendências" acima.
- Suite: 366/366 (35 arquivos). Lint: zero avisos. Build: TypeScript + Vite + PWA sem erro novo
  (mesmo aviso preexistente de chunk >500kB, não relacionado a este lab).
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
