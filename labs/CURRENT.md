# Laboratório atual

Último concluído: labs/lab-51-deploy-producao/ (jogo publicado no Vercel, multiplayer publicado
via relé no Fly.io, testado ao vivo entre duas abas de navegador — dois bugs reais de deploy
encontrados e corrigidos no caminho: porta errada no fly.toml, service worker do PWA servindo
bundle antigo)
Contexto para o próximo laboratório: labs/lab-51-deploy-producao/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo**: https://missao-aprender-relay.fly.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`
(usuário pediu merge + apagar a branch — esta sessão não pode mesclar em main nem apagar a
branch; ver comando de merge em `labs/lab-51-deploy-producao/CONTEXT.md`, seção "Estado do
repositório ao final").

Nenhum pedido novo pendente. Se quiser deploy automático a cada push (CI/CD), o próximo passo
natural é conectar o GitHub ao projeto Vercel pelo painel deles.

Para retomar o trabalho numa nova sessão, leia primeiro `labs/lab-51-deploy-producao/CONTEXT.md`
(o que foi feito, como redeployar, e o que vem a seguir).
