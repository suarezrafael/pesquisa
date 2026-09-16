# Laboratório 191 — Troca segura de nickname

Status: em andamento (PR convergida, aguardando confirmação de merge)
Início: 2026-09-16
Fim: -
Commit inicial: 11871b3ab94168282b08b7c097670b897576f40d

## Objetivo do laboratório

Deixar a criança trocar o apelido depois do onboarding (arrependimento do nick inicial ou vontade
de renovar a identidade), sem expor dado pessoal e sem precisar de conta adulta — reaproveitando o
gerador/filtro já usado na criação de perfil.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 207 - Troca segura de nickname" —
próximo item da "Recomendação priorizada" (seção 7) depois do lab-190 (a ordem exata do documento
é 201→202→203→204→205→207→206; 207 vem antes de 206 porque "Pets premium" (206) está marcado
como dependente de 203/pet já estar confiável, já resolvido no lab-188).

## Investigação prévia (leitura do código, antes de codar)

- **O gerador/filtro do backlog JÁ EXISTE, só pro onboarding**: `data/nicknames.ts`
  (`generateNickname`, adjetivo+bicho, sem número desde o lab-89) e `data/nicknameFilter.ts`
  (`sanitizeNicknameChars`/`isNicknameAllowed` — só letra/espaço + lista de bloqueio, mesma checagem
  duplicada no servidor) já cobrem os critérios "gerador seguro"/"bloquear PII e palavra
  inadequada" do backlog. `Onboarding.tsx` já usa os três. **O que falta de verdade é só a
  capacidade de TROCAR depois** — não existe hoje nenhuma função `renameNickname`/`updateName` em
  `state/useProfile.ts` (só `equipAvatar`/`equipHat`/etc., nenhuma mexe em `profile.name`), nem
  nenhuma UI depois do onboarding pra isso. O botão "🔁 Trocar perfil" do HUD (`HudHeader.tsx`) troca
  entre PERFIS diferentes no mesmo aparelho (multi-perfil, lab-108) — não é o mesmo caso, não edita
  o nickname do perfil atual.
- **Achado real, propagação já é de graça em 2 dos 3 lugares citados pelo backlog**:
  - **HUD**: `<h1>{profile.name}</h1>` (`HudHeader.tsx`) já lê `profile.name` reativo — qualquer
    troca aparece na hora, sem código novo.
  - **Ranking**: `RankingPanel.tsx:35` já faz `name: isSelf ? profile.name : r.name` — o PRÓPRIO
    jogador sempre vê seu nick mais atual no ranking, mesmo que o resto da lista venha de um
    snapshot do relay. Sem código novo.
  - **Multiplayer**: `world3d/multiplayer.ts`'s `sendState(name, ...)` é chamado a cada broadcast
    de estado (não só na conexão) com o `profile.name` corrente lido em `World3D.tsx` — outros
    jogadores conectados veem o nick novo no próximo broadcast. Sem código novo.
- **Achado real, a lacuna genuína que este lab precisa fechar**: `usePlayerIdentity.ts`'s
  `ensureRegistered(nickname, ...)` só chama `POST /players/register` **UMA VEZ por perfil**
  (`if (playerId) return playerId`, guarda síncrona) — o nickname enviado ali fica GRAVADO PRA
  SEMPRE em `player_identities.nickname` no Neon, e NUNCA é atualizado depois, mesmo que
  `profile.name` mude localmente. Isso significa: `GET /players/search?nickname=` (achar amigo),
  `FriendsPanel.tsx`'s `f.nickname`/`r.nickname` (o que os amigos veem de você) e
  `GET /players/:id/public-profile` (perfil público visitável) ficariam PRESOS no nick antigo pra
  sempre — o critério de aceite "ranking/amigos/multiplayer mostram o novo nick" só está
  genuinamente em risco pro pedaço de AMIGOS (backend Neon), não pros outros dois. Confirmado
  lendo `server-accounts/src/index.ts`: `handlePlayerRegister` faz um `INSERT` simples (chamar de
  novo criaria um jogador DUPLICADO, não atualiza o existente) — não existe hoje nenhuma rota que
  atualize `nickname` num `player_identities` já criado.
