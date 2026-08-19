# Laboratório atual

Último concluído: labs/lab-54-relay-v2-cloudflare/ (relay de multiplayer migrado pro Cloudflare
Workers — plano Free de verdade, sem cartão de crédito, ao contrário do Fly.io que agora só dá
2h/7 dias de trial. Novo app/server-cf-relay/ fala o mesmo protocolo do v1, jogo já aponta pra lá
em produção, testado ao vivo com dois clientes reais)
Contexto para o próximo laboratório: labs/lab-54-relay-v2-cloudflare/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relay de multiplayer ao vivo (v2, Cloudflare — em uso)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev
**Relay v1 (Fly.io — ainda no ar, mas o jogo não usa mais)**: https://missao-aprender-relay.fly.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`
(usuário pediu merge + apagar a branch — esta sessão não pode mesclar em main nem apagar a
branch; ver comando de merge em
`labs/lab-54-relay-v2-cloudflare/CONTEXT.md`, seção "Estado do repositório ao final").

Pedido pendente: perguntar ao usuário se quer desligar o app do Fly.io (v1) agora que o v2 está
validado em produção, ou deixá-lo como fallback manual.

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-54-relay-v2-cloudflare/CONTEXT.md` (o que foi feito, como redeployar cada peça, e o que
vem a seguir).
