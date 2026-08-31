# Contexto — Laboratório 134 — Correção: casa confundida com carro + casa enterrada no relevo + raio de gatilho inalcançável

Preenchido em: 2026-08-30
Commit inicial → final: 51760bfc59fc8b3265de2b51bcaf5a991e737205..HEAD

## O que foi feito

Ver `FEATURES.md` para o resumo completo — este laboratório teve TRÊS rodadas de correção pro
mesmo sintoma relatado ("casa não aceita o comando E"), cada uma motivada por uma pista nova do
usuário:

1. **1ª causa**: a casa ficava perto demais do laço de rua dos carrinhos e usava o MESMO texto de
   dica que os carros ("Pressione E pra entrar") — o jogador via a legenda de um carro passando e
   achava que era da casa. Corrigido reposicionando a casa (2,5+ unidades de folga real da rua,
   medido por script) e diferenciando os dois textos ("...em casa" vs. "...no carro").
2. **2ª causa** (achada depois, quando o usuário reportou o MESMO sintoma de novo mesmo já sem
   cache — "acho que a causa é a casa estar enterrada na terra"): a busca de posição da 1ª correção
   não checava inclinação real do terreno, e a nova direção ficava bem perto da rampa de um platô
   decorativo — mesma classe de bug já documentada no lab-95 pras escolinhas. Corrigido
   generalizando a função de busca por relevo plano já usada pelas escolinhas
   (`findFlatterSchoolUpReal` → `findFlatterUpReal`, agora parametrizada) e aplicando-a também à
   casa.
3. **3ª causa, a mais conclusiva** (achada depois de o usuário reportar o MESMO sintoma pela
   TERCEIRA vez, já com as duas correções anteriores publicadas): `HOUSE_TRIGGER_DISTANCE` (1,2)
   era MENOR que a distância física mínima que a colisão sólida da parede da casa (`houseWalls`,
   meia-profundidade 0,7) mais o raio do avatar (`AVATAR_RADIUS = 0,55`) permite alcançar (~1,25) —
   ou seja, nenhum jogador de verdade jamais conseguiu chegar perto o bastante, em nenhuma posição,
   desde a implementação original da casa. Corrigido subindo o limiar pra `1,6`. Ver "Terceira
   causa" em `FEATURES.md` para a investigação completa, incluindo por que essa causa escapou de
   TODA verificação anterior (teleporte de depuração direto ao pivô/porta ignora a mesma colisão
   que bloqueia um jogador real).

## Decisões técnicas tomadas

Ver `FEATURES.md`. A decisão mais importante: aplicar as DUAS correções juntas (reposicionar E
diferenciar o texto), não só uma — reposicionar sozinho resolve o caso relatado, mas diferenciar o
texto é uma defesa mais robusta contra o MESMO tipo de confusão acontecer de novo no futuro se
qualquer outra coisa (um carro, outro prédio) ficar perto da casa por acidente em um laboratório
seguinte.

## Achado real na investigação (processo de diagnóstico, vale registrar)

O processo até chegar na causa raiz é o interessante aqui, não só o fix:
1. Confirmado que o deploy de hoje estava mesmo no ar (build stamp certo), mas achado um problema
   REAL e separado: o service worker do PWA servia uma versão de 3 dias atrás até ser limpo
   manualmente — registrado como dívida técnica, não a causa do bug da casa.
2. Reproduzido o bug 3 vezes em produção (teclado e toque) — real, não imaginado.
3. Tentativa de reproduzir em ambiente local controlado (`__debugTeleport` exato) funcionou de
   primeira — o CÓDIGO da interação estava correto, então o problema tinha que ser outra coisa
   (posição ou dado, não lógica).
4. **A pista decisiva veio do usuário**, não de mim: a hipótese de que os carros (com dica
   idêntica) perto da casa eram a explicação real. Medir a posição real da casa contra o laço de
   rua (`streetCenter`) confirmou a hipótese em segundos — a casa ficava a só ~1,2-1,8 unidades de
   um carro em certos momentos, dentro do raio de entrar no carro (2,0).
5. Corrigido com uma busca de posição nova medida (mesmo método já estabelecido no projeto pra
   lab-09/11/127: script varrendo candidatos, medindo distância mínima até cada obstáculo
   conhecido) — não uma direção escolhida de olho.
6. **O usuário reportou o MESMO sintoma de novo**, já em condições que descartavam cache (dados do
   site limpos no celular, onboarding pediu apelido de novo) — com uma segunda pista certeira:
   "acho que a causa é a casa estar enterrada na terra". A busca da etapa 5 media distância a
   obstáculos, mas NUNCA inclinação real do terreno.