- **Ponto de extensão já existente, reaproveitável**: `handleHeartbeat`
  (`POST /players/heartbeat`, chamado a cada ~60s por `useHeartbeat.ts` E também sob demanda via
  `sendImmediateHouseVisibility` pro caso "a mudança precisa valer AGORA, não esperar o próximo
  tick") já faz UPDATE parcial com `coalesce` em `equipped_look`/`badges`/campos de casa — o mesmo
  padrão serve pra `nickname`, sem precisar inventar uma rota nova.
- **Cooldown/limite de frequência (critério de aceite explícito do backlog)**: não existe hoje
  nenhum campo de "quando foi a última troca de nickname" nem no `Profile` (client) nem em
  `player_identities` (Neon). Precisa de um campo novo dos dois lados, seguindo o padrão já
  estabelecido de instante ISO + guarda anti-recuo (mesmo espírito de
  `weeklyEventObjectiveRewardedAtIso`/`applyPetDailyChallengeCompleted`, embora ali seja por DIA
  civil e aqui precise ser uma janela rolante de N dias, não um dia calendário).
- **Regra de segurança já estabelecida neste repo, aplicável aqui**: `docs/prompts/01-seguranca.md`
  §3 — "nunca confia só na validação do lado do cliente". A validação de formato/lista de bloqueio
  E o cooldown de frequência precisam ser reforçados no servidor também, não só na UI (um cliente
  adulterado não pode trocar de nick em loop pra assediar/confundir amigos, risco citado no próprio
  item do backlog).

## Funcionalidades planejadas

- [x] `types.ts`: novo campo `Profile.nicknameChangedAt: string | null` (instante ISO da última
  troca; `null` = nunca trocou, inclusive todo perfil salvo antes deste lab).
- [x] `state/progression.ts`: nova função pura `canChangeNickname(nicknameChangedAt, nowIso)` +
  constante `NICKNAME_CHANGE_COOLDOWN_DAYS` (7 dias) — testada (`progression.test.ts`).
- [x] `state/useProfile.ts`: nova função `renameNickname(name)` — valida local primeiro
  (`isNicknameAllowed` + `canChangeNickname`, falha rápida sem rede se bloqueado), atualiza
  `profile.name`+`nicknameChangedAt` e persiste, dispara sincronização imediata com o backend
  (best-effort, ver abaixo).
- [x] Novo componente `NicknamePanel.tsx` (modal, mesmo padrão `useModalA11y` dos outros painéis):
  mostra nick atual, campo com o MESMO filtro/gerador do onboarding, mensagem de cooldown restante
  quando bloqueado, botão salvar.
- [x] `HudHeader.tsx`: novo botão "✏️" na fileira de ícones do HUD (não inline no `<h1>` — ver
  "Implementação" abaixo pro motivo), abre o `NicknamePanel` — novo prop `onOpenNicknamePanel`,
  plumbing por `App.tsx` igual aos outros painéis (`useModalA11y`, ação reversível/local).
- [x] `state/useHeartbeat.ts`: nova função `sendImmediateNicknameChange(nickname)` (mesmo padrão de
  `sendImmediateHouseVisibility`), MAS com resultado observável (`Promise<{ok:boolean; error?:
  string}>`, diferente do fire-and-forget das outras) — o painel precisa mostrar "só pode trocar de
  novo em N dias" se o SERVIDOR recusar (defesa real, não só a checagem local otimista).
- [x] `server-accounts/migrations/0014_player_nickname_changed_at.sql`: nova coluna
  `nickname_changed_at timestamptz` em `player_identities` (`null` = nunca trocou).
- [x] `server-accounts/src/domain.ts`: mesma função pura `canChangeNickname` do client (mesma
  constante de dias) — testada (`domain.test.ts`).
- [x] `server-accounts/src/index.ts`: `handleHeartbeat` ganha um campo opcional `nickname` no corpo
  — quando presente e DIFERENTE do nickname já salvo, valida formato (`isNicknameAllowed`,
  reaproveitado) + cooldown (`canChangeNickname` contra o `nickname_changed_at` atual da linha);
  se aprovado, `UPDATE ... SET nickname = ..., nickname_changed_at = now()`; se recusado, resposta
  de erro dedicada (não deixa os outros campos do MESMO heartbeat de badges/equipped_look/casa
  falharem por causa disso — mesmo princípio já usado pro `houseVisible` malformado).
- [x] Verificação ao vivo (Chrome real, banco de PRODUÇÃO real via `wrangler dev` local, mesma
  técnica dos labs 175/185): registrar 2 jogadores de teste, trocar o nickname de um deles,
  confirmar que o outro consegue achar o nick NOVO via busca/perfil público, e que tentar trocar de
  novo antes do cooldown é recusado com mensagem clara.
- [x] Confirmar ao vivo que HUD/ranking(próprio jogador)/multiplayer refletem o nick novo
  IMEDIATAMENTE, sem depender do heartbeat (já é o comportamento hoje, por construção — só
  confirmar que a troca local não quebra isso).

## Implementação

- `types.ts`: `Profile.nicknameChangedAt: string | null` — instante ISO da última troca.
- `state/storage.ts`: default `null` no `loadProfile()` (backward-compat, mesmo padrão dos outros
  campos opcionais ali).
- `state/progression.ts`: `canChangeNickname(nicknameChangedAt, nowIso)` + constante
  `NICKNAME_CHANGE_COOLDOWN_DAYS = 7` (dias CORRIDOS via `Date.getTime()`, não `utcDayNumber` —
  intencional, ver comentário no código: cooldown de "não confundir os amigos", não um limite de
  calendário). Falha aberta (permite) se a data salva estiver corrompida. Testado
  (`progression.test.ts`).
- `state/useProfile.ts`: `renameNickname(name, nicknameChangedAt)` — atualiza `profile.name`+
  `nicknameChangedAt` local e persiste com o valor RECEBIDO (a linha de verdade devolvida pelo
  servidor, não um `new Date()` calculado aqui — ver "Rodada 5" abaixo), sem repetir validação de
  formato/cooldown (quem decide de verdade é o servidor; `App.tsx` só chama isto depois de
  `sendImmediateNicknameChange` confirmar —
  ver "Rodada 1" abaixo pro motivo de não duplicar a checagem aqui).
- Novo componente `components/NicknamePanel.tsx` — mesmo gerador/filtro/UX do `Onboarding.tsx`
  (`generateNickname`/`sanitizeNicknameChars`/`isNicknameAllowed`), mais mensagem de cooldown
  restante quando bloqueado.
- `world3d/HudHeader.tsx`: novo botão "✏️ Trocar apelido" na fileira de ícones do HUD (mesma classe
  `.help-button`, MESMO piso de toque de 44px já auditado — descartada a ideia inicial de um ícone
  inline no `<h1>` do nome por ficar pequeno demais nesse contexto compacto pra respeitar o piso de
  acessibilidade sem redesenhar o cabeçalho inteiro).
- `App.tsx`: novo estado `showNicknamePanel`, incluído em `suspendTriggers` (mesmo tratamento de
  todo outro modal de tela cheia). `onSave` do painel orquestra: chama o servidor primeiro
  (`sendImmediateNicknameChange`), só grava local (`renameNickname`) se o servidor confirmar —
  nunca deixa o estado local divergir do que o backend realmente aceitou.
- `state/useHeartbeat.ts`: `sendImmediateNicknameChange(nickname)` — mesmo padrão de
  `sendImmediateHouseVisibility`, mas com resultado observável (`Promise`, não fire-and-forget) pra
  o painel poder mostrar a recusa de cooldown vinda do servidor. Sem `playerId` (nunca abriu
  Amigos), devolve sucesso trivial — nada pra sincronizar ainda, o próximo registro já usa o nome
  atualizado.
- `server-accounts/migrations/0014_player_nickname_changed_at.sql`: nova coluna
  `nickname_changed_at timestamptz` em `player_identities`.
- `server-accounts/src/domain.ts`: mesma função `canChangeNickname` + mesma constante do client —
  cópia proposital (não dá pra importar entre os pacotes deployáveis, mesmo padrão já usado por
  `isNicknameAllowed`). Testado (`domain.test.ts`).
- `server-accounts/src/index.ts`: `handleHeartbeat` ganha um campo opcional `nickname`, tratado num
  caminho SEPARADO (early return) do `UPDATE` genérico de `equippedLook`/`badges`/casa — quando
  presente, a requisição INTEIRA é só sobre nickname, nunca chega no `UPDATE` genérico (`last_seen_at`
  incluso). Só a chamada IMEDIATA do painel manda este campo, e nunca combinado com os outros (ver
  "Rodada 3" abaixo — achado real sobre essa premissa, corrigido só na documentação, não no
  comportamento). Quando presente e DIFERENTE do nickname já salvo: valida formato
  (`isNicknameAllowed`) e cooldown (`canChangeNickname` contra a linha real do banco) antes de
  atualizar `nickname`+`nickname_changed_at`, devolvendo `{changed: true}`; recusa com 400 (formato),
  403 (posse) ou 429 (cooldown). Renomear pro MESMO nome já salvo devolve `{changed: false}` sem
  tocar no cooldown.

## Verificação ao vivo

**Migrações**: `0014_player_nickname_changed_at.sql` e `0015_player_identity_secret.sql` já foram
aplicadas em PRODUÇÃO (`npm run migrate`, verificado no momento de cada rodada em que foram
criadas — antes do respectivo commit ser enviado). O Worker de produção só é atualizado depois do
merge desta PR; não há janela real onde o código novo rode contra um schema sem as colunas.

**Nota**: esta seção registra a verificação da RODADA 1, quando a resposta do heartbeat pra
nickname ainda era um 204 vazio. Esse contrato mudou nas rodadas 2-5 (ownership por
`player_secret`, depois `{changed, nickname, nicknameChangedAt}` em JSON 200) — ver o histórico de
rodadas mais abaixo pra cada mudança e sua própria verificação ao vivo; o comportamento ATUAL é o
descrito lá, não o 204 desta seção.

**Backend, direto contra o banco de PRODUÇÃO real** (`wrangler dev` local na porta 8790, mesma
técnica dos labs 175/185): registrados 2 jogadores de teste via `POST /players/register`. Confirmado
via `curl`: (1) busca pelo nickname ORIGINAL encontra o jogador; (2) `POST /players/heartbeat` com
um `nickname` novo devolve 204 e a busca pelo nome NOVO encontra o jogador, a busca pelo nome ANTIGO
não encontra mais nada; (3) tentar trocar de novo imediatamente devolve 429 com mensagem clara, e o
nickname permanece o mesmo (cooldown real, não só client-side); (4) reenviar o MESMO nickname já
salvo devolve 204 sem consumir o cooldown; (5) nickname da lista de bloqueio devolve 400; (6)
`GET /players/:id/public-profile` reflete o nome novo; (7) um heartbeat comum sem `nickname` nenhum
continua funcionando (regressão checada). Jogadores de teste removidos do banco ao final de cada
etapa.

**UI completa, Chrome real** (Vite local temporariamente apontado pro `wrangler dev` acima via
`VITE_ACCOUNTS_API_URL`, perfil de teste já existente no navegador — nome/estado restaurados ao
final): abrir "✏️ Trocar apelido" mostra o painel com o nome atual pré-preenchido e "Salvar"
desabilitado (nome igual); "🎲 Gerar" preenche um nome novo válido, habilita "Salvar"; salvar fecha
o painel e atualiza o HUD instantaneamente com o nome novo; reabrir o painel imediatamente depois
mostra a mensagem de cooldown ("pode trocar de novo em 7 dia(s)") com campo/gerador/salvar
desabilitados; abrir o painel de Amigos DEPOIS da troca (primeiro registro do jogador) confirma via
busca no backend que o registro usa o nome JÁ TROCADO, não o original — a propagação por HUD/
ranking(próprio jogador)/multiplayer não precisou de nenhuma mudança de código, por construção
(investigação prévia já confirmada, ver acima).

## Review automático do Copilot (PR #71)

**Rodada 1** — 2 comentários gerados (ambos reais, sérios) + 4 suprimidos:

- **Real, grave, corrigido**: o desenho original autorizava a troca só pelo `playerId` — que
  `GET /players/search` devolve pra QUALQUER chamador que busque um nickname. Sem prova de posse,
  qualquer jogador que descobrisse o `playerId` de outra criança (bastava buscar o nick dela)
  conseguia renomear o perfil dela sem consentimento — risco de bullying/impersonação citado no
  próprio item do backlog, e mais grave que o resto do heartbeat (equipped_look/badges/casa já
  tinham esse mesmo problema estrutural, mas trocar a IDENTIDADE pública de outra criança é mais
  sério). Corrigido reaproveitando `player_identities.device_id` (já existe desde o lab-159, NUNCA
  exposto por `/players/search`/`/players/:id/public-profile` — confirmado lendo o código: essas
  rotas só selecionam `id`/`nickname`/`avatar_emoji`/etc., nunca `device_id`) como prova de posse:
  `sendImmediateNicknameChange` passa a mandar o `deviceId` do próprio aparelho, e o servidor recusa
  com 403 se não bater com a linha. Verificado ao vivo (`wrangler dev` contra produção): registrado
  um jogador "vítima", um segundo `deviceId` "atacante" tentando renomear a vítima recebeu 403 e o
  nickname da vítima permaneceu intocado; o dono de verdade (deviceId correto) renomeou com sucesso
  (204). Não foi criado nenhum segredo/token novo — `device_id` já cumpria esse papel implicitamente
  desde que essas rotas foram desenhadas, só nunca tinha sido usado como prova de posse.
- **Real, corrigido**: a checagem de cooldown lia `nickname_changed_at` num `SELECT` separado do
  `UPDATE` que vinha depois — duas requisições concorrentes pro mesmo jogador podiam ler o mesmo
  valor, passar as duas, e gravar nomes diferentes dentro da mesma janela de 7 dias. Corrigido
  tornando a gravação CONDICIONAL: a cláusula `where` do próprio `UPDATE` reavalia o cooldown contra
  a linha de verdade no momento exato da escrita (travamento de linha padrão do Postgres pra
  `UPDATE` fecha a janela de corrida — a segunda transação concorrente só executa depois da primeira
  liberar o lock, e nesse momento já vê o `nickname_changed_at` atualizado, falhando a condição).
- **Real, corrigido (achado suprimido)**: depois de um 204 do servidor, o código gravava
  `nicknameChangedAt` local com um NOVO `new Date().toISOString()` (relógio diferente do `now()`
  usado pelo servidor) — bem na fronteira exata dos 7 dias, essa leitura local levemente atrasada em
  relação ao servidor podia fazer o próprio `renameNickname` (que repetia a checagem de cooldown por
  "defesa em profundidade") recusar uma troca que o SERVIDOR já tinha aprovado, deixando o HUD preso
  no nome antigo. Corrigido removendo a checagem de cooldown redundante de dentro de
  `renameNickname` — quem decide de verdade é o servidor (`App.tsx` só chama isto depois da
  confirmação), repetir a checagem local não protege nada a mais e podia causar exatamente esse tipo
  de divergência.
- **Real, corrigido (achado suprimido)**: o campo de apelido não estava dentro de um `<form>`,
  então apertar Enter depois de digitar não fazia nada — quebra o fluxo esperado de teclado, e
  diferente do `Onboarding.tsx` (mesmo campo, já usa `<form onSubmit>`). Corrigido envolvendo o
  campo/gerador/salvar num `<form>` com `onSubmit`, botão salvar virou `type="submit"` (gerador
  continua `type="button"`, não deve disparar submit).
- **Real, mas não corrigido nesta rodada (achado suprimido)**: corrida estreita no PRIMEIRO
  registro — `ensureRegistered` é assíncrono; se a criança fechar o painel de Amigos e abrir o de
  troca de apelido ANTES da resposta do registro chegar, `loadPlayerId()` ainda devolve `null`,
  `sendImmediateNicknameChange` devolve sucesso trivial (nada pra sincronizar ainda) — mas o
  registro em voo, que já tinha capturado o nome ANTIGO no corpo da requisição, termina segundos
  depois com o nome desatualizado. Avaliado e não corrigido: exige serializar registro+troca (fila/
  mutex) pra uma janela de corrida de poucas centenas de milissegundos, que exige uma ação bem
  específica da criança (abrir Amigos, fechar, trocar de apelido, tudo em menos de um round-trip de
  rede) — e se acontecer, autocorrige na PRÓXIMA troca de apelido ou heartbeat qualquer. Custo de
  corrigir desproporcional ao risco real; disclosed como limitação conhecida, não corrigido.
- **Real, mas não corrigido nesta rodada (achado suprimido)**: a resposta 429 de cooldown não
  inclui o `nickname_changed_at` de verdade do banco — se o relógio local do painel estiver
  dessincronizado do servidor (ex.: troca feita em outro aparelho/sessão), a mensagem de erro fica
  genérica em vez de mostrar o número exato de dias. Avaliado como cosmético (o painel já bloqueia
  proativamente ANTES de chegar nesse caso, usando o próprio `nicknameChangedAt` local — este 429
  só é alcançável no mesmo cenário raro de dessincronização entre aparelhos/sessões do achado
  anterior); não corrigido nesta rodada.

**Rodada 2** — 1 comentário gerado + 5 suprimidos (1 marcado "previously missed", repetição da
corrida de registro já disclosed acima, sem mudança):

- **Real, grave, corrigido**: a correção da rodada 1 usou `device_id` como prova de posse — mas
  `device_id` é POR APARELHO, não por PERFIL (`storage.ts`, `getOrCreateDeviceId`, lab-108: vários
  perfis do mesmo tablet compartilham o mesmo id). Um irmão jogando no mesmo tablet enviaria o
  MESMO `device_id` da vítima e passaria a checagem — a correção da rodada 1 fechava o ataque
  "estranho descobre o playerId pela internet" mas deixava aberto o caso "irmão no mesmo aparelho".
  Corrigido com um segredo de verdade ESCOPADO AO PERFIL: nova coluna `player_secret` (migração
  `0015`, UUID gerado no registro), devolvida só na resposta de `POST /players/register` — nunca
  por `/players/search`/`/players/:id/public-profile`/heartbeat comum. Guardada localmente por
  perfil (`playerSecretKey`, mesmo padrão de `playerIdKey`). Verificado ao vivo reproduzindo
  EXATAMENTE o cenário do achado: dois jogadores registrados com o MESMO `deviceId` (irmãos no
  mesmo tablet) — o segundo tentando renomear o primeiro com o PRÓPRIO segredo (não o da vítima)
  recebeu 403; o dono de verdade (segredo correto) renomeou com sucesso (204); cooldown e no-op
  reverificados também, continuam corretos com o novo mecanismo. Perfis registrados ANTES desta
  migração (sem segredo salvo localmente) degradam pro mesmo caminho de "nada pra sincronizar
  agora" — a troca fica só local até uma tentativa futura, disclosed como limitação aceita (mesma
  postura de degradação graciosa já usada em outros pontos deste app pra sincronização sem conta).
