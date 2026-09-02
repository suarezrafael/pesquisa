# Contexto — Laboratório 88 — proteção contra sobrecarga/DDoS e endurecimento dos Workers

Preenchido em: 2026-08-24
Commit inicial → final: 6f60629ab3e8516abbdd6050d67788819164b2ef..HEAD

## O que foi feito
- **Auditoria completa** dos dois Workers (`server-accounts`, `server-cf-relay`) — achados
  listados por severidade no `FEATURES.md`. Resumo: `/pairing/redeem` sem rate limit + corrida
  real (crítico), relay sem nenhum limite de conexão/mensagem (alto), `/health` consultando o
  banco a cada chamada, publicamente (alto, G9 do documento de escala), `/client-error` sem rate
  limit (médio), `/checkout`/`/pairing/generate` autenticados mas sem limite (baixo/médio).
  Verificado como OK: webhook do Stripe já valida assinatura, nenhuma SQL injection (driver
  parametrizado em toda query), nenhum segredo commitado.
- **Corrigida a corrida em `/pairing/redeem`**: `select` + `update` separados viraram um `UPDATE
  ... WHERE code = $1 AND redeemed_at IS NULL AND expires_at >= now() RETURNING
  family_account_id` atômico.
- **`crypto.getRandomValues()`** substituiu `Math.random()` em `generatePairingCode` (defesa em
  profundidade).
- **`/health` não consulta mais o banco** — resposta estática `{ok: true}`.
- **Rate limiting em todas as rotas sensíveis dos dois Workers** — implementado inicialmente com
  o binding nativo de Rate Limiting do Cloudflare Workers (`env.X.limit({key})`, configurado via
  `[[ratelimits]]` no `wrangler.toml`, um namespace por rota). Ver "Achado principal" abaixo pro
  motivo de isso não ser suficiente sozinho.
- **Endurecimento do relay**: limite de tamanho de mensagem (4KB, rejeitada antes de qualquer
  `JSON.parse`/broadcast) e limite de taxa de mensagem por conexão (10 msg/s, contador guardado no
  próprio `serializeAttachment` do WebSocket — sobrevive à hibernação do Durable Object, diferente
  de um `Map` comum em memória da instância).
- **Deploy em produção dos dois Workers**, com verificação ao vivo (não só local) de cada
  mecanismo de proteção — ver "Números medidos" abaixo.

## Achado principal (não estava no escopo original, mudou a estratégia no meio do laboratório)
**O binding nativo de Rate Limiting do Cloudflare Workers não bloqueou nenhuma requisição em
produção**, apesar de: (a) aceitar o deploy sem erro, (b) aparecer corretamente no painel do
Cloudflare como "Rate limiter" com o namespace certo, (c) **simular perfeitamente em `wrangler dev`
local** (bloqueou exatamente 20 de 40 requisições concorrentes contra um limite de 20/60s,
repetido de forma consistente). Testado ao vivo contra produção: **100 requisições concorrentes
contra `/health` (limite configurado: 20/60s) — 100 passaram, 0 bloqueadas**. Mesmo padrão
confirmado na conexão de WebSocket do relay (30 conexões concorrentes contra um limite de 20/60s —
30 abriram, 0 bloqueadas). O motivo não foi confirmado (não documentado com clareza pela
Cloudflare se é uma limitação do plano Free em produção especificamente, um bug da plataforma, ou
uma configuração que falta e não está documentada) — não abri um ticket de suporte por falta de
tempo neste laboratório, fica como pendência.

**Isso muda a estratégia de defesa**: não dá pra confiar só nesse binding pras rotas realmente
críticas. Implementei alternativas verificadas, cada uma testada ao vivo contra produção com
tráfego real:
- **`/pairing/redeem`** (a rota mais crítica — sem isso, sequestro de assinatura por força bruta
  era praticamente garantido): rate limiter próprio no Postgres, um `UPSERT` atômico numa tabela
  nova (`pairing_redeem_attempts`, ip + janela + contador). Testado ao vivo: 20 chamadas
  concorrentes com um código inválido → **8 passaram pro `400` (código inválido), 12 bloqueadas
  com `429`** — bate exatamente o limite de 8/60s configurado.
- **Relay — limite de conexões simultâneas por IP**: em vez do binding, conta quantos WebSockets
  já abertos pertencem ao mesmo IP usando `state.getWebSockets()` (que a própria Hibernation API
  já mantém) — não depende de nenhuma infraestrutura nova. Testado ao vivo: 25 tentativas de
  conexão simultânea → **exatamente 15 abriram** (o teto configurado), o resto recebeu `429`.
- **Relay — limite de taxa de mensagem por conexão**: já não dependia do binding (implementado
  desde o início como contador no `serializeAttachment`). Testado ao vivo com uma inundação real
  (50 mensagens em rajada de um socket): só 11 chegaram nos outros jogadores conectados.

**As rotas de severidade menor (`/health`, `/client-error`, `/checkout`, `/pairing/generate`)
continuam usando só o binding nativo**, sem o reforço em Postgres — decisão consciente, não
esquecimento (ver "Decisões técnicas" abaixo pro raciocínio).

