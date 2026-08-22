# Contexto — Laboratório 73 — multiplayer visual e personalização

Preenchido em: 2026-08-22
Commit inicial → final: e77b0891d1d144fd76e5f700715d9daeb06661a8..29dffa2

## O que foi feito
- **Protocolo de rede estendido** (`app/src/world3d/multiplayer.ts`): `RemoteState` ganhou
  `hatId`/`hasSword`/`hasGun`/`shirtColorId`/`pantsColorId`/`shoeColorId`/`backpackColorId`/
  `hairShapeId`; novo tipo `AttackEvent` (evento avulso, não um campo contínuo) + `sendAttack`/
  `onRemoteAttack`. Confirmado por leitura direta do `app/server/relay.cjs` que o relé local faz
  pass-through agnóstico de esquema (`broadcast(id, {...msg, id})` pra qualquer tipo não-`chat`) —
  nenhuma mudança de servidor foi necessária pra essas duas extensões de protocolo. **Não
  confirmado**: se o relé de produção (Cloudflare Worker, `https://missao-aprender-relay-v2.
  rafaelvs.workers.dev`, código fora deste repositório) também é agnóstico de esquema — assumido
  por analogia ao relé local, mas não verificado.
- **Aparência remota** (`World3D.tsx`): nova função `applyRemoteAppearance(rp, state, scene,
  shadowGenerator)` com atualização "change-detected" (compara contra `rp.lastXxx` antes de
  reconstruir malhas) pros 8 campos de aparência — necessário porque `sendState` dispara a cada
  ~120ms e reaplicar chapéu/cabelo (que fazem dispose+rebuild de malha) a cada mensagem geraria
  flicker visual. `ensureRemotePlayer` agora também constrói `rSword`/`rGun` (via `buildSword`/
  `buildLaserGun`) parentados aos cotovelos da figura remota, escondidos até `hasSword`/`hasGun`
  chegarem `true`. **Verificado ao vivo** (duas abas do navegador, mesmo perfil local, então o
  jogador remoto observado tem a MESMA aparência-base — mas a aba A nunca recarrega seu próprio
  perfil em memória, então seu avatar local ficou com o visual antigo enquanto o avatar remoto
  (dirigido pela rede) mostrou corretamente o boné comprado na aba B): o chapéu equipado na aba B
  apareceu no jogador remoto renderizado na aba A. Isso confirma o pipeline inteiro (mesma função
  cobre os 8 campos), mas cor de camisa/calça/sapato/mochila e cabelo não foram confirmados
  visualmente um a um (o boné cobre a cabeça, escondendo o cabelo; o ângulo da câmera sempre atrás
  do avatar dificultou ver o peito/camisa de frente) — a lógica é idêntica em estrutura à do
  chapéu (mesmo change-detection, mesmos catálogos/fallbacks de `buildStudentFigure`), então a
  confiança é alta, mas não é confirmação visual direta desses 4 eixos.
- **Efeito de combate transmitido**: `handleInteractPress()` agora chama `sendAttack(...)` no
  instante do golpe/tiro (dentro do bloco `canDefeat`, ver `World3D.tsx` por volta da linha 2854).
  Outros clientes recebem via `onRemoteAttack`, tocam o laser (`fireLaserBeam`, só pra `kind ===
  'gun'`, espelhando o que o atacante original faz) e disparam a mesma animação de braço
  (`rp.attackAnimTimer`/`attackAnimKind`) no laço de física do jogador remoto — não testado ao
  vivo (exigiria levar dois jogadores até Marte e derrotar um inimigo enquanto ambos observam).
