# Laboratório atual

Último concluído: labs/lab-59-foguete-pilotavel-e-marte/ (foguete deixou de ser teleporte
instantâneo — agora o boneco entra na nave e pilota, avanço/recuo com as mesmas setas/direcional
do carro, viajando ao longo de um arco real entre os dois planetas; planetinha secundário
reskinado como Marte — chão marrom, só rochas, entradas de caverna, sem árvores; depois do
primeiro deploy, feedback do usuário em produção pediu decolagem vertical de verdade — em vez de
"de lado" — e reduzir a distância entre os planetas pra ~1,5 diâmetro do planeta principal; numa
segunda rodada de feedback, corrigido um bug real de orientação que deixava a nave "torta"
saindo/"achatada" voltando do planetinha (rotação incremental quadro a quadro em vez de
reconstruir a base do zero) e adicionado som de motor do foguete durante o voo)
Contexto para o próximo laboratório: labs/lab-59-foguete-pilotavel-e-marte/CONTEXT.md

**Jogo ao vivo**: https://app-two-flax-92.vercel.app
**Relay de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
PRs #2-#5 já foram mesclados pelo usuário — este laboratório abre mais um PR novo (ver link no
resumo da sessão; esta sessão não pode mesclar/apagar branch diretamente).

Pedidos pendentes: (1) usuário testar no Poco C75/Redmi Pad 2 — a pilotagem do foguete e a
aparência de Marte; (2) recolorir os modelos de rocha reaproveitados pro tom de Marte (cosmético
menor, ver CONTEXT.md do lab-59); (3) se ainda pesado mesmo com qualidade adaptativa, thin
instancing de verdade continua sendo o próximo alavanca (documentado desde o lab-53); (4) decidir
sobre desligar o Fly.io (v1, sem uso desde o lab-54).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-59-foguete-pilotavel-e-marte/CONTEXT.md`.
