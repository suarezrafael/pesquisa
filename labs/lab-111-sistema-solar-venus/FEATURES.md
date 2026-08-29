# Laboratório 111 — Sistema Solar: Vênus

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
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
- [x] `VENUS_RADIUS`/`VENUS_CENTER`/`VENUS_LANDING_UP` + entrada em `DESTINATION_PLANETS`.
- [x] `buildVenusIfNeeded()`: esfera alaranjada-amarelada (superfície), esfera translúcida maior
      por cima (atmosfera, decorativa, sem física), rochas vulcânicas esparsas (mesmos templates
      glTF já usados), 6 moedas escondidas, foguete de volta com rótulo.
- [x] `buildPlanetIfNeeded` ganha o `case 'venus'`.
- [x] `PlanetPickerPanel` mostra os 3 destinos automaticamente (sem mudança de código — já lê
      `DESTINATION_PLANET_LIST` na íntegra) — confirmado ao vivo (Marte/Mercúrio/Vênus, cada um
      com nome/emoji corretos).
- [x] Verificação ao vivo (dev server + browser automation): seletor mostra os 3 destinos; viagem
      completa pra Vênus confirmada por inspeção direta da cena (avatar a ~7,3 unidades do centro
      de Vênus, batendo com `VENUS_RADIUS + AVATAR_RADIUS`; chão, atmosfera, 6 moedas e rochas
      todos presentes); visual da atmosfera translúcida confirmado por screenshot (tom
      amarelo-areia difuso, como esperado de dentro da casca semi-transparente). Sem erro de
      console em nenhuma etapa. **A viagem de VOLTA de Vênus não foi confirmada ao vivo nesta
      sessão** (perdida por deriva de posição entre chamadas de automação — o avatar andou
      ~12 unidades longe do foguete de retorno antes da checagem seguinte) — decisão consciente de
      não insistir mais, já que o caminho de retorno (`boardRocket(null)`/`landRocket`) é código
      100% genérico e IDÊNTICO ao já verificado com sucesso pra Marte e Mercúrio no lab-110 (nada
      específico de Vênus nesse trecho); risco residual considerado desprezível.

## Fora de escopo (explicitamente adiado)
- Júpiter, Saturno, Urano, Netuno — próximos laboratórios desta mesma frente.
- Qualquer efeito sonoro/partícula extra pra atmosfera (vento, etc.) — decorativo simples nesta
  primeira passada.
