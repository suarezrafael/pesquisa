# Contexto - Laboratorio 225 - Perfil de qualidade mobile

Preenchido em: 2026-09-22
Commit inicial: a92be87b18d3cc1fde3b4b0bea7647d0bcb07328
PR: a preencher

## O que foi feito

- `qualityProfile.ts` concentra os valores antes dispersos em dois perfis tipados: `economy`
  (benchmark de GPU fraca) e `full` (GPU forte). O perfil cobre antialiasing, FXAA, SSAO2,
  sombras, HDRI, densidade de props/NPCs/inimigos e efeitos decorativos.
- `World3D.tsx` usa o perfil em cada ponto antes condicionado por `isLowEndDevice`. A classificacao
  continua vindo do mesmo benchmark; o autoajuste de resolucao por FPS continua independente.
- O HUD mostra o perfil e o numero de reducoes. `window.__perf.qualityProfile()` e o JSON de
  `sample()` mostram os valores do perfil, `reducedSettings`, a escala atual, o ultimo FPS medido
  pelo autoajuste e o numero de ciclos. `gpuTierSource` distingue benchmark de override local.
- `?gpuTier=weak|strong` funciona somente em desenvolvimento para repetir testes visuais dos
  dois caminhos, mesmo sem acesso a um aparelho fisico. Producoes ignoram esse parametro.
- `README.md` foi atualizado para descrever a deteccao e o FXAA reais, que ja nao correspondiam
  ao texto antigo sobre user agent.

## Verificacao

- `npx tsc -b --force`: passou.
- `npm run test -- --run`: 281/281 testes em 16 arquivos.
- `npm run lint`: passou sem erro; dois avisos preexistentes.
- `npm run build`: passou, inclusive o service worker PWA.
- Edge 153: `full` exibiu zero reducoes e 2.264 meshes no perfil local; `economy` forcado exibiu
  26 reducoes, 1.594 meshes, FXAA ativo, SSAO/sombras custosas desligados, cena e legenda visiveis
  e console sem erros. O viewport 390x844 tambem foi inspecionado.
- JSON do perfil `economy` mostrou `gpuTierSource: development-override`, escala 1,60 apos tres
  ciclos e a lista completa das 26 reducoes.

## Decisoes e limites

- Os valores de cada perfil reproduzem os ramos existentes; este lab melhora auditabilidade e
  controle de experimentos, sem prometer ganho de FPS por reorganizar codigo.
- `hardwareScalingLevel` e dinamico; o perfil registra o valor inicial e o relatorio registra
  o valor atual, para evitar chamar um aparelho `full` de resolucao cheia depois do autoajuste.
- Tamanho das legendas continua baseado em legibilidade/tela, fora do perfil de GPU. Agua e borda
  da piscina, quests, recompensas e minijogos permanecem presentes nos dois caminhos.
- O Android Emulator instalado iniciou, mas o controle automatizado de sua interface foi
  bloqueado neste ambiente antes de abrir o jogo. O teste `economy` no Edge e funcional/visual,
  nao uma medicao de FPS do Redmi Pad 2 ou Poco C75.

## Proximo laboratorio recomendado

Lab 226 - coletar amostras equivalentes em Redmi Pad 2, Poco C75 e um Android intermediario,
incluindo Terra, centro de jogos e um planeta secundario. Com esses dados, escolher uma unica
familia cara de camera/render targets para otimizar e comparar FPS p5, tempo de render e leitura
visual. Pergunta: "qual passe ou familia de objetos ainda domina o tempo de quadro real mobile?"
