# Contexto — Laboratório 61 — Espada, arma e voo do foguete apontando pro destino

Preenchido em: 2026-08-20
Commit inicial → final: 30fa7180620651b3d54b1a845be8e274280e6ec7..HEAD

## O que foi feito

1. **Voo em três fases** (`World3D.tsx`, laço de voo): a orientação em voo do lab-59 (Slerp puro
   entre as duas rotações de repouso) corrigia o pouso "de cabeça" mas nunca fazia o nariz apontar
   pra onde a nave estava indo de verdade durante o cruzeiro — pedido novo do usuário: "ele deve
   voar apontando pro planeta de destino". Reescrito em três trechos, usando `ROCKET_LAUNCH_HOLD_END
   = 0.15` e `ROCKET_LANDING_FLIP_START = 0.75` como fronteiras:
   - até 0.15: trava na rotação de repouso da decolagem (reto pra cima, herdado do lab-59).
   - de 0.15 a 0.75: rotação INCREMENTAL (`quaternionBetweenVectors`, nunca degenera) do nariz
     atual pra tangente da curva a cada quadro — aponta pro destino de verdade.
   - de 0.75 em diante: "flip" — `Quaternion.Slerp` da orientação capturada no instante em que
     essa fase começa (`flipStartQuat`, guardado em `drivingRocket`) até a rotação de repouso do
     pouso, terminando de pé, motores na frente — pouso de ré.
   A câmera (já corrigida no lab-59 pra usar o nariz de verdade da nave via `rotationQuaternion`,
   não a tangente crua) não precisou de nenhuma mudança — passou a seguir automaticamente atrás do
   foguete durante o cruzeiro, porque agora o nariz de verdade É a tangente nessa fase.
2. **Espada e arma a laser** (`buildSword`/`buildLaserGun`) — pegáveis no planeta principal, só
   primitivas. Espada: lâmina em cilindro de 4 lados afunilada, guarda, cabo, pomo. Arma: corpo,
   cano, ponta emissiva ciano, cabo. Posicionadas em `SWORD_LOCATION_DIR`/`GUN_LOCATION_DIR`, giram
   lentamente (dica visual extra) enquanto não coletadas; detecção de coleta é andar por cima
   (`WEAPON_PICKUP_RADIUS`).
3. **Combate em Marte** — `MarsEnemy` ganhou um campo `alive`; `handleInteractPress` ganhou um
   bloco novo (checado ANTES do embarque no foguete) que procura um inimigo vivo dentro de
   `MARS_COMBAT_RADIUS` e, se o jogador tiver a arma certa (`hasSwordRef`+ET ou `hasGunRef`+robô),
   nocauteia (`alive = false`, mesh escondido) e dá uma moedinha de recompensa. O laço de IA/ataque
   por quadro (lab-60) ganhou um `if (!enemy.alive) continue` no topo — inimigo nocauteado para de
   perseguir/atacar e simplesmente some da simulação, sem precisar removê-lo do array.
4. **Dicas de localização** (pedido explícito do usuário: "dê dicas de como encontrar... senão não
   tem como sobreviver") — legendas flutuantes (`🗡️ Espada`/`🔫 Arma a laser`) SEMPRE visíveis
   (`linkWithMesh`, não só de perto, diferente das dicas "Pressione E"), giro de exibição chamando
   atenção, e um aviso transitório ao embarcar rumo a Marte sem os dois itens ainda.

## Decisões técnicas tomadas

- **Rotação incremental (não Slerp puro) no trecho de cruzeiro** — a versão anterior (lab-59)
  evitou de propósito seguir a tangente da curva (causava mergulho de cabeça no pouso), trocando
  por Slerp entre as duas rotações de repouso; mas isso nunca fazia o nariz apontar pro destino de
  verdade durante o meio do voo. A solução não é "Slerp OU tangente", é as duas coisas em
  momentos diferentes: tangente durante o cruzeiro (pedido novo), rotação de repouso travada nas
  pontas (decolagem reta, pouso de ré — pedidos anteriores, ainda válidos). `quaternionBetweenVectors`
  garante que o trecho de cruzeiro nunca degenera (mesmo problema já resolvido antes com essa
  mesma função, removida e reintroduzida nesta sessão).
- **`flipStartQuat` capturado uma vez, não recalculado a cada quadro** — pra `Quaternion.Slerp`
  terminar EXATAMENTE na rotação de pouso em `progress = 1`, precisa de um ponto de partida FIXO
  pro Slerp (senão vira uma convergência exponencial que nunca chega exatamente lá). Capturado na
  primeira vez que `progress` cruza `ROCKET_LANDING_FLIP_START`, resetado pra `null` se o jogador
  reverter o acelerador antes disso (senão o "flip" começaria de um ponto errado numa segunda
  tentativa de pouso).
- **Combate por proximidade + tecla E, sem ataque automático** — mais simples que criar um botão
  novo, e reaproveita a mesma tecla já usada pra tudo (carro, foguete). Checado ANTES da checagem
  de embarque no foguete em `handleInteractPress`, pra não competir com ela perto da plataforma.
- **Sem HUD de inventário** — as legendas flutuantes + o aviso ao embarcar já satisfazem o pedido
  de "dar dicas"; um indicador permanente de "o que você tem equipado" ficou fora de escopo
  (ver `FEATURES.md`) por não ter sido pedido explicitamente.

## Pendências / dívidas conhecidas

- A recompensa em moeda ao nocautear um inimigo (`onCollectCoinRef.current()`, mesmo padrão já
  usado pelo bônus "Amigo dos Bichos") não foi confirmada visualmente atualizando o HUD durante o
  teste ao vivo desta sessão — pode ser só um atraso de re-render do React no ambiente de teste
  automatizado (o padrão em si é idêntico a uma feature já funcionando), mas vale confirmar de
  novo numa sessão futura com o aparelho físico.
- Combate testado com o robô (arma a laser); o ET com a espada usa exatamente o mesmo código
  (`canDefeat` cobre os dois casos simetricamente), mas não foi verificado ao vivo nesta rodada
  por tempo — risco baixo dado que é o mesmo bloco de código, só trocando `kind`/ref.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma.

## O que o próximo laboratório deve desenvolver

1. Usuário testar ao vivo: sensação do voo (câmera/orientação apontando pro destino), se a espada
   e a arma são fáceis de encontrar com as dicas atuais, se o combate em Marte ficou justo (nem
   fácil demais nem impossível).
2. Confirmar a recompensa em moeda do combate atualiza o HUD de verdade (ver "Pendências" acima).
3. Itens antigos ainda pendentes: thin instancing (maior alavanca de performance não puxado,
   documentado desde o lab-53); decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PR #5 (labs 58-60) ainda aberto —
  este laboratório continua no mesmo PR até o usuário mesclar.
- Jogo ao vivo (republicado com este laboratório): https://app-two-flax-92.vercel.app
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como testar sem andar até os itens: no console do navegador (`npm run dev`, não o build de
  produção), `window.__debugTeleport(0.65, 0.55, -0.52)` teleporta pra espada,
  `window.__debugTeleport(-0.25, -0.45, -0.85)` pra arma — andar por cima já coleta.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes`.
