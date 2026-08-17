# Laboratório atual

Último concluído: labs/lab-39-correcao-laser-e-teleporte-debug/ (bug real corrigido: laser do
parkour tinha falso positivo pra jogador no chão, longe do percurso; nova ferramenta de teste
`__debugTeleportExact`; os três cenários do laser — acerto, limpou, falso positivo — confirmados
com física real depois de contornar um problema de renderização da aba de automação)
Contexto para o próximo laboratório: labs/lab-39-correcao-laser-e-teleporte-debug/CONTEXT.md

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`
(ainda não mesclada — usuário pediu merge, mas esta sessão não pode mesclar em main; ver comando
de merge/PR em `labs/lab-39-correcao-laser-e-teleporte-debug/CONTEXT.md`, seção "Estado do
repositório ao final").

Nenhum pedido novo pendente. Se precisar testar algo dinâmico ao vivo via automação de navegador
numa sessão futura, ver a memória `browser_automation_frame_throttle` (abas de automação podem
parar de renderizar quadros quando só esperando sem interagir — capturar um screenshot força um
quadro real).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-39-correcao-laser-e-teleporte-debug/CONTEXT.md` (o que foi feito e o que vem a seguir) e
rode a skill `lab` no modo `start` pra abrir o próximo laboratório.
