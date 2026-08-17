# Laboratório atual

Concluído: labs/lab-12-chat-seguro/
Contexto do laboratório anterior: labs/lab-12-chat-seguro/CONTEXT.md

Trabalho aconteceu na branch de worktree `worktree-abstract-wobbling-owl`, a partir de `main`
(ainda não mesclada — PR aberto:
https://github.com/suarezrafael/pesquisa/pull/new/worktree-abstract-wobbling-owl). Nenhum
laboratório novo foi aberto ainda — antes de começar o próximo, ver a lista de pedidos pendentes
(ruas+carros, loja navegável, trovão/raio, e os itens de backend/conta identificados na revisão de
`prompt.md`) no final de `labs/lab-12-chat-seguro/CONTEXT.md` e confirmar prioridade com o usuário.

Para retomar o trabalho numa nova sessão, leia primeiro `labs/lab-12-chat-seguro/CONTEXT.md`.

**Bugfix fora de lab, após o lab-12 (commit `3a3bf74`)**: "montanha invisível" relatada pelo
usuário com screenshot — colisor esférico invisível das props (árvores/rochas) deixava sobrar
saliência alta o bastante acima do chão pro personagem ficar em pé em cima dela, flutuando.
Existia desde o lab-02, só ficou visível depois do bugfix do pulo passar a fazer o personagem
visual seguir a altura real do colisor físico. Corrigido limitando a saliência acima do chão a
uma constante fixa pequena, verificado com física real (não só posição visual).
