# Laboratório atual

Último concluído: labs/lab-63-mochila-de-armas/ (painel de "mochila" — ícone 🎒 no HUD, aparece
assim que espada e/ou arma a laser são coletadas; clicar num item destaca ele e mostra a dica de
uso; confirmado ao vivo de ponta a ponta. Também revisão de código do golpe/tiro visual do lab-62,
sem regressão encontrada)
Contexto para o próximo laboratório: labs/lab-63-mochila-de-armas/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Pendência que atravessa dois laboratórios (lab-62 e lab-63)**: os efeitos visuais de ataque dos
inimigos em Marte (choque elétrico do robô, fumaça verde do ET, feixe de laser do jogador) nunca
foram vistos AO VIVO num frame ativo — duram só 180-450ms e, nas duas rodadas de teste via
automação de navegador, o avatar morreu e foi respawnado entre uma chamada e a próxima antes de dar
tempo de flagrar a malha. Em compensação, zero erros de console em qualquer tentativa, incluindo o
ciclo completo dano→morte→respawn (só possível se as funções de VFX rodaram sem exceção). Ver
"Pendências" em `labs/lab-63-mochila-de-armas/CONTEXT.md`. Não é bloqueante — só fica pra quando
alguém puder testar num aparelho real, sem a limitação de timing da automação.

Outros pedidos pendentes: (1) confirmar se a recompensa em moeda do combate (lab-61) atualiza o
HUD de verdade; (2) thin instancing continua sendo o maior alavanca de performance não puxado
(documentado desde o lab-53); (3) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-63-mochila-de-armas/CONTEXT.md`.
