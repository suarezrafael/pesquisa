# Laboratório atual

Último concluído: labs/lab-53-otimizacao-performance-mobile/ (otimização de renderização pra
dispositivos fracos tipo Redmi Pad 2 — detecção de dispositivo móvel/tablet via UA, e nesse
caminho: menor resolução interna, sem antialiasing/MSAA/FXAA, sem SSAO, sombra em resolução
menor e sem nenhum caster, menos partículas de chuva. Investigado o pedido de apagar peixe/rio
"abaixo da superfície" — não havia geometria de fato oculta/desperdiçada, então nada foi
removido da lagoa)
Contexto para o próximo laboratório: labs/lab-53-otimizacao-performance-mobile/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo**: https://missao-aprender-relay.fly.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`
(usuário pediu merge + apagar a branch — esta sessão não pode mesclar em main nem apagar a
branch; ver comando de merge em
`labs/lab-53-otimizacao-performance-mobile/CONTEXT.md`, seção "Estado do repositório ao final").

Pedido pendente: usuário deve testar no Redmi Pad 2 (ou outro Android/tablet de entrada) real
depois do deploy e reportar se o FPS melhorou o suficiente — ver "O que o próximo laboratório
deve desenvolver" no CONTEXT.md do lab-53 pros próximos passos se ainda estiver pesado
(instancing dos meshes repetidos é o maior alavanca restante).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-53-otimizacao-performance-mobile/CONTEXT.md` (o que foi feito, como redeployar, e o que
vem a seguir).
