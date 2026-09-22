# Laboratorio 226 - Baseline Android fisico

Status: em andamento
Inicio: 2026-09-22
Fim: -
Commit inicial: 4b242896698b1e56c9c8a5323026b834a0588d3e

## Objetivo do laboratorio

Medir o jogo em Redmi Pad 2, Poco C75 e, se disponivel, um Android intermediario com o mesmo
roteiro. Identificar com dados qual cena e qual familia de custo devem orientar a proxima
otimizacao de camera/render, sem sacrificar legibilidade ou conteudo educativo.

## Funcionalidades planejadas

- [ ] Coletar amostras reais de 15 segundos na Terra, no centro de jogos e em Marte ou outro
  planeta secundario, em pelo menos Redmi Pad 2 e Poco C75 (referencia: Lab 225 `CONTEXT.md`,
  Lab 219 `CONTEXT.md` e backlog 191).
- [ ] Conferir dispositivo, build, cena, perfil, escala e numero de ciclos do autoajuste em cada
  JSON; rejeitar amostras de carregamento, aba em segundo plano ou cena errada (referencia: Lab
  219 `CONTEXT.md` e Lab 225 `qualityProfile.ts`).
- [ ] Comparar FPS medio/p5/p1, tempo de quadro p95, draw calls, meshes ativos, camera/render,
  render targets, fisica e tempo de GPU quando disponivel. Identificar uma familia de custo com
  evidencia em pelo menos duas amostras do mesmo aparelho/cena (referencia: backlog 193).
- [ ] Escolher e descrever uma unica otimizacao pequena para o proximo lab, com baseline, roteiro
  antes/depois e criterio de qualidade visual (referencia: Lab 225 `CONTEXT.md`).

## Como coletar

1. Abra o jogo publicado em `https://app-two-flax-92.vercel.app` no aparelho real. Se o HUD ainda
   nao mostrar `perfil economy` ou `perfil full`, feche todas as abas/PWA do jogo e abra de novo.
   Anote o `build` do HUD; as amostras de baseline devem ter o mesmo build.
2. Em cada cena, espere o carregamento terminar e jogue por cerca de 15 segundos antes de medir,
   para o autoajuste ter tempo de executar. Deixe o aparelho na mesma orientacao e no mesmo modo
   de energia durante todas as medicoes; evite alternar de aplicativo enquanto mede.
3. Abra o painel de FPS e toque em `Medir 15 s`. Para a Terra, comece no ponto de nascimento e
   mova camera/avatar normalmente. Repita o mesmo caminho na segunda medicao. Depois repita no
   centro de jogos e em Marte (ou informe qual planeta secundario foi usado).
4. Toque em `Copiar JSON` e envie o texto ou o arquivo baixado caso a copia falhe. Comece com as
   duas amostras da Terra em cada aparelho; as outras cenas completam a matriz depois.
5. Nao inclua nome da crianca, conta, endereco ou outros dados pessoais no envio. O JSON de FPS
   ja inclui somente metadados tecnicos do dispositivo e da cena.

## Criterios de leitura

- Duas amostras por aparelho/cena; mesma versao e percurso parecido antes de comparar resultados.
- `qualityProfile.gpuTierSource` deve ser `benchmark` em producao; registrar se `gpuTier` e
  `hardwareScalingLevel` diferirem entre amostras do mesmo aparelho.
- `gpuFrameTimeMs = 0` significa medicao GPU indisponivel, nao custo zero. Os contadores de
  camera/render/render targets podem se sobrepor; nao somar como se fossem fatias independentes.
- Uma melhora so sera afirmada apos comparacao antes/depois no mesmo aparelho e cena. Amostras do
  Edge ou Android Emulator servem para verificar comportamento, nao para estimar FPS fisico.

## Fora de escopo

- Alterar perfil, resolucao, sombras ou densidade sem baseline Android fisico.
- Coletar telemetria automaticamente ou enviar dados da crianca ao backend.
- Marcar o backlog 191 como concluido com apenas amostras desktop/emuladas.
