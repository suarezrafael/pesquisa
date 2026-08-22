# Laboratório atual

Último concluído: labs/lab-68-legenda-por-user-agent/ (a correção do lab-67 pra fonte das
legendas não bastou — detecção de tela pequena trocada de dimensão de viewport pra user-agent,
testada contra amostras reais de Redmi Pad 2/celular Android/iPhone/iPad/desktop; fator de
redução da fonte suavizado de 0.72 pra 0.85)
Contexto para o próximo laboratório: labs/lab-68-legenda-por-user-agent/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Pendência importante**: esta é a SEGUNDA tentativa de corrigir o tamanho da legenda no tablet
(lab-67 tentou por dimensão de viewport, não bastou; este lab tentou por user-agent, testado
contra amostras reais mas não confirmado no aparelho de verdade). Se o usuário testar de novo e
ainda estiver errado, considerar expor `isSmallScreen` no contador de FPS (lab-67) pra diagnóstico
direto em vez de continuar adivinhando.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); (3) confirmar se a
correção do PWA (lab-65) resolveu o problema de versão antiga no celular do usuário; (4) avaliar
`createOrUpdateSelectionOctree()` (lab-67) se "lag ao mover a câmera" persistir.

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-68-legenda-por-user-agent/CONTEXT.md`.
