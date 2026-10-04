# Estado auditado dos backlogs

Ultima auditoria: 2026-10-03 (lab-248, reconciliando labs 227-247; auditoria anterior era de
2026-09-23 e parava no lab-226)

Este arquivo e o indice operacional entre os numeros historicos dos backlogs e os diretorios de
laboratorio realmente executados. `labs/CURRENT.md` continua sendo a fonte de verdade do ultimo lab;
os documentos de backlog continuam sendo a fonte do problema, hipotese e criterios de aceite.

## Regras de leitura

- `Concluido`: PR mesclada em `main`, confirmada pelo historico Git/GitHub.
- `Parcial`: uma parte verificavel foi entregue, mas ainda ha criterio original pendente.
- `Pendente`: nenhum lab concluido cobre o escopo principal.
- `Bloqueado`: depende de um recurso que esta sessao nao tem como gerar (dispositivo fisico,
  assinatura Stripe real, playtest com criancas) — nao e falta de priorizacao, e falta de insumo.
- O numero do backlog nao e necessariamente o numero do diretorio real. Bugs urgentes ocuparam
  numeros antes reservados por documentos de planejamento.
- `docs/gameplay-market-expansion-backlog.md` define os itens numerados 191-218 (nao ha item 219+
  nesse documento — "193, 219" na tabela abaixo significa que o LAB real 219 contribuiu pro item
  de backlog 193, nao que existe um backlog 219).

## Crescimento e UX

