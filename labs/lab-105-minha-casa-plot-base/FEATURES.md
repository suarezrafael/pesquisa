# Laboratório 105 — Minha Casa (primeira fatia: plot base gratuito)

Status: em andamento
Início: 2026-08-29
Fim: -
Commit inicial: 0f258a85547bfe07c355d1fbb61bcb1377b699a3

## Objetivo do laboratório
Construir a PRIMEIRA fatia de "Minha Casa" (`docs/plano-comercial-backend.md`, catálogo de
cosméticos Fase E, item ainda não construído — escolhido pelo usuário entre 4 frentes de backlog
de produto não implementadas: Minha Casa / Fase F Stripe produção / e-mail semanal via Resend /
múltiplos perfis de criança por família). O documento de origem já avisa que o sistema completo
"viraria seu próprio laboratório dado o tamanho" — este laboratório entrega só a base: um plot/casa
FIXO, GRATUITO pra todo jogador (mesmo princípio já aplicado em progressão/cooperação: nunca gatear
conteúdo social/de exploração atrás de assinatura, só cosmético), que o boneco pode entrar e sair
andando. Mobília comprável com moeda e os dois conjuntos exclusivos de assinante ("Quarto Espacial"
🚀, "Jardim Encantado" 🌷) ficam para laboratórios seguintes.

## Investigado antes de planejar
- `docs/plano-comercial-backend.md` (linhas 130-184): especifica plot gratuito + mobília avulsa
  comprável com moeda + 2 conjuntos temáticos exclusivos de assinante; "modo visita" (ver casa de
  amigo) é P2 explícito, fora de escopo até revisão de segurança infantil equivalente ao quick-chat.
- Precedente mais próximo já construído: `labs/lab-93-carteira-de-estudos-e-conquistas/` — objeto
  FIXO único perto do spawn (`terrainGroundRadial` + `settleMeshOnTerrain`), gatilho de proximidade
  abre uma interação, pose "sentado" congela só a pose do boneco (nunca física/input/posição — bug
  real encontrado e corrigido lá quando a primeira versão gateava o bloco inteiro). Mesma lição se
  aplica aqui: entrar/sair da casa deve mexer só em câmera/estado visual, nunca travar o loop de
  física.
- Precedente de estrutura com interior andável: as escolinhas de missão (`World3D.tsx`, paredes +
  telhado + professor) já são "prédios" que o boneco entra fisicamente hoje — `settleMeshOnTerrain`
  já sabe excluir telhado/professor da amostragem de altura (`excludeFromSampling`, lição do lab-95:
  incluir peças que não tocam o chão distorce o assentamento do prédio inteiro). Minha Casa reusa
  esse padrão de construção (paredes+telhado+chão assentados no terreno), não o padrão mais simples
  da carteira (objeto decorativo sem interior).
- Decisão de arquitetura tomada nesta sessão (sem pergunta ao usuário, por consistência com o resto
  do jogo): casa é um espaço 3D ANDÁVEL de verdade (não uma tela de menu/painel 2D) — o jogo inteiro
  já é uma exploração 3D contínua (Roblox/Brookhaven RP é a referência de produto já confirmada para
  a Fase E), e um painel 2D quebraria essa linguagem só pra esta feature. Interior é uma casca
  simples (paredes+telhado+chão, um cômodo só) — mobília deste laboratório é decorativa e fixa
  (não comprável/posicionável ainda), só pra a casa não ficar vazia.

## Funcionalidades planejadas
- [ ] Estrutura fixa "Minha Casa" perto do spawn (perto da carteira de estudos, mas sem competir
      posicionalmente com ela nem com o ponto de chegada) — paredes, telhado, chão, uma porta
      (abertura sem física de porta de verdade, só um vão) — reaproveita
      `terrainGroundRadial`/`settleMeshOnTerrain`/`excludeFromSampling` (padrão das escolinhas).
- [ ] Jogador consegue ANDAR pra dentro e pra fora livremente (colisão das paredes deixa passar só
      pelo vão da porta; chão interno sólido) — sem gatilho de proximidade que trave nada, ao
      contrário da carteira/quiz (aqui não há pose especial nem painel obrigatório).
- [ ] Mobília decorativa fixa dentro (cama + mesa, reaproveitando os materiais PBR já usados na
      carteira — `deskWoodMat`-like) — não comprável, não posicionável, só preenche o espaço.
- [ ] Rótulo/indicador visual (mesmo padrão da carteira: `TextBlock` com emoji, `linkWithMesh`) —
      🏠 sobre a casa, visível de longe.
- [ ] Verificação ao vivo (browser automation ou build local): jogador anda até a casa, entra pelo
      vão da porta, anda dentro, sai — sem travar física/input, sem clipping visual óbvio.

## Fora de escopo (explicitamente adiado)
- Mobília comprável com moeda (loja de móveis) — próximo laboratório desta frente.
- Os dois conjuntos temáticos exclusivos de assinante ("Quarto Espacial", "Jardim Encantado") —
  requer o sistema de mobília comprável existir primeiro.
- "Modo visita" (ver a casa de um outro jogador) — P2 explícito no documento de origem, precisa de
  revisão de segurança infantil própria antes de qualquer implementação.
- Persistência de posição de mobília customizada (não existe ainda mobília móvel neste laboratório).