7. Ler o próprio código revelou que essa é uma classe de bug JÁ documentada e já resolvida pras
   escolinhas no lab-95 ("TODAS AS CASA ESTÃO DENTRO DA TERRA") — causada por cair perto da rampa
   de um `PLATEAU_CENTERS`. Cálculo manual confirmou a nova direção da casa a só ~25° de um platô
   com raio ~23,5° — na borda. Corrigido reaproveitando a função de busca por relevo REAL (raycast
   físico, não fórmula) que as escolinhas já usam, generalizada pra aceitar qualquer footprint de
   prédio, e aplicada também à casa.
8. **O usuário reportou o MESMO sintoma pela TERCEIRA vez**, já com as duas correções publicadas
   nos dois servidores. Desta vez trouxe a pista decisiva: um print do HUD mostrando `CASA:1.10`
   (diagnóstico `buriedHouseReport`, novo nesta sessão) — valor SAUDÁVEL, provando que a casa NÃO
   estava enterrada — seguido de um print mostrando o avatar parado bem na frente da casa (🏠
   visível) sem efeito ao apertar E. Isso forçou reconsiderar a geometria da interação em si, não a
   posição/terreno.
9. Cálculo geométrico direto (profundidade da parede + raio do avatar) revelou que
   `HOUSE_TRIGGER_DISTANCE = 1,2` era MENOR que a distância mínima fisicamente alcançável (~1,25) —
   um bug pré-existente desde a implementação original da casa, nunca detectado porque toda
   verificação anterior (incluindo a desta própria investigação, nas rodadas 1 e 2) usava teleporte
   de depuração direto ao pivô ou à porta, uma posição que a colisão real bloqueia um jogador de
   verdade de alcançar. A verificação foi refeita teleportando pra um ponto genuinamente fora da
   colisão sólida (~1,4 do pivô, na direção de fora da porta) e deixando a física assentar por
   dezenas de quadros — resultado estável a `1,585`, dentro do novo limiar de `1,6` e fora do
   antigo `1,2`, confirmando tanto o diagnóstico quanto a correção.

**Lição pro projeto (uma de cada rodada, a 3ª é a mais importante)**: (1) quando duas interações
diferentes (carro, casa, e potencialmente outras futuras) usam o MESMO texto de dica genérico,
qualquer proximidade acidental entre elas no futuro pode reproduzir o mesmo tipo de bug de
confusão — silencioso, sem erro de console, difícil de diagnosticar sem a pista certa; (2) QUALQUER
reposicionamento de prédio neste planeta precisa passar pela busca de relevo real
(`findFlatterUpReal`), não só pela busca de distância a obstáculos; (3) **verificação por teleporte
de depuração direto ao pivô/porta de um prédio pode "passar" numa posição geometricamente
inalcançável por um jogador real**, porque ignora a mesma colisão sólida que bloqueia esse jogador —
sempre teleportar pra um ponto FORA do volume de colisão e deixar a física assentar antes de medir
distância de gatilho, nunca confiar numa medição feita a partir do pivô ou de um mesh decorativo
embutido na parede (como a porta). Essa foi a causa raiz que sobreviveu a DUAS rodadas de correção
"verificadas com sucesso" sem realmente estar corrigida.

## Pendências / dívidas conhecidas

Ver `FEATURES.md` (seção "Pendências"): cache do PWA obsoleto (backlog futuro) e nenhuma auditoria
de OUTROS pares de dica genérica idêntica além de casa/carro.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — o escopo era só corrigir o bug relatado, concluído integralmente.

## O que o próximo laboratório deve desenvolver

Ver `FEATURES.md` (seção "O que o próximo laboratório deve desenvolver") — lista completa do
backlog acumulado nesta sessão, incluindo os 4 itens novos reportados pelo usuário hoje.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 75/75 passando (sem teste novo — mudança de posição/texto/constante numérica em
  cena 3D, não lógica de domínio pura).
- `npm run build`: sem erros.
- Verificado ao vivo em ambiente local: nova posição da casa com 2,49 unidades de folga real da
  rua E confirmada segura contra relevo íngreme por `findFlatterUpReal` (busca real por raycast);
  `HOUSE_TRIGGER_DISTANCE` corrigido de 1,2 pra 1,6, verificado com o avatar assentado numa posição
  de repouso genuína fora da colisão sólida da parede (1,585 do pivô, dentro do novo limiar) —
  entrada confirmada no interior da casa via a ponte de interação. Uma confirmação adicional com
  tecla `E` sintética de verdade não foi concluída por limitação da aba de automação (em segundo
  plano); vale reconfirmar numa aba em primeiro plano ou no celular do usuário.
- Deploy: as duas primeiras correções já publicadas nos dois servidores (Vercel + Cloudflare
  Pages); a 3ª correção (`HOUSE_TRIGGER_DISTANCE`) está pronta para publicação.
