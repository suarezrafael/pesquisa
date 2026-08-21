# Laboratório atual

Último concluído: labs/lab-62-feedback-visual-de-combate/ (espada/arma agora aparecem presas na
mão do boneco assim que coletadas, com animação de golpe/tiro ao nocautear; inimigos de Marte
ganharam "colisão" por matemática de distância — não podem mais sobrepor o jogador —, além de
efeitos de ataque próprios: choque elétrico do robô, fumaça verde do ET, e um "solavanco" de
escala; anel de onda sonora pulsando ao redor do boneco em Marte)
Contexto para o próximo laboratório: labs/lab-62-feedback-visual-de-combate/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**ATENÇÃO — prioridade máxima pro próximo laboratório**: as funcionalidades deste lab-62 (espada/
arma na mão, animação de golpe/tiro, colisão com inimigos, anel de onda sonora, choque elétrico
do robô, fumaça verde do ET, solavanco de ataque) foram implementadas, compilam sem erro
(`tsc`/`build` limpos) e foram revisadas linha a linha com bastante confiança, mas o ambiente de
automação do navegador ficou instável durante esta sessão (timeouts de injeção de script em
múltiplas abas/grupos de abas, mesmo depois de recriar o grupo do zero) antes que desse pra testar
essas funcionalidades especificamente AO VIVO — diferente do padrão rigoroso mantido no resto da
sessão. Ver "Pendências" em `labs/lab-62-feedback-visual-de-combate/CONTEXT.md` pro diagnóstico
completo. Testar tudo isso ao vivo assim que possível é o item mais importante a resolver.

Outros pedidos pendentes: (1) confirmar se a recompensa em moeda do combate (lab-61) atualiza o
HUD de verdade; (2) thin instancing continua sendo o maior alavanca de performance não puxado
(documentado desde o lab-53); (3) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-62-feedback-visual-de-combate/CONTEXT.md`.