- **Real, corrigido**: o `UPDATE` condicional da rodada 1 concatenava
  `${NICKNAME_CHANGE_COOLDOWN_DAYS} || ' days'` sem `::text` explícito no parâmetro numérico —
  mesmo padrão já usado (com o cast certo) em `handleAdminMetrics` pro NPS
  (`${NPS_COOLDOWN_DAYS}::text || ' days'`, `index.ts` linha ~1746). Corrigido adicionando o mesmo
  `::text` — apesar da verificação ao vivo da rodada 1 não ter reproduzido uma falha (o teste real
  passou com 204), o padrão já estabelecido no arquivo pra exatamente este tipo de expressão usa o
  cast explícito, e não há motivo real pra divergir.
- **Real, corrigido (achado suprimido)**: apertar Enter de novo enquanto a primeira troca ainda
  estava em voo disparava uma segunda chamada concorrente — o botão desabilitado não impede o
  `onSubmit` do form via teclado, e a guarda de `handleSave` não considerava `saving`. Corrigido
  incluindo `saving` na guarda.
- **Real, corrigido (achado suprimido)**: a recusa do servidor (só aparece depois de uma espera
  assíncrona) não tinha semântica de região viva — quem usa leitor de tela não era avisado da falha.
  Corrigido com `role="alert"` no elemento de erro.
