# Contexto — Laboratório 67 — Contador de FPS em produção, auto-ajuste contínuo e legenda ilegível no tablet

Preenchido em: 2026-08-22
Commit inicial → final: 2bd207d5b90509da3627bcfd25c5cd698ef14e4e..HEAD

## O que foi feito

1. **Contador de FPS sempre visível** (`World3D.tsx`) — removido `import.meta.env.DEV &&` tanto
   da atualização do texto quanto da renderização do `<div ref={debugRef}>`. String agora inclui
   também a escala de resolução atual (`engine.getHardwareScalingLevel()`), pra dar um número
   concreto e reportável (não só "ainda tá lento") em qualquer relato futuro de performance.
2. **Auto-ajuste de resolução por FPS virou contínuo** — a versão anterior (lab-58) rodava um
   `setTimeout` (6s) seguido de um `setInterval` que colhia 3 amostras e se auto-cancelava pra
   sempre. Agora `runAutoTuneCycle()` se re-agenda (`setTimeout` de 6s de descanso) depois de cada
   decisão, rodando indefinidamente enquanto a cena existir — reage tanto a piorar (entrar numa
   área pesada do mapa) quanto a melhorar (voltar pra uma área leve) ao longo de toda a sessão.
3. **Legenda ilegível no tablet corrigida** — `isSmallScreen = Math.min(window.innerWidth,
   window.innerHeight) < 500` substituiu `isLowEndDevice` como o sinal que decide `mobileFontSize`
   escalar a fonte pra baixo. `isLowEndDevice` continua controlando resolução/sombra/contagem de
   props sem nenhuma mudança.

## Decisões técnicas tomadas

- **Separar "aparelho fraco" de "tela física pequena"** — os dois eram controlados pelo MESMO
  booleano (`isLowEndDevice`, baseado em user-agent) porque, na prática, isso costuma coincidir em
  CELULAR (GPU fraca E tela pequena, mesmo aparelho). Um TABLET grande (Redmi Pad 2, ~11") quebra
  essa suposição: tem a mesma GPU fraca de um celular (precisa de resolução/sombra reduzidas), mas
  a tela é grande o bastante pra não precisar de fonte reduzida — reduzir do mesmo jeito deixa o
  texto minúsculo sem necessidade nenhuma. Corrigido usando a dimensão REAL da janela (`Math.min`
  de largura/altura, pra não confundir celular deitado com tablet) só pra essa decisão específica.
  Bug relatado ao vivo pelo usuário, com uma pista valiosa: só apareceu depois que ele desativou o
  modo "Site para computador" do Chrome no tablet — enquanto esse modo estava ativo, o user-agent
  mascarado fazia `isLowEndDevice` dar `false` (nenhuma otimização de aparelho fraco rodava, nem
  a redução de fonte, escondendo os dois problemas ao mesmo tempo).
- **Octree de seleção avaliado e adiado** (ver `FEATURES.md` "Fora de escopo" pro raciocínio
  técnico completo) — leitura direta do código-fonte do Babylon.js confirmou que ajudaria de
  verdade (substitui a seleção de malhas ativas por quadro, o custo real por trás de "lag ao mover
  a câmera"), mas o mecanismo de atualização automática do Babylon só cobre malhas importadas via
  `SceneLoader` — praticamente tudo neste jogo nasce via `.clone()`/`MeshBuilder` em tempo de
  execução (jogadores remotos, efeitos de combate), que NÃO entram no octree sozinhos depois de
  criado. Sem atualizar manualmente em cada ponto de criação de malha (arriscado esquecer um e
  causar algo invisível), decidi não implementar — mesmo padrão de risco já registrado pro
  thin-instancing nos labs anteriores.

## Pendências / dívidas conhecidas

- **Efeito real da mudança de auto-ajuste contínuo só se confirma quando o usuário testar de
  novo** — a lógica é uma extensão direta e de baixo risco do mecanismo já existente (só virou
  recorrente), mas sem aparelho físico não dá pra medir o ganho de verdade.
- **Se "lag ao mover a câmera" persistir**, a alavanca que resta é o octree de seleção — mas só
  vale a pena com um plano melhor de auditoria (mapear e atualizar TODOS os pontos de criação
  dinâmica de malha) ou acesso a um aparelho real pra testar exaustivamente. Ver raciocínio
  completo no `FEATURES.md` deste laboratório antes de tentar.
- **Lembrete útil pro usuário**: testar sempre com o modo "Site para computador" do Chrome
  DESLIGADO no tablet — com ele ligado, o jogo trata o aparelho como desktop e nenhuma otimização
  de aparelho fraco roda, dando uma falsa impressão de que as otimizações não estão funcionando.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as três correções pedidas (contador de FPS em produção, continuar otimizando, legenda
ilegível) foram implementadas e confirmadas ao vivo (o contador de FPS diretamente; o auto-ajuste
contínuo e a correção de fonte por revisão de código, já que ambos dependem de medir num aparelho
fraco de verdade, que não está disponível nesta sessão).

## O que o próximo laboratório deve desenvolver

1. Aguardar o próximo teste do usuário no Redmi Pad 2 (com "Site para computador" desligado) — o
   contador de FPS em produção agora deve dar números concretos pra decidir o próximo passo.
2. Se ainda insuficiente, considerar o octree de seleção com um plano de auditoria completo dos
   pontos de criação dinâmica de malha (jogadores remotos, efeitos de combate em Marte, e
   qualquer outro `MeshBuilder`/`.clone()` em tempo de execução que uma varredura encontrar).
3. Itens antigos ainda pendentes, sem mudança: confirmar se a recompensa em moeda do combate
   atualiza o HUD; decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); confirmar se a
   correção do PWA (lab-65) resolveu o problema de versão antiga no celular do usuário.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PR #5 (labs 58-61) ainda aberto —
  este laboratório continua no mesmo PR até o usuário mesclar.
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes` (feito ao final deste laboratório).
