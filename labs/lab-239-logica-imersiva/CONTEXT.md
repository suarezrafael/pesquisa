# Contexto - Laboratorio 239 - Logica imersiva

Preenchido em: 2026-09-25
Commit inicial: 1a9ee9d1b8836a4e92744545fb8189026badd64f

## Implementado

- `app/src/state/logicGame.ts`: catalogo de sequencias, tres rodadas por tentativa,
  alternativas unicas e erro sem perda de progresso. Testes em `logicGame.test.ts`.
- `World3D.tsx`: quatro pecas de sequencia e tres placas de resposta na Central,
  criadas somente ao entrar; o portal Logica usa o controlador de arena existente.
  Resposta por proximidade/E ou toque curto; arraste/pinca continuam cancelando o toque.
- Vitoria unica por tentativa credita tres moedas, conclusao da categoria `logica`,
  trofeu e eventual missao semanal pelas mesmas funcoes das outras arenas.
- `server-accounts/src/domain.ts`: allowlist de `minigameId` aceita `logica` para
  preservar a telemetria, sem alterar conta, assinatura ou dados pessoais.
- A missao ambiental da ponte continua no fluxo original; a arena da Central e
  distinguida pelo ID `logica` dos eventos `ponte-logica` do hub.

## Verificacao

- App: 308/308 testes, build/TypeScript e lint passaram. Lint mostrou dois avisos
  preexistentes fora do lab.
- Worker de contas: 171/171 testes passaram.
- Navegador local: o mundo 3D carregou sem erro de console. A navegacao manual
  nao alcancou o interior da Central nesta sessao; geometria, legibilidade,
  resposta ao toque e ciclo completo da arena nao foram confirmados visualmente.

## Pendencias

- Playtest no Redmi Pad 2: entrar na Central, tocar Logica, responder uma opcao
  errada e depois tres corretas, confirmar recompensa/trofeu, repetir e sair.
- Medir selecao, conclusao, abandono e FPS; nao atribuir ganho de retencao sem
  dados de criancas. Validar tambem que a ponte externa segue independente.

## Proximo passo

Usar o playtest para ajustar posicao, tamanho e legibilidade das pecas e placas,
sem ampliar a arena antes de observar as criancas jogando.
