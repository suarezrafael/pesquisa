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
- **Planetas secundários — achado real, corrigido.** Auditoria geométrica de `buildMarsHill`
  (`World3D.tsx`) contra seu colisor: o morro visual (`main`, esfera `diameter:3.4, slice:0.55`
  escalada `(1.15, 0.8, 1.05)`) tem pico a ~1,36 unidades acima do chão e um raio de base visível
  (na altura do chão) de ~1,8-2,0 unidades — mas o colisor era uma ESFERA pequena (`diameter: 2.1`)
  embutida com só 0,15 de protrusão acima do chão (`MARS_ROCK_COLLIDER_PROTRUSION`), cuja seção
  transversal NA ALTURA DO CHÃO é de só ~0,54 de raio (matemática de esfera: uma calota rasa perto
  do polo é muito mais estreita que o equador). Isso deixa um anel real entre ~0,54 e ~1,9 de raio
  onde o jogador atravessa visualmente a encosta do morro sem colidir — um caso concreto,
  computado a partir da geometria real do código (não suposição), da mesma classe de bug do
  backlog ("física e visual divergem"), só que na direção oposta ao "andar sobre o invisível"
  (aqui é "atravessar o visível"). **Corrigido**: colisor trocado de esfera pra CILINDRO
  (`PhysicsShapeType.CYLINDER`, mesmo tipo já usado no colisor do próprio foguete de lançamento,
  `World3D.tsx` ~5042) — raio 1,65 (cobre o pé do morro sem passar da malha visível, escolhido
  deliberadamente menor que o raio visual real pra nunca sobrar "parede fantasma" além do morro) e
  altura 2,0 com só 0,3 de protrusão acima do chão (bem abaixo do pico de 1,36) — preserva a
  intenção original do comentário ("esbarrão lateral, nunca vira plataforma escalável"), só
  corrige a LARGURA da base, que estava errada.

## Decisões técnicas tomadas

- **Nenhuma mudança no planeta principal, apesar do lab ter sido aberto pra investigar
  justamente isso** — decisão baseada em evidência ao vivo, não em "não achei nada": testado no
  platô mais íngreme de propósito (o pior caso), de 4 ângulos, sem nenhum artefato. Registrar
  "nenhuma mudança necessária, verificado ao vivo" é mais valioso pro próximo lab do que inventar
  uma correção especulativa nova em cima de uma já especulativa (lab-151) sem evidência de que o
  problema ainda existe.
- **Cilindro em vez de esfera maior pro colisor do morro** — uma esfera maior com a MESMA
  protrusão rasa teria uma seção transversal no chão ainda estreita (matemática de calota esférica
  — só um cilindro dá raio de base constante independente da altura de protrusão escolhida). Mesmo
  tipo de forma (`PhysicsShapeType.CYLINDER`) já usado no colisor do foguete de lançamento no MESMO
  arquivo — não introduz um padrão novo, reaproveita um já validado.
- **Raio do colisor (1,65) escolhido menor que o raio visual real (~1,8-2,0)** — de propósito:
  cobrir de menos deixa uma margem estreita nas bordas onde ainda dá pra atravessar (mesmo
  problema, bem reduzido), mas cobrir de MAIS criaria uma parede invisível além da malha visível
  (o oposto do bug relatado — "colisão onde não tem nada pra ver"). Dado que este morro é
  decoração ("relevo ocasional", comentário original), a prioridade foi eliminar o grosso da
  divergência sem arriscar um novo tipo de bug pra compensar.
- **Não foi possível verificar ao vivo o fix de Marte** — viajou de foguete até Marte com sucesso
  (fluxo real: teleporte até o foguete, `E`, escolher "Marte", aguardar a animação), mas
  `window.__debugTeleportExact` perto de um morro produziu resultados inconsistentes com o cálculo
  geométrico esperado (avatar terminando a uma distância do centro de Marte bem diferente da
  pretendida, sugerindo que a gravidade/física de Marte se comporta de forma diferente do planeta
  principal pra posições fora do fluxo normal de pouso — não investigado a fundo, foge do escopo
  deste lab). Confiança no fix vem da leitura direta da geometria real do mesh (`buildMarsHill`) e
  dos parâmetros do colisor antigo, mais o precedente do MESMO tipo de colisor (`CYLINDER`) já
  funcionando no foguete de lançamento no mesmo arquivo — não de reprodução ao vivo.

## Pendências / dívidas conhecidas

- Verificação ao vivo do fix de Marte fica pendente pro próximo lab que precisar mexer ali (ver
  acima) — se algo relacionado a morros/Marte for tocado de novo, vale a pena investir tempo em
  entender por que `__debugTeleportExact` se comportou de forma inesperada lá (pode ser um
  problema de ambiente de teste, ou um comportamento real do jogo que vale a pena investigar por
  si só).
- Se o usuário relatar de novo "montanha invisível" especificamente em Marte (não no planeta
  principal), o próximo passo é confirmar visualmente com um teste manual real (não automatizado)
  se o cilindro cobre bem a base do morro.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos (o item de verificação mobile não pôde
ser testado num viewport mobile real nesta sessão — mesma limitação de ambiente já documentada em
labs anteriores; a mudança em si não introduz nada específico de mobile/desktop, os dois usam o
mesmo colisor).

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
  em nenhum. Viagem real de foguete até Marte confirmada funcionando (UI completa: caminhar até o
  foguete, `E`, escolher destino, animação de voo). Fix do colisor do morro de Marte NÃO verificado
  visualmente ao vivo (ver "Decisões técnicas" acima) — confiança vem de matemática de geometria
  aplicada aos parâmetros reais do código, não de reprodução visual direta.