## Números medidos (todos ao vivo, contra produção — não simulados)
| Mecanismo | Configurado | Medido |
|---|---|---|
| Binding nativo, `/health`, limite 20/60s | 20 passam por minuto | **100/100 passaram** (não funciona) |
| Binding nativo, conexão do relay, limite 20/60s | 20 passam por minuto | **30/30 passaram** (não funciona) |
| Rate limiter em Postgres, `/pairing/redeem`, limite 8/60s | 8 passam por minuto | **8 passaram, 12 bloqueados** (funciona) |
| Contagem de conexões no Durable Object, relay, teto 15 | 15 simultâneas | **15 passaram, 10 bloqueadas** (funciona) |
| Limite de taxa de mensagem por conexão, relay, 10 msg/s | 10/s | **11 de 50 numa rajada chegaram nos outros** (funciona) |
| Carga legítima (script do lab-85, 6-30 jogadores) depois do endurecimento | sem regressão | **conectou e funcionou normalmente em todos os testes** |

## Decisões técnicas tomadas
- **Não estendi o rate limiter em Postgres pras rotas de severidade menor.** `/health` não pode
  usar Postgres pra isso — o PRÓPRIO motivo de `/health` ter parado de consultar o banco neste
  laboratório (G9: qualquer consulta ali impede o compute do Neon de suspender) seria reintroduzido
  na hora se eu adicionasse uma escrita de rate-limit ali. `/client-error` não toca banco hoje;
  adicionar só pra rate limit criaria uma dependência nova sem necessidade real (inundar esse
  endpoint só desperdiça cota de requests do Worker, não expõe dado nem dinheiro). `/checkout` e
  `/pairing/generate` já são autenticados (barreira bem mais alta que `/pairing/redeem`, que é
  público de propósito) — fica como dívida de menor prioridade, não uma omissão descuidada.
- **Não investiguei a fundo por que o binding nativo falha em produção** (ex.: abrir ticket de
  suporte, testar em outra conta/plano) — dado que já tenho defesas verificadas pras rotas que
  mais importam, aprofundar essa investigação tinha retorno decrescente pro tempo que consumiria.
  Mantive o binding chamado em todo lugar mesmo assim (não custa nada, e se a Cloudflare corrigir
  o que quer que seja, essas rotas ganham uma camada extra de graça).
- **Teto de conexões por IP do relay é 15, não um número menor** — o caso legítimo mais exigente
  não é "uma casa com vários dispositivos", é uma sala de aula inteira atrás do mesmo NAT (o
  público-alvo do jogo). A defesa que realmente limita um atacante é o limite de TAXA de mensagem
  por conexão (10 msg/s) — mesmo 15 conexões maliciosas ficam presas a 15×10=150 msg/s no total,
  uma fração pequena do que "sem limite nenhum" permitia antes.
- **Corrigi um bug real no próprio script de teste de carga** (`load-test.mjs`, lab-85): o handler
  de `error` de uma conexão REJEITADA não resolvia a Promise (só o de `close` resolvia), travando
  o script pra sempre quando testava contra um endpoint que já tinha rate limit. Achado testando
  este laboratório, não um bug pré-existente sabido.

## Pendências / dívidas conhecidas
- **Por que o binding nativo de Rate Limiting não funciona em produção nesta conta** continua sem
  resposta — se algum dia isso importar de novo (ex.: quiser reforçar `/health`/`/client-error`
  também), vale abrir um ticket de suporte da Cloudflare ou pesquisar mais a fundo antes de
  assumir que o binding funciona só porque o deploy foi aceito.
- **`/health`, `/client-error`, `/checkout`, `/pairing/generate` continuam sem uma defesa
  VERIFICADA** — só o binding nativo (não confirmado funcionando). Risco aceito conscientemente
  dada a severidade menor de cada um (ver "Decisões técnicas").
- **G5 (lista branca completa de tipos de mensagem no relay)** continua parcialmente aberto — o
  limite de tamanho reduz o pior caso de amplificação, mas `broadcast(ws, {...msg, id})` ainda
  aceita qualquer formato de mensagem conhecida além de `chat`.
- **G4 (apelido deixar de ser texto livre)** e **autenticação de socket no relay** continuam fora
  de escopo — ver `FEATURES.md`.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo original ficou de fora — todas foram implementadas, algumas com um mecanismo
  diferente do planejado originalmente (Postgres/Durable Object em vez do binding nativo, pelo
  motivo documentado acima).

## O que o próximo laboratório deve desenvolver
`labs/CURRENT.md` (antes deste laboratório) recomendava G3/G5 + G4 como próximo passo — G3 (parte
de segurança do relay) foi bastante coberto aqui; G4 (apelido/moderação) e o resto de G5 (lista
branca completa de mensagens) continuam de pé. Se não houver outro redirecionamento do usuário,
retomar por aí.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (31 testes) e `cd app/server-accounts && npm run test` (14 testes) —
    sem mudança de contagem, lógica de domínio não mudou (as correções são de segurança/rota, não
    de regra de negócio nova).
  - `npx tsc --noEmit -p tsconfig.json` limpo nos dois Workers.
  - `cd app/server-cf-relay && npm run load-test -- --players 10 --duration-s 15` confirma tráfego
    legítimo funcionando contra o relay endurecido em produção.
  - Testes de força bruta/inundação reais (não repetidos aqui por consumirem cota real de
    produção) — os comandos usados estão documentados nos commits e no histórico desta sessão.
  - Jogo ao vivo: https://missaoaprendizado.com — nenhuma mudança visível pro jogador, tudo é
    proteção de infraestrutura.
