# Contexto — Laboratório 86 — correção do orçamento de cota do multiplayer

Preenchido em: 2026-08-24
Commit inicial → final: b6b33de5f78f2d174853598017bb0372ecfc18c9..HEAD

## O que foi feito
- **Investigação da dúvida deixada pelo lab-85** (cota de Durable Objects por conta vs. por
  instância): consultei a documentação oficial da Cloudflare (`developers.cloudflare.com/
  durable-objects/platform/limits/` e `.../pricing/`) três vezes com perguntas cada vez mais
  específicas. A dúvida original **continua sem resposta explícita** nos documentos oficiais — mas
  no processo encontrei um fato bem mais importante que não estava no radar de ninguém até agora.
- **Achado principal**: a página oficial de preços dos Durable Objects (seção "Compute billing",
  "Last Updated: August 10, 2026") documenta que **mensagens WebSocket recebidas são cobradas numa
  razão de 20:1** — citação exata, confirmada em duas consultas independentes pra descartar
  alucinação da ferramenta de busca: *"For compute requests billing-only, a 20:1 ratio is applied
  to incoming WebSocket messages to factor in smaller messages for real-time communication. For
  example, 100 WebSocket incoming messages would be charged as 5 requests for billing purposes."*
  Mensagens **enviadas** (broadcast, o que o relay faz o tempo todo) não são cobradas: *"There is
  no charge for outgoing WebSocket messages, nor for incoming WebSocket protocol pings."*
- **Nem `docs/prompts/05-escala-e-viabilidade.md` nem `labs/lab-85-protocolo-tempo-real/`
  aplicaram essa razão** — os dois trataram "1 mensagem recebida = 1 request" (o documento
  original na seção 1, "A conta que ninguém fez ainda no repositório"; o lab-85 no seu script de
  carga e na extrapolação de 38,2%). Isso significa que a urgência original de G1 estava
  superestimada em 20x.
