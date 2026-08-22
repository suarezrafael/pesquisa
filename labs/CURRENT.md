# Laboratório atual

Último concluído: labs/lab-72-overlay-sobreposto-e-fonte-1-6x/ (overlay de FPS/diagnóstico
corrigido pra não sobrepor mais o painel do HUD em tela estreita — quebra em 2-3 linhas dentro
da tela em vez de "vazar" pela esquerda; fonte do celular subiu de 1.2x pra 1.6x, depois de um
screenshot real do Poco C75 confirmar que 1.2x ainda não era suficiente)
Contexto para o próximo laboratório: labs/lab-72-overlay-sobreposto-e-fonte-1-6x/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Boa notícia**: um screenshot real do Poco C75 mostrou "escala 1.40" — um valor que só existe na
tabela ATUAL (`SCALING_TIERS` do lab-70), confirmando que a correção da trava de recarregamento
(lab-71) funcionou e o aparelho finalmente está recebendo código atualizado.

**Pendência**: a legibilidade da fonte no celular já passou por três rodadas de ajuste (labs 67,
68, 70) antes de acertar a DIREÇÃO certa (aumentar, não diminuir) no lab-70, e mesmo assim 1.2x
não foi suficiente segundo o screenshot mais recente — agora em 1.6x. Se isso ainda não bastar, o
próximo passo (não uma questão de tamanho) é revisar o CONTRASTE do texto (`outlineWidth`/
`outlineColor` dos `TextBlock`), não continuar só aumentando a fonte.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-72-overlay-sobreposto-e-fonte-1-6x/CONTEXT.md`.
