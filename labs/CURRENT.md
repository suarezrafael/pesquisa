# Laboratório atual

Último concluído: labs/lab-40-limite-de-playtesting-automatizado/ (hook `__debugSetFacing` +
descoberta de um limite prático: cronometrar pulos com precisão de fração de segundo não é
viável via chamadas sequenciais de automação de navegador — latência de ferramenta é maior que a
janela de tempo que o mecanismo exige)
Contexto para o próximo laboratório: labs/lab-40-limite-de-playtesting-automatizado/CONTEXT.md

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`
(ainda não mesclada — usuário pediu merge, mas esta sessão não pode mesclar em main; ver comando
de merge/PR em `labs/lab-40-limite-de-playtesting-automatizado/CONTEXT.md`, seção "Estado do
repositório ao final").

**Nenhum pedido novo pendente.** Todos os mecanismos construídos nesta sessão (labs 31-40) já
passaram por verificação estática (raycast/build/posição exata) via automação; a única forma
confiável de confirmar mecanismos com timing fino (como o parkour de laser) daqui pra frente é o
usuário jogando de verdade — automação de navegador não tem a precisão de tempo necessária pra
isso (ver `labs/lab-40-limite-de-playtesting-automatizado/CONTEXT.md`).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-40-limite-de-playtesting-automatizado/CONTEXT.md` (o que foi feito e o que vem a seguir)
e rode a skill `lab` no modo `start` pra abrir o próximo laboratório.
