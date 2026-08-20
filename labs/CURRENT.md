# Laboratório atual

Último concluído: labs/lab-58-foguete-planeta-secundario-e-qualidade-adaptativa/ (foguete +
estação de lançamento no planeta principal, tecla E embarca num planetinha secundário construído
só na primeira viagem — esfera com árvores/rochas, sem NPC —, botão de toque pra E; qualidade
gráfica adaptativa por FPS medido de verdade em vez de chute fixo; HUD do topo com clamp() fluido
em vez de breakpoint)
Contexto para o próximo laboratório: labs/lab-58-foguete-planeta-secundario-e-qualidade-adaptativa/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relay de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PRs #2 e #3 já foram mesclados pelo usuário — este laboratório abre mais um PR novo (ver link no
resumo da sessão; esta sessão não pode mesclar/apagar branch diretamente).

Pedidos pendentes: (1) usuário testar no Poco C75/Redmi Pad 2 — qualidade adaptativa, HUD com
clamp(), e o foguete/planetinha secundário (fica bem ao sul do planeta, o jogador precisa andar
até lá); (2) se ainda pesado mesmo com qualidade adaptativa, thin instancing de verdade continua
sendo o próximo alavanca (documentado desde o lab-53); (3) decidir sobre desligar o Fly.io (v1,
sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-58-foguete-planeta-secundario-e-qualidade-adaptativa/CONTEXT.md`.
