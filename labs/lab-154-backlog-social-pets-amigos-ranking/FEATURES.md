# Laboratório 154 — Backlog social: pets, amigos, ranking, séries

Status: concluído (planejamento — nenhum código, ver "Objetivo")
Início: 2026-09-07
Fim: 2026-09-07
Commit inicial: 8a49c05e01d4a0968c04fad18064051c06f18eb2

## Objetivo do laboratório

Pedido do usuário: "montar um lab de backlog" pra pets, lista de amigos, busca por nickname, status
online/último acesso, convites, ver avatar/conquistas de amigo, ranking da semana, ofensiva e
"séries" (Bronze/Prata/Ouro/Diamante). Este laboratório NÃO implementa tudo isso — é o
planejamento pedido explicitamente: mapear o que já existe, o que cada item exige de verdade, e
que decisão o usuário precisa tomar antes de qualquer código, porque metade da lista esbarra numa
mudança de arquitetura grande (ver "Achado central" abaixo), não é ajuste pontual.

Contexto do pedido, pra não perder: o usuário também esclareceu o que entende por "problema que o
produto resolve" — não é só diversão+aprendizado, é os PAIS conseguirem saber se/quanto o filho usa
o jogo. Isso já existe parcialmente (`loadLastPlayedAt`/telemetria anônima de `product_events`),
mas não é um painel de uso pro responsável — fica registrado como item relacionado, fora desta
lista (o usuário não pediu ele agora, mas é candidato a lab futuro se confirmado como prioridade).

## Achado central (antes de detalhar cada item)

A lista tem dois grupos com exigências MUITO diferentes:

- **Grupo A — dá pra construir na arquitetura de hoje** (perfil local, sem conta pra quem não
  assina): pets, séries (Bronze/Prata/Ouro/Diamante), e a maior parte da UI de conquistas/avatar
  JÁ existem localmente — só falta expor.
- **Grupo B — exige uma identidade de jogador PERSISTENTE E BUSCÁVEL pra TODO MUNDO, não só
  assinante** (lista de amigos, busca por nickname, status online/último acesso, convite): hoje
  `generateNickname()`/o apelido digitado é só local (`Profile.name`, guardado por perfil no
  `localStorage` do próprio aparelho), nunca sai do aparelho, nunca é único, e o jogo inteiro é
  desenhado deliberadamente pra "a criança nunca cria conta" (`CLAUDE.md`, `docs/prompts/
  01-seguranca.md`). "Buscar amigo por nickname" e "ver se está online agora" exigem um diretório
  de jogadores do lado do servidor — algo que HOJE não existe pra ninguém que não seja família
  assinante (e mesmo assinante só tem conta pro RESPONSÁVEL, nunca pra criança). Isso é uma
  mudança de arquitetura real, com implicação de segurança infantil (um diretório buscável de
  apelidos é uma superfície nova de risco — mais sensível que o catálogo de chat fechado já
  existente), não um recurso pontual.

**Recomendação**: construir o Grupo A primeiro (rápido, sem decisão de arquitetura pendente) em
laboratórios pequenos e independentes; tratar o Grupo B como UM projeto à parte que precisa de
decisão explícita do usuário sobre a mudança de identidade de jogador antes de qualquer linha de
código (ver "Perguntas em aberto pro usuário").

## Detalhamento por item

### 1. Sistema de pets (Grupo A)
- **Hoje**: gatos (`__perchedCats`) existem só como decoração estática espalhada pelo planeta —
  não são adotáveis, não têm dono, não evoluem.
- **O que falta**: adotar (provavelmente com moeda, reaproveitando a economia já existente),
  alimentar/cuidar, crescer por estágios visuais, seguir o jogador. Reaproveita os modelos de gato
  já existentes — não precisa de arte nova.
- **Achado da pesquisa de mercado desta sessão**: é o gancho de maior alavancagem encontrado
  (o core loop do Adopt Me!, o "Roblox" mais parecido em faixa etária).
- **Escopo**: laboratório próprio de tamanho médio — schema novo em `Progress` (algo como
  `adoptedPets: {id, stage, lastFedAt}[]`), UI de cuidado, integração com a economia de moedas.

### 2. Séries: Bronze / Prata / Ouro / Diamante (Grupo A)
- **Hoje**: `Progress.loginStreak` (lab-138) e `Progress.currentStreak` (combo de acertos,
  lab-132) já existem e já são números reais guardados por perfil — só falta uma CAMADA de
  apresentação em cima (definir os limiares de cada série, um emblema/cor por série, mostrar no
  HUD/perfil).