- **Colisão jogador-jogador**: em vez de física real entre corpos (jogadores remotos são posições
  interpoladas via `Vector3.Lerp`, não corpos físicos), cada cliente aplica uma força radial no
  PRÓPRIO avatar (`body.applyForce`, mesmo mecanismo já usado pra gravidade) sempre que fica mais
  perto que `PLAYER_PERSONAL_SPACE` (2× `AVATAR_RADIUS`) de um jogador remoto — mesma técnica já
  validada pros inimigos de Marte (`MARS_ENEMY_PERSONAL_SPACE`), adaptada porque aqui só o lado
  local pode ser empurrado (o remoto não é um corpo físico controlável). Como todo cliente
  conectado faz o mesmo em si mesmo, o resultado é simétrico sem precisar sincronizar física entre
  máquinas. Não testado ao vivo (exigiria mover dois avatares até colidir, bloqueado pela mesma
  limitação de throttling de abas em segundo plano — ver decisões técnicas).
- **Lojinha de personalização** (`app/src/data/customization.ts`, novo arquivo): catálogos
  `SHIRT_COLOR_CATALOG`/`PANTS_COLOR_CATALOG`/`SHOE_COLOR_CATALOG`/`BACKPACK_COLOR_CATALOG` (3
  opções pagas + 1 padrão grátis cada) e `HAIR_SHAPE_CATALOG` (`padrao`/`moicano`/`longo`).
  `AvatarShop.tsx` ganhou os componentes `ColorSection` (reusado pros 4 eixos de cor) e
  `HairShapeSection`. **Verificado ao vivo**: compra e equipar funcionou pros 5 eixos na UI (moedas
  descontadas corretamente: 127→112 pela camisa rosa, 112→100 pelo moicano; estado persistido em
  `localStorage` conferido via `JSON.parse(localStorage.getItem('jogo-educativo:profile'))`).
- **Persistência**: `Profile` (`types.ts`) ganhou os 5 `equippedXxxId`; `Progress` ganhou os 5
  `unlockedXxxIds`; `emptyProgress`/`loadProfile` (`storage.ts`) tratam os novos campos com
  default seguro pra perfis salvos antes deste laboratório (migração implícita via spread com
  fallback `null`/array-com-item-padrão).
- **`progression.ts`**: helper genérico `unlockGeneric<T extends {id:string; cost:number}>(coins,
  unlockedIds, catalog, id)` extrai a lógica de desbloqueio compartilhada pelos 5 nowos wrappers
  (`unlockShirtColor`/`unlockPantsColor`/`unlockShoeColor`/`unlockBackpackColor`/
  `unlockHairShape`), evitando repetir a mesma verificação (existe no catálogo? já desbloqueado?
  moedas suficientes?) 5 vezes.

## Decisões técnicas tomadas
- **Efeito de combate como evento avulso, não campo de estado contínuo** — um golpe/tiro é
  instantâneo, então vira uma mensagem `type: 'attack'` mandada uma vez (não um campo de
  `RemoteState` sincronizado a cada quadro como posição/aparência). Motivo: sincronizar como
  estado contínuo exigiria lógica de "já vi esse ataque?" no receptor pra não repetir a animação a
  cada `sendState`; como evento, o próprio recebimento da mensagem já é o gatilho único.
- **Colisão sem física de corpo-a-corpo real** — decisão já tomada no lab-60 pros inimigos de
  Marte (custo de física por unidade) e reaplicada aqui: jogadores remotos continuam sendo posições
  interpoladas, não corpos Havok. A "colisão" empurra só o avatar LOCAL de cada cliente pra fora do
  raio de proximidade — como todo cliente faz isso consigo mesmo, o efeito final observado por
  qualquer jogador é simétrico (nenhum atravessa o outro) sem precisar de autoridade de física
  compartilhada entre máquinas.
- **`applyRemoteAppearance` com change-detection por campo** — sem isso, `hatId`/`hairShapeId`
  (que exigem dispose+rebuild de malha) seriam reconstruídos a cada ~120ms mesmo sem mudança
  nenhuma, causando flicker visual perceptível. Cores de material (`shirtColorId` etc.) são baratas
  de reaplicar, mas o padrão de comparação foi mantido uniforme pros 8 campos por simplicidade.