| Backlog | Lab real | Estado | Observacao |
| --- | --- | --- | --- |
| Labs 176-185 | Labs 176-185 | Concluido | Implementacao, qualidade, monetizacao e analytics entregues. |
| Lab 186 - Playtest crianca + responsavel | - | Bloqueado | O lab real 186 foi o bug do ranking; o estudo com 5-8 duplas ainda nao ocorreu — depende de acesso a familias, nao de codigo. |
| UX Lab 187 - Mapa de verbos | 228 | Parcial | Inventario e triagem entregues (PR #115). Primeira sessao, planeta secundario e touch fisico seguem sem lab novo desde a ultima auditoria. |
| UX Lab 188 - Linguagem de interativos | 229, 237, 238, 241, 242 | Parcial | Labs 229 (PR #118), 237 (PR #126), 238 (PR #127, toque direto nos portais), 241 (PR #129, toque nos alvos das 4 arenas) e 242 (PR #130, retomar pergunta por E/touch) ja mesclados — cobertura de touch na Central de Jogos bem mais ampla que na auditoria anterior. Playtest fisico da Central confirmado funcionando (lab-240, 2026-10-04). Padrao global de linguagem de interativos FORA da Central continua pendente. |
| UX Lab 189 - Monetizacao infantil segura | 230 | Parcial | PR #119: copia/fluxo de vinculo infantil revisados, area adulta separada. Achado do review automatico do Copilot (PR #140): status anterior deste indice dizia `Concluido`, mas `labs/lab-230-lojinha-infantil-segura/AUDIT.md` e o criterio de aceite original (`docs/growth-retention-monetization-backlog.md`) exigem testar compreensao com responsaveis/criancas antes de concluir — isso nunca ocorreu (nenhuma entrevista com as 5-8 duplas). Nenhum lab novo tocou este item desde a ultima auditoria (lab-234/236 abaixo sao Fases D/E do backend, relacionadas mas com escopo proprio). |
| UX Lab 190 - Primeira sessao de 10 minutos | 232 | Parcial | PR #121: entrada curta e guia contextual para movimento, primeira missao e recompensa. Playtest/iteracao da jornada completa no tablet continua pendente. |

## Jogabilidade e qualidade 3D

| Backlog | Lab real | Estado | Observacao |
| --- | --- | --- | --- |
| 201 - Ranking nao bloqueia camera | 186 | Concluido | PR #66. |
| 202 - Objetos alinhados ao relevo | 187 | Concluido | PR #67. |
| 203 - Pet maior e visivel | 188 | Concluido | PR #68. |
| 204 - Ceu espacial/atmosfera | 189 | Concluido | PR #69. |
| 205 - Preview fixo da loja | 190 | Concluido | PR #70. |
| 207 - Troca segura de nickname | 191 | Concluido | PR #71. |
| 206 - Pets e cosmeticos | 192, 216 | Concluido | Preview 3D (lab-192) + catalogo de acessorios conquistaveis com moeda, dois encaixes, painel com abas (lab-216, PR #100). |
| 191 - Auditoria de FPS | 193, 219, 226, 227, 235 | Parcial | Instrumentacao + coleta pelo HUD prontas; LOD por tamanho aparente (lab-227, PR #116) e HUD de FPS compacto sempre visivel (lab-235, PR #124) adicionados desde a ultima auditoria. Falta medicao sistematica em Android fisico e classificacao por cena — sem isso, nao declarar o item concluido. |
| 192 - Locomocao sem moonwalk | 194 | Concluido | PR #76. |
| 208 - Movimento responsivo | 195, 233 | Concluido | PRs #77/#78; giro touch do avatar alinhado ao direcional e suavizacao ajustada no lab-233 (PR #122) — validacao fisica desse refinamento ainda pendente. |
| 209 - Hub de mini-jogos | 196 | Concluido | PR #79. |
| 212-217 - Centro e arenas educativas | 197-202, 237-240 | Parcial | Nucleo (saguao, portais, 4 arenas, progressao) concluido nas PRs #80-#85. Segunda rodada de controles/conteudo (labs 237-240) ampliou isto: entrada/selecao por toque (lab-237, PR #126), toque direto nos portais (lab-238, PR #127), arena de Logica imersiva nova (lab-239, PR #128). Lab 240 (validacao no Redmi Pad 2): usuario confirmou em 2026-10-04 entrada/saida e toque nas 4 placas sem ativacao acidental; retorno ao planeta e independencia do desafio da ponte nao foram confirmados item a item (achado do Copilot na PR #152). Sem numeros de FPS/build (ver backlog 191 abaixo). |
| 210 - Parkour arcade | 203, 231 | Concluido | PR #86; bug de saida sem checkpoint corrigido no lab-231 (PR #120). |
| 211 - Trofeus | 204 | Concluido | PR #87. |
| 195 - Ranking sem friccao | 205 | Concluido | PR #88. |
| 196 - NPCs nos planetas | 206 | Concluido | PR #89. |
| 194 - Chat radial contextual | 208 | Concluido | PR #91. |
| 197 - Orbitas/luas | 209 | Concluido | PR #92. |
| 200 - Missoes fisicas | 210 | Concluido | PR #93. |
| 198 - Efeitos visuais leves | 207/211/212/213/214/215 | Concluido | Landing puff, brilho, pulso, poeira de passos, rastro do foguete e feedback de puzzle entregues. |
| 193 - Otimizacao de draw calls | 220/221/222/223/224/225 | Parcial | Props e escolas foram instanciados/cullados; 45 materiais estaticos congelados. O Lab 225 centralizou os perfis e expoe 26 reducoes no perfil economico, escala e ciclos do autoajuste. `lab-125` testou e revogou code-splitting por import individual do `@babylonjs/core` (piorou o bundle, ~4,31MB -> ~5,85MB — nao tentar de novo sem medir primeiro). Falta medir Android fisico pra escolher a proxima otimizacao. |
| 199 - Filtro de chat livre | - | Condicional | P2; somente apos pesquisa e opt-in parental. Pedido de chat livre do usuario foi recusado em 2026-08-24 por risco de seguranca infantil (`docs/prompts/01-seguranca.md`); ver `labs/CURRENT.md`. |
| 218 - Mercado/bazar 3D | - | Bloqueado | Escopo ainda precisa ser decidido com o usuario. |

## Monetizacao e contas (Fases D/E, `docs/plano-comercial-backend.md`)

| Item | Lab real | Estado | Observacao |
| --- | --- | --- | --- |
| Mascarar cosmeticos de assinatura expirada no perfil publico | 234 | Concluido | PR #123: `effectiveCosmeticProfile` projeta o save pro que o entitlement atual permite, sem alterar o save em si. |
| Revalidar assinatura durante sessao longa | 236 | Concluido (codigo); validacao real pendente | PR #125 mesclada em `7c0258a` em 2026-10-03, apos ficar em rascunho desde 2026-09-24 (11 labs). Decisao explicita do usuario de mesclar sem a validacao fisica/assinatura real — ver `labs/lab-236-revalidacao-entitlement/CONTEXT.md` ("Decisao de merge"). Suite 366/366, lint e build verdes, deploy automatico confirmado. Risco residual: comportamento fim-a-fim com assinatura Stripe real mudando de estado em sessao aberta e touch/desempenho no Redmi Pad 2 nunca foram testados — primeiro lugar a revisar se um responsavel reportar cosmetico desatualizado. |

## Endurecimento, acessibilidade e correcoes de codigo (sem item de backlog numerado)

Trilha organica de achados de codigo/revisao automatica (Copilot) desde a ultima auditoria, fora
de qualquer documento de backlog pre-planejado — registrada aqui so pra nao ficar invisivel no
indice:

- Lab 241 (PR #129): toque direto nos alvos das 4 arenas e alcance das perguntas dos planetas
  secundarios.
- Lab 242 (PR #130): retomar pergunta pendente por `E` ou toque, com dica contextual, sem loop.
- Lab 243 (PR #131): modais altos/rolaveis em telas baixas, fechar acessivel, previews compactos.
- Lab 244 (PR #132): devolver foco ao abridor quando um modal fecha.
- Lab 245 (PR #133): foco inicial no titulo visivel de modais longos (portao parental, perguntas).
- Lab 246 (PR #135): cancelar recompensa atrasada do `QuestModal` ao fechar/desmontar a pergunta
  — achado de severidade ALTA do review automatico do Copilot (estado da tentativa anterior ficava
  preso na pergunta nova quando um desafio ambiental substituia outro ja aberto).
- Lab 247 (PR #137): estendeu o mesmo endurecimento (`key` por identidade de tentativa) aos outros
  4 usos de `QuestModal` — preventivo, sem corrida reproduzida ao vivo para esses 4.

Todos os 7 labs acima: suite/lint/build verdes, CI verde, deploy automatico confirmado em
`missaoaprendizado.com` (`.github/workflows/ci.yml`, desde o lab-104). Pendencia comum a todos:
teste fisico de touch/teclado virtual/leitor de tela no Redmi Pad 2, acumulada desde o lab-238.

## Pesquisa pendente

- Lab 186: playtest guiado com 5-8 duplas crianca/responsavel.
- Lab 240: entrada/saida da Central e toque nas 4 placas confirmados pelo usuario em 2026-10-04.
  Ainda faltam: retorno ao planeta e independencia do desafio da ponte (nao confirmados item a
  item) e a medicao numerica de FPS/build (ver backlog 191/193 acima).
- Pesquisas A-E: teste dos 10 segundos, camera/primeira sessao, valor da assinatura, riqueza dos
  planetas e linguagem etica de monetizacao.
- Pesquisas F-H: necessidade real de chat livre, controle percebido e elementos de planeta que
  geram retorno.
- Baseline tecnico: executar `window.__perf.sample(15000)` nas cenas definidas pelo lab real 193 em
  Redmi Pad 2, Poco C75 e ao menos um Android intermediario.
- Lab 236 (mesclado sem validacao, ver tabela acima): testar revalidacao de entitlement com
  assinatura Stripe real (cancelar/reativar, offline, segundo jogador) e no Redmi Pad 2.

## Proxima ordem recomendada

A auditoria deste lab (248) nao achou nenhum item de backlog numerado que esta sessao possa avancar
sem um dos tres insumos que faltam: dispositivo Android fisico, uma assinatura Stripe real pra
testar, ou um playtest com criancas/responsaveis. Em ordem de dependencia:

1. Medir o baseline de FPS em Redmi Pad 2/Poco C75 (fecha os backlogs 191 e 193 — a parte
   funcional do lab-240 ja foi confirmada em 2026-10-04, falta so o numero).
2. Validar o lab-236 (ja mesclado) com assinatura real — e o unico codigo em produção sem
   confirmação fim-a-fim; qualquer sintoma de cosmetico desatualizado comeca por ali.
3. Executar o Lab 186 de playtest e as Pesquisas A/B.
4. Priorizar UX 187-190 com base nos testes acima.
5. Definir o escopo do mercado/bazar como backlog 218 (aguardando o usuario detalhar o pedido).

Sem nenhum desses insumos, o proximo lab de codigo precisa vir de uma prioridade que o usuario
escolha explicitamente, ou de um bug concreto e reproduzido (nao especulativo) achado por leitura
de codigo — mesmo criterio usado pra decidir o escopo do lab-247.
