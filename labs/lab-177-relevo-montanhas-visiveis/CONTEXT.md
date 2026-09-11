# Contexto — Laboratório 177 — Relevo e montanhas visíveis

Preenchido em: 2026-09-11
Commit inicial → final: 2317efb68a8a19525385afddad57b38aab30b341..HEAD (ver `git log` na branch
`lab-177-relevo-montanhas-visiveis`)

## O que foi feito

- **Planeta principal — reverificado ao vivo, confirmado limpo (pendência do lab-151 finalmente
  fechada).** Calculada a inclinação de cada um dos 12 `PLATEAU_CENTERS` pela mesma fórmula do
  comentário do lab-151 (`1,5 × altura ÷ (raio_angular × PLANET_RADIUS)`); o platô mais íngreme
  hoje é o índice 11 (`dir ≈ (0,509, -0,276, -0,815)`, inclinação ≈ 0,666, dentro da faixa
  "0,64-0,67" que o lab-151 esperava alcançar). Teleportado (`window.__debugTeleport`) direto pro
  centro desse platô num navegador real (Chrome, `npm run dev` local) e inspecionado de 4 ângulos
  de câmera diferentes (visão de cima, angulada lateral, grazing quase horizontal, e afastada) —
  em NENHUM ângulo apareceu qualquer culling, triângulo transparente ou malha faltando na rampa.
  A cúpula/platô renderiza sólida e sombreada corretamente em todos os testes. **Conclusão: a
  redução especulativa de altura do lab-151 funcionou (ou o defeito original era mesmo específico
  de GPU/driver do usuário e não reproduz neste ambiente) — nenhuma mudança de código foi
  necessária no planeta principal.**
- **Planetas secundários — achado real, corrigido (e corrigido de novo na 1ª rodada de review,
  ver abaixo).** Auditoria geométrica de `buildMarsHill` (`World3D.tsx`) contra seu colisor: o
  morro visual (`main`, esfera `diameter:3.4, slice:0.55` escalada `(1.15, 0.8, 1.05)`) tem pico a
  ~1,36 unidades acima do chão e um raio de base visível (na altura do chão) de ~1,8-2,0 unidades
  — mas o colisor era uma ESFERA pequena (`diameter: 2.1`) embutida com só 0,15 de protrusão acima
  do chão (`MARS_ROCK_COLLIDER_PROTRUSION`), cuja seção transversal NA ALTURA DO CHÃO é de só
  ~0,54 de raio (matemática de esfera: uma calota rasa perto do polo é muito mais estreita que o
  equador). Isso deixa um anel real entre ~0,54 e ~1,9 de raio onde o jogador atravessa
  visualmente a encosta do morro sem colidir — um caso concreto, computado a partir da geometria
  real do código (não suposição), da mesma classe de bug do backlog ("física e visual divergem"),
  só que na direção oposta ao "andar sobre o invisível" (aqui é "atravessar o visível").
  **Tentativa 1 (revertida)**: colisor trocado de esfera pra CILINDRO (raio 1,65, altura 2,0,
  protrusão 0,3). **Correção final, depois do achado real da 1ª rodada de review** (ver seção
  própria abaixo): um `PhysicsAggregate` do tipo `MESH` diretamente nas malhas visuais do morro
  (`main` + `shoulder`) — cobre a silhueta real por construção, sem nenhuma aproximação primitiva
  errar pra um lado ou pro outro.

## Decisões técnicas tomadas

- **Nenhuma mudança no planeta principal, apesar do lab ter sido aberto pra investigar
  justamente isso** — decisão baseada em evidência ao vivo, não em "não achei nada": testado no
  platô mais íngreme de propósito (o pior caso), de 4 ângulos, sem nenhum artefato. Registrar
  "nenhuma mudança necessária, verificado ao vivo" é mais valioso pro próximo lab do que inventar
  uma correção especulativa nova em cima de uma já especulativa (lab-151) sem evidência de que o
  problema ainda existe.
- **Colisor `MESH` nas próprias malhas visuais do morro, não uma forma primitiva aproximada** —
  a primeira tentativa (cilindro largo e baixo) parecia razoável mas tinha dois problemas reais
  achados pelo review automático do Copilot (ver seção própria abaixo): um cilindro sempre tem
  TOPO PLANO (climável, já que o avatar pula bem mais alto que a protrusão escolhida) e nunca cobre
  perfeitamente uma silhueta assimétrica (o `shoulder` do morro, deslocado do centro). Qualquer
  forma primitiva (esfera, cilindro, cápsula) erra pra um lado — estreita demais ou larga com um
  topo/geometria que não existe na malha visual de verdade. Um colisor `MESH` direto nas malhas
  reais (`main` + `shoulder`) resolve os dois problemas ao mesmo tempo, por construção — mesmo
  padrão já usado pro planeta principal (`PhysicsAggregate(planet, PhysicsShapeType.MESH, ...)`).
  Custo desprezível (só 4 morros no total, malhas de baixa poligonagem — 12 segmentos).
