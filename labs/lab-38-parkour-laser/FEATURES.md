# Laboratório 38 — Quarto parkour: plataformas retangulares com laser

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: b6b2ca3b0d650668b7a8ccff80da8e39521fd792

## Objetivo do laboratório
Pedido do usuário: "criar um parkour que tem laser nos quadradinhos, mas eles devem ser
retangulares e para passar pro retângulo mais alto tem que pular antes o laser, se pisar no laser
fazer animação de morrendo e caindo até o planeta novamente."

## Funcionalidades planejadas
- [x] Plataformas RETANGULARES (2,0 × 0,8, bem mais larga que funda — pedido explícito, não
      quadradas como as dos outros três parkours), em linha reta (sem ziguezague — o laser já é
      o desafio principal).
- [x] Um feixe de laser guardando a entrada de cada plataforma, numa altura fixa (`LASER_HEIGHT
      = 0.5`) acima da plataforma anterior — andando normal nunca ultrapassa essa altura (fica
      ~0), só um pulo de verdade (apex ~1,2) consegue. Espaçamento verificado num script isolado
      ANTES de escrever o código de cena (mesma prática do lab-36): maior distância entre
      plataformas = 1,39, bem dentro do alcance já comprovado dos outros parkours (~2,1-2,36);
      folga de 0,7 entre a altura do laser e o pulo máximo.
- [x] Detecção de "pisar no laser": decompõe a posição do jogador relativa a cada feixe em
      componente radial (altura) e lateral (distância da "linha" do feixe) — conta como acerto só
      quando lateralmente perto E baixo demais (não pulou alto o bastante).
- [x] Animação de "morrendo e caindo até o planeta" — ao acertar: som de "zap" sintetizado
      (`playLaserZap`, novo em `ambientAudio.ts`), controle do jogador suspenso por 2,2s
      (`laserStunTimer`), um empurrão inicial pra fora da plataforma (sem isso a física manteria
      o personagem apoiado indefinidamente), e uma cambalhota contínua na visual enquanto a
      gravidade real (já existente, aplicada todo quadro) leva o personagem de volta pro chão de
      verdade — não teleporte, física de verdade.
- [x] Verificação: `npm run build` passa (2 rodadas — a primeira com um erro de variável não
      usada, corrigido); ao vivo, as 8 plataformas confirmadas com colisão física, os 8 feixes de
      laser confirmados, 6 moedas no topo confirmadas; teleportado o jogador EXATAMENTE na posição
      de um laser e medido, via física real (não estado interno lido por cima): velocidade
      não-nula aparecendo logo depois (confirma o empurrão), altura radial caindo ao longo do
      tempo (confirma queda de verdade), e finalmente pousando sobre o planeta de verdade
      (raycast filtrado confirmando colisor `'planet'`, velocidade quase zero). Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Testar jogando de verdade (pular manualmente sobre os lasers, não só a detecção de acerto) —
  toda a verificação foi via física real simulada por script, não uma sessão de jogo humana.
