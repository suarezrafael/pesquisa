# Laboratorio 240 - Validacao da Central de Jogos no tablet

Status: em andamento
Inicio: 2026-09-25
Fim: -
Commit inicial: 9fa3187f074426593e636eec4ee782e99e710ccd

## Objetivo do laboratorio

Confirmar no Redmi Pad 2 que a crianca consegue entrar na Central, escolher
Logica por toque, jogar ate concluir e sair sem confundir toque com arraste da
camera. Corrigir apenas problemas observados nesse fluxo, preservando as outras
arenas e o desempenho mobile.

## Funcionalidades planejadas

- [ ] Registrar build, cena, perfil de qualidade e FPS da sessao no tablet,
  com relato ou video dos pontos em que a interacao falhar (referencia:
  `labs/lab-239-logica-imersiva/CONTEXT.md`, pendencias; Lab 227).
- [ ] Testar entrada e saida da Central, toque curto nas quatro placas, arraste
  e pinca sem ativacao acidental, e botao E como alternativa (referencia:
  `labs/lab-238-toque-direto-portais/CONTEXT.md`; Labs 237-238).
- [ ] Na arena Logica, testar uma resposta errada seguida de tres corretas,
  recompensa/trofeu, nova tentativa e retorno ao planeta; conferir que o
  desafio da ponte continua independente (referencia:
  `labs/lab-239-logica-imersiva/CONTEXT.md`).
- [ ] Se o teste reproduzir defeito, corrigir o menor trecho responsavel,
  acrescentar teste de regressao quando viavel e repetir o fluxo e o build
  (referencia: `docs/prompts/04-manutencao-clean-code.md`).

## Criterios de aceite

- A crianca consegue iniciar e concluir Logica no tablet sem ficar presa no
  saguao nem depender de posicionamento preciso demais para tocar uma placa.
- Um erro nao troca a sequencia nem reduz o progresso; tres acertos concedem
  a recompensa uma vez por tentativa e permitem jogar novamente.
- Toque de camera, arraste e pinca nao escolhem portal ou resposta por engano.
- A medicao informa build, FPS medio e p5; nenhuma melhora de desempenho ou
  retencao sera atribuida sem comparacao valida.

## Fora de escopo (explicitamente adiado)

- Novas arenas, conteudo didatico, loja, conta, assinatura e alteracoes de chat.
- Declarar a experiencia aprovada por criancas ou o FPS validado a partir de
  simulacao no desktop.
