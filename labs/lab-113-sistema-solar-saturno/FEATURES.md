# Laboratório 113 — Sistema Solar: Saturno

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
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
- [x] `SATURN_RADIUS`/`SATURN_CENTER`/`SATURN_LANDING_UP` + entrada em `DESTINATION_PLANETS`.
- [x] `buildSaturnIfNeeded()`: esfera com textura de faixas (paleta pálida/dourada), ANEL
      (`CreateTorus` achatado, translúcido), 8 moedas escondidas, foguete de volta.
- [x] `buildPlanetIfNeeded` ganha o `case 'saturno'`.
- [x] Verificação ao vivo (dev server + browser automation, com a correção de `keysDown['e']`
      travado do lab-112 já aplicada — funcionou de primeira desta vez): seletor mostra os 5
      destinos; viagem completa pra Saturno confirmada por inspeção direta da cena (avatar a
      ~17,55 unidades do centro, batendo com `SATURN_RADIUS + AVATAR_RADIUS`; chão, anel e 8
      moedas presentes). Geometria do anel conferida por medição direta da bounding box
      (`getBoundingInfo`) — disco fino de ~55 unidades de diâmetro, centrado no planeta, visível e
      habilitado; confirma matematicamente `diameter=SATURN_RADIUS*2.7 + thickness=SATURN_RADIUS*0.55
      = 55.25`, batendo com o valor medido. O screenshot ao vivo não mostrou o anel claramente
      (câmera perto do polo de pouso, anel no equador fica fora do ângulo de visão nessa posição —
      geometria/física real, não um bug), então a confirmação definitiva veio da medição direta,
      não só do olho. Sem erro de console.

## Fora de escopo (explicitamente adiado)
- Urano, Netuno — próximo (e último) laboratório desta frente.
- Qualquer divisão visível nos anéis (ex.: Divisão de Cassini) — anel único e uniforme nesta
  primeira passada.
