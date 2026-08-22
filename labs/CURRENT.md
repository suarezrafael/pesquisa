# Laboratório atual

Último concluído: labs/lab-67-fps-continuo-e-legenda-tablet/ (contador de FPS + escala de
resolução sempre visível, também em produção; auto-ajuste de resolução por FPS virou contínuo em
vez de rodar só uma vez no carregamento; corrigida a legenda ilegível em tablets grandes como o
Redmi Pad 2 — a fonte reduzida agora depende do tamanho real da tela, não do mesmo sinal de
"aparelho fraco" que controla resolução/sombra)
Contexto para o próximo laboratório: labs/lab-67-fps-continuo-e-legenda-tablet/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Pendência importante**: o usuário pediu pra "seguir melhorando o FPS" — o contador agora visível
em produção deve dar números concretos no próximo teste. Se "lag ao mover a câmera" persistir, a
alavanca avaliada (e adiada) foi `scene.createOrUpdateSelectionOctree()` do Babylon.js — ajudaria
de verdade, mas exige mapear e atualizar manualmente TODO ponto do código que cria malha em tempo
de execução (jogadores remotos, efeitos de combate em Marte), senão alguma malha nova pode ficar
invisível. Ver CONTEXT.md do lab-67 pro raciocínio técnico completo antes de tentar. **Lembrete
útil pro usuário**: testar sempre com "Site para computador" desligado no Chrome do tablet — com
ele ligado, nenhuma otimização de aparelho fraco roda (incluindo o corte de piscina/lagoa do
lab-66), dando a falsa impressão de que nada mudou.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); (3) confirmar se a
correção do PWA (lab-65) resolveu o problema de versão antiga no celular do usuário.

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-67-fps-continuo-e-legenda-tablet/CONTEXT.md`.
