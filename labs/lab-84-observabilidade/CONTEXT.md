# Contexto — Laboratório 84 — observabilidade (erro + analytics básico)

Preenchido em: 2026-08-24
Commit inicial → final: e49b50fd3dcc69307e0519332976b755911a8142..HEAD

## O que foi feito
- **Cloudflare Web Analytics** habilitado pro domínio `missaoaprendizado.com`, via a mesma conta
  Cloudflare já usada pros Workers. Configurado no modo **"Enable with JS Snippet installation"**
  (não "Automatic setup") porque a zona DNS do domínio é "DNS only"/sem proxy — quem serve o site
  é o Vercel, então o modo automático (baseado em proxy da zona) nunca veria tráfego nenhum. Beacon
  adicionado no `<head>` de `app/index.html`, token real `c80a4e55a117436aa6e1a4e1572428d3`.
  Verificado ao vivo: `curl https://missaoaprendizado.com/` confirma o `<script>` do beacon
  presente no HTML de produção; uma visita real via navegador confirmou a página carregando normal
  (jogo abriu, HUD renderizou). Confirmação de visita não-zero no *dashboard* do Web Analytics é
  a única verificação não feita nesta sessão (a ingestão de dado leva minutos/horas — ver
  Pendências).
- **`POST /client-error`** adicionado em `app/server-accounts/src/index.ts` (`handleClientError`):
  limita corpo a 8000 bytes, valida JSON, trunca `message`/`stack`/`url`/`userAgent`, loga via
  `console.error('[client-error]', ...)`, responde `204`. Roteado no dispatcher com CORS.
  Testado ao vivo: `curl -X POST .../client-error` com payload de teste retornou `204`, e
  `wrangler tail` (rodando em paralelo) mostrou a linha `(error) [client-error] {...}` capturada
  em tempo real — confirma que o caminho completo (endpoint → log → visível via CLI) funciona.
- **`app/src/errorReporting.ts`** (novo) — `installErrorReporting()` registra
  `window.addEventListener('error', ...)` e `'unhandledrejection'`, reporta pro endpoint acima via
  `fetch(..., { keepalive: true })`, limitado a 5 reports por sessão de aba (evita spam se um erro
  entrar em loop, ex. dentro do laço de render do Babylon), falha silenciosamente se o próprio
  report falhar. Chamado no topo de `app/src/main.tsx`, antes do `registerSW(...)`.
- **`app/server-cf-relay/src/index.ts`** — mesma filosofia de visibilidade aplicada ao relay:
  `webSocketMessage` agora envolve o processamento de mensagem num `try/catch` que loga
  `[relay-error]` com `id`/`msgType`/erro sem derrubar a conexão do jogador; `webSocketError` loga
  `[relay-error]` antes de fechar (antes só chamava `webSocketClose` sem registrar nada); o
  `catch` silencioso de `broadcast` (socket morto) agora também loga `[relay-send-failed]` — é
  descartável na prática, mas deixa de ser invisível caso o motivo real um dia seja outro (payload
  inválido, por exemplo).
- **`vite.config.ts`** — corrigido um erro de build introduzido no lab-83: o bloco `test: {...}`
  (config do Vitest) não é reconhecido pelo overload de tipos do `defineConfig` puro do Vite,
  então `tsc -b` (rodado como parte de `npm run build`) falhava com `TS2769`. Adicionada
  `/// <reference types="vitest/config" />` no topo do arquivo — resolve o tipo sem trocar o
  import nem duplicar config. Bug real: `npm run test` sempre funcionou (Vitest não passa pelo
  `tsc -b`), então isso só quebrava em produção (`npm run build`), nunca foi pego antes porque
  o build de produção não tinha sido rodado desde o lab-83.
- Suítes de teste (`app/`: 22, `server-accounts/`: 14 — 36 no total) rodadas antes de deployar,
  todas passando, sem alteração de lógica de domínio neste laboratório.
- **Deploy em produção dos três componentes**: `server-accounts` (Worker), `server-cf-relay`
  (Worker) e o front-end (Vercel, aliased em `https://missaoaprendizado.com`).
- **Documento novo trazido pelo usuário**, copiado para `docs/prompts/05-escala-e-viabilidade.md`
  e registrado em `docs/prompts/README.md` (item 5 da lista): uma auditoria de viabilidade
  comercial em infraestrutura gratuita, com achados numerados G1-G15 e uma ordem de ataque
  recomendada (seção 7) para os próximos laboratórios. O achado mais urgente (G1): o protocolo de
  tempo real atual (`World3D.tsx` envia `sendState` a 8,33 msg/s) esgota a cota gratuita de
  Durable Objects (100k requests/dia) com **~13 crianças jogando 15 min cada**, e a reconexão sem
  backoff (G2) transforma o estouro de cota num auto-DDoS contra o próprio relay. Isso muda a
  prioridade do próximo laboratório — ver "O que o próximo laboratório deve desenvolver".

## Decisões técnicas tomadas
- **Sentry (ou qualquer serviço de terceiro) descartado**, mantendo a decisão já registrada no
  `FEATURES.md` deste laboratório: criar conta em nome do usuário não é uma ação que a sessão pode
  tomar. A infraestrutura escolhida (Cloudflare Web Analytics + endpoint próprio logado via
  `console.error`) usa só o que a conta Cloudflare do usuário já tem — zero conta nova, zero custo
  novo.