- **Decisão que falta**: qual métrica vira "série" — só a sequência de login, só o combo de
  acertos, ou uma combinação/pontuação própria (ex.: XP acumulado na semana)? Precisa de uma
  escolha do usuário antes de definir os limiares de cada nível.
- **Escopo**: laboratório PEQUENO — é essencialmente dado que já existe + UI nova, sem mudança de
  arquitetura.

### 3. Ranking da semana (parcialmente Grupo A, parcialmente Grupo B)
- **Hoje**: `RankingPanel` já existe, mas mostra só quem está CONECTADO NESTE MOMENTO no relay
  global (`app/server-cf-relay`), sem histórico nenhum entre sessões — não é "da semana", é "agora".
- **Duas versões possíveis**:
  - **Local/família** (Grupo A): ranking só entre os PERFIS deste mesmo aparelho (irmãos, lab-108)
    somando XP ganho na semana — dá pra fazer sem backend nenhum, comparando `Progress` dos
    perfis já salvos localmente.
  - **Global de verdade** (Grupo B): ranking entre TODOS os jogadores do jogo, com histórico
    persistente — exige um backend novo (guardar XP/data por jogador, com QUE identidade?) e cai
    direto no mesmo problema de identidade do Grupo B.
- **Escopo**: a versão local é um laboratório pequeno; a versão global depende da decisão de
  identidade do Grupo B.

### 4. Lista de amigos, busca por nickname, status online/último acesso, convites, ver avatar/
   conquistas de um amigo (Grupo B — tudo junto, porque um depende do outro)
- **Hoje**: nada disso existe. Nickname é só local, não único, não buscável; não existe conceito de
  "outro jogador" além de quem está conectado NESTE INSTANTE no relay (sem nome de conta, sem
  histórico).
- **O que exige de verdade**: uma identidade de jogador persistente e única (algo como um "código
  de jogador" ou nickname único registrado num backend), um serviço de presença (quem está online
  agora e quando foi a última vez — precisa de um servidor guardando isso, o relay atual não
  guarda nada em disco), uma tabela de relacionamento (convite pendente/aceito), e uma tela de
  perfil público limitada (avatar + conquistas, nada de dado pessoal) pra ver o de um amigo.
- **Risco de segurança infantil a desenhar ANTES de codar** (não é bloqueio técnico, é decisão de
  produto+segurança, mesma categoria de G13/G15 já tratados nesta sessão): um diretório de
  jogadores buscável por nickname é uma superfície nova onde um estranho pode tentar "achar" uma
  criança específica — precisa de salvaguarda (ex.: só aceitar amigo por CÓDIGO trocado fora do
  jogo, tipo o código de pareamento de família, não busca livre por nome), e decidir se
  isso precisa do mesmo tipo de consentimento parental do lab-152 (G13 já cobriu "multiplayer
  geral"; "lista de amigos com estranhos que a criança escolhe adicionar" pode ser uma categoria
  de risco DIFERENTE, que vale reavaliar).
- **Escopo**: não é um laboratório — é um mini-projeto (identidade de jogador + presença + convites
  + perfil público), várias semanas de trabalho num ritmo de labs pequenos. Não deve começar sem
  as perguntas abaixo respondidas.

## Perguntas em aberto pro usuário (Grupo B)

1. Você está de acordo em criar uma identidade de jogador BUSCÁVEL pra toda criança que joga (não
   só famílias assinantes), saindo do modelo atual "a criança nunca cria conta"? Isso é a mudança
   de arquitetura que sustenta lista de amigos/busca por nick/status online.
2. Se sim: amigo se adiciona por busca livre de nickname, ou por um código trocado fora do jogo
   (mais seguro, mesmo padrão do pareamento de família)?
3. Isso precisa de um novo tipo de consentimento parental (como o portão do lab-152, mas
   específico pra "adicionar estranhos que a criança escolheu"), ou o portão de multiplayer já
   existente cobre esse caso pra você?

## Fora de escopo (explicitamente adiado)

- Qualquer implementação de código — este laboratório é só o mapeamento do backlog.
- Painel de uso pros pais (mencionado pelo usuário como parte do "problema" que o jogo resolve) —
  candidato a laboratório próprio futuro, não pedido explicitamente ainda.
