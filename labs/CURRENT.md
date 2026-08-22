# Laboratório atual

Último concluído: labs/lab-65-estacao-alienigena-e-alertas-de-marte/ (contador de marcianos vivos
e vinheta vermelha de perigo por proximidade em Marte; rochas trocaram o modelo "bola" por rochas
de verdade e ganharam colisão; morros decorativos com colisão; estação alienígena em forma de
disco voador, entrável, com console de nave espacial decorativo; correção do registro do service
worker pra recarregar sozinho ao detectar uma versão nova, em vez de precisar fechar/reabrir)
Contexto para o próximo laboratório: labs/lab-65-estacao-alienigena-e-alertas-de-marte/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PR #5 (labs 58-61) ainda está aberto — este laboratório continua no mesmo PR até o usuário
mesclar. Esta sessão não pode mesclar/apagar branch diretamente.

**Pendência a confirmar no próximo laboratório (ou quando o usuário testar em aparelho real)**:
entrar na estação alienígena e ver o console de perto não foi confirmado com um screenshot
literal — o teleporte de QA nesse planeta pequeno (raio 6) deixa a câmera em terceira pessoa
encravada na curvatura do terreno com facilidade. A estrutura (paredes com física, porta, console)
foi confirmada por inspeção de cena e visualmente de fora, com alta confiança (mesmo padrão já
comprovado do Prédio dos Enigmas). Ver "Pendências" no CONTEXT.md.

Também: se o usuário testar a correção do PWA no celular e a versão antiga ainda aparecer,
investigar mais a fundo (pode ser cache específico do navegador do celular).

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) thin instancing continua sendo o maior alavanca de performance não puxado (desde o
lab-53); (3) decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-65-estacao-alienigena-e-alertas-de-marte/CONTEXT.md`.