- **Real, corrigido (achado suprimido)**: a descrição de `renameNickname` em "Implementação" acima
  ainda afirmava que a função repetia a checagem de cooldown (verdade na rodada 1, removido na
  rodada 1 pelo achado do relógio local — a DESCRIÇÃO não tinha sido atualizada junto). Corrigida.

**Rodada 3** — 2 comentários gerados + 4 suprimidos (1 marcado "previously missed", repetição da
corrida de registro já disclosed, sem mudança):

- **Real, corrigido**: a resposta do servidor era um 204 vazio TANTO pra troca de verdade quanto
  pro no-op (nome já igual) — o cliente não tinha como distinguir os dois casos, e gravava um
  `nicknameChangedAt` novo local mesmo no no-op. Alcançável se outra aba/sessão do MESMO perfil já
  tivesse trocado pro nome que esta está tentando mandar de novo (destrancaria um cooldown que o
  servidor não consumiu de verdade — bloqueio local incorreto). Corrigido: a resposta agora é
  `{changed: true}` ou `{changed: false}` (200, não mais 204 vazio); `App.tsx` só grava o cooldown
  local quando `changed` é verdadeiro. Verificado ao vivo: troca de verdade devolve
  `{"changed":true}`; repetir o MESMO nome logo em seguida devolve `{"changed":false}`.
