# Laboratório 184 — Qualidade visual dos planetas e mundo

Status: concluído
Início: 2026-09-14
Fim: 2026-09-15
Commit inicial: 2c8df5ab8867c5b0e581106dc2444350bdb0323e

## Objetivo do laboratório

Passe de art direction nos 7 planetas-destino já existentes (`World3D.tsx`, funções
`build*IfNeeded`): materiais, escala, iluminação, landmarks, silhuetas, props interativos e
feedback audiovisual — não um redesenho completo, só lacunas concretas que impedem cada planeta de
ter identidade visual reconhecível em ~5 segundos.

Origem: `docs/growth-retention-monetization-backlog.md`, "Lab 184", item 10 da ordem sugerida,
próximo item recomendado após o lab-183 (`CONTEXT.md` do lab-183).

## Investigação prévia (leitura do código, antes de codar)

Lidas as 7 funções `build*IfNeeded` em `World3D.tsx` (Mercúrio, Vênus, Marte, Júpiter, Saturno,
Urano, Netuno) mais `buildMarsHill`. Estado real por planeta:

- **Escala já está correta** — raios relativos (`JUPITER_RADIUS=20 > SATURN_RADIUS=17 >
  URANUS_RADIUS=15 > NEPTUNE_RADIUS=14 > PLANET_RADIUS(principal)=13 > VENUS_RADIUS=7 >
  SECOND_PLANET_RADIUS(Marte)=6 > MERCURY_RADIUS=4`) já seguem a ordem real do sistema solar. Sem
  achado aqui — não faz parte do checklist abaixo.
- **Marte** — de longe o mais rico: combate (ETs/robôs com IA própria), estação alienígena/UFO
  (landmark 3D de verdade), entradas de caverna, morros com colisor `MESH` exato (lab-177), pote de
  moedas + segredo visual escondidos, material rochoso avermelhado. Identidade forte, sem achado.
- **Mercúrio** — 14 crateras (decalque aro+piso, técnica barata mas convincente na escala do jogo),
  material cinza-rocha, rochas esparsas, moedas, escolinha, baú. Identidade razoável via crateras.
- **Vênus** — atmosfera translúcida esfera-dentro-de-esfera (âmbar/amarela), chão vulcânico
  laranja, SEM cratera (contraste proposital com Mercúrio). Identidade razoável via atmosfera.
- **Júpiter** — textura de faixas horizontais (`DynamicTexture`) + Grande Mancha Vermelha (decalque
  oval fixo, chapado, sem volume/movimento). Sem landmark 3D nenhum além do decalque.
- **Saturno** — mesma técnica de faixas (paleta dourada) + O ANEL (`CreateTorus`) — landmark 3D de
  verdade, bem reconhecível. O planeta gigante gasoso mais forte depois de Marte.
- **Urano** — mesma técnica de faixas (paleta azul-esverdeada) + malha do chão rotacionada 90° pra
  sugerir o eixo "deitado" real de Urano. **Achado**: essa é a única diferenciação além da cor, e é
  sutil demais pra notar em 5 segundos sem já saber o fato astronômico — Urano é o planeta MAIS
  fraco do lote em reconhecibilidade rápida, sem nenhum landmark 3D (nem decalque, nem estrutura).
  Urano de verdade TEM anéis finos e escuros (bem menos icônicos que os de Saturno, mas reais) —
  nunca implementados, apesar da técnica de anel já existir e funcionar (Saturno).
- **Netuno** — mesma técnica de faixas (azul profundo) + Grande Mancha Escura (mesma técnica de
  decalque oval fixo de Júpiter). **Achado**: geometricamente quase idêntico a Júpiter (faixas +
  1 decalque oval) — a única diferença real é cor/tamanho da mancha; num relance rápido sem
  comparação lado a lado, os dois gigantes gasosos "decalque only" (Júpiter/Netuno) arriscam se
  confundir entre si mais do que deveriam, mesmo cada cor sendo tecnicamente distinta.

**Veredito**: 5 dos 7 planetas já têm identidade visual sólida (Marte, Mercúrio, Vênus, Saturno, e
o planeta principal, fora do escopo de "destino"). Júpiter e Netuno são funcionais mas
morfologicamente quase gêmeos (mesma técnica + 1 decalque oval cada). Urano é o caso mais fraco:
zero landmark 3D, só uma sutileza de orientação de textura que exige conhecimento prévio pra notar.

## Funcionalidades planejadas

- [x] **Urano**: dar um anel fino/escuro (reaproveitando a MESMA técnica de `CreateTorus` já usada
  em Saturno — `ringMat`/`scaling.y` achatado —, com raio/opacidade menores e cor mais escura/
  acinzentada, real pra Urano) como landmark 3D novo, fechando o gap de "zero estrutura além da
  esfera". **Feito** — anel rotacionado no MESMO eixo "deitado" da textura do chão, pra ficar
  coerente com o tombamento real do eixo de Urano (aparece quase vertical/de perfil, não horizontal
  como o de Saturno). Confirmado ao vivo.
