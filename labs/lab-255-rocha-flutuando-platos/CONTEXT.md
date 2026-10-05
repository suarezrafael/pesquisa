# Contexto — Laboratório 255 — Rocha decorativa flutuando nos platôs

Preenchido em: 2026-10-04
Commit inicial → final: 533cd3d12fab3519336702478990f49871705ada..(ver PR)

## O que foi feito

- `app/src/world3d/World3D.tsx`, laço `PLATEAU_CENTERS.forEach` que espalha rochas decorativas
  nas montanhas (lab-42, `mountainRock-{plateau}-{índice}`): antes de assentar cada rocha
  (`settleMeshOnTerrain`), a direção candidata agora passa por `findFlatterUpReal` — a mesma busca
  já usada pros prédios desde o lab-134 — com um raio angular calculado a partir da própria
  `scale` sorteada da rocha (`(scale * 0.55) / PLANET_RADIUS`) e um limite de variação segura
  (`MOUNTAIN_ROCK_SAFE_TERRAIN_VARIANCE = 0.35`).
- Nenhuma mudança em `settleMeshOnTerrain` em si, nem nas 3 correções anteriores (lab-95 culling,
  lab-124 two-sided lighting, lab-254 bounding info) — todas continuam corretas e ativas,
  confirmado ao vivo nesta sessão (ver "Como a causa foi encontrada").

## Como a causa foi encontrada

O usuário testou o deploy do lab-254 e reportou que o sintoma persistia, com instrução explícita
de parar de especular e testar ao vivo de verdade. `waitForVisible()` (`World3D.tsx`, ~linha 2179)
trava indefinidamente esperando `visibilitychange`, que nunca dispara no ambiente de automação —
causa raiz real do motivo de 3+ tentativas anteriores nesta sessão terem travado em "Carregando o
mundo 3D..." por minutos (não era throttling de timer, era esse gate específico). Bypassado
temporariamente só pra investigar (sempre revertido antes de qualquer commit).

Com o jogo carregando de verdade, foi feita uma varredura sistemática: raycast físico real
(`scene.pickWithRay`, usando a classe `Ray` obtida em runtime via
`camera.getForwardRay().constructor` — não há import de `@babylonjs/core` disponível no console)
contra o mesh `planet`, combinado com leitura de PIXEL real do canvas WebGL (não captura de tela —
`ctx.drawImage(glCanvas,0,0)` num canvas 2D auxiliar, técnica já documentada na memória da sessão
pra contornar `gl.readPixels` retornando transparente). Em ~2400 pontos varridos no terreno
`planet`/`mountainRock` em duas vistas diferentes perto do platô 0, nenhum pixel "sólido mas
invisível" foi encontrado — confirmando que as 3 correções anteriores (culling, two-sided
lighting, bounding info) estão corretas e ativas.

O usuário então mandou um SEGUNDO print, já em produção, apontando precisamente pra uma rocha
decorativa (o "capacete" marrom largo visto no print) flutuando com uma fresta de céu visível por
baixo, no mesmo platô (mesmos rótulos: "Hub de Jogos", "Parkour", "Ponte"). Localizada como
`mountainRock-0-3` (modelo `rock_largeA`, escala ~2,9). Medição com a mesma técnica de raycast
real, replicando EXATAMENTE a amostragem que `settleMeshOnTerrain` usa (9 buckets num grid 3×3 em
espaço tangente, pegando o vértice mais baixo de cada bucket): variação de ~1,23m entre o ground
real debaixo de cada uma das 9 amostras do footprint da própria rocha.

Causa raiz: `settleMeshOnTerrain` (~linha 5332) só ajusta a posição da rocha pelo MAIOR gap entre
os 9 pontos amostrados — ou seja, só garante que o ponto mais "flutuante" dos 9 encoste no chão.
Nunca verificou se o RESTO da silhueta (o capacete largo de `rock_largeA`/`rock_tallA`, que se
projeta bem além da base de apoio) também está sobre terreno próximo. Perto da borda de um platô,
onde a altura cai de forma acentuada dentro de poucos metros, isso deixa esse capacete pairando
sobre um trecho de chão bem mais baixo do que onde a base tocou — exatamente a fresta de céu do
print do usuário.

## Decisões técnicas tomadas

- **Reaproveitar `findFlatterUpReal` em vez de mudar `settleMeshOnTerrain`.** A função já existe,
  já foi desenhada explicitamente pra "qualquer prédio com footprint diferente" (comentário do
  lab-134) e já está em uso em 3 lugares (escolas, "Minha Casa", centro de jogos) com o mesmo
  padrão `FOOTPRINT_ANGULAR_RADIUS`/`SAFE_TERRAIN_VARIANCE`. Resolve a causa raiz de verdade
  (a ESCOLHA de posição, não o assentamento em si) sem arriscar quebrar `settleMeshOnTerrain`
  pra todos os outros tipos de prop que dependem dela.
