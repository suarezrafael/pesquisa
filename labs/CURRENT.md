# Laboratório atual

Último concluído: labs/lab-69-tela-branca-poco-e-qualidade/ (trava de no máximo 1 recarregamento
automático do PWA por sessão — hipótese mais provável pra tela branca relatada no Poco C75, não
confirmada; limiares de resolução do auto-ajuste retrabalhados — resolução cheia a partir de
35fps, e passo gradual em vez de pulo direto pro extremo)
Contexto para o próximo laboratório: labs/lab-69-tela-branca-poco-e-qualidade/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Pendência crítica**: o Poco C75 parou de abrir (tela branca) depois dos laboratórios anteriores
— suspeita forte (não confirmada, sem acesso ao aparelho) é um loop de recarregamento do service
worker introduzido no lab-65. A trava implementada aqui limita a automação a 1 recarregamento por
sessão, mas se a tela branca persistir, o aparelho provavelmente já está preso num estado de
cache corrompido de ANTES desta correção — só se resolve limpando os dados do site ou
desinstalando/reinstalando o PWA nesse aparelho específico, não com mais código. Ver CONTEXT.md
deste laboratório pro raciocínio completo.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); (3) avaliar
`createOrUpdateSelectionOctree()` (lab-67) se "lag ao mover a câmera" persistir.

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-69-tela-branca-poco-e-qualidade/CONTEXT.md`.