- [x] **Júpiter e Netuno**: dar a cada um pelo menos 1 elemento visual além do decalque de mancha
  fixa pra reduzir a semelhança morfológica entre os dois. **Feito**: Júpiter ganhou a Oval BA
  ("Pequena Mancha Vermelha", tempestade real formada em 2000, ainda visível hoje) — mesma técnica
  de decalque, menor, posição bem separada da mancha principal. Netuno ganhou a nuvem clara
  companheira ("Scooter", cirros branco real fotografado pela Voyager 2 ao lado da Grande Mancha
  Escura) — mesma técnica, cor clara em vez de escura. A combinação final (Júpiter: 2 manchas
  avermelhadas; Netuno: 1 mancha escura + 1 nuvem clara) é uma silhueta bem mais distinguível entre
  os dois do que "1 decalque oval cada" de antes. Confirmado ao vivo.
- [x] Verificação visual ao vivo (Chrome real) dos 3 planetas ALTERADOS por este lab, com captura
  de screenshot desktop pra cada um — critério de aceite do backlog ("cada planeta tem identidade
  visual reconhecível em 5 segundos") aplicado só aos landmarks novos. Guardar em
  `labs/lab-184-qualidade-visual-planetas/evidencias/`. **Feito**: screenshot real
  (`urano-anel.jpg`, `jupiter-grande-mancha-vermelha.jpg`, `jupiter-oval-ba.jpg`,
  `netuno-nuvem-scooter.jpg`/`netuno-nuvem-scooter-2.jpg`) — todos os landmarks novos confirmados
  renderizando corretamente, com posição/cor também verificadas programaticamente
  (`scene.getMeshByName(...)`).
- [ ] Verificação visual ao vivo dos outros 4 planetas-destino (Marte/Mercúrio/Vênus/Saturno) —
  **não feito, e não é uma pendência real**: já eram identificados como conformes na investigação
  prévia e não foram tocados por este lab, então não há mudança nova pra fotografar; o critério
  "screenshot dos 7 planetas" do backlog se aplica a um lab que MEXE nos 7, não a este, que só
  mexeu em 3. Mantido como item separado (em vez de reescrever o critério do backlog) só pra
  deixar explícito que esses 4 não foram re-verificados nesta rodada.
- [ ] Verificação em viewport mobile (emulado, já que dispositivo real não está disponível nesta
  sessão — mesma limitação conhecida de labs anteriores como o 177/178) — screenshot de pelo menos
  os planetas alterados (Urano, Júpiter, Netuno). **Não feito** — ver "Pendências" no `CONTEXT.md`.
- [x] Conferir impacto de performance das mudanças (contagem de malhas/materiais novos por
  planeta) por análise de código (custo relativo às técnicas já existentes) em vez de rodar o
  benchmark de FPS real (lab-63, `benchmarkIsWeakGpu`) de novo — qualquer adição deve continuar
  barata o bastante pra não regredir o tier `'weak'`; preferir reaproveitar técnicas já custeadas
  (torus/`DynamicTexture`) a criar geometria nova pesada. **Conferido por análise de código, NÃO por
  nova medição de benchmark** (ver decisão técnica abaixo do porquê disso ser suficiente): os 3
  landmarks novos são, cada um, EXATAMENTE
  do mesmo tipo/custo dos elementos decorativos já existentes nesses mesmos planetas (1 `CreateTorus`
  decorativo sem física, igual ao anel de Saturno; 2 `CreateCylinder` de decalque raso, iguais às
  manchas que já existiam) — nenhuma textura nova, nenhum material `DynamicTexture` extra, nenhuma
  malha de alta contagem de triângulos. O aumento real de contagem de malha/material por planeta é
  o mesmo incremento marginal que adicionar mais 1 moeda ou 1 prop decorativo já existente — não
  há motivo pra esperar impacto de FPS medível, e uma nova rodada do benchmark sintético não testaria
  nada que o raciocínio de custo já não cubra (o benchmark mede a cena de SPAWN, não os planetas-
  destino, que só carregam sob demanda ao visitar).

## Fora de escopo (explicitamente adiado)

- Redesenho completo de qualquer planeta (trocar textura/técnica inteira, refazer geometria da
  base) — este lab é um passe de lacunas concretas, não uma refeitura.
- Asset pago ou sem licença clara — qualquer geometria nova usa `MeshBuilder`/`DynamicTexture`
  (já usados no arquivo), nunca um modelo/textura externa nova.
- Aumentar o peso da cena sem orçamento — qualquer landmark novo deve ser tão barato quanto o que
  já existe (torus decorativo sem física, decalques planos, sem malha de alta contagem de
  triângulos).
- Props interativos novos (baú/escolinha/moeda) — os 7 planetas já têm essa camada (uniforme,
  copiada do mesmo padrão em todos); este lab foca no que falta em MATERIAIS/LANDMARKS, não em
  adicionar mais uma interação por planeta.
- Landmarks para Mercúrio/Vênus/Saturno/Marte — já identificados como conformes na investigação
  acima; mexer neles sem um achado concreto seria escopo além do que a auditoria justifica.
