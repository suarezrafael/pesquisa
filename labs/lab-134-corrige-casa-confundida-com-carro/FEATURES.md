# Laboratório 134 — Correção: casa confundida com carro (dica idêntica + perto da rua)

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: 51760bfc59fc8b3265de2b51bcaf5a991e737205

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
  ~1,2-1,8 antes); interação funciona corretamente numa chamada atômica (teleporte + E juntos, sem
  lacuna de tempo real) — entra no interior da casa (`(150, 10.6, 148.7)`) exatamente como esperado.
  Sem erro de console em nenhum momento.
- **Deploy**: fix aplicado localmente; deploy manual pendente até o usuário confirmar (ver próxima
  mensagem da conversa).
