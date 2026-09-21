# Contexto - Laboratorio 219 - Captura de performance mobile

Preenchido em: 2026-09-21
Commit inicial: e9ee81c5b7eafd748afa55b4cabf4e3f9f696b3a

## O que foi feito

- A instrumentacao de performance existente ficou acessivel pelo painel de FPS, com uma amostra
  local de 15 segundos e relatorio JSON copiavel.
- O relatorio identifica automaticamente build, cena, dispositivo, viewport e implementacao
  WebGL, alem das metricas Babylon que ja existiam.
- A coleta continua permitindo movimento e camera, para medir uma sessao jogavel em vez de uma
  cena parada.
- O HUD deixou de ler draw calls antes da renderizacao e agora mostra o ultimo quadro concluido.
- O layout foi ajustado no Android emulado para nao disputar espaco com giro/recentralizacao da
  camera; mensagens completas permanecem em `aria-live` sem criar outra linha visual.

## Baseline Android emulado

Perfil: Android Emulator 15, 2 processadores expostos, 2 GB de memoria exposta pelo Chrome,
720x1600 fisico (viewport CSS 412x811), ANGLE/OpenGL ES 3.0, cena Terra.

| Metrica | Resultado |
| --- | ---: |
| Duracao / quadros | 15.108 ms / 227 |
| FPS medio | 15,07 |
| FPS p5 / p1 | 9,36 / 7,56 |
| Draw calls medio / maximo | 2.315 / 2.388 |
| Meshes ativos medio / maximo | 297 / 333 |
| Camera render | 45,59 ms |
| Active meshes evaluation | 9,14 ms |
| Render | 7,19 ms |
| Render targets | 3,81 ms |
| Fisica | 0,56 ms |

O emulador nao substitui Redmi Pad 2/Poco C75: CPU e GPU sao virtualizadas e
`gpuFrameTimeMs` nao esta disponivel. Ainda assim, ele revelou dois sinais estruturais fortes:
camera/render domina o quadro e mais de 2,3 mil draw calls chegam ao pipeline, enquanto fisica e
particulas nao sao o gargalo principal nessa cena.

## Decisoes tecnicas

- Nao enviar diagnostico para analytics/backend: o testador controla coleta e compartilhamento.
- Nao aplicar otimizacao grande no mesmo lab de medicao.
- Manter o backlog 191 parcial ate existirem amostras em aparelhos fisicos; o lab remove a barreira
  operacional para coleta nesses aparelhos.
- Tratar a classificacao `gpuTier=strong` do benchmark inicial com cautela: o mesmo perfil mediu
  15 FPS em gameplay e recebeu apenas auto-tune de resolucao. O proximo lab deve usar o baseline
  de runtime para atacar draw calls/camera render e revisar a classificacao de qualidade.

## Proximo laboratorio recomendado

Lab 220 - reduzir draw calls de um grupo repetido de props com instances/thin instances, mantendo
colisao, sombra e equivalencia visual, e comparar a mesma amostra antes/depois. A primeira fatia
deve mirar arvores/rochas decorativas sem interacao; escolas, NPCs e objetos dinamicos ficam fora.

Pergunta tecnica respondida: "o FPS baixo desta cena vem principalmente de fisica?" Nao no
emulador: fisica ficou em 0,56 ms, contra 45,59 ms de camera render e 2.315 draw calls medios.

## Pendencias

- Coletar os mesmos 15 segundos na Terra, loja, casa, Marte e planeta secundario em Redmi Pad 2,
  Poco C75 e ao menos um Android intermediario.
- Registrar os JSONs e comparar o lab 220 com o mesmo aparelho/cena/caminho.