- **Real, corrigido (achado suprimido, cobertura de teste)**: os dois testes "libera exatamente aos
  7 dias corridos" (client e servidor) usavam dois instantes que são AO MESMO TEMPO 7×24h decorridas
  E 7 datas de calendário UTC adiante — não provam de verdade que a implementação é por tempo
  decorrido e não por dia civil (uma implementação errada por dia civil passaria nos dois testes
  igual). Corrigido acrescentando o caso que realmente distingue: mesmo `changedAt`, mas um `nowIso`
  que atravessa 7 datas de calendário com só 6 dias e 1 hora reais decorridos — a implementação
  correta continua bloqueando; uma regressão pra semântica de dia civil aceitaria incorretamente.
  Adicionado nos dois lados (`progression.test.ts` e `domain.test.ts`).
- **Real, mas fora do que corrigi nesta rodada (achado suprimido)**: o caminho de troca de nickname
  faz um `return` antecipado ANTES do `UPDATE` genérico de `equippedLook`/`badges`/casa — se algum
  chamador futuro combinasse `nickname` com esses outros campos na MESMA requisição, eles seriam
  ignorados silenciosamente (incluindo `last_seen_at`). Confirmado que isso nunca acontece hoje:
  `sendImmediateNicknameChange` (única chamadora deste campo) manda só
  `{playerId, nickname, secret}`, nunca combinado com os outros campos opcionais. Corrigida só a
  documentação (que overclaimava "não deixa os outros campos falharem", quando na prática a
  requisição inteira é sobre nickname, não convive com os outros campos por design) — não
  implementado o merge transacional dos dois caminhos, custo desproporcional a um cenário que não
  ocorre com o cliente atual; registrado aqui como restrição de design, não bug latente.

