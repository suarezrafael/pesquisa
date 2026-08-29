# Laboratório 114 — Sistema Solar: Urano + Netuno (fecha a frente)

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: bec9fd20505a663a7b346fba01482fd3b8dfec76

## Objetivo do laboratório
Último laboratório da frente "Sistema Solar" (labs 110-113) — os dois gigantes de gelo, feitos
juntos por serem incrementos pequenos sobre o padrão já estabelecido (esfera + faixas + moedas +
foguete, sem rocha/cratera/combate). Com isso, os 8 planetas reais do sistema solar (Mercúrio,
Vênus, Terra=planeta principal, Marte, Júpiter, Saturno, Urano, Netuno) estarão completos no jogo.

## Investigado antes de planejar
- Reaproveita a técnica de faixas (`DynamicTexture`) dos labs 112-113, só trocando paleta de cor —
  Urano azul-esverdeado pálido, Netuno azul profundo.
- **Urano de verdade gira "deitado"** — eixo de rotação inclinado ~98° (quase paralelo à órbita,
  ao contrário de todos os outros planetas, que giram "em pé"). Decisão: rotacionar a MALHA da
  esfera-chão 90° (`rotationQuaternion`, não o `landingUp` — o foguete continua pousando num ponto
  qualquer da esfera física, que é uma esfera perfeita independente de rotação visual) faz as
  faixas (que variam por latitude/V da textura) aparecerem VERTICAIS no ponto de pouso em vez de
  horizontais — um jeito simples de dar um toque visual reconhecível sem reescrever a técnica de
  textura.
- **Netuno tem uma "Grande Mancha Escura"** (tempestade, análoga à Mancha Vermelha de Júpiter,
  porém escura/azul-marinho) — mesma técnica de decalque fixo já usada em Júpiter (lab-112).
- Netuno e Urano são bem parecidos em tamanho na vida real (Netuno levemente menor) — ambos bem
  menores que Saturno/Júpiter, mas ainda maiores que o planeta principal.

## Decisões técnicas tomadas
- **Urano: faixas rotacionadas 90° na malha** (não no `landingUp`) — único ajuste visual
  diferenciador desta dupla, reflete a característica real mais marcante de Urano sem precisar de
  geometria nova.
- **Netuno: Grande Mancha Escura**, decalque fixo azul-marinho — mesma técnica/posicionamento fixo
  já usado na Mancha Vermelha de Júpiter.
- **Sem rocha/cratera/combate em nenhum dos dois** — mesma decisão de todos os gigantes gasosos/de
  gelo desta frente.
- **Raio um pouco menor que Saturno**, os dois próximos um do outro (`URANUS_RADIUS = 15`,
  `NEPTUNE_RADIUS = 14`) — mantém a ordem real (os gigantes de gelo são menores que os gasosos).
- **Sexto e sétimo pontos no espaço**, diagonais, distantes de tudo que já existe.

## Funcionalidades planejadas
- [x] `URANUS_RADIUS`/`URANUS_CENTER`/`URANUS_LANDING_UP` + `NEPTUNE_RADIUS`/`NEPTUNE_CENTER`/
      `NEPTUNE_LANDING_UP` + as duas entradas em `DESTINATION_PLANETS`.
- [x] `buildUranusIfNeeded()`: esfera com faixas azul-esverdeadas PÁLIDAS, malha rotacionada 90°
      (faixas verticais no pouso), 7 moedas escondidas, foguete de volta.
- [x] `buildNeptuneIfNeeded()`: esfera com faixas azul PROFUNDO, Grande Mancha Escura (decalque
      fixo), 7 moedas escondidas, foguete de volta.
- [x] `buildPlanetIfNeeded` ganha os `case 'urano'`/`case 'netuno'`.
- [x] Verificação ao vivo (dev server + browser automation): seletor mostra os 7 destinos
      corretamente (quebra em 3 linhas de grade). Urano: viagem de IDA E VOLTA completa
      confirmada (ida: avatar a ~15,55 unidades do centro, batendo com raio+avatar; rotação da
      malha do chão confirmada via `rotationQuaternion` = exatamente
      `RotationAxis(Vector3.Right(), π/2)`, provando a inclinação de 90° aplicada; volta:
      avatar de volta a ~13,45 unidades da origem, no planeta principal). Netuno: viagem de ida
      confirmada (chão, Grande Mancha Escura e 7 moedas presentes) e visualmente por screenshot
      (azul profundo nítido, foguete de volta e dica funcionando). Sem erro de console em nenhuma
      etapa. **Com isso, os 8 planetas reais do sistema solar estão completos no jogo** — frente
      "Sistema Solar" (labs 110-114) encerrada.

## Fora de escopo (explicitamente adiado)
- Qualquer planeta anão (Plutão etc.) — fora do escopo original do pedido ("todos os planetas do
  sistema solar" — Plutão não é mais classificado como planeta desde 2006).
- Luas, cinturão de asteroides — não pedidos.
