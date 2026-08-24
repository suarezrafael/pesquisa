# Laboratório 88 — proteção contra sobrecarga/DDoS e endurecimento dos Workers

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: 6f60629ab3e8516abbdd6050d67788819164b2ef

## Objetivo do laboratório
Pedido direto do usuário: "vasculhe o código e a infra pra verificar se tem alguma
vulnerabilidade de ddos ou outro tipo de ataque, o jogo precisa estar seguro com sobrecarga de
servidor." Auditoria feita lendo `app/server-cf-relay/src/index.ts`, `app/server-accounts/src/
index.ts`, `app/server-accounts/src/domain.ts`, `wrangler.toml` dos dois Workers, e confirmando
empiricamente (deploy real) que o binding nativo de Rate Limiting do Cloudflare Workers está
disponível no plano Free desta conta — não documentado com clareza nas páginas de preço da
Cloudflare, testado direto.

Isso confirma e aprofunda achados já registrados em `docs/prompts/05-escala-e-viabilidade.md`
(G3, G7, G9) que nunca chegaram a ser corrigidos — `labs/CURRENT.md` já recomendava G3-G5 como
próximo passo há dois laboratórios, mas o usuário redirecionou a prioridade duas vezes seguidas
(lab-87, e agora este pedido específico de segurança). G4 (apelido deixar de ser texto livre)
continua fora do escopo deste laboratório — é sobre moderação de conteúdo, não sobrecarga, e
precisa de uma decisão de produto própria (como fica a personalização sem ser texto livre).

## Achados da auditoria (por severidade)

**CRÍTICO — `/pairing/redeem` (`server-accounts/src/index.ts`)**: sem rate limit, código de 6
dígitos gerado com `Math.random()` (não criptográfico), e a troca de "verificar código válido" +
"marcar como usado" é feita em DUAS queries separadas (`select` depois `update`) — corrida real:
duas tentativas simultâneas com o mesmo código geram dois tokens de entitlement de 180 dias. Sem
rate limit, um único script consegue tentar as ~900.000 combinações possíveis dentro da janela de
validade de 15 minutos (900.000 códigos ÷ 900s = só 1.000 tentativas/s, trivial de sustentar) —
sequestrar a assinatura de qualquer família enquanto um código dela estiver ativo é praticamente
garantido, não teórico.

**ALTO — Relay de multiplayer (`server-cf-relay/src/index.ts`)**: qualquer um com a URL pública
(visível no bundle do jogo) conecta sem limite — sem checagem de origem, sem limite de conexões
por IP, sem limite de tamanho de mensagem, sem limite de taxa de mensagem por conexão. Como é uma
sala global única (um Durable Object só pra todo mundo), inundar com conexões/mensagens degrada o
jogo pra TODOS os jogadores reais ao mesmo tempo — o alvo mais direto de "sobrecarga de servidor"
do pedido do usuário.

**ALTO — `/health` (`server-accounts/src/index.ts`)**: público, sem autenticação, sem rate limit,
consulta o banco (`select count(*) from family_accounts`) a cada chamada — G9 do documento:
qualquer monitor de disponibilidade (ou ataque deliberado) batendo nele repetidamente impede o
compute do Neon de suspender (scale-to-zero), queimando a cota gratuita de 100 CU-horas/mês e
podendo derrubar o pagamento de assinaturas reais no meio do mês.

**MÉDIO — `/client-error` (`server-accounts/src/index.ts`)**: sem autenticação (correto, um erro
pode acontecer antes de haver sessão) e sem rate limit — só o tamanho do corpo é limitado (8KB).
Um script pode inundar esse endpoint sem custo, consumindo a cota de requests do Worker.

**BAIXO/MÉDIO — `/checkout`, `/pairing/generate`**: exigem JWT válido (autenticados), mas sem
nenhum limite de taxa por usuário — uma conta comprometida ou mal-intencionada pode gerar sessões
de Checkout do Stripe ou códigos de pareamento repetidamente sem limite.

**Verificado e OK, sem achado**: `/webhooks/stripe` já valida assinatura corretamente
(`stripe.webhooks.constructEventAsync`), sem essa checagem seria possível forjar eventos de
pagamento — não é o caso aqui. Todas as queries usam template tag parametrizado do driver do Neon
(sem risco de SQL injection). Nenhum segredo commitado (`.dev.vars`/`.env` conferidos).

## Funcionalidades planejadas
- [x] **Corrigir a corrida em `/pairing/redeem`**: `select` + `update` virou um `UPDATE ... WHERE
  code = $1 AND redeemed_at IS NULL AND expires_at >= now() RETURNING family_account_id` atômico.
- [x] **Rate limit em `/pairing/redeem`** — **achado importante não previsto**: o binding nativo
  de Rate Limiting do Workers, apesar de simular corretamente em `wrangler dev` local (testado ao
  vivo, bloqueou exatamente no limite configurado), **não bloqueou nenhuma de 100 chamadas
  concorrentes em produção** contra um limite de 20/60s — motivo não confirmado. Como esta é a
  rota mais crítica, a defesa real virou um rate limiter próprio no Postgres (UPSERT atômico,
  tabela `pairing_redeem_attempts`), **testado ao vivo em produção**: 8 passaram, 12 bloqueados
  com 429, batendo exatamente o limite configurado. Ver "Achado principal" no CONTEXT.md.
- [x] **`crypto.getRandomValues()` em vez de `Math.random()`** em `generatePairingCode`.
- [x] **`/health` para de consultar o banco** — resposta estática `{ok:true}`, confirmado ao vivo.
- [x] **Rate limit em `/health`, `/client-error`, `/checkout`, `/pairing/generate`** — usando o
  binding nativo do Workers (mesma ressalva acima: não confirmado funcionando em produção pra
  essas rotas específicas, mas são de severidade bem menor que `/pairing/redeem` — ver CONTEXT.md
  pra por que não recebi o mesmo tratamento de reforço com Postgres).
- [x] **Endurecimento do relay de multiplayer**: limite de tamanho de mensagem (4KB) e limite de
  taxa de mensagem por conexão (10 msg/s, guardado no attachment do WebSocket — sobrevive à
  hibernação do Durable Object) — **testados ao vivo em produção** com um flood real (50 mensagens
  em rajada, só 11 chegaram nos outros jogadores). Limite de conexões simultâneas por IP: a mesma
  descoberta do binding nativo não funcionar em produção se repetiu aqui — a defesa real virou
  contagem de conexões já abertas dentro do próprio Durable Object (`getWebSockets()`), **testada
  ao vivo em produção**: exatamente 15 de 25 tentativas de conexão simultânea passaram, o resto
  bloqueado com 429.
- [x] **Testado ao vivo**: script de carga do lab-85 confirma que tráfego legítimo (6-30
  jogadores) continua funcionando normalmente depois do endurecimento; testes de força bruta/
  inundação reais contra produção (não simulados) confirmam que os limites bloqueiam exatamente
  onde deveriam.

## Fora de escopo (explicitamente adiado)
- **G4 — apelido deixar de ser texto livre**: é sobre moderação/privacidade de conteúdo, não
  sobrecarga — precisa de uma conversa de produto própria sobre como fica a personalização do
  apelido sem ser um campo de texto livre (o pedido de "chat livre" já foi recusado antes por esse
  mesmo motivo, `labs/CURRENT.md`).
- **Lista branca completa de tipos de mensagem no relay** (G5) — o `broadcast(ws, {...msg, id})`
  genérico continua aceitando qualquer formato de mensagem conhecida além de `chat`; o limite de
  tamanho deste laboratório reduz o pior caso de amplificação, mas não fecha esse buraco por
  completo. Adiado por precisar enumerar todo o protocolo de mensagens em uso sem quebrar nada.
- **Autenticação de socket no relay** (token de sessão emitido pelo Worker de contas) — mudança
  de protocolo maior, envolve os dois Workers + o cliente; o limite de conexões por IP + limite de
  taxa por conexão deste laboratório já reduz bastante o risco de sobrecarga sem precisar disso
  agora.
- **Resolver a dúvida "por conta vs. por instância" da cota de Durable Objects** (deixada em
  aberto no lab-86) — não é bloqueador pra este laboratório, que é sobre limitar ABUSO, não sobre
  orçamento de uso legítimo.
