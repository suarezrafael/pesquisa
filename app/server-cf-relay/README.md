# missao-aprender-relay-v2

Servidor de retransmissão (relay) do multiplayer de **Missão Aprender**, rodando em
[Cloudflare Workers](https://workers.cloudflare.com/) com um
[Durable Object](https://developers.cloudflare.com/durable-objects/). Recebe posição, aparência,
chat e eventos de combate via WebSocket de cada jogador conectado e repassa (broadcast) pra todos
os outros — não guarda nada em disco, é só uma "sala" em memória.

**URL em produção**: `https://missao-aprender-relay-v2.rafaelvs.workers.dev`

## Por que existe (histórico)

A v1 do relay (`../server/relay.cjs`, Node + [`ws`](https://www.npmjs.com/package/ws)) roda no
Fly.io. O Fly.io dá só 2h/7 dias de trial antes de exigir cartão de crédito. Esta v2 foi criada
(`labs/lab-54-relay-v2-cloudflare/`) especificamente pra rodar de graça, sem cartão, usando o plano
Free do Cloudflare Workers. O **protocolo é idêntico** ao da v1 — o cliente (`app/src/world3d/
multiplayer.ts`) não precisou mudar nada além da URL de conexão.

## Como foi construído

- **Serviço usado**: Cloudflare Workers + **Durable Objects** (não um Worker "stateless" comum) —
  um Durable Object é necessário porque o relay precisa manter uma lista viva de conexões
  WebSocket compartilhada entre todos os jogadores conectados a qualquer momento; um Worker comum
  não tem esse estado persistente entre invocações.
- **WebSocket Hibernation API** (`state.acceptWebSocket`, `webSocketMessage`,
  `webSocketClose`/`webSocketError`, `ws.serializeAttachment`/`deserializeAttachment` —
  ver `src/index.ts`): em vez de manter o Durable Object sempre "acordado" enquanto qualquer
  socket estiver aberto, essa API permite ao runtime **hibernar** o objeto entre mensagens sem
  derrubar as conexões — ele só "acorda" quando uma mensagem nova chega. Isso é o que torna
  viável rodar isso no plano Free (cobrança por invocação/CPU, não por tempo de conexão aberta).
- **Durable Object SQLite-backed** (`new_sqlite_classes` no `wrangler.toml`, não `new_classes`):
  é o **único tipo de Durable Object disponível no plano Free** — o tipo clássico (sem SQLite)
  exige plano pago. Este relay não usa `state.storage` pra nada de verdade (não persiste
  posição/chat entre reinícios), mas o *binding* precisa declarar um tipo de storage mesmo assim,
  então SQLite-backed foi a escolha obrigatória pra continuar no Free.
- **Uma sala global só**: todo mundo que conecta cai no mesmo Durable Object
  (`env.RELAY.idFromName('global')`). Não há salas separadas — é o mesmo comportamento da v1.
  Trocar pra múltiplas salas no futuro seria simples (`idFromName(nomeDaSala)` em vez de um nome
  fixo), mas não foi construído por não ter sido pedido.
- **Protocolo** (mensagens JSON via WebSocket, mesmo formato da v1):
  - `welcome` — enviado ao cliente na conexão, com o `id` gerado pro socket (`crypto.randomUUID()`
    truncado pra 8 caracteres).
  - `state` — posição/aparência/XP/moedas do jogador; repassado como veio, só com `id` adicionado.
  - `attack` — evento de combate (espada/arma); mesmo tratamento genérico de repasse.
  - `chat` — **validado no servidor**, não só no cliente: só passa se `messageId` estiver no
    catálogo fechado `QUICK_CHAT_IDS` (nunca texto livre — requisito de segurança do projeto,
    `docs/prompts/01-seguranca.md` §3). Mensagens fora do catálogo são silenciosamente descartadas.
  - `leave` — enviado a todos quando um socket desconecta.
  - **Qualquer outro `type` de mensagem é repassado sem validação de esquema** (`{ ...msg, id }`)
    — é assim que este relay ficou "agnóstico de esquema": extensões de protocolo do lado do
    cliente (novos campos em `state`, ou o `attack` do lab-73) não exigem nenhuma mudança aqui.

## Onde está hospedado

- **Conta**: Cloudflare, subdomínio `workers.dev` da conta (`rafaelvs.workers.dev`) — precisou ser
  registrado uma vez via dashboard antes do primeiro deploy (passo manual único por conta).
- **Região**: Cloudflare não permite escolher região pra Workers/Durable Objects SQLite-backed no
  plano Free — o runtime roda na borda (edge), mais perto de onde a requisição chega.
- **Deploy**: via [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI, autenticado
  com a conta Cloudflare do usuário (`npx wrangler login`, OAuth interativo — não pode ser feito
  por uma sessão automatizada).

## Rodando localmente

```bash
cd app/server-cf-relay
npm install
npm run dev        # wrangler dev — simulador local (Miniflare), não é o ambiente real da borda
```

## Publicando

```bash
cd app/server-cf-relay
npm install
npx wrangler whoami   # confirma que está autenticado
npm run deploy        # wrangler deploy
```

Depois de publicar, `app/.env.production` (`VITE_RELAY_URL`) precisa apontar pra URL certa e o
jogo precisa ser republicado (`cd app && npx vercel --prod --yes`) pra usar a versão nova do relay.

## Capacidade no plano Free

Limites **publicados** pela Cloudflare (conferidos na documentação oficial em 2026-08-22):

| Limite | Valor (Free) |
|---|---|
| Requisições por Worker, por dia | 100.000 (reseta à meia-noite UTC; excedeu = erro 1027) |
| Tempo de CPU por requisição (Workers) | 10 ms |
| Tempo de CPU por requisição (Durable Object) | 30 s (padrão) |
| Classes de Durable Object por conta | 100 |
| Storage por conta (Durable Objects) | 5 GB |
| Limite "soft" de requisições por Durable Object individual | 1.000 /segundo |
| Tamanho máximo de mensagem WebSocket recebida | 32 MiB |
| Conexões WebSocket simultâneas por Durable Object | **não documentado** |

A Cloudflare não publica um número exato pra conexões WebSocket simultâneas no plano Free (mesma
lacuna já encontrada e registrada em `labs/lab-54-relay-v2-cloudflare/CONTEXT.md`).

**Quantos jogadores simultâneos isso aguenta, na prática?** Não é uma pergunta com resposta oficial
direta — a Cloudflare não publica um teto de conexões WebSocket. A conta que realmente importa é
outra: **cada mensagem recebida (`webSocketMessage`) conta como uma requisição contra o limite
diário de 100.000**, e o cliente deste jogo manda seu próprio estado a cada ~120ms enquanto conectado
(`sendState`, ver `app/src/world3d/multiplayer.ts` — `netSendTimer > 0.12`), ou seja, **~8,3
mensagens por segundo, por jogador conectado**, o tempo todo (não só quando anda).

Fazendo a conta pra **1 jogador conectado o dia inteiro**: 8,3 msg/s × 86.400 s/dia ≈ **720.000
mensagens/dia** — mais de **7× o limite diário de 100.000 requisições do plano Free**. Ou seja, o
gargalo real deste relay no plano Free não é "quantos jogadores simultâneos" no sentido clássico —
é o **tempo total de conexões ativas somadas por dia**, porque o próprio ritmo de sincronização do
jogo (a cada 120ms) consome a cota rapidamente. Nas contas de hoje, com uso esporádico de
teste/demonstração (alguns minutos por sessão, não o dia inteiro), isso não é um problema
observado — mas **não escala** pra um cenário de "várias pessoas jogando por horas todo dia" sem
estourar a cota gratuita bem antes de qualquer limite de conexões simultâneas entrar em jogo.

Se o uso real crescer, as opções (nenhuma implementada ainda, por não ter sido pedida) seriam:
reduzir a frequência de `sendState` (ex. 250-500ms em vez de 120ms — menos fluido, mas
proporcionalmente mais barato), ou migrar pro plano pago do Cloudflare Workers (que também sobe o
tempo de CPU por requisição de 10ms pra 5 minutos).

## Diferenças em relação à v1 (Fly.io)

Nenhuma no protocolo — só na infraestrutura. A v1 (`../server/relay.cjs`) roda um processo Node
sempre ativo (sem hibernação) com a lib `ws`; esta v2 roda "sem servidor" (hiberna entre
mensagens) num Durable Object. Ambas implementam exatamente as mesmas mensagens
`welcome`/`state`/`attack`/`chat`/`leave` e a mesma validação de chat contra o catálogo fechado.
