# Laboratório 85 — protocolo de tempo real com orçamento de cota

Status: em andamento
Início: 2026-08-24
Fim: -
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
- [ ] Orçamento por jogador-minuto medido no dashboard do Cloudflare **antes** de qualquer
  mudança (requests de Durable Object numa sessão real de ~10 min) — número escrito no
  `CONTEXT.md`, não estimativa (referência: `05-escala-e-viabilidade.md` seção 3, primeiro
  `[MUST]`)
- [ ] Envio por mudança em vez de por relógio: parar de mandar `state` quando posição/direção/
  aparência não mudaram além de um limiar; keepalive raro (≥5s) quando parado. Alvo do documento:
  de 8,33 msg/s para ≤2 msg/s em movimento e ~0,2 msg/s parado (seção 3)
- [ ] Separar estado contínuo (posição/direção, mensagem enxuta) de estado raro (chapéu, cores,
  arma — só quando muda ou quando um jogador novo entra), em vez de as duas viajarem juntas a
  cada envio (seção 3)
- [ ] Reconexão com backoff exponencial + jitter em `multiplayer.ts` (ex.: 1s → 2s → 4s → … →
  teto de 60s), limite de tentativas por sessão, e desistência silenciosa para modo solo — hoje é
  fixo a cada 3s, sem limite, sem jitter (seção 3, G2)
- [ ] Modo solo como padrão funcional comprovado por teste automatizado (o jogo abre, joga, salva
  e progride com o relay 100% fora do ar) — já é quase verdade na prática, falta a prova (seção 3)
- [ ] Orçamento por jogador-minuto medido de novo **depois** das mudanças, mesmo protocolo de
  medição do primeiro item, número comparado lado a lado no `CONTEXT.md`
- [ ] Teste de carga sintético (script versionado no repo, N clientes WebSocket falsos) que serve
  de critério de aceite reproduzível — o documento sugere 30 jogadores simultâneos por 30 min
  consumindo menos de 20% da cota diária (seção 3, "Critério de aceite")

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
