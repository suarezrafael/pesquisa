# Laboratório atual

Último concluído: labs/lab-66-performance-redmi-pad-2/ (piscina + gente da piscina, e lagoa +
peixes/pato/tartaruga, removidas em aparelho fraco pra ajudar o FPS no Redmi Pad 2 — a decoração
mais cara do mapa; caminho padrão/desktop confirmado sem regressão)
Contexto para o próximo laboratório: labs/lab-66-performance-redmi-pad-2/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Pendência importante**: o efeito real no FPS do Redmi Pad 2 só se confirma quando o usuário
testar no aparelho de verdade — sem acesso físico a ele, a mudança foi verificada por revisão de
código + confirmação ao vivo do caminho padrão (desktop), não por medição real de FPS num
aparelho fraco. Se ainda não for suficiente, a próxima alavanca é thin-instancing das props
decorativas (árvores/rochas) — já avaliada e adiada duas vezes (antes desta sessão, e de novo
neste laboratório) por não dar pra testar num aparelho real; ver CONTEXT.md deste lab pro
raciocínio completo antes de tentar.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); (3) confirmar se a
correção do PWA (lab-65) resolveu o problema de versão antiga no celular do usuário.

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-66-performance-redmi-pad-2/CONTEXT.md`.
