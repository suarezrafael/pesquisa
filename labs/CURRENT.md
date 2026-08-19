# Laboratório atual

Último concluído: labs/lab-57-fix-legendas-e-hud-mobile/ (corrigida a causa raiz das legendas 3D
gigantes/borradas no celular — a textura do GUI do Babylon compartilhava a resolução reduzida da
cena 3D, agora forçada pra resolução real do aparelho; hardwareScalingLevel voltou de 1.75 pra
1.5; HUD do topo ganhou breakpoint responsivo pra tela estreita)
Contexto para o próximo laboratório: labs/lab-57-fix-legendas-e-hud-mobile/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relay de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PRs #2 e #3 já foram mesclados pelo usuário — este laboratório abriu um PR novo (ver link no
resumo da sessão; esta sessão não pode mesclar/apagar branch diretamente).

Pedidos pendentes: (1) usuário testar no Poco C75 e no Redmi Pad 2 de novo — não foi possível
emular um viewport móvel real neste ambiente de automação, a correção das legendas foi validada
por leitura do código-fonte do Babylon.GUI, não por teste visual ao vivo; (2) se ainda pesado no
Redmi Pad 2, thin instancing de verdade é o próximo alavanca (documentado desde o lab-53); (3)
decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-57-fix-legendas-e-hud-mobile/CONTEXT.md`.
