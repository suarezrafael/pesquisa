# Laboratório 85 — protocolo de tempo real com orçamento de cota

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: b8e1bbeb5fccfb0aa493fa72ecbeb616f00a81c4

## Objetivo do laboratório
`docs/prompts/05-escala-e-viabilidade.md` (achados G1/G2, seção 3, ordem de ataque seção 7 item 1)
é o item mais urgente da lista deixada por `labs/lab-84-observabilidade/CONTEXT.md`: o protocolo
de multiplayer atual (`World3D.tsx` manda `sendState` a 8,33 msg/s por jogador, sempre, mesmo
parado) esgota a cota gratuita de Durable Objects (100.000 requests/dia) com **~13 crianças
jogando 15 min cada**, e a reconexão sem backoff de `multiplayer.ts` (fixa a cada 3s, sem limite)
transforma o estouro de cota num auto-DDoS contra o próprio relay, exatamente no momento de maior
tráfego. Este laboratório precisa provar, com número medido (não estimado), que o custo por
jogador-minuto caiu e que a reconexão não amplifica um incidente.

## Funcionalidades planejadas
- [x] Orçamento por jogador-minuto medido **antes** — não veio do dashboard (checado ao vivo:
  o Worker tem histórico de tráfego real desprezível até agora, 9 invocations/24h, nenhum jogo
  concorrente real ainda aconteceu pra medir), então o número "antes" vem do próprio código-fonte:
  `netSendTimer > 0.12` era incondicional = exatamente 8,33 msg/s por jogador, sempre — não é
  estimativa, é o valor literal do timer que existia. Ver CONTEXT.md.
- [x] Envio por mudança em vez de por relógio: `World3D.tsx` só manda `state` quando posição/
  direção mudou além de um limiar, ou quando o keepalive de 5s vence parado. Teto de verificação
  em 0,5s (≤2 msg/s andando, igual ao alvo do documento)
- [x] Separar estado contínuo de estado raro — **decisão consciente de NÃO dividir em duas
  mensagens de rede** (ver "Decisões técnicas" no CONTEXT.md): a aparência continua no mesmo
  `state`, mas só é reenviada quando muda OU no keepalive de 5s, o que já resolve o problema real
  descrito (aparência "andando junto" 8x/s) sem precisar de um segundo tipo de mensagem nem de
  avisar o relay sobre jogadores novos entrando
- [x] Reconexão com backoff exponencial + jitter em `multiplayer.ts` (1s → 2s → 4s → … → teto de
  60s, "full jitter" 50%-100%), limite de 10 tentativas por sessão com desistência silenciosa —
  testado (5 testes unitários em `multiplayer.test.ts`)
- [x] Modo solo comprovado por teste automatizado, no escopo testável sem infraestrutura nova de
  E2E (o projeto não tem Playwright/jsdom): `sendState`/`sendAttack`/`sendChat` nunca lançam
  exceção sem conexão (testado), e a decisão de desistir de reconectar é uma função pura testada
  isoladamente. Um teste literal de "o jogo abre e progride com o relay fora do ar" continua fora
  do alcance sem adicionar infraestrutura de teste nova — ver Pendências no CONTEXT.md
- [x] Orçamento medido **depois**, ao vivo, com o script de carga (não estimativa) — ver resultado
  real (30 jogadores/90s, extrapolado pra 30min) no CONTEXT.md
- [x] Script de teste de carga sintético criado e versionado
  (`app/server-cf-relay/scripts/load-test.mjs`, `npm run load-test`), rodado de verdade contra o
  relay ao vivo duas vezes. **Resultado não bate o critério de aceite do documento** (<20% da cota
  pra 30 jogadores/30min) — mediu 38,2%. Achado real e importante, não uma falha do laboratório:
  ver "Conclusão" no CONTEXT.md pra por que isso é esperado e o que falta (salas).

## Fora de escopo (explicitamente adiado)
- **Salas com teto explícito** (sala por região do mundo, teto de 12 jogadores por sala, abrir
  sala nova ao lotar) — é uma mudança arquitetural própria (particionamento do Durable Object),
  grande o suficiente para um laboratório separado; fica para logo em seguida, ainda dentro do
  item 1 da ordem de ataque de `05-escala-e-viabilidade.md` seção 7.
- **Interesse por proximidade** (não retransmitir estado de jogador muito distante) e **binário
  compacto** (`Float32`/quantização) — marcados `[SHOULD]` no documento, e o próprio documento diz
  para fazer isso só depois de envio-por-mudança e salas estarem prontos (ganho menor, complexidade
  maior).
- **Endurecimento do relay + socket autenticado** (G3, G5) e **moderação de apelido** (G4) — são
  os próximos itens da ordem de ataque (seção 7, itens 2-3), mas dependem de decisões de produto
  (ex.: como fica o apelido sem ser texto livre) que valem uma conversa própria; não misturar com
  a mudança de protocolo deste laboratório.
