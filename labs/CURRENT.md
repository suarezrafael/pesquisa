# Laboratório atual

Último concluído: labs/lab-60-inimigos-e-vida-em-marte/ (ETs e robôs em Marte que perseguem e
atacam o jogador, barra de vida no HUD, e vida zerada teleporta de volta pro planeta principal —
precisa pilotar o foguete de novo pra voltar a Marte)
Contexto para o próximo laboratório: labs/lab-60-inimigos-e-vida-em-marte/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-59) ainda está aberto — este laboratório abre mais um PR novo (ver link no resumo
da sessão; esta sessão não pode mesclar/apagar branch diretamente).

Pedidos pendentes: (1) usuário testar ao vivo — combate em Marte (dificuldade, clareza do aviso de
morte, posição da barra de vida na tela) e as correções de foguete/HUD/qualidade do lab-59;
(2) thin instancing continua sendo o maior alavanca de performance não puxado (documentado desde o
lab-53) — o combate em Marte soma mais IA por quadro, vale reconsiderar se pesa no Redmi Pad 2;
(3) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-60-inimigos-e-vida-em-marte/CONTEXT.md`.
