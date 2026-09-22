# Laboratorio 219 - Captura de performance mobile

Status: concluido
Inicio: 2026-09-21
Fim: 2026-09-21
Commit inicial: e9ee81c5b7eafd748afa55b4cabf4e3f9f696b3a
PR: #103

## Problema / hipotese

O backlog de auditoria de FPS continua parcial porque `window.__perf.sample(15000)` exige DevTools
remoto para coletar o relatorio em Android. Se a mesma instrumentacao puder ser acionada e copiada
pelo HUD existente, sera possivel obter amostras comparaveis em Redmi Pad 2, Poco C75 e outros
aparelhos sem instalar ferramentas de desenvolvimento neles.

## Usuario beneficiado

- Crianca em aparelho modesto, indiretamente, por orientar a proxima otimizacao correta.
- Responsavel/testador que precisa registrar uma medicao no aparelho real.

## Escopo

- Reaproveitar a instrumentacao existente, sem criar outro overlay ou outro loop continuo.
- Iniciar uma amostra de 15 segundos pelo painel de FPS.
- Identificar build, cena, horario, viewport, tela, DPR, CPU/RAM expostas pelo navegador e WebGL.
- Manter o jogo interativo durante a janela para medir movimento e camera reais.
- Copiar o relatorio JSON por acao explicita, com download local como fallback.
- Corrigir o contador resumido do HUD para mostrar draw calls do ultimo quadro concluido, em vez
  de ler o contador ainda zerado antes da renderizacao.

## Fora de escopo

- Enviar diagnostico a servidor ou analytics.
- Tratar emulador como benchmark equivalente a hardware fisico.
- Aplicar thin instances, octree, LOD ou reducao visual antes de comparar as cenas.

## Criterios de aceite

- O painel expandido oferece `Medir 15 s` sem bloquear movimento/camera.
- So existe uma amostra ativa por vez e o botao mostra o estado em andamento.
- O JSON inclui a cena e o dispositivo junto das metricas ja existentes.
- O valor de draw calls do HUD deixa de mostrar zero falso e permanece coerente com a amostra.
- Copia funciona em HTTPS; quando bloqueada, um arquivo JSON e baixado localmente.
- Nenhum dado e enviado pela rede e nao existe custo novo enquanto a medicao esta parada.
- TypeScript, testes, lint e build passam; fluxo e verificado no navegador e no emulador Android.

## Metricas esperadas

- Baseline de FPS medio/p5/p1, draw calls, meshes ativos e tempos por subsistema por cena.
- 100% das amostras identificadas por build, cena e perfil do dispositivo.
- Decisao do proximo lab baseada no gargalo dominante, nao em hipotese sem medicao.

## Riscos

- A instrumentacao adiciona pequeno custo apenas durante os 15 segundos amostrados.
- GPU virtual do emulador pode distorcer FPS e `gpuFrameTimeMs`; resultado deve ser rotulado como
  emulador e nao substitui Redmi/Poco fisicos.
- Clipboard pode ser bloqueado por navegador/WebView; download local e o fallback.

## Prioridade

P0, conclusao operacional do backlog 191 antes da otimizacao de draw calls do backlog 193.

## Implementacao entregue

- O painel de FPS ganhou `Medir 15 s` e `Copiar JSON`, sem bloquear joystick, camera ou gameplay.
- A amostra inclui build, cena, horario, viewport/tela/DPR, processadores/RAM expostos pelo
  navegador e renderer/vendor/versao WebGL.
- Clipboard bloqueado cai para download local; nenhum relatorio e enviado pela rede.
- O status usa o proprio rotulo dos botoes e `aria-live` oculto, sem ocupar uma terceira linha no
  HUD mobile.
- O contador resumido do HUD agora le draw calls do ultimo quadro concluido. No emulador, deixou
  de mostrar `0` falso e passou a exibir aproximadamente 2.485 chamadas.

## Verificacao

- `npx tsc -b --force`: limpo.
- `npm run test -- --run`: 266/266 testes.
- `npm run lint`: sem novo aviso; permanecem os 2 avisos preexistentes.
- `npm run build`: concluido.
- Edge: amostra completa, estado em andamento, JSON pronto e copia confirmada.
- Android Emulator 15, 720x1600: fluxo completo com movimento durante a janela, sem sobreposicao
  com os controles de camera e copia confirmada.
- Baseline do emulador/Terra (15,1 s): 15,07 FPS medio, p5 9,36, p1 7,56, 2.315 draw calls medios,
  297 meshes ativos, camera render 45,59 ms, active-mesh evaluation 9,14 ms e fisica 0,56 ms.
- Review do Copilot, rodada 1: dois achados reais corrigidos. Uma trava por `ref` impede reentrada
  por duplo-toque antes do state do React atualizar; o estado visual de copia agora e tipado e nao
  depende da pontuacao do texto anunciado por `aria-live`.
- Review do Copilot, rodada 2: confirmou os dois achados anteriores como resolvidos e encontrou o
  fallback de download desprotegido. Falhas de Blob/DOM agora preservam o handler e exibem feedback
  claro, com limpeza do link e da URL temporaria no `finally`.
