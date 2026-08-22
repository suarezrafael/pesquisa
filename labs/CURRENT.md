# Laboratório atual

Último concluído: labs/lab-75-rochas-flutuando/ (rochas grandes do sorteio geral de decoração
paravam de flutuar perto de bordas íngremes de platô — mais visível no computador, que tem quase
3× mais props que o celular; escala de renderização era só coincidência, não causa raiz)
Contexto para o próximo laboratório: labs/lab-75-rochas-flutuando/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Se o usuário reportar objetos flutuando de novo** (lab-75): pedir um print com o jogador parado
bem perto do objeto — a correção deste laboratório só cobre rocha/cacto do sorteio geral de props
e do deserto; se for outro tipo de objeto ou outro sistema, é uma fonte diferente. Lembrar também
que o sistema de chuva dinâmica (`window.__forceRain(true/false)` em dev) pode deixar a cena
inteira acinzentada por 20-90s — não confundir com um bug de renderização antes de descartar isso.

**Pendência de verificação (lab-73)**: chapéu remoto foi confirmado ao vivo em duas abas; arma/
efeito de ataque compartilhado e colisão jogador-jogador só foram verificados por leitura de
código + build limpo, não ao vivo — ver `labs/lab-73-multiplayer-visual-e-personalizacao/
CONTEXT.md` pra detalhes e o que testar primeiro se algo for reportado errado.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); (3) se a legibilidade de
fonte no celular (labs 67-72) voltar a ser reportada como insuficiente mesmo em 1.6x, o próximo
passo é revisar CONTRASTE (`outlineWidth`/`outlineColor`), não aumentar o tamanho de novo.

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-75-rochas-flutuando/CONTEXT.md`.
