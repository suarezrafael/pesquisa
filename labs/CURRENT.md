# Laboratório atual

Último concluído: labs/lab-70-legendas-maiores-e-painel-estreito/ (fonte das legendas AUMENTA em
tela pequena em vez de reduzir — o oposto do que os labs 67/68 tentaram, seguindo o pedido direto
do usuário; teto do pior nível de resolução reduzido de 2.2 pra 1.6; painel do HUD com largura
proporcional à tela em vez de fixa)
Contexto para o próximo laboratório: labs/lab-70-legendas-maiores-e-painel-estreito/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Boa notícia confirmada pelo usuário**: o Redmi Pad 2 está "perfeito" depois do lab-69 (escala
1.15, FPS bom, qualidade compatível). O Poco C75 continuava ilegível mesmo no pior nível (escala
1.80 antes desta rodada) — este laboratório reduziu o teto pra 1.6 e AUMENTOU a fonte (inverteu a
direção tentada nos labs 67/68). Ainda não confirmado no aparelho real.

**Se o Poco C75 continuar inviável mesmo depois desta rodada**, considerar que o gargalo real
desse aparelho é CPU/física por quadro (não fill-rate/resolução — o próprio usuário reportou FPS
travado em ~20 mesmo no pior nível de downscale), o que só se resolveria com uma alavanca maior
(thin-instancing ou octree de seleção, ambos já avaliados e adiados por risco de regressão sem
aparelho real pra testar — ver CONTEXT.md dos labs 66/67).

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-70-legendas-maiores-e-painel-estreito/CONTEXT.md`.
