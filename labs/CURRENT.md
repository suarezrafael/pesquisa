# Laboratório atual

Último concluído: labs/lab-61-combate-e-voo-do-foguete/ (foguete aponta pro planeta de destino
durante o cruzeiro do voo, pousando de ré; espada e arma a laser pegáveis no planeta principal pra
nocautear ETs/robôs em Marte, com dicas de localização — sem elas o combate do lab-60 era
impossível de vencer)
Contexto para o próximo laboratório: labs/lab-61-combate-e-voo-do-foguete/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-60) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

Pedidos pendentes: (1) usuário testar ao vivo — voo do foguete (câmera/orientação apontando pro
destino), facilidade de achar a espada/arma, justiça do combate em Marte; (2) confirmar se a
recompensa em moeda do combate atualiza o HUD de verdade (suspeita de atraso de re-render só no
ambiente de teste automatizado, ver CONTEXT.md do lab-61); (3) thin instancing continua sendo o
maior alavanca de performance não puxado (documentado desde o lab-53); (4) decidir sobre desligar
o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-61-combate-e-voo-do-foguete/CONTEXT.md`.