**Rodada 4** — 1 comentário gerado + 3 suprimidos (1 marcado "previously missed" — repetição
literal do achado já disclosed de perfis registrados antes da migração do segredo ficarem sem
sincronizar pra sempre; nenhuma mudança nesta rodada, permanece uma limitação aceita e documentada):

- **Real, corrigido**: `sendImmediateNicknameChange` tratava `res.ok` como sucesso e usava
  `body?.changed ?? true` — durante uma janela de rollout com uma versão ANTIGA do Worker ainda
  respondendo (sem suporte a `nickname` no heartbeat), essa versão antiga ignora o campo e devolve
  um 204 comum sem corpo, que passaria por `res.ok` e cairia no fallback `?? true`, fazendo o
  cliente gravar um nome/cooldown local que nunca foi persistido de verdade no banco — divergência
  silenciosa entre local e servidor. Corrigido exigindo `changed` explicitamente booleano no corpo;
  resposta ambígua (sem corpo, corpo malformado, ou campo ausente) agora é tratada como falha
  (`ok: false`), nunca como sucesso presumido. Reverificado ao vivo: o caminho feliz continua
  devolvendo `{"changed":true}` corretamente.
- **Real, corrigido (achado suprimido)**: o comentário do teste de cooldown dizia "menos de 24h de
  diferença de calendário" pros instantes `2026-09-10T23:00` e `2026-09-17T23:00` — que na verdade
  têm 7 dias de diferença de calendário (a intenção era descrever "mesmo horário do dia", não a
  distância de calendário). Corrigido pra descrever o caso com precisão.

**Rodada 5** — 1 comentário gerado + 4 suprimidos, sem nenhum marcado "previously missed" desta
vez (mesmo o achado de perfis sem segredo local sendo, na prática, uma repetição literal do já
disclosed nas rodadas 2/4 — tratado como tal abaixo, terceira vez que surge):

- **Real, corrigido**: a resposta `{changed: false}` (no-op — outra aba/sessão do MESMO perfil já
  tinha trocado pro nome pedido) não trazia o nickname/timestamp de verdade do banco — `App.tsx` só
  chamava `renameNickname` quando `changed` era `true`, então no caso de no-op o HUD desta aba
  ficava PRESO no nome antigo, mesmo com o servidor já correto (e sem essa reconciliação, também
  sem saber qual `nicknameChangedAt` de verdade usar). Corrigido: a resposta do servidor agora inclui
  `nickname`+`nicknameChangedAt` (a linha de verdade do banco) em AMBOS os ramos (`changed: true` e
  `changed: false`, incluindo o `returning nickname_changed_at` no próprio `UPDATE` em vez de
  assumir que o relógio do cliente bate com o `now()` do Postgres); `App.tsx` passou a reconciliar
  sempre com esses valores, não mais com `name`/`new Date()` otimistas locais, mesmo no no-op.
  Verificado ao vivo: uma troca de verdade e um no-op subsequente pro MESMO nome devolvem o mesmo
  `nicknameChangedAt` de verdade nos dois casos.
- **Real, corrigido (achado suprimido)**: `ensureRegistered` gravava `savePlayerSecret(body.playerSecret)`
  sem checar o tipo — se um Worker ANTIGO durante uma janela de deploy (frontend/backend deployam
  separado, sem garantia de ordem) devolvesse só `{playerId}` (sem `playerSecret`, versão anterior a
  este lab), `localStorage.setItem` converteria `undefined` na STRING literal `"undefined"` —
  depois do Worker atualizar, `loadPlayerSecret()` devolveria esse lixo (truthy, não-nulo), toda
  troca de nickname seria recusada com 403 pra sempre, e o `playerId` já salvo impede um novo
  registro que corrigiria isso. Corrigido validando que os DOIS campos são string de verdade antes
  de gravar qualquer um — resposta incompleta agora é tratada como registro que falhou (nada
  salvo), não como sucesso parcial.
- **Real, mas repetido pela 3ª vez, permanece disclosed e não corrigido**: perfis registrados ANTES
  da migração do segredo (`playerId` local sem `playerSecret` correspondente) continuam caindo no
  caminho de "nada pra sincronizar agora" — `ensureRegistered` nunca re-registra um perfil que já
  tem `playerId`, então não existe hoje nenhum caminho pra esses perfis obterem um segredo
  retroativamente; a troca de nickname deles fica só local (HUD/ranking/multiplayer OK) mas nunca
  chega aos amigos/busca. Dado que isso já foi avaliado 2 vezes antes (rodadas 2 e 4) com a mesma
  conclusão — população afetada é pequena e finita (só quem usou o painel de Amigos entre o
  lab-159 original e este lab; toda conta NOVA a partir daqui já nasce com segredo) — mas a
  repetição pela 3ª vez sugere que vale a pena um laboratório futuro dedicado a um bootstrap seguro
  de segredo pra identidades legadas, em vez de continuar reavaliando a mesma decisão a cada rodada
  deste PR. Registrado aqui como dívida real pra um laboratório futuro (mesmo padrão já usado no
  lab-186 pra uma limitação semelhante), não descartado.

