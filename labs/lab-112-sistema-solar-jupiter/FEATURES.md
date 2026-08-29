# Laboratório 112 — Sistema Solar: Júpiter

Status: em andamento
Início: 2026-08-29
Fim: -
Commit inicial: 1ec902598fba4c0c11cfa652889b1fa044e243ff

## Objetivo do laboratório
Continuação da frente "Sistema Solar" (labs 110-111: arquitetura genérica + Mercúrio + Vênus) —
terceiro planeta novo, primeiro GIGANTE GASOSO. Mesmo escopo já confirmado com o usuário (moedas
escondidas, sem combate), mas precisa de uma técnica visual nova: faixas horizontais coloridas
(a característica mais reconhecível de Júpiter de verdade), nunca usada ainda pra textura de
planeta neste projeto.

## Investigado antes de planejar
- `DynamicTexture` já é usado no projeto (chama do foguete, gota de chuva) — confirma a API
  disponível (`getContext()` devolve um contexto de canvas 2D de verdade, `update()` sobe pra GPU)
  pra desenhar as faixas horizontais de Júpiter proceduralmente, sem precisar de nenhum arquivo de
  imagem externo (mantém o padrão do projeto: tudo primitivas/procedural, nunca textura de
  arquivo pra planeta).
- UV padrão de `MeshBuilder.CreateSphere`: V (0 a 1) corresponde a latitude (polo a polo), U (0 a
  1) à longitude — uma textura com faixas HORIZONTAIS (variando só em V, constante em U) aparece
  como faixas ao redor da esfera inteira, exatamente o efeito de Júpiter — confirmado por
  documentação/uso já existente do Babylon neste projeto, sem precisar de UV customizado.
- Júpiter na vida real não tem superfície sólida (é gás até o núcleo) — mesma simplificação já
  aceita pro resto do jogo (o boneco anda em cima de qualquer planeta, incluindo Marte/Mercúrio/
  Vênus, sempre com uma esfera física por baixo): aqui a esfera COM a textura de faixas já É a
  "superfície" jogável, sem precisar de uma segunda casca de atmosfera como em Vênus.
- Maior planeta do sistema solar de verdade — raio bem maior que o planeta principal (ao contrário
  de Mercúrio/Marte/Vênus, todos menores), reforça a escala real sem precisar ser literalmente
  proporcional (Júpiter real tem ~11x o diâmetro da Terra, impraticável pro jogo).

## Decisões técnicas tomadas
- **Faixas via `DynamicTexture` procedural** (canvas 2D: `fillRect` de listras horizontais em tons
  de laranja/bege/marrom, larguras variadas) aplicada como `albedoTexture` — decisão confirma que a
  técnica funciona antes de reaproveitar pra Saturno/Urano/Netuno nos próximos laboratórios.
- **Grande Mancha Vermelha** — um decalque oval avermelhado fixo (mesma técnica de disco raso já
  usada nas crateras de Mercúrio) num ponto fixo da esfera, não aleatório — é a feature mais
  reconhecível de Júpiter isoladamente, vale a pena garantir que sempre apareça no mesmo lugar
  (não fica escondida pelo acaso de uma distribuição aleatória).
- **Sem rocha/cratera nenhuma** — Júpiter não tem superfície sólida de verdade, só a textura de
  faixas + a Mancha; reforça o contraste com os planetas rochosos (Mercúrio/Vênus/Marte).
- **Raio bem maior que o planeta principal** (`JUPITER_RADIUS = 20` vs. planeta principal = 13) —
  maior planeta do sistema solar de verdade, precisa "sentir" maior que a Terra do jogo, não só
  maior que os outros planetas-destino.
- **Centro num quarto ponto do espaço**, diagonal (não mais um eixo puro X/Y/Z como os três
  primeiros planetas — já não há eixo "livre" óbvio sobrando, e não precisa haver: só importa a
  distância até o planeta principal, nunca entre dois planetas-destino).

## Funcionalidades planejadas
- [ ] `JUPITER_RADIUS`/`JUPITER_CENTER`/`JUPITER_LANDING_UP` + entrada em `DESTINATION_PLANETS`.
- [ ] `buildJupiterIfNeeded()`: esfera com textura de faixas horizontais proceduralmente gerada
      (`DynamicTexture`), decalque da Grande Mancha Vermelha, moedas escondidas, foguete de volta.
- [ ] `buildPlanetIfNeeded` ganha o `case 'jupiter'`.
- [ ] Verificação ao vivo: seletor mostra os 4 destinos; viagem completa pra Júpiter (faixas
      visíveis, Mancha Vermelha visível, moedas contam pro HUD); Marte/Mercúrio/Vênus continuam
      funcionando sem regressão.

## Fora de escopo (explicitamente adiado)
- Saturno (com anéis), Urano, Netuno — próximos laboratórios desta mesma frente.
- Qualquer animação de rotação/turbulência nas faixas — decorativo estático nesta primeira passada.
