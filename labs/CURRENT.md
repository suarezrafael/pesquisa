# Laboratório atual

Último concluído: labs/lab-55-polimento-multiplayer-performance-e-readme/ (jogadores remotos agora
mexem as pernas e emitem som de passo, balão de chat aparece sobre a cabeça de quem manda uma
mensagem — pro remetente e pra quem recebe, ranking movido pro canto superior direito, botões de
câmera por toque (◀/▶) pro lado direito da tela, mais uma rodada de otimização de FPS pro Redmi
Pad 2 (menos objetos decorativos em dispositivo fraco + matriz de mundo congelada nas props/pedras
estáticas em todo dispositivo), e um README de verdade na raiz do repo)
Contexto para o próximo laboratório: labs/lab-55-polimento-multiplayer-performance-e-readme/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relay de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
Usuário pediu merge + exclusão da branch — esta sessão não pode mesclar em main nem apagar a
branch diretamente, então foi aberto um Pull Request de verdade (ver link no CONTEXT.md do
lab-55, seção "Estado do repositório ao final") — o usuário mescla com um clique.

Pedidos pendentes: (1) usuário testar no Redmi Pad 2 real se a otimização de FPS foi suficiente —
se não, thin instancing de verdade é o próximo alavanca; (2) decidir sobre desligar o Fly.io (v1,
ainda no ar mas sem uso desde a migração pro Cloudflare no lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-55-polimento-multiplayer-performance-e-readme/CONTEXT.md`.
