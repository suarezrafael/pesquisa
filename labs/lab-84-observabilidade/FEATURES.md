# Laboratório 84 — observabilidade (erro + analytics básico)

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: e49b50fd3dcc69307e0519332976b755911a8142

## Objetivo do laboratório
Pedido do usuário: "continue o próximo laboratório", sem especificar qual — `labs/CURRENT.md`
listava 4 frentes de profissionalização sem prioridade única (monitoramento de erro, analytics,
code-splitting do `World3D.tsx`, auditoria de acessibilidade). Escolhi monitoramento de erro +
analytics básico por dois motivos: (1) são as duas únicas frentes que não dependem de um
refactor grande/arriscado num arquivo de 7500+ linhas sem essa rede de segurança ainda madura;
(2) ao contrário de código-splitting/acessibilidade, dão retorno imediato mesmo enquanto o
produto ainda está em desenvolvimento ativo, não só depois do lançamento.

**Ajuste importante em relação ao que `labs/CURRENT.md` sugeria**: "Sentry" foi descartado
porque exigiria criar uma conta nova em nome do usuário — ação que não posso fazer (só o usuário
pode criar contas em serviços de terceiros). Em vez disso, uso infraestrutura que a conta
Cloudflare do usuário já tem (mesma conta dos Workers e do domínio): Web Analytics (métrica de
visita, sem cookie, gratuito) + um endpoint próprio de captura de erro do client, logado via
Cloudflare (visível em `wrangler tail`/dashboard), sem depender de nenhum serviço/conta nova.

## Funcionalidades planejadas
- [x] Cloudflare Web Analytics habilitado pro domínio do jogo (beacon script, sem cookie) —
  primeira fonte real de métrica de uso (visitas, países, dispositivo) sem precisar de conta nova
- [x] `POST /client-error` no Worker `server-accounts` — recebe erros JS não tratados do jogo
  (`window.onerror`/`unhandledrejection`) e loga estruturado (visível via `wrangler tail`/painel
  Cloudflare), sem enviar nenhum dado pessoal da criança
- [x] Handler global de erro no client (`app/src/main.tsx` ou equivalente) que captura exceções
  não tratadas e reporta pro endpoint acima, silenciosamente (nunca interrompe o jogo pra
  criança)
- [x] Mesma captura de erro aplicada aos dois Workers (`server-accounts`, `server-cf-relay`) —
  garantir que uma falha ali também fica visível nos logs, não só silenciosamente descartada
- [x] Testado ao vivo: forçar um erro de propósito e confirmar que aparece no log

## Fora de escopo (explicitamente adiado)
- Code-splitting de `World3D.tsx` — refactor grande, fica pra depois com mais testes no lugar.
- Auditoria de acessibilidade WCAG AA sistemática.
- "Minha Casa" (Fase E do plano comercial) — feature nova, não profissionalização.
- Qualquer serviço de terceiro que exija criar conta nova (Sentry, PostHog, etc.).
