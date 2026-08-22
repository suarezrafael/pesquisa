# Laboratório atual

Último concluído: labs/lab-71-trava-de-reload-por-tempo/ (trava de recarregamento automático do
PWA virou baseada em tempo — só ignora se o último foi há menos de 15s — em vez de "1 por sessão
pra sempre", que estava impedindo o Poco C75 de receber as correções dos labs 69/70 depois de já
ter usado seu único recarregamento permitido numa visita anterior)
Contexto para o próximo laboratório: labs/lab-71-trava-de-reload-por-tempo/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Pendência importante**: o usuário relatou uma escala de resolução (2.40, depois corrigido pra
1.80) no Poco C75 que não existe em NENHUMA versão do código desde o lab-70 — forte indício de que
o aparelho estava preso em código de pelo menos dois laboratórios atrás, provavelmente porque a
trava de recarregamento "1 por sessão" do lab-69 já tinha sido consumida numa visita anterior.
Este laboratório trocou pra uma trava baseada em tempo (15s). Aguardar o próximo teste do usuário
pra confirmar se o aparelho finalmente recebeu as correções mais recentes (escala deve aparecer
como 1.0, 1.15, 1.4 ou 1.6 — os únicos valores possíveis hoje).

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-71-trava-de-reload-por-tempo/CONTEXT.md`.