- **Recálculo com a razão correta** (ver tabela abaixo).
- **Correção documentada em três lugares**, sem apagar/reescrever nada do que já existia:
  - Adendo datado no topo de `docs/prompts/05-escala-e-viabilidade.md` (o texto original do
    usuário permanece intacto abaixo do adendo).
  - Nota de correção no topo de `labs/lab-85-protocolo-tempo-real/CONTEXT.md` (a seção "Números
    medidos" original continua lá, só com o aviso de que o denominador estava errado).
  - Este arquivo.
- **Identifiquei "Duration" como o recurso que agora merece mais atenção** que "Requests" (ver
  seção própria abaixo) — não tinha sido considerado antes porque toda a atenção estava em
  requests/dia.

## Recálculo dos números do lab-85 com a razão 20:1

| | Sem a razão 20:1 (como o lab-85 mediu) | Com a razão 20:1 (correto) |
|---|---|---|
| 30 jogadores/90s, mensagens enviadas medidas ao vivo | 1.911 mensagens | 1.911 mensagens (isso não muda — é a contagem real de envios) |
| Requests cobrados nesses 90s | 1.911 (assumido 1:1) | **96** (1.911 ÷ 20, arredondado) |
| Extrapolado pra 30 jogadores / 30 min | 38.220 requests | **1.911 requests** |
| % da cota diária (100.000) | **38,2%** | **1,91%** |
| Protocolo antigo (8,33 msg/s incondicional), mesmos 30 jogadores/30min | ≈450.000 mensagens → 450.000 requests (assumido 1:1) = **450% da cota** (impossível, estouraria sozinho) | ≈450.000 mensagens → **22.500 requests = 22,5% da cota** — cabe numa única sessão, mas comeria quase um quarto do dia com só uma sala rodando 30 min |
| Achado do documento original ("~13 crianças de 15min esgotam a cota", protocolo antigo) | 13 crianças | **≈267 crianças** (13 × 20, contas na seção do adendo em `05-escala-e-viabilidade.md`) |

**Conclusão prática**: as duas otimizações do lab-85 (envio por mudança + reconexão com backoff)
continuam sendo a decisão certa — cortam a carga em ~12x frente ao protocolo antigo, um resultado
real. Só que, com a razão de cobrança correta, o produto **já está com folga enorme** de requests/
dia mesmo sem salas: uma sessão de 30 jogadores por 30 minutos usa menos de 2% da cota diária.

## "Duration" — o recurso que passa a merecer mais atenção
Achado novo, não estava no radar de nenhum laboratório anterior. A tabela de preços também mostra:
- **Duration**: 13.000 GB-s/dia (Free), cobrada como "wall-clock time while active/unable to
  hibernate", cobrando os **128MB de memória inteiros por instância** enquanto ela estiver ativa
  (rodapé 3 da tabela de preços). E a página confirma que **chamar `accept()` num WebSocket mantém
  o objeto ativo (impede hibernação) por todo o tempo que a conexão ficar aberta** — ou seja, a
  sala global fica "ativa" (cobrando duration) o tempo inteiro em que pelo menos um jogador estiver
  conectado, independente de quantas mensagens estão sendo trocadas.
- Conta: 0,125 GB (128MB) × segundos ativos. Orçamento de 13.000 GB-s ÷ 0,125 GB = **104.000
  segundos-objeto/dia** — mas um dia só tem 86.400 segundos, então mesmo que a sala global fique
  ocupada por pelo menos um jogador **24 horas por dia, 7 dias por semana**, o custo seria
  0,125 × 86.400 = **10.800 GB-s = 83% da cota diária de duration**. Apertado, mas cabe — desde
  que seja só UMA sala sempre ativa.
- **Isso muda o cálculo de "salas"**: se o produto crescer e "salas com teto de 12" forem
  implementadas, cada sala simultaneamente ocupada por pelo menos um jogador soma duration
  separadamente contra o mesmo orçamento (presumindo que "Duration" também seja por conta, mesma
  dúvida de agregação não resolvida que "Requests" tem). Duas salas ativas ao mesmo tempo, o dia
  inteiro, já estourariam os 13.000 GB-s sozinhas (2 × 10.800 = 21.600 GB-s). **Rooms não é uma
  otimização "de graça" do ponto de vista de duration** — o número de salas simultaneamente ativas
  importa tanto quanto o número de jogadores.
- Não medi isso ao vivo (precisaria de uma sessão real de horas, não segundos/minutos como o
  script de carga do lab-85 permite medir de forma prática) — fica registrado como uma hipótese
  fundamentada na documentação oficial, não como número medido. Ver "O que o próximo laboratório
  deve desenvolver".

## Decisões técnicas tomadas
- **Não implementei "salas com teto de 12" neste laboratório**, mesmo sendo o próximo item natural
  da ordem de ataque do documento original. Motivo: com o orçamento de requests corrigido (~1,9%
  pra 30 jogadores/30min), não existe mais uma crise de cota de requests que justifique a
  prioridade sobre G3-G5 (segurança do relay + moderação de apelido, que têm risco legal/
  reputacional imediato e nenhuma dependência de "salas" primeiro). Rooms continua sendo uma boa
  ideia por outros motivos (fan-out O(N²) de CPU/banda, soft-limit de 1.000 req/s por objeto), só
  não com a urgência que o documento original (sem a razão 20:1) sugeria.
- **Não tentei resolver definitivamente a dúvida "por conta vs. por instância"** (nem pra Requests
  nem pra Duration) depois de encontrar a razão 20:1 — a urgência de responder essa pergunta caiu
  junto com a urgência da cota. Fica como uma dúvida em aberto de baixo custo (documentada, não
  esquecida), não como bloqueador de mais nada agora.
- **Corrigi os documentos existentes com adendos datados, não reescrevendo o conteúdo original**
  — `docs/prompts/05-escala-e-viabilidade.md` foi trazido pelo usuário; reescrever silenciosamente
  os números dele apagaria o rastro de como a decisão evoluiu e poderia parecer que o documento
  original "sempre disse isso". Um adendo visível, datado e linkado pro laboratório que o corrigiu
  é mais honesto e é o mesmo padrão que o projeto já usa (ver a nota de divergência entre
  `prompt.md` e a implementação real, em `CLAUDE.md`).

## Pendências / dívidas conhecidas
- Duas dúvidas de agregação de cota continuam sem resposta oficial clara: (1) Requests/dia é por
  conta ou por instância de Durable Object? (2) Duration/dia é por conta ou por instância? Ambas
  de baixa urgência agora (ver acima), mas valem a pena resolver antes de qualquer decisão de
  arquitetura que dependa da resposta (ex.: "salas" quando o produto crescer o suficiente pra
  precisar delas de verdade).
- "Duration" não foi medido ao vivo — é uma extrapolação a partir da documentação oficial
  (0,125GB × segundos ativos), não um número medido como os de "Requests" no lab-85. Precisa de
  uso real e sustentado (ou um teste de carga de várias horas, que tem custo real de infra pra
  rodar) pra virar número medido.
- O critério de aceite original do documento ("<20% da cota pra 30 jogadores/30min") foi escrito
  sem considerar a razão 20:1 — meio que "acertou por engano": o alvo continua servindo como uma
  margem de segurança razoável mesmo com o novo denominador (1,9% medido está bem confortável
  dentro dele), então não precisa ser reescrito, só reinterpretado com a base numérica correta.

## Funcionalidades planejadas que NÃO foram concluídas
- "Investigar se a cota é por conta ou por instância" ficou sem resposta definitiva — rebaixado
  de bloqueador pra dúvida documentada, não descartado (ver "Fora de escopo" no `FEATURES.md`).
- "Medir Duration ao vivo com um teste de carga" não foi feito — precisa de uso real sustentado,
  não dá pra simular em segundos/minutos como as métricas de requests.

## O que o próximo laboratório deve desenvolver
Com a correção deste laboratório, a ordem de ataque de `docs/prompts/05-escala-e-viabilidade.md`
seção 7 volta a fazer sentido na ordem original, **pulando "salas" por enquanto**:
1. **G3/G5 — endurecimento do relay + socket autenticado**: o relay hoje não verifica `Origin`,
   não exige token, não limita conexões por IP nem tamanho de mensagem, e repassa qualquer tipo de
   mensagem desconhecido (`broadcast(ws, {...msg, id})`). Pré-requisito de moderação.
2. **G4 — apelido deixa de ser texto livre**: o único achado com risco legal/reputacional
   imediato. `Onboarding.tsx` ainda usa um `<input>` de texto livre pro apelido, que é transmitido
   cru pra outros jogadores — fere o `[MUST]` de "sem texto livre" por um caminho que ninguém
   tinha notado até o documento original.
3. Só depois, se o produto tiver crescido o suficiente pra o número de jogadores simultâneos
   justificar (não antes): salas com teto de ~12 jogadores — nesse ponto, vale medir Duration ao
   vivo primeiro (uso real já vai existir), e resolver a dúvida de agregação por conta/instância
   antes de commitar ao desenho (pode fazer mais sentido usar poucas salas grandes do que muitas
   pequenas, dependendo da resposta).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Este laboratório é só documentação — nenhum código de jogo/Worker mudou. Nada novo pra rodar
  build/test/deploy.
- Como verificar: ler o adendo no topo de `docs/prompts/05-escala-e-viabilidade.md`, a nota de
  correção no topo de `labs/lab-85-protocolo-tempo-real/CONTEXT.md`, e este arquivo.
