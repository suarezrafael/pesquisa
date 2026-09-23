# Estado auditado dos backlogs

Ultima auditoria: 2026-09-23

Este arquivo e o indice operacional entre os numeros historicos dos backlogs e os diretorios de
laboratorio realmente executados. `labs/CURRENT.md` continua sendo a fonte de verdade do ultimo lab;
os documentos de backlog continuam sendo a fonte do problema, hipotese e criterios de aceite.

## Regras de leitura

- `Concluido`: PR mesclada em `main`, confirmada pelo historico Git/GitHub.
- `Parcial`: uma parte verificavel foi entregue, mas ainda ha criterio original pendente.
- `Pendente`: nenhum lab concluido cobre o escopo principal.
- O numero do backlog nao e necessariamente o numero do diretorio real. Bugs urgentes ocuparam
  numeros antes reservados por documentos de planejamento.

## Crescimento e UX

| Backlog | Lab real | Estado | Observacao |
| --- | --- | --- | --- |
| Labs 176-185 | Labs 176-185 | Concluido | Implementacao, qualidade, monetizacao e analytics entregues. |
| Lab 186 - Playtest crianca + responsavel | - | Pendente | O lab real 186 foi o bug do ranking; o estudo com 5-8 duplas ainda nao ocorreu. |
| UX Lab 187 - Mapa de verbos | 228 | Parcial | Inventario e triagem entregues; primeira sessao, planeta secundario e touch fisico pendentes. |
| UX Lab 188 - Linguagem de interativos | 229 | Parcial | Dicas de acao por teclado/toque publicadas; botao E validado no tablet, mas legibilidade perto dos objetos, padrao global e playtest ainda pendentes. |
| UX Lab 189 - Monetizacao infantil segura | 230 | Em andamento | Revisao de badges, copias e fluxo de vinculo infantil; area adulta permanece separada. |
| UX Lab 190 - Primeira sessao de 10 minutos | - | Pendente | Ainda falta playtest/iteracao da jornada completa. |

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
| 191 - Auditoria de FPS | 193, 219 | Parcial | Instrumentacao + coleta pelo HUD prontas; baseline emulador registrado. Faltam Android fisico e classificacao por cena. |
| 192 - Locomocao sem moonwalk | 194 | Concluido | PR #76. |
| 208 - Movimento responsivo | 195 | Concluido | PRs #77/#78. |
| 209 - Hub de mini-jogos | 196 | Concluido | PR #79. |
| 212-217 - Centro e arenas educativas | 197-202 | Concluido | PRs #80-#85. |
| 210 - Parkour arcade | 203 | Concluido | PR #86. |
| 211 - Trofeus | 204 | Concluido | PR #87. |
| 195 - Ranking sem friccao | 205 | Concluido | PR #88. |
| 196 - NPCs nos planetas | 206 | Concluido | PR #89. |
| 194 - Chat radial contextual | 208 | Concluido | PR #91. |
| 197 - Orbitas/luas | 209 | Concluido | PR #92. |
| 200 - Missoes fisicas | 210 | Concluido | PR #93. |
| 198 - Efeitos visuais leves | 207/211/212/213/214/215 | Concluido | Landing puff, brilho, pulso, poeira de passos, rastro do foguete e feedback de puzzle entregues. |
| 193 - Otimizacao de draw calls | 220/221/222/223/224/225 | Parcial | Props e escolas foram instanciados/cullados; 45 materiais estaticos congelados. O Lab 225 centralizou os perfis e expoe 26 reducoes no perfil economico, escala e ciclos do autoajuste. Falta medir Android fisico para escolher nova otimizacao. |
| 199 - Filtro de chat livre | - | Condicional | P2; somente apos pesquisa e opt-in parental. |
| 218 - Mercado/bazar 3D | - | Bloqueado | Escopo ainda precisa ser decidido. |

## Pesquisa pendente

- Lab 186: playtest guiado com 5-8 duplas crianca/responsavel.
- Pesquisas A-E: teste dos 10 segundos, camera/primeira sessao, valor da assinatura, riqueza dos
  planetas e linguagem etica de monetizacao.
- Pesquisas F-H: necessidade real de chat livre, controle percebido e elementos de planeta que
  geram retorno.
- Baseline tecnico: executar `window.__perf.sample(15000)` nas cenas definidas pelo lab real 193 em
  Redmi Pad 2, Poco C75 e ao menos um Android intermediario.

## Proxima ordem recomendada

1. Medir o baseline em Redmi Pad 2/Poco C75 e fechar o backlog 191.
2. Usar os JSONs do perfil em dispositivos fisicos para escolher o gargalo e o escopo do Lab 226.
3. Executar o Lab 186 de playtest e as Pesquisas A/B.
4. Priorizar UX 187-190 com base nos testes.
5. Definir o escopo do mercado/bazar como backlog 218 (aguardando o usuario detalhar o pedido).
