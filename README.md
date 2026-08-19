# Missão Aprender

Jogo educativo 3D pra crianças (~10 anos): um mini-planeta esférico com escolinhas espalhadas
pela superfície, cada uma abrindo um quiz de lógica, matemática ou leitura. Caminhar, pular,
dirigir carro, fazer parkour, cuidar de bichos, trocar de avatar numa lojinha e jogar junto com
outros jogadores em tempo real — tudo rodando no navegador, sem instalar nada.

**Jogo ao vivo**: https://app-two-flax-92.vercel.app

Construído em iterações pequenas chamadas "laboratórios" (`labs/lab-NN-slug/`) — cada uma com um
`FEATURES.md` (o que foi planejado) e um `CONTEXT.md` (o que foi feito e por quê). `labs/CURRENT.md`
sempre aponta pro laboratório mais recente; é o primeiro arquivo a ler pra retomar o projeto do
zero. Este README dá a visão geral; os laboratórios têm o histórico detalhado, decisão por decisão.

## Stack técnica

- **Frontend**: React 19 + TypeScript + Vite.
- **Motor 3D**: [Babylon.js](https://www.babylonjs.com/) — materiais PBR, sombras dinâmicas, SSAO2,
  tonemapping ACES, `GlowLayer`, iluminação por HDRI real (CC0), modelos glTF (Kenney Nature Kit,
  CC0), thin instances pra grama (2600 folhas, 1 draw call só), `ShaderMaterial` customizado
  (grama balançando com o vento).
- **Física**: [Havok](https://www.havok.com/) (plugin oficial gratuito do Babylon) — física de
  corpo rígido de verdade, não aproximação visual: gravidade radial em direção ao centro do
  planeta, controlador de personagem em cápsula, colisão de terreno via malha física real.
- **Áudio**: 100% sintetizado via Web Audio API — nenhum arquivo de áudio externo é baixado.
  Vento, chuva, trovão, trilha chiptune (várias faixas alternando), passos, sons de animais,
  moeda, laser.
- **PWA**: instalável, `vite-plugin-pwa`/Workbox.
- **Persistência**: só `localStorage` — sem conta/backend (decisão consciente, ver seção
  "Limitações conhecidas").
- **Multiplayer**: WebSocket cru. Relay v1 (`app/server/relay.cjs`, Node, hospedado no Fly.io) →
  relay v2 (`app/server-cf-relay/`, Cloudflare Workers + Durable Objects) — migrado porque o
  plano gratuito do Fly.io encolheu pra um trial de 2h/7 dias, exigindo cartão de crédito depois
  disso. O v2 fala exatamente o mesmo protocolo do v1.
- **Deploy**: frontend no Vercel (`vercel --prod`), relay no Cloudflare Workers (plano Free, sem
  cartão de crédito).

## Arquitetura

Regra principal (`docs/prompts/03-arquitetura-sistema.md` §1): **lógica de domínio separada do
motor de renderização**. `src/data/quests.ts`, `src/state/progression.ts`, `src/types.ts` não
sabem nada sobre Babylon — só regras (progressão, XP, quests, entitlements). Isso já foi
comprovado na prática: o hub trocou de 2D pra 3D (lab-02) sem tocar em nenhum desses arquivos.

```
app/
  src/
    data/          # quests, avatares, chapéus, eventos semanais, catálogo de chat — dados puros
    state/         # progressão (XP/nível/badges), regras de desbloqueio — sem I/O, sem Babylon
    world3d/       # tudo Babylon.js: cena, física, avatar, multiplayer, áudio, HUD
      World3D.tsx       # arquivo principal da cena — setup, loop de física/render, todos os builders
      multiplayer.ts    # cliente WebSocket (fala com o relay v1 ou v2, mesma interface)
      ambientAudio.ts   # toda síntese de áudio (Web Audio API)
    types.ts       # Profile, Progress — contratos entre domínio e UI
  server/            # relay v1 (Node + ws, Fly.io)
  server-cf-relay/   # relay v2 (Cloudflare Workers + Durable Objects)
labs/                # histórico de laboratórios (FEATURES.md + CONTEXT.md por lab)
docs/prompts/        # padrão de qualidade de engenharia (segurança, design, arquitetura, clean code)
```

### Multiplayer: v1 → v2

Os dois relays (`app/server/relay.cjs` e `app/server-cf-relay/src/index.ts`) falam o **mesmo
protocolo**: mensagens `welcome`/`state`/`chat`/`leave` em JSON puro sobre WebSocket, broadcast
simples (sem salas — todo mundo que conecta cai no mesmo grupo). `app/src/world3d/multiplayer.ts`
não sabe qual dos dois está do outro lado — só lê `VITE_RELAY_URL` (`app/.env.production`) em
tempo de build. O v1 usa `ws` (Node) num processo sempre ligado no Fly.io; o v2 usa a WebSocket
Hibernation API de um Durable Object no Cloudflare Workers (permite hibernar entre mensagens,
plano Free, sem cartão de crédito — o motivo real da migração).

### Otimização pra dispositivos fracos

A cena inteira (~1900 meshes, sombras, SSAO, antialiasing) roda tranquilamente em desktop, mas
pesava demais em tablets de entrada (relatado num Redmi Pad 2). Detecção por user agent móvel
ativa um caminho de qualidade reduzida: resolução interna menor (`hardwareScalingLevel`), sem
antialiasing/MSAA/FXAA, sem SSAO2, sombras em resolução menor e sem nenhum caster, menos
partículas de chuva, e menos itens decorativos (props/pedras/bichos/nuvens/NPCs) — tudo isolado
atrás de uma detecção só, sem duplicar lógica, e sem nenhuma mudança pro caminho desktop.

## O que tem no jogo

**Mundo e movimento**: mini-planeta esférico com gravidade radial de verdade (força em direção ao
centro, não "pra baixo" uniforme — o gancho narrativo de por que o personagem é pequeno num
planetinha), relevo real com platôs/montanhas, controle tipo carrinho (direção + acelerar/frear),
joystick virtual + botões de toque (pular/correr) no mobile, corrida (Shift), pulo físico de
verdade.

**Conteúdo educativo**: 21 escolas/quests (`src/data/quests.ts`) em três tipos — lógica, matemática
básica, leitura/interpretação — com desbloqueio sequencial. Um prédio à parte ("Prédio dos
Enigmas") com quiz surpresa em cada um dos 4 andares, recompensa só em moedas.

**Progressão**: XP, moedas, níveis, badges — tudo local (`localStorage`). Lojinha de avatares (12
criaturas, cada uma com peças 3D próprias — orelha/rabo/chifre/etc., não só cor) e chapéus
(eixo de customização independente). Eventos semanais determinísticos (sem servidor: calculados a
partir do número da semana ISO).

**Mundo vivo**: bioma de deserto, 12 montanhas com rochas de verdade, 7 espécies de bicho (coelho,
esquilo, pássaro, gato, cachorro, onça, falcão — 39 no total, com IA de vagar e mini-jogo "Amigo
dos Bichos"), lagoa com peixe/pato/tartaruga, clima dinâmico (chuva + trovão/raio), estrada com
carros dirigíveis, 21 escolas + professor em cada, lojinha navegável, torre do tesouro, 4 cursos
de parkour (incluindo um com laser que precisa pular por cima).

**Multiplayer**: outros jogadores conectados aparecem em tempo real (posição, animação de andar,
som de passo, balão de chat), ranking por XP/moedas, chat por catálogo fechado de mensagens
pré-definidas (nunca texto livre — ver "Segurança" abaixo).

## Segurança e privacidade infantil

Requisitos de `docs/prompts/01-seguranca.md` aplicados desde o início:

- **Sem chat de texto livre** — só um catálogo fechado de mensagens pré-aprovadas
  (`src/data/chatMessages.ts`), validado tanto no cliente quanto no servidor do relay (nunca
  confia só na validação do client).
- **Apelido, não nome real** — onboarding gera um apelido (adjetivo+animal+número) em vez de
  pedir o nome verdadeiro da criança, já que ele fica visível pra outros jogadores.
- **Sem conta/autenticação/pagamento** — esses itens continuam deliberadamente fora do MVP,
  documentados como pendência em vários laboratórios, não esquecidos silenciosamente.

## Rodando localmente

```bash
cd app
npm install
npm run dev          # servidor de desenvolvimento (Vite)
npm run build         # typecheck + build de produção
npm run preview        # serve o build de produção localmente
```

Multiplayer localmente: `cd app/server && node relay.cjs` sobe um relay na porta 3001; sem
`VITE_RELAY_URL` definido, o cliente assume esse relay local automaticamente.

## Deploy

```bash
cd app && npx vercel --prod --yes                          # frontend (Vercel)
cd app/server-cf-relay && npx wrangler deploy               # relay v2 (Cloudflare Workers)
```

## Limitações conhecidas

- Sem conta/servidor de progresso — cada aparelho guarda seu próprio progresso local
  (`localStorage`); trocar de aparelho reseta.
- Multiplayer é uma sala única global (sem salas separadas) — todo mundo conectado ao mesmo
  relay se vê.
- Sem instancing pra maioria dos objetos decorativos repetidos (só a grama usa thin instances) —
  a otimização de mobile reduz quantidade de objetos e config de renderização em vez de mudar a
  arquitetura de draw calls; converter os maiores grupos (props/pedras/bichos) pra thin instances
  é o próximo alavanca de performance se a redução atual não for suficiente.

## Mais contexto

- `prompt.md` — brief de produto original (hipóteses de mercado, escopo do MVP, stack recomendada).
- `docs/prompts/` — padrão de qualidade de engenharia (segurança, design, arquitetura, clean code)
  aplicado a todo o código do jogo.
- `labs/` — histórico completo, laboratório por laboratório, com o "porquê" de cada decisão.