- **Não foi possível verificar ao vivo o fix de Marte, em NENHUMA das duas tentativas** — viajou
  de foguete até Marte com sucesso pelo menos uma vez (fluxo real: teleporte até o foguete, `E`,
  escolher "Marte", aguardar a animação), mas `window.__debugTeleportExact` perto de um morro
  produziu resultados inconsistentes com o cálculo geométrico esperado (avatar terminando a uma
  distância do centro de Marte bem diferente da pretendida). Na 2ª tentativa (depois do fix de
  `MESH`), o clique em "Viajar" no menu do foguete não pareceu completar a viagem de verdade (o
  avatar continuou próximo do raio do planeta PRINCIPAL mesmo depois de esperar), e rótulos de GUI
  vinculados a objetos de Marte (`linkWithMesh`) apareceram na tela mesmo assim — achado incidental
  interessante: como todo o jogo roda numa ÚNICA `Scene` do Babylon (planeta principal e Marte só
  ficam fisicamente longe um do outro no mesmo espaço, não são cenas separadas), rótulos de GUI
  vinculados a mesh não têm corte por distância — projetam na tela sempre que o mesh vinculado está
  na direção da câmera, mesmo a dezenas de unidades de distância, o que pode confundir quem está
  tentando confirmar "cheguei no planeta certo?" só pelo que aparece na tela. Não investigado a
  fundo (foge do escopo deste lab) — documentado aqui caso ajude o próximo lab que mexer em Marte
  ou em texto de GUI vinculado a mesh. Confiança no fix final vem da leitura direta da geometria
  real do mesh (`buildMarsHill`) e do mesmo padrão `PhysicsShapeType.MESH` já usado (e funcionando)
  pro planeta principal — não de reprodução ao vivo.

Primeira rodada do review automático do Copilot no PR #52 trouxe 3 achados reais corrigidos e 1
achado de documentação (este próprio arquivo):

- **O cilindro colisor (tentativa 1) tinha um topo plano contínuo, escalável** — o avatar pula
  ~1,2 unidade, bem mais que os 0,3 de protrusão escolhidos; ele conseguia subir no topo do
  cilindro e caminhar por cima/dentro da cúpula visual, recriando a MESMA classe de bug do
  backlog (plataforma invisível), só que desta vez coberta pela malha do morro em vez de destacada
  dela. Corrigido trocando a abordagem inteira por colisor `MESH` (ver "Decisões técnicas" acima).
- **O cilindro também não cobria o `shoulder`** (sub-malha do morro deslocada em
  `(1.1, -0.35, 0.6)`, alcançando ~2,05 de raio no chão, além do alcance do cilindro de 1,65) —
  resolvido junto pela mesma troca pra `MESH` (cobre `main` E `shoulder`, cada um com seu próprio
  `PhysicsAggregate`).
- **Erro de concordância gramatical** num comentário (`"do que ALTA"` → `"do que alta"`) —
  corrigido.
- **Screenshot de verificação citado mas não incluído/linkado** — o `CONTEXT.md` original
  afirmava ter tirado screenshots de verificação (critério de aceite explícito do backlog,
  `FEATURES.md`), mas nenhuma imagem foi de fato salva/commitada. Corrigido: capturado de novo
  (mesmo platô, mesmo teste) com a imagem salva em disco desta vez, e commitada em
  `labs/lab-177-relevo-montanhas-visiveis/evidencias/planeta-principal-plato-11.jpg` (ver seção
  final).

Verificação desta rodada: `npx tsc -b`/`npm run test` (app, 178/178, inalterado) e `npm run build`
limpos. Nova verificação ao vivo pro planeta principal (screenshot real desta vez, ver abaixo);
Marte continua sem verificação visual direta (ver "Decisões técnicas").

## Pendências / dívidas conhecidas

- Verificação ao vivo do fix de Marte fica pendente pro próximo lab que precisar mexer ali (ver
  acima) — se algo relacionado a morros/Marte for tocado de novo, vale a pena investir tempo em
  entender por que `__debugTeleportExact` se comportou de forma inesperada lá (pode ser um
  problema de ambiente de teste, ou um comportamento real do jogo que vale a pena investigar por
  si só).
- Se o usuário relatar de novo "montanha invisível" especificamente em Marte (não no planeta
  principal), o próximo passo é confirmar visualmente com um teste manual real (não automatizado)
  se o colisor `MESH` (`main` + `shoulder`, implementação final — NÃO o cilindro da tentativa 1,
  revertido) cobre bem a base do morro.

## Funcionalidades planejadas que NÃO foram concluídas

