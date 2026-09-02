# Laboratório 86 — correção do orçamento de cota do multiplayer

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: b6b33de5f78f2d174853598017bb0372ecfc18c9

## Objetivo do laboratório
`labs/lab-85-protocolo-tempo-real/CONTEXT.md` deixou uma dúvida real e não respondida como
pré-requisito pro próximo passo da ordem de ataque de `docs/prompts/05-escala-e-viabilidade.md`
(salas com teto de 12 jogadores): não estava claro se a cota de 100.000 requests/dia de Durable
Objects é por conta ou por instância. Antes de escrever qualquer código de salas, este
laboratório investiga essa dúvida a fundo na documentação oficial da Cloudflare — e no processo
encontrou algo mais importante que a pergunta original: a página oficial de preços dos Durable
Objects (`developers.cloudflare.com/durable-objects/platform/pricing/`, "Last Updated: August 10,
2026") documenta uma **razão de cobrança de 20:1 pra mensagens WebSocket recebidas** ("100
WebSocket incoming messages would be charged as 5 requests for billing purposes") que nem o
documento original nem o lab-85 levaram em conta. Isso muda a conta inteira: os números "medidos"
do lab-85 (38,2% da cota pra 30 jogadores/30min) estavam superestimados em 20x.

## Funcionalidades planejadas
- [x] Confirmar a razão de cobrança 20:1 na documentação oficial da Cloudflare, com citação exata
  e verificação cruzada — confirmado em duas consultas independentes, mesma citação exata as duas
  vezes: "100 WebSocket incoming messages would be charged as 5 requests for billing purposes"
- [x] Investigar se a cota de requests/dia e a de duração são por conta ou por instância — **sem
  sucesso definitivo**, documentado como dúvida em aberto de baixa urgência (ver CONTEXT.md)
- [x] Recalcular os números medidos do lab-85 com a razão 20:1 aplicada — 38,2% → 1,91% da cota
  diária pra 30 jogadores/30min; ver tabela completa no CONTEXT.md
- [x] Identificar "Duration" (13.000 GB-s/dia) como recurso que merece mais atenção agora que
  Requests — cálculo: sala global ativa 24h/dia consumiria ~83% desse orçamento sozinha, e salas
  múltiplas simultâneas multiplicam esse custo (não é otimização "de graça")
- [x] Nota de correção datada em `docs/prompts/05-escala-e-viabilidade.md` — adendo no topo, texto
  original do usuário preservado abaixo
- [x] Nota de correção em `labs/lab-85-protocolo-tempo-real/CONTEXT.md` — adendo no topo, seção
  "Números medidos" original preservada abaixo
- [x] Recomendação atualizada pro `labs/CURRENT.md` — próximo passo real é G3-G5 (endurecimento
  do relay + moderação de apelido), "salas" volta pro backlog sem urgência

## Fora de escopo (explicitamente adiado)
- **Implementar salas com teto explícito** — com o orçamento revisado, deixou de ser urgente pela
  ótica de requests/dia (ver achado principal). Continua sendo uma boa prática por outros motivos
  (reduz fan-out O(N²) de CPU/banda por sala, reduz o soft-limit de 1.000 req/s por objeto), mas
  sem uma crise de cota real por trás, não justifica prioridade sobre G3-G5 (segurança/moderação,
  que têm risco legal/reputacional imediato). Fica pro backlog, não descartado.
- **Medir "Duration" ao vivo com um teste de carga** — precisa de uma sessão real e mais longa
  (o script de carga do lab-85 roda por segundos/minutos, não horas) pra ter um número confiável;
  fica pra quando houver uso real recorrente o suficiente pra medir sem precisar simular.
- **Resolver definitivamente a dúvida por-conta-vs-por-instância** — não tem resposta clara nem
  nas páginas de limites nem nas de preço da Cloudflare; resolver definitivamente exigiria abrir
  um ticket de suporte ou um teste real com duas instâncias de DO gerando tráfego simultâneo por
  tempo suficiente pra aparecer nos dois lados do dashboard de billing — não fiz isso porque a
  razão 20:1 já reduziu a urgência de responder essa pergunta especificamente.
