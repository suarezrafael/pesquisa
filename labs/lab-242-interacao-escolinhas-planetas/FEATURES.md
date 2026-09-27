# Laboratorio 242 - Interacao explicita nas escolinhas dos planetas

Status: implementado; PR #130 aberta, validacao fisica pendente
Inicio: 2026-09-27
Fim: 2026-09-27 (implementacao local)
Commit inicial: 504c8c6a072ecddfba21d839c0469de60706b299
Prioridade: P0 - recuperacao de uma interacao educativa

## Problema / hipotese

O usuario relatou perguntas que nao abrem junto a placa/professor. O Lab 241
corrigiu o alcance, mas cancelar a pergunta ainda exige sair do raio e retornar.
Hipotese: uma acao explicita e contextual permite retomar a pergunta sem confundir
o jogador, preservando a histerese que impede modais em loop.
Usuario beneficiado: crianca explorando planetas com teclado ou touch.
Origens: relato do usuario, CONTEXT do Lab 241, UX 188 e mapa de verbos do Lab 228.

## Escopo e criterios de aceite

- [x] E e o botao touch existente abrem a pergunta pendente mais proxima, no
  planeta atual e no mesmo alcance da abertura automatica.
- [x] Apos cancelar, a mesma pergunta pode ser retomada sem sair do lugar;
  a aproximacao automatica nao reabre sozinha.
- [x] Somente a placa elegivel mais proxima mostra a dica de acao; dicas nao
  aparecem em voo, interiores, chat, modal ou apos concluir a pergunta.
- [x] Selecao pura usa distancia ao quadrado, sem novos vetores por quadro;
  GUI reutiliza o ciclo de proximidade de 10 Hz e a linguagem do Lab 229.
- [x] Testes cobrem planeta, conclusao, alcance, empate, retomada e histerese;
  lint/build e teste no navegador registrados sem confundir com tablet fisico.
- [x] F9 somente em desenvolvimento posiciona perto de uma escolinha pendente
  de Venus para reproduzir cancelar/retomar pela UI, sem premiar ou responder;
  nao equivale a validar a viagem nem a caminhada a partir do foguete.

## Fora de escopo

- Alterar recompensa, catalogo de perguntas, assinatura, chat ou persistencia.
- Adicionar planeta, malha, textura ou novo controle touch.
- Declarar concluido o playtest fisico do Lab 240.

## Metricas esperadas e validacao

- Criterio funcional: cancelar e reabrir a mesma pergunta por uma acao, sem
  deslocamento, e nenhuma reabertura automatica enquanto permanece perto.
- Playtest pendente: 5-8 duplas; medir tentativas/tempo para retomar uma pergunta
  e sucesso sem ajuda. Meta exploratoria: >=80% retomam em ate 10 s, nao medida.
- Nao atribuir ganho de FPS, aprendizagem ou retencao sem coleta comparavel.

## Riscos

- E disputar com foguete: priorizar pergunta elegivel perto da placa, manter
  retorno do foguete acessivel fora desse alcance.
- Modais repetidas: manter latch automatico e guardas existentes de suspensao.
- Sobreposicao/legibilidade: dica curta, unica, sem bloquear arraste da camera;
  touch e legibilidade fisicos permanecem criterio de validacao no Redmi Pad 2.