- **Sem persistência em banco para os erros do client** — só log estruturado visível via
  `wrangler tail`/painel de Logs. Suficiente para o estágio atual (produto em desenvolvimento
  ativo, poucos usuários); se o volume crescer, a evolução natural é WAE (Workers Analytics
  Engine) ou uma tabela dedicada, mas isso é prematuro agora.
- **Limite de 5 reports de erro por sessão de aba** no client — protege o endpoint (e a cota do
  Worker) de um erro em loop de renderização virar uma tempestade de requests; motivo real: o
  laço de render do Babylon já causou incidentes de performance em labs anteriores (66-72), então
  um erro ali tem chance real de disparar centenas de vezes por segundo sem esse limite.
- **Fix do `vite.config.ts` via triple-slash reference em vez de trocar o import** — a alternativa
  seria importar `defineConfig` de `'vitest/config'` em vez de `'vite'`, mas isso reexporta (e
  pode divergir de) o `defineConfig` do Vite; a referência de tipos resolve só o problema de tipo,
  sem trocar comportamento em runtime.

## Pendências / dívidas conhecidas
- **Confirmação de visita não-zero no dashboard do Cloudflare Web Analytics** não foi feita nesta
  sessão — o beacon está confirmado presente no HTML de produção e uma visita real foi gerada via
  navegador, mas a ingestão de dado no dashboard pode levar de minutos a horas. Próxima sessão:
  abrir o dashboard e confirmar visitas > 0.
- **O documento `docs/prompts/05-escala-e-viabilidade.md` (trazido pelo usuário nesta sessão)
  redefine a prioridade do projeto** — ver seção seguinte. Ele lista 15 achados (G1-G15) e um
  "MUST NÃO" explícito reafirmando a proibição de chat de texto livre (já documentada em
  `labs/CURRENT.md`). Não foi executado nenhum item dele nesta sessão além de arquivá-lo no repo —
  fica para o próximo laboratório, seguindo a ordem de ataque da seção 7 do próprio documento.
- Dívidas de labs anteriores continuam abertas e não tocadas aqui: code-splitting de `World3D.tsx`
  (chunk de 6,4 MB / 1,37 MB gzip — visível no output do build desta sessão), auditoria de
  acessibilidade WCAG AA, "Minha Casa" (Fase E do plano comercial).

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — as 5 funcionalidades planejadas no `FEATURES.md` foram todas concluídas e verificadas
  (a única verificação parcial, dashboard de visitas, é detalhada acima como pendência, não como
  item não-concluído do escopo em si).

## O que o próximo laboratório deve desenvolver
`docs/prompts/05-escala-e-viabilidade.md` seção 7 propõe uma ordem de ataque; o item 1 é o mais
urgente porque é o que quebra primeiro se o produto crescer:

1. **Orçamento e protocolo de tempo real (G1, G2)** — medir uma sessão real de 10 min no dashboard
   do Cloudflare (requests de Durable Object por jogador-minuto), depois implementar envio-por-
   mudança (parar de mandar `state` a 8,33 Hz quando nada mudou; keepalive raro em vez disso) e
   reconexão com backoff exponencial + jitter em `multiplayer.ts` (hoje é fixo a cada 3s, sem
   limite de tentativas — é a causa do "auto-DDoS" descrito no documento). Critério de aceite
   sugerido pelo documento: teste de carga sintético demonstrando 30 jogadores simultâneos por
   30 min consumindo menos de 20% da cota diária.
2. Depois disso: endurecimento do relay + socket autenticado (G3, G5), moderação de apelido (G4 —
   é o único achado com risco legal/reputacional imediato, já que hoje o apelido livre furra o
   `[MUST]` de "sem texto livre" transmitindo o texto cru pra outros jogadores).

Antes de começar, ler `docs/prompts/05-escala-e-viabilidade.md` inteiro (não só o resumo acima) —
ele tem números concretos (13 crianças/dia esgotam a cota, cálculo completo na seção 1) e uma
checklist de aceite (seção 9) pra usar ao fechar o laboratório.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (22 testes) e `cd app/server-accounts && npm run test` (14 testes) —
    ambos devem passar, sem relação direta com este laboratório mas rodados como gate antes do
    deploy.
  - `cd app && npm run build` — deve completar sem erro de tipo (valida o fix do `vite.config.ts`).
  - `curl -s https://missaoaprendizado.com/ | grep cloudflareinsights` — confirma o beacon de
    Web Analytics presente em produção.
  - `curl -X POST https://missao-aprender-accounts.rafaelvs.workers.dev/client-error -H
    "Content-Type: application/json" -d '{"message":"teste"}'` deve retornar `204`; rodando
    `npx wrangler tail` (dentro de `app/server-accounts/`) em paralelo mostra a linha
    `[client-error]` capturada em tempo real.
  - Jogo ao vivo: https://missaoaprendizado.com (também https://app-two-flax-92.vercel.app)
  - Relay: https://missao-aprender-relay-v2.rafaelvs.workers.dev
  - Contas: https://missao-aprender-accounts.rafaelvs.workers.dev
