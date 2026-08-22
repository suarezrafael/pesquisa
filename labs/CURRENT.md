# Laboratório atual

Último concluído: labs/lab-73-multiplayer-visual-e-personalizacao/ (chapéu/arma/efeito de ataque
agora visíveis pros outros jogadores no multiplayer, colisão jogador-jogador via empurrão suave, e
lojinha com cor de camisa/calça/sapato/mochila + formato de cabelo, 3 opções cada)
Contexto para o próximo laboratório: labs/lab-73-multiplayer-visual-e-personalizacao/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Pendência de verificação (lab-73)**: chapéu remoto foi confirmado ao vivo em duas abas; arma/
efeito de ataque compartilhado e colisão jogador-jogador só foram verificados por leitura de
código + build limpo, não ao vivo — ver `labs/lab-73-multiplayer-visual-e-personalizacao/
CONTEXT.md` pra detalhes e o que testar primeiro se algo for reportado errado.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); (3) se a legibilidade de
fonte no celular (labs 67-72) voltar a ser reportada como insuficiente mesmo em 1.6x, o próximo
passo é revisar CONTRASTE (`outlineWidth`/`outlineColor`), não aumentar o tamanho de novo.

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-73-multiplayer-visual-e-personalizacao/CONTEXT.md`.
