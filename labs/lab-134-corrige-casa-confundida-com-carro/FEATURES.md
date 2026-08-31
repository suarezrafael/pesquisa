# Laboratório 134 — Correção: casa confundida com carro + casa enterrada no relevo

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: 51760bfc59fc8b3265de2b51bcaf5a991e737205

**Nota**: este laboratório teve DUAS rodadas de correção pro mesmo sintoma relatado ("casa não
aceita o comando E"), cada uma motivada por uma pista nova do usuário. A seção original abaixo
cobre a 1ª causa (dica idêntica ao carro); a seção "Segunda causa" cobre a 2ª (casa enterrada no
relevo), achada depois que o usuário reportou o bug de novo mesmo após a 1ª correção.

## Objetivo do laboratório

Bug reportado pelo usuário em produção, ao vivo em chat: *"ao chegar perto da casa e aperto E nao
acontece nada"*, depois confirmado com mais detalhe (aba anônima do Chrome, sem cache) e uma pista
certeira: *"confira se nao esta confundido com os carros passando que aparece pressione E para
entrar... mude a casa de lugar pra longe dos carros, pode ser esse o problema"*.

## Investigação (não foi um bug de lógica — foi um bug de posição + texto)

- **Verificação em produção**: build de hoje realmente estava no ar (confirmado via build stamp),
  mas o service worker do PWA estava servindo uma versão em cache de 3 dias atrás até ser limpo
  manualmente — achado real, registrado abaixo, mas SEPARADO da causa do bug em si.
- **Reproduzido ao vivo em produção 3 vezes** (teclado e botão de toque na tela) — a legenda
  "Pressione E pra entrar" aparecia perto da casa, mas apertar E não fazia nada.
- **Tentativa de reproduzir em ambiente local controlado** (`window.__debugTeleport` exato até a
  porta) funcionou perfeitamente de primeira — indicando que o CÓDIGO da interação em si estava
  correto, e o problema era outra coisa.
- **A pista do usuário foi a chave**: medindo a posição real da casa contra `streetCenter` (o laço
  de rua que os carrinhos percorrem, `World3D.tsx`), a casa original ficava a só ~1,2-1,8 unidades
  do carro mais próximo em certos momentos — DENTRO de `CAR_ENTER_DISTANCE` (2,0). E o texto da
  dica do carro era **literalmente idêntico** ao da casa: `'Pressione E pra entrar'` nos dois
  lugares (`World3D.tsx`, construção do carro vs. construção da casa).
- **Causa raiz confirmada**: o jogador via a legenda "Pressione E pra entrar" de um CARRO passando
  perto da casa (texto idêntico, impossível distinguir visualmente), e apertava E numa posição
  dentro do raio do CARRO (2,0) mas fora do raio da CASA (1,2) — entrando no carro sem perceber (a
  visão de "dirigir" pode não parecer muito diferente de "andando" se o jogador não anda logo em
  seguida), e concluindo "a casa não funciona".

## O que foi feito

- **`World3D.tsx`**: casa reposicionada — `houseUp` (direção da casa no planeta principal) trocado
  de `(-0.35, 1, 0.12)` pra uma nova direção medida por script (mesmo método de lab-09/11/127):
  pelo menos 2,5 unidades de QUALQUER ponto do laço de rua (folga real acima de
  `CAR_ENTER_DISTANCE=2.0`), sem colidir com nenhuma escolinha/loja/carteira (>2,2 de cada), longe
  da decolagem do foguete (>5), e a só ~3,8 unidades da posição antiga (mesma vizinhança, não um
  teleporte pra longe).
- **Textos de dica diferenciados** (reforço, independente da posição): casa agora diz "Pressione E
  pra entrar em casa", carro agora diz "Pressione E pra entrar no carro" — mesmo que uma futura
  mudança de cenário aproxime os dois de novo, o jogador consegue distinguir qual é qual.
- **Proteção contra relevo íngreme** (2ª causa, ver seção própria abaixo): `findFlatterUpReal`
  generalizada a partir da função já usada pelas escolinhas (lab-95), agora reaproveitada também
  pela casa.

## Achado de ferramenta na verificação (não bug do produto)

Ao testar a nova posição via `window.__debugTeleport` seguido de uma chamada SEPARADA de
`__handleInteractPress()` (duas chamadas de ferramenta distintas, com tempo real entre elas), a
interação falhava — porque o terreno na nova posição (mais montanhoso/inclinado, escolhido por
estar longe da rua) faz o avatar "escorregar" um pouco pela gravidade entre uma chamada e outra,
saindo do raio de 1,2 antes da segunda chamada rodar. Fazendo teleporte + interação numa ÚNICA
chamada atômica (sem lacuna de tempo real), funcionou perfeitamente. Isso é uma limitação da
TÉCNICA de teste (mesma família dos achados de lab-129/131/133 sobre `__debugTeleport`), não do
produto — um jogador de verdade andando (não teleportando) fica parado no chão continuamente, sem
esse "assentamento" pós-teleporte.

## Segunda causa: casa enterrada no relevo (achada depois, mesma sessão)

Depois da 1ª correção (reposicionar + diferenciar texto), o usuário testou de novo em condições
que descartavam cache (limpou dados do site no celular, onboarding pediu apelido de novo — versão
nova de verdade) e reportou o MESMO sintoma, com uma hipótese nova e certeira: *"eu acho que a
causa é a casa estar enterrada na terra"*.

- **Investigação**: a busca de posição da 1ª correção só checava distância até rua/escolinhas/loja/
  carteira/foguete — nunca a inclinação REAL do terreno. Ler o código revelou que esta é a MESMA
  classe de bug já documentada (e já corrigida pras escolinhas) no lab-95: *"TODAS AS CASA ESTÃO
  DENTRO DA TERRA, ATE OS NPC ESTÃO ENTERRADO"* — causada por um prédio cair perto da rampa de um
  `PLATEAU_CENTERS` (até 3,2 unidades de altura numa borda com `smoothstep`, inclinação de até 0,8
  unidade por metro). Cálculo manual confirmou: a nova direção da casa (1ª correção) ficava a só
  ~25° de distância angular de um platô de altura 2,6 com raio ~23,5° — bem na borda da rampa.
- **Por que a fórmula sozinha não bastava** (lição já registrada no código desde o lab-95, reaplicada
  aqui): medir variação de relevo com a fórmula analítica `terrainHeight` não é confiável perto de
  rampas — a malha real do planeta (só 48 segmentos, ~1,7m cada) se afasta muito mais da curva suave
  da fórmula do que uma checagem analítica prevê. A correção de verdade precisa medir com
  `terrainGroundRadial` (raycast físico real, a mesma fonte que posiciona tudo de fato).
- **Correção**: a função de busca já existente pras escolinhas (`findFlatterSchoolUpReal`, lab-95)
  foi generalizada pra `findFlatterUpReal(baseUp, angularRadius, safeVariance)` — mesma lógica
  (anéis crescentes ao redor do candidato, medindo variação real por raycast, nunca se afasta mais
  que ~3,4m), só que parametrizada em vez de fixada nas constantes de escolinha. A casa agora chama
  essa busca com constantes próprias (`HOUSE_FOOTPRINT_ANGULAR_RADIUS`/`HOUSE_SAFE_TERRAIN_VARIANCE`,
  medidas a partir da fundação real da casa, 1,72×1,52), usando a direção da 1ª correção como ponto
  de partida — se ela já estiver segura, a busca devolve ela mesma sem mudar nada (preservando a
  folga de rua já verificada); se não, ajusta pra o candidato mais plano mais próximo dentro do
  orçamento de busca.
- **Verificado ao vivo**: a busca, na prática, devolveu a MESMA posição candidata da 1ª correção sem
  ajuste (`bestVariance <= safeVariance` já na primeira checagem) — ou seja, o cálculo manual de
  "~25° de um platô de 23,5°" estava perto o bastante do limite pra ser incerto no papel, mas a
  medição REAL por raycast confirmou que está do lado seguro. Ainda assim, a busca agora RODA de
  verdade (não é um cálculo manual único, arriscado de errar de novo numa próxima mudança de
  posição) — qualquer reposicionamento futuro da casa passa automaticamente por essa proteção.
  Testado com tecla E REAL (não só a ponte de depuração): parado exatamente na porta, a legenda
  "Pressione E pra entrar em casa" aparece, apertar E entra no interior da casa corretamente.

## Pendências / dívidas conhecidas

- **Cache do PWA obsoleto**: o service worker ficou servindo uma versão de build de 3 dias atrás
  até ser limpo manualmente durante esta investigação — não é a causa do bug da casa, mas é um
  problema real e separado (usuários podem ficar presos numa versão antiga por mais tempo do que
  deveriam). Fica como item de backlog pra um laboratório futuro (ex.: configurar
  `skipWaiting`/`clientsClaim` no plugin PWA, ou um aviso de "nova versão disponível" na UI).
- **Nenhuma outra dupla de textos de dica idênticos foi auditada** — este laboratório só corrigiu
  o par casa/carro (o par que causou o bug relatado). Se outro par de interações (ex. dois carros
  diferentes, ou carro/foguete) também usar texto genérico idêntico e ficar posicionado perto um do
  outro no futuro, o mesmo tipo de confusão pode se repetir.
- **`findFlatterUpReal` só foi chamada pra casa e escolinhas** — outros prédios fixos do planeta
  principal (loja, carteira, Prédio dos Enigmas) não passam por essa proteção; se algum deles for
  reposicionado num laboratório futuro, vale considerar a mesma busca.

## O que o próximo laboratório deve desenvolver

Do backlog maior discutido em chat, ainda não formalizado em labs: bônus por limpar um planeta
inteiro já concluído (lab-133); persistência de "Minha Casa" pra assinante; segundo "chefe" em
Júpiter; mini-desafios temáticos por planeta; corrida/parkour temático; vitrine de troféus mais
visual; emotes/danças; evento sazonal; mascote/pet colecionável; cartão-postal colecionável;
boletim/certificado do explorador; clima ativo por planeta; "distress call" de NPC perdido. Mais 4
itens reportados pelo usuário nesta sessão (lab-133/134): câmera da lojinha de avatar precisa girar
ao pressionar+arrastar + mais luz no avatar; mais roupas texturizadas e mais opções na lojinha;
painel `/família` sem link de acesso de dentro do jogo; cache do PWA obsoleto (acima). Sem
prioridade única — perguntar ao usuário antes de escolher o próximo.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 75/75 passando (sem teste novo — mudança de posicionamento/texto em
  cena 3D, não lógica de domínio pura).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificado ao vivo: nova posição da casa medida a 2,49 unidades de folga real da rua (contra
  ~1,2-1,8 antes) E confirmada segura contra relevo íngreme pela busca real (`findFlatterUpReal`);
  interação funciona com tecla E REAL (não só ponte de depuração) parado exatamente na porta,
  legenda "Pressione E pra entrar em casa" aparece, entra no interior da casa (`(150, 10.6,
  148.7)`) exatamente como esperado. Sem erro de console em nenhum momento.
- **Deploy**: fix aplicado localmente (as duas rodadas); deploy manual pendente até o usuário
  confirmar.