**Verificação visual num viewport mobile real, especificamente em qualidade `isLowEndDevice`
(baixa)** — achado real do review automático do Copilot na 3ª rodada do PR #52: a versão anterior
deste documento declarava "nenhuma pendência" e ao mesmo tempo admitia que o mobile não tinha sido
testado, uma contradição real. O critério de aceite do backlog é explícito ("mobile low quality
ainda mostra leitura mínima do relevo") e não foi verificado de fato nesta sessão — só CONFIRMADO
POR LEITURA DE CÓDIGO que `isLowEndDevice` não desliga a malha de terreno nem o `PhysicsAggregate`
em nenhum branch (reduz só contagem de props/rochas decorativas e tamanho de shadow map), o que dá
confiança razoável mas não é o mesmo que ver a tela de verdade. **Achado real da 4ª/5ª rodada do
mesmo review**: mesmo documentando a limitação, `FEATURES.md`/`labs/CURRENT.md` ainda declaravam
o laboratório "concluído" sem qualificar esse critério específico como pendente — corrigido
desmarcando o item correspondente em `FEATURES.md` (`[ ]`, não `[x]`). Investigado se dava pra
fazer a verificação de qualquer jeito nesta sessão: `isLowEndDevice` é detectado só por regex de
`navigator.userAgent` (`World3D.tsx` ~2326), e as ferramentas de automação de navegador
disponíveis (`mcp__claude-in-chrome__*`) não expõem override de user agent nem emulação de
dispositivo — só `resize_window` (muda viewport, não `navigator.userAgent`) — então não existe um
jeito VÁLIDO de forçar esse branch nesta sessão sem gambiarra (e uma gambiarra tipo sobrescrever
`navigator.userAgent` via `Object.defineProperty` depois que a página já carregou não serviria,
já que `isLowEndDevice` é um `const` avaliado uma vez só na montagem da cena, antes de qualquer
JS injetado depois ter chance de rodar). Fica como pendência real pro próximo lab que tocar
terreno/qualidade mobile, ou pra uma sessão futura com acesso a um dispositivo/emulador de
verdade (ou a uma ferramenta de automação com suporte a emulação de dispositivo).

## O que o próximo laboratório deve desenvolver

Seguindo a ordem recomendada por `docs/growth-retention-monetization-backlog.md` (seção 12):

1. **Lab 178 — Câmera Roblox-like fácil** (P0): orbit por mouse/touch, zoom, recentralizar,
   sensibilidade padrão, modo mobile com dedo direito pra câmera e esquerdo pra movimento.
2. Considerar o **Lab 185 — Medição de coortes** antes dos labs 179+ se faltar evento pra provar
   os labs seguintes.

## Estado do repositório ao final

- Branch: `lab-177-relevo-montanhas-visiveis`.
- `npx tsc -b`/`npm run test` (app): limpo, 178/178 (inalterado — mudança é só geometria de
  colisor 3D, sem lógica de domínio isolável). `npm run build`: limpo, sem regressão de bundle.
- Nenhuma mudança em `server-accounts`/`server-cf-relay` — lab inteiro é client-side (Babylon/3D).
- **Verificado ao vivo, num navegador real** (Chrome via automação, `npm run dev` local, perfil de
  teste já existente no ambiente): planeta principal confirmado limpo no platô mais íngreme
  (índice 11 de `PLATEAU_CENTERS`) de 4 ângulos de câmera diferentes — sem culling/malha faltando
  em nenhum. Screenshot real salvo em
  `labs/lab-177-relevo-montanhas-visiveis/evidencias/planeta-principal-plato-11.jpg` (ângulo
  grazing quase horizontal, o mais propenso a expor culling/normal degenerada segundo a hipótese
  histórica do bug — mostra a cúpula do platô renderizada sólida, sombreada, sem nenhum artefato).
  Viagem real de foguete até Marte confirmada funcionando pelo menos uma vez (UI completa: caminhar
  até o foguete, `E`, escolher destino, animação de voo). Fix do colisor do morro de Marte NÃO
  verificado visualmente ao vivo em nenhuma das duas tentativas (ver "Decisões técnicas" acima) —
  confiança vem de matemática de geometria aplicada aos parâmetros reais do código, mais o mesmo
  padrão `PhysicsShapeType.MESH` já em uso comprovado pro planeta principal, não de reprodução
  visual direta.
- **PR #52 teve 6 rodadas de review automático do Copilot**: rodada 1 com 2 achados reais
  (cilindro escalável + screenshot ausente, ver "Decisões técnicas" acima) e 1 nit gramatical;
  rodada 2 com 1 achado real (PR description/`labs/CURRENT.md` desatualizados, ainda descrevendo
  o cilindro abandonado); rodada 3 com 1 achado real (autocontradição no próprio `CONTEXT.md`);
  rodada 4 com 0 achados novos (veredito não-verde repetindo pendência já disclosed, sem ação);
  rodada 5 com 1 achado real (`FEATURES.md`/`labs/CURRENT.md` marcavam item mobile como concluído
  apesar do próprio `CONTEXT.md` admitir o contrário); rodada 6 com 0 achados novos, só repetindo
  as duas pendências já documentadas (Marte e mobile) — tratada como não-acionável e o PR seguiu
  pra merge.
- **Confirma deploy em produção**: PR #52 mergeado (commit `616269f`), CI/CD verde nos 3 workers
  (`app`, `server-accounts`, `server-cf-relay` — nenhum dos dois últimos tem mudança real neste
  lab, client-side puro), app respondendo 200 em `app-two-flax-92.vercel.app`.