- **Raio angular proporcional à `scale` de cada rocha, não uma constante fixa.** As rochas de
  montanha variam de escala (2,6 a 3,9×) por fórmula determinística — uma constante fixa ou
  sub-dimensionaria rochas grandes (não evitaria a borda) ou super-dimensionaria rochas pequenas
  (busca cara demais sem necessidade).
- **Não há garantia de variação zero — aceito o resultado parcial, medido.** `findFlatterUpReal`
  documenta explicitamente que sempre devolve "a melhor candidata achada, mesmo que nenhuma fique
  100% dentro do limite seguro" — não trava esperando um ponto perfeito. Medido ao vivo: a rocha
  testada (`mountainRock-0-3`) melhorou de 1,23m pra 0,72m de variação, e a fresta de céu visível
  no ângulo do print do usuário desapareceu (conferido com zoom na mesma vista). Não é zero, mas é
  uma melhora real, medida, não uma suposição.
- **Nenhuma rocha foi removida nem teve sua escala/raio de espalhamento (`radiusFrac`) alterados.**
  Cogitado como alternativa (reduzir o range de 0,15–0,58 do raio do platô, ou reduzir a escala
  máxima), mas descartado por ora: a correção via `findFlatterUpReal` já ataca a causa raiz sem
  precisar re-equilibrar esses parâmetros espalhados por todos os 12 platôs.

## Pendências / dívidas conhecidas

- **A variação da rocha testada não chegou a zero (0,72m, acima do `MOUNTAIN_ROCK_SAFE_TERRAIN_
  VARIANCE = 0,35` configurado)** — melhora real e visualmente confirmada no ângulo do print, mas
  não uma garantia matemática de que nenhuma rocha em nenhum dos 12 platôs ainda mostra alguma
  fresta menor. Se o usuário ainda notar alguma rocha flutuando depois do deploy (mesmo que menos
  perceptível que antes), os próximos ajustes a tentar, em ordem: (a) aumentar o número/raio dos
  anéis de busca em `findFlatterUpReal` só pra esta chamada (ela é compartilhada, então melhor
  adicionar um parâmetro opcional do que mudar o comportamento de escolas/prédios); (b) reduzir a
  escala máxima das rochas maiores; (c) reduzir o `radiusFrac` máximo (hoje chega perto de 0,69 do
  raio do platô, perto da borda).
- **Limitação de ambiente de automação (`waitForVisible` travando em aba sem foco) não resolvida,
  só contornada manualmente de novo** — mesma dívida já registrada no lab-254, não deste lab
  especificamente. Guia útil pra sessões futuras: usar `camera.getForwardRay().constructor`/
  `camera.position.constructor` pra obter as classes `Ray`/`Vector3` do Babylon em runtime (não há
  `BABYLON` global nem import direto disponível no console do navegador).
- Validação ao vivo do USUÁRIO (não só desta sessão) continua sendo o critério final — mesmo
  com raycast real confirmando a melhora, só o próximo print/relato do usuário confirma se o
  sintoma relatado por ele está resolvido na prática, no aparelho dele.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todas as marcadas em `FEATURES.md` foram concluídas (implementação + verificação ao
vivo + suíte completa). A única coisa que não foi (e não podia ser) concluída nesta sessão é a
confirmação do próprio usuário depois do deploy — ver "Pendências" acima.

## O que o próximo laboratório deve desenvolver

- Aguardar confirmação do usuário depois do deploy. Se a fresta ainda aparecer (mesmo que menor),
  seguir as opções (a)/(b)/(c) listadas em "Pendências" acima, nessa ordem — não inventar uma
  teoria nova sem antes tentar essas.
- Se o usuário confirmar resolvido, considerar fechar de vez a linha de investigação "morro
  invisível" (labs 95/124/151/254/255) no histórico do projeto.

## Estado do repositório ao final

- Branch: `lab-255-rocha-flutuando-platos`.
- Suite: 377/377 (37 arquivos, inalterada — mudança de posicionamento de prop decorativo, sem
  lógica de domínio nova pra testar). Lint: zero avisos. `tsc -b`: limpo. Build: TypeScript + Vite
  + PWA sem erro novo (mesmo aviso preexistente de chunk >500kB).
- Bypass temporário de teste (`waitForVisible` retornando cedo) usado só durante a investigação
  desta sessão e revertido antes de qualquer commit — `git diff --stat` confirma só
  `app/src/world3d/World3D.tsx` alterado, sem rastro do bypass.
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
