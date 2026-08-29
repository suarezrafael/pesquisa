# Laboratório 111 — Sistema Solar: Vênus

Status: em andamento
Início: 2026-08-29
Fim: -
Commit inicial: 2f4968ba3a19dc67102f5f90dbdedf3e5f934099

## Objetivo do laboratório
Continuação direta do lab-110 (arquitetura genérica de planetas-destino + Mercúrio) — segundo
planeta novo da frente "Sistema Solar" pedida pelo usuário, seguindo a ordem real de distância ao
Sol (Mercúrio → Vênus → [Terra, já é o planeta principal] → Marte → gigantes gasosos). Mesmo
escopo confirmado antes (lab-110): moedas escondidas, sem combate/inimigo.

## Investigado antes de planejar
- `labs/lab-110-sistema-solar-selecao-de-planeta/CONTEXT.md`: arquitetura genérica já pronta
  (`DESTINATION_PLANETS`, `buildPlanetIfNeeded`, `returnRockets`) — adicionar um planeta novo é só
  registrar as constantes + escrever `buildVenusIfNeeded()` + um `case` no dispatcher, sem tocar
  em `boardRocket`/`landRocket`/no seletor.
- Característica visual real mais reconhecível de Vênus: atmosfera densa de nuvens de ácido
  sulfúrico, amarelo-esbranquiçada, tão espessa que esconde a superfície por completo vista de
  fora (diferente de Mercúrio, que não tem atmosfera nenhuma — contraste visual deliberado entre
  os dois primeiros planetas). Superfície por baixo: vulcânica, tom alaranjado-amarelado (a luz que
  passa pela atmosfera espessa tinge tudo de amarelo/laranja em fotos reais da superfície), MUITO
  poucas crateras visíveis (atividade vulcânica constante reafirma a superfície, ao contrário de
  Mercúrio) — decisão: Vênus NÃO tem cratera nenhuma, só rochas vulcânicas esparsas, pra reforçar
  o contraste com Mercúrio.
- Nenhuma técnica nova de engine necessária além de uma esfera translúcida extra (`alpha`,
  `backFaceCulling = false`) — já usado em outros materiais do projeto (ex.: reflexo da lagoa,
  `pondMat.alpha`), só nunca como uma "casca" de atmosfera ao redor de um planeta inteiro.

## Decisões técnicas tomadas
- **Vênus um pouco maior que Marte, menor que a Terra** (`VENUS_RADIUS = 7` vs. Marte=6,
  Mercúrio=4, Terra/planeta principal=13) — mantém a ordem de tamanho real dos planetas already
  estabelecida no lab-110 (Mercúrio < Marte < Vênus < Terra), mesmo a ordem de DISTÂNCIA ao sol ser
  diferente da ordem de tamanho (Vênus é o 2º mais perto do Sol mas maior que Marte, o 4º).
- **Sem cratera nenhuma** (ao contrário de Mercúrio) — reforça visualmente que são planetas
  diferentes, baseado na geologia real (vulcanismo constante apaga crateras em Vênus).
- **Atmosfera é só uma esfera translúcida decorativa**, sem colisão física, sem afetar
  luz/céu/skybox globais do jogo (que continuam compartilhados com todo o resto do mundo, mesma
  decisão já tomada para Marte no lab-59 — trocar isso globalmente exigiria salvar/restaurar
  estado ao entrar/sair de cada planeta, fora de escopo).
- **Centro num terceiro eixo** (`VENUS_CENTER = (0, 58, 0)`, eixo Y) — Marte usa Z, Mercúrio usa X;
  mantém os três planetas-destino mutuamente ortogonais no espaço, mesmo raciocínio do lab-110 (só
  importa a distância até o planeta principal, nunca a distância entre dois planetas-destino, já
  que não se voa direto de um pro outro).

## Funcionalidades planejadas
- [ ] `VENUS_RADIUS`/`VENUS_CENTER`/`VENUS_LANDING_UP` + entrada em `DESTINATION_PLANETS`.
- [ ] `buildVenusIfNeeded()`: esfera alaranjada-amarelada (superfície), esfera translúcida maior
      por cima (atmosfera, decorativa, sem física), rochas vulcânicas esparsas (mesmos templates
      glTF já usados), moedas escondidas, foguete de volta com rótulo.
- [ ] `buildPlanetIfNeeded` ganha o `case 'venus'`.
- [ ] `PlanetPickerPanel` mostra 3 destinos automaticamente (sem mudança de código — já lê
      `DESTINATION_PLANET_LIST` na íntegra).
- [ ] Verificação ao vivo: seletor mostra os 3 destinos; viagem completa pra Vênus (atmosfera
      visível, rochas, moedas contam pro HUD, foguete de volta funciona); Marte/Mercúrio continuam
      funcionando sem regressão.

## Fora de escopo (explicitamente adiado)
- Júpiter, Saturno, Urano, Netuno — próximos laboratórios desta mesma frente.
- Qualquer efeito sonoro/partícula extra pra atmosfera (vento, etc.) — decorativo simples nesta
  primeira passada.