- **`StudentFigureColorOptions` como 4º parâmetro opcional de `buildStudentFigure`** — todos os
  call sites existentes (NPCs, professor, lojista, gente da piscina, civis) continuam chamando com
  3 argumentos e recebem as cores padrão antigas sem nenhuma mudança; só o jogador local e os
  jogadores remotos passam o 4º argumento. Evita quebrar ~10 call sites por uma mudança que só 2
  precisavam.

## Pendências / dívidas conhecidas
- Cor de camisa/calça/sapato/mochila e formato de cabelo não foram confirmados visualmente em
  duas abas ao vivo (só o chapéu foi) — a lógica é estruturalmente idêntica à do chapéu (mesma
  função, mesmo catálogo/fallback), então a confiança é alta, mas vale um teste visual dedicado
  (ex. ver o avatar de frente, ou remover o chapéu antes de comparar o cabelo) numa sessão futura
  se algum desses eixos aparecer errado em campo.
- Efeito de combate compartilhado (`sendAttack`/`onRemoteAttack`) e colisão jogador-jogador não
  foram testados ao vivo nesta sessão — só verificados por leitura de código e
  `npx tsc -b`/`npm run build` limpos. Recomenda-se um teste real (dois dispositivos/abas, Marte
  pro ataque; dois jogadores andando um em direção ao outro pra colisão) assim que possível.
- Testar em dois navegadores (duas abas do mesmo Chrome compartilham `localStorage`, então os dois
  jogadores testados tinham o MESMO perfil-base) deu um teste imperfeito: a aba "observadora" não
  atualiza seu próprio avatar quando o `localStorage` muda em outra aba (não há listener de
  `storage` event nem foi pedido) — isso é esperado/aceitável (perfis são por navegador, o cenário
  real de produção são dispositivos diferentes com perfis diferentes), só registrando que limitou
  o teste visual desta sessão.
- Continua sem confirmação se o relé de produção (Cloudflare Worker) tolera os campos novos de
  `RemoteState`/`AttackEvent` do mesmo jeito que o relé local (`relay.cjs`, cujo pass-through foi
  lido e confirmado) — o código fonte do relé de produção não está neste repositório.
- Pendências antigas do lab-72 continuam sem mudança: (1) confirmar se a recompensa em moeda do
  combate atualiza o HUD; (2) decidir sobre desligar o Fly.io v1 (sem uso desde o lab-54).

## Funcionalidades planejadas que NÃO foram concluídas
Todas as 9 funcionalidades planejadas em `FEATURES.md` têm código correspondente e passam
typecheck/build; nenhuma foi descartada. As ressalvas de verificação estão na seção de pendências
acima.

## O que o próximo laboratório deve desenvolver
- Testar ao vivo (dois dispositivos reais, não duas abas do mesmo navegador) o efeito de combate
  compartilhado e a colisão jogador-jogador, que só foram verificados por código nesta sessão.
- Se o usuário reportar cor de roupa ou cabelo remoto errado em campo, investigar
  `applyRemoteAppearance` primeiro (é onde os 4 eixos de cor e o cabelo do jogador remoto são
  aplicados).
- Retomar as pendências do lab-72 que continuam em aberto (HUD de recompensa de combate; Fly.io).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl` (worktree, a partir de `main`; PR #5 ainda aberto,
  cobrindo labs 58-61 — este laboratório entra no mesmo PR até o usuário decidir mesclar).
- Como rodar/verificar o que foi construído neste laboratório: `cd app && npm run dev`, abrir duas
  abas — uma equipa chapéu/roupa/cabelo na lojinha, a outra deve ver essas mudanças no boneco
  remoto em tempo real. Pra testar o combate compartilhado e a colisão, dois jogadores próximos um
  do outro (ou em Marte, pro ataque). `npx tsc -b` e `npm run build` (dentro de `app/`) confirmam
  que o build de produção está limpo.
