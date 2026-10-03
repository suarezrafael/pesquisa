# Contexto — Laboratório 250 — Corrigir vulnerabilidades de alta severidade (app + Workers)

Preenchido em: 2026-10-03
Commit inicial → final: 37582e8610a91977509d4f017e36b956d699f4da..(ver PR)

## O que foi feito

- `app/package-lock.json`: `npm audit fix` (sem `--force`) bumpou `brace-expansion` de `2.1.4`
  para `2.1.7` e de `5.0.9` para `5.0.12` (GHSA-q2hr-2g5m-vwhr e relacionadas: DoS por expansão
  quadrática/recursão descontrolada em padrões `{a,b}`). `npm audit` em `app`: 0 vulnerabilidades
  (antes 1 alta). `package.json` não mudou — dependência transitiva.
- `app/server-accounts/package.json`/`package-lock.json` e
  `app/server-cf-relay/package.json`/`package-lock.json`: `npm install wrangler@latest` atualizou
  `wrangler` de `4.125.0`/`4.124.0` para `4.147.0` — sem `--force`. `npm install <pkg>@latest`
  também reescreve a faixa declarada em `package.json` pra combinar com o que instalou
  (`^4.124.0` → `^4.147.0` nos dois), comportamento padrão do npm, não uma escolha manual. Essa
  versão já traz `undici`/`sharp`/`miniflare` corrigidos — `npm audit` nos dois pacotes: 0
  vulnerabilidades (antes 4 altas cada).
- `tsc --noEmit` e `npm run test` confirmados nos dois Workers depois do bump (171 e 13 testes,
  sem regressão).

## Achado real: a primeira conclusão deste lab estava errada

A primeira versão deste lab concluiu, incorretamente, que `wrangler` já estava na última versão
e que não havia correção disponível — baseada em `npm ls wrangler` (que refletia o que estava
em `node_modules`, não necessariamente sincronizado com o lockfile) e `npm view wrangler version`
(que só reporta o LATEST do registry, não a versão que o `package-lock.json` deste repositório de
fato fixa). O review automático do Copilot na PR #146 apontou isso com precisão: os lockfiles
COMMITADOS fixavam `4.125.0`/`4.124.0`, não `4.147.0` — ou seja, havia sim uma versão mais nova
compatível (dentro do range `^4.124.0`) nunca instalada nesses dois pacotes. `npm install
wrangler@latest` resolveu de verdade, como registrado acima. Lição: ao concluir "já está na
última versão" ou "sem correção disponível", verificar a versão travada no `package-lock.json`
committed, não o que `npm ls`/`npm view` reportam isoladamente — os dois podem refletir estado de
`node_modules` fora de sincronia com o que o repositório de fato declara.

## Decisões técnicas tomadas

- **`npm install wrangler@latest` em vez de `npm audit fix --force`.** Não foi preciso forçar
  nada — `4.147.0` é só um bump de patch/minor dentro do mesmo major (4.x), risco de
  incompatibilidade baixo.
- **`sharp`/`undici`/`miniflare`/`wrangler` são devDependencies, não vão para o bundle publicado.**
  Confirmado com `npm audit --omit=dev` em `app` (0 vulnerabilidades mesmo antes do fix) — a
  urgência real aqui é reduzir superfície de ataque no pipeline de CI/máquinas de desenvolvimento,
  não um risco direto ao jogador. Ainda assim, vale corrigir: `wrangler` é o que de fato executa
  `wrangler deploy` em produção nos 3 jobs de CI (`.github/workflows/ci.yml`), então uma versão
  mais nova e mais segura da própria ferramenta de deploy tem valor direto.

## Pendências / dívidas conhecidas

- Nenhuma nova — os 3 `npm audit` (app, server-accounts, server-cf-relay) saem limpos agora.
- O bump de `wrangler` (4.125.0/4.124.0 → 4.147.0) é um salto de patch/minor dentro do mesmo
  major, mas ainda é uma mudança de ferramenta de deploy; o CI (que já roda `wrangler deploy` nos
  3 jobs a cada push em `main`) é a validação real de que a nova versão continua funcionando.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — todas as funcionalidades de `FEATURES.md` foram concluídas, incluindo a correção real
  em `server-accounts`/`server-cf-relay` que a primeira versão deste lab tinha descartado por
  engano (ver achado acima).

## O que o próximo laboratório deve desenvolver

- Sem novo insumo (dispositivo físico, assinatura real validada, playtest, ou pedido explícito do
  usuário), a sessão já esgotou os itens de manutenção/limpeza sem risco que conseguiu encontrar
  por leitura de código e auditoria de dependências (labs 248, 249 e 250). Próximo passo real
  depende do usuário.

## Estado do repositório ao final

- Branch: `lab-250-correcao-vulnerabilidade-brace-expansion`.
- `npm audit`: 0 vulnerabilidades nos 3 pacotes (`app`, `server-accounts`, `server-cf-relay`) —
  antes 1 alta em `app` e 4 altas em cada um dos outros dois.
- `app`: suite 366/366 (35 arquivos), lint zero avisos, build sem erro novo (mesmo aviso
  preexistente de chunk >500kB). `server-accounts`: 171/171 testes, `tsc --noEmit` limpo.
  `server-cf-relay`: 13/13 testes, `tsc --noEmit` limpo.
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
