# Laboratorio 235 - FPS compacto no HUD

Status: implementado localmente; teste em aparelho fisico pendente
Inicio: 2026-09-23
Fim: -
Commit inicial: e387563840415333a670504adc87fbc7ca327382
Prioridade: P1
Origem: `labs/lab-228-mapa-verbos/VERB-MAP.md`, inconsistencia do painel
tecnico expandido; pedido anterior do Lab 67 para exibir FPS em producao.

## Problema e hipotese

O painel tecnico expandido por padrao cobre parte do planeta e disputa espaco
com controles em telas pequenas. Mostrar somente o FPS por padrao mantem a
medicao acessivel sem atrapalhar a primeira sessao da crianca.

## Usuario beneficiado

Criancas em telas touch e responsaveis/testadores que medem desempenho.

## Escopo e criterios de aceite

- [x] Iniciar recolhido, mas mostrar FPS numerico em producao.
- [x] Manter alvo de toque de pelo menos 44 px, nome acessivel e tooltip.
- [x] Preservar abertura do painel completo e acao `Medir 15 s`.
- [x] Atualizar o texto tecnico no maximo duas vezes por segundo, sem estado
  React por quadro.
- [x] Passar build, testes e lint; inspecionar no navegador local e a 390x844.
- [ ] Validar no Redmi Pad 2 e Poco C75, inclusive HUD com telas de modal.

## Fora de escopo

- Mudar o motor 3D, o algoritmo de medicao `window.__perf` ou o perfil grafico.
- Remover o painel de diagnostico em producao.

## Metricas e riscos

Meta: indicador de FPS sempre visivel, zero sobreposicao com controles de
camera/toque no viewport testado e medicao de 15 s acessivel em um toque.
O valor de FPS pode variar entre atualizacoes de 500 ms; os dados detalhados
continuam sendo uma leitura instantanea, nao media de sessao. O ganho de CPU
por reduzir escritas no DOM ainda nao foi medido em Android fisico.