**Rodada 6** — 3 comentários gerados + 2 suprimidos:

- **Real, grave, corrigido**: a correção da rodada 5 (reconciliar `nicknameChangedAt` com o valor
  devolvido pelo servidor) introduziu uma REGRESSÃO real — o caminho "sem `playerId`/`secret`"
  (perfil nunca abriu Amigos, ou identidade legada) passou a devolver `nicknameChangedAt: null`
  sempre, e `App.tsx` grava esse `null` local a CADA troca bem-sucedida — como `canChangeNickname(null,
  ...)` sempre libera, isso reiniciava o cooldown pra "nunca trocou" toda vez, permitindo trocar de
  apelido em loop sem nenhum limite de frequência, contornando exatamente o critério de aceite do
  backlog que este lab existe pra cumprir. Corrigido voltando a usar `new Date().toISOString()`
  nesse caminho específico (onde não há servidor pra reconciliar) — só o caminho COM servidor usa o
  valor autoritativo devolvido. Verificado ao vivo: trocar de apelido sem nunca ter aberto o painel
  de Amigos agora bloqueia corretamente por 7 dias no próprio painel, não reseta.
- **Real, grave, corrigido**: `ensureRegistered` resolvia `savePlayerId`/`savePlayerSecret` pelo
  perfil ATIVO no momento em que a resposta assíncrona chegava, não no momento em que a chamada
  começou — se a criança trocasse de perfil (tablet compartilhado, lab-108) enquanto o registro
  ainda estava em voo, o `playerId`+segredo do perfil ANTIGO seriam gravados no slot do perfil NOVO,
  vazando a credencial de um irmão pro outro (que passaria a poder renomear a identidade do
  primeiro). Corrigido capturando o perfil ativo ANTES do `fetch` e só gravando a resposta se o
  perfil ainda for o mesmo quando ela chegar; caso contrário, descarta (mesmo tratamento de
  "registro incompleto" já usado pra resposta malformada).
- **Real, corrigido (documentação)**: a seção "Verificação ao vivo" registrava respostas 204 pro
  heartbeat de nickname, desatualizada desde a rodada 3 (que mudou pra JSON 200 com `changed`).
  Adicionada uma nota explícita no topo da seção apontando pro histórico de rodadas como fonte do
  comportamento atual, sem reescrever o registro histórico da rodada 1 (que descrevia o
  comportamento real DAQUELE momento). Corrigida também a assinatura documentada de
  `renameNickname` (dizia `nowIso`, o parâmetro real desde a rodada 5 é o `nicknameChangedAt`
  autoritativo devolvido pelo servidor).
- **Real, mas fora do que corrigi nesta rodada (achado suprimido)**: o `SELECT` que embasa a
  resposta `{changed: false}` não está travado — se outra sessão renomear a MESMA identidade entre
  esse `SELECT` e a resposta, o payload devolvido carrega nickname/timestamp já desatualizados, e o
  cliente reconciliaria pra um estado que não é mais o mais recente (autocorrige na PRÓXIMA
  interação, já que a COLUNA no banco em si nunca fica errada — só a resposta desta requisição
  específica). Avaliado como narrow/cosmético (exige duas trocas verdadeiramente simultâneas do
  MESMO perfil) — corrigir de verdade exigiria travar a linha (`select ... for update`) ou uma
  segunda leitura pós-escrita, custo desproporcional a uma janela de corrida sub-milissegundo que
  se autocorrige sozinha; disclosed, não corrigido.
- **Real, corrigido (achado suprimido, documentação)**: o plano de teste/FEATURES.md não deixava
  explícito que as migrações `0014`/`0015` já tinham sido aplicadas em produção antes de cada commit
  correspondente ser enviado — corrigido com uma nota explícita no topo de "Verificação ao vivo".

**Rodada 7** — 1 comentário gerado + 5 suprimidos (2 marcados "previously missed" — repetição
literal do achado já disclosed de identidades legadas sem segredo, sem mudança):

- **Real, corrigido**: a validação de resposta da rodada 6 checava `changed`/`nickname` mas não
  validava `nicknameChangedAt` de verdade — um valor presente porém malformado (não uma data válida)
  passaria como se fosse `null` ou uma data real. Corrigido validando explicitamente que o campo é
  `undefined`, `null`, ou uma string que representa uma data parseável, antes de aceitar a resposta
  como confirmada.
- **Real, mas avaliado como fora de proporção pra este PR (achado suprimido)**: com a correção da
  rodada 6 (`ensureRegistered` trata resposta incompleta como falha total, sem gravar nada), um
  cenário de ORDEM DE DEPLOY invertida — frontend novo publicado ANTES do Worker (CI publica os
  dois em jobs independentes, sem garantia de ordem) — faria cada tentativa de abrir Amigos durante
  essa janela criar uma linha órfã em `player_identities` (o servidor antigo ainda insere) sem o
  cliente jamais salvar o `playerId` correspondente, repetindo a cada tentativa até o Worker
  atualizar. Nenhuma linha fica CORROMPIDA (mesma classe de achado que a rodada 6 corrigiu evitava)
  — só linhas órfãs duplicadas, uma questão de ordem de deploy operacional, não um bug de código:
  fazer o deploy do Worker (`server-accounts`) ANTES do frontend nesta PR específica evita a janela
  por completo. `handlePlayerRegister` já não é idempotente por natureza (todo `INSERT` simples,
  sem chave única por `deviceId`) — resolver isso de verdade é uma mudança de design maior que este
  lab, não relacionada à troca de nickname em si; registrado aqui como nota operacional de rollout,
  não como bug a corrigir no código.
