# Laboratório 113 — Sistema Solar: Saturno

Status: em andamento
Início: 2026-08-29
Fim: -
Commit inicial: f0136c27c724584f90c9f12d9a417b7b8eeeb880

## Objetivo do laboratório
Continuação da frente "Sistema Solar" (labs 110-112) — quarto planeta novo, segundo gigante
gasoso. Reaproveita a técnica de faixas horizontais do lab-112 (Júpiter), mas precisa de uma
feature nova: OS ANÉIS — a característica mais reconhecível de Saturno, e de qualquer planeta do
sistema solar isoladamente.

## Investigado antes de planejar
- `labs/lab-112-sistema-solar-jupiter/CONTEXT.md`: já antecipava a técnica pros anéis —
  `MeshBuilder.CreateTorus` bem achatado no eixo Y (`scaling.y` pequeno), mesma primitiva já usada
  no anel sonoro de combate de Marte (lab-62), só numa escala bem maior e sem animação de pulso.
- `DynamicTexture` de faixas (lab-112) é diretamente reaproveitável, só trocando a paleta de cores
  (Saturno é mais pálido/dourado, menos contraste que Júpiter).
- Saturno na vida real é um pouco menor que Júpiter (raio ~9,4 vs. ~11,2 raios terrestres) — mantém
  a ordem real: `SATURN_RADIUS` um pouco menor que `JUPITER_RADIUS`.

## Decisões técnicas tomadas
- **Anel como um único `CreateTorus` achatado**, centrado no planeta, no plano equatorial (eixo Y
  do `saturnRoot`, mesmo eixo do pouso do foguete) — decorativo, sem física (não é pisável),
  `backFaceCulling = false` + `alpha` um pouco abaixo de 1 (leve transparência, sugere gelo/poeira
  em vez de um anel sólido opaco).
- **Faixas mais pálidas/douradas que Júpiter** (paleta de cor diferente na mesma técnica de
  `DynamicTexture`) — reforça que são dois planetas diferentes, não o mesmo gigante gasoso
  reskinado.
- **Sem rocha/cratera/Mancha** (igual Júpiter) — sem superfície sólida de verdade, sem combate.
- **Raio um pouco menor que Júpiter** (`SATURN_RADIUS` < `JUPITER_RADIUS`) — mantém a ordem real de
  tamanho dos dois maiores planetas do sistema solar.
- **Quinto ponto no espaço** — mais um centro diagonal, distante o bastante do planeta principal e
  dos outros 4 planetas-destino já existentes.

## Funcionalidades planejadas
- [ ] `SATURN_RADIUS`/`SATURN_CENTER`/`SATURN_LANDING_UP` + entrada em `DESTINATION_PLANETS`.
- [ ] `buildSaturnIfNeeded()`: esfera com textura de faixas (paleta pálida/dourada), ANEL
      (`CreateTorus` achatado, translúcido), moedas escondidas, foguete de volta.
- [ ] `buildPlanetIfNeeded` ganha o `case 'saturno'`.
- [ ] Verificação ao vivo: seletor mostra os 5 destinos; viagem completa pra Saturno (faixas e
      anel visíveis, moedas contam pro HUD); Marte/Mercúrio/Vênus/Júpiter continuam funcionando
      sem regressão.

## Fora de escopo (explicitamente adiado)
- Urano, Netuno — próximo (e último) laboratório desta frente.
- Qualquer divisão visível nos anéis (ex.: Divisão de Cassini) — anel único e uniforme nesta
  primeira passada.