- **Real, mas já avaliado e mantido (achado suprimido, repetição expandida da rodada 6)**: a mesma
  corrida de leitura sem lock no `SELECT` do caminho `changed: false`, desta vez com a observação de
  que nem um `select ... for update` isolado bastaria (precisaria de uma transação serializável
  completa). Mantida a mesma decisão da rodada 6: narrow, autocorrige na próxima interação, custo de
  corrigir desproporcional ao risco — ver rodada 6 pro raciocínio completo.

**Rodada 8** — 0 comentários novos, 5 suprimidos (1 marcado "previously missed"; os outros 3 são
repetições/expansões de decisões já avaliadas nas rodadas 6-7 — corrida do `ensureRegistered` em
voo, ordem de deploy do registro não-idempotente, e o painel não reavaliar o relógio sozinho
enquanto fica aberto — mantidas sem mudança, mesmo raciocínio já registrado). Dos 2 restantes,
ambos genuinamente acionáveis e de baixo custo:

- **Real, corrigido (simplificação)**: a pré-checagem de cooldown em JS (`canChangeNickname` contra
  `new Date()` do Worker) rodava ANTES do `UPDATE` atômico, que já reavalia o cooldown de verdade
  contra o `now()` do PRÓPRIO Postgres na sua cláusula `where`. Ter duas fontes de "agora" (relógio
  do Worker vs. relógio do banco) podia, bem na fronteira exata dos 7 dias, recusar com 429 uma
  troca que o banco já aceitaria. Corrigido removendo a pré-checagem redundante — só o
  `UPDATE` decide, via `updated.length === 0`. Reverificado ao vivo: cooldown continua bloqueando
  corretamente uma segunda troca imediata.
- **Real, corrigido**: a validação de resposta aceitava `nicknameChangedAt` AUSENTE (`undefined`)
  como equivalente a `null` ("nunca trocou") — mas o contrato do servidor sempre manda esse campo
  nos dois ramos, então a ausência dele indica uma resposta malformada, não a falta de troca
  anterior. Corrigido exigindo o campo explicitamente presente (`null` ou uma data válida), nunca
  ausente.

**Rodada 9** — 0 comentários novos, 4 suprimidos:

- **Real, corrigido (documentação)**: a rodada 8 removeu a pré-checagem em JS que USAVA
  `canChangeNickname` no servidor — a função ficou exportada e testada, mas sem nenhum consumidor
  real no caminho de produção (só a cláusula SQL do `UPDATE` decide de verdade agora). Isso criava
  uma falsa sensação de cobertura: os testes de `canChangeNickname` continuariam verdes mesmo que a
  condição SQL divergisse da regra pretendida. Avaliado: remover a função inteiramente perderia a
  especificação testável e isolada da regra (útil como referência, exercitada pelos próprios
  testes que documentam o comportamento esperado); reintroduzir como pré-checagem reabriria a corrida
  de relógios já corrigida na rodada 8. Corrigido só o comentário, deixando claro que esta função é
  uma ESPECIFICAÇÃO da regra (não o enforcement de verdade, que é só a cláusula SQL) e que qualquer
  mudança na janela de dias precisa manter as duas formas em sincronia manual.
- **Avaliado e mantido — decisão de produto já tomada numa sessão anterior, não revisitada aqui (3
  achados suprimidos, mesma raiz)**: `isNicknameAllowed` não detecta PII formada só por letras/
  espaço (nome completo, escola, endereço) — o filtro aceita qualquer coisa que passe no formato +
  lista de bloqueio. Isso é uma limitação REAL e conhecida, mas é a MESMA validação já usada há
  muito tempo no onboarding (`Onboarding.tsx`) — este lab reaproveita a validação existente sem
  enfraquecê-la nem fortalecê-la, e a decisão de não implementar detecção de PII foi tomada
  explicitamente no lab-89 ("decisão de produto confirmada com o usuário... detecção de PII foi
  deixada de fora por decisão do usuário nesta sessão", já citado desde a investigação prévia deste
  lab e na seção "Fora de escopo" abaixo). Não é uma lacuna introduzida por este lab, e revisitar
  essa decisão de produto está fora do que uma rodada de review automático pode decidir sozinha —
  precisaria de confirmação do usuário de verdade, não deste PR.

**Convergência**: 2 rodadas seguidas (8 e 9) com 0 comentários novos, restando só achados já
avaliados/disclosed em rodadas anteriores ou decisões de produto explicitamente fora de escopo —
mesmo critério já usado em labs anteriores desta sessão (lab-184, lab-189) pra encerrar o ciclo de
review.

## Fora de escopo (explicitamente adiado, conforme o próprio item do backlog)

- Nome real, bio livre, imagem enviada, nickname totalmente livre sem filtro algum.
- Histórico público de nomes antigos (nenhum registro do nick anterior é exposto a terceiros).
- Detecção de PII além do que `nicknameFilter.ts` já faz (decisão de produto já tomada no lab-89,
  não revisitada aqui).
- Sincronizar a troca de nickname pelo heartbeat PERIÓDICO (a cada 60s) — só pela chamada imediata
  disparada pelo próprio painel de troca; se a chamada imediata falhar por estar offline no
  momento exato da troca, a mudança fica só local até uma tentativa futura (mesma postura já
  aceita em outros pontos deste app pra telemetria/sincronização sem conta — não crítico pro
  público-alvo, disclosed se acontecer na verificação ao vivo).
