# Laboratório 215 — Feedback visual e sonoro de puzzle

Status: em andamento
Início: 2026-09-20
Fim: -
Commit inicial: d6612c4a3670bb468c5f3378527279ffaa1c03ae

## Objetivo do laboratório

Fechar a última peça do backlog "Lab 198 - Efeitos visuais de recompensa, movimento e interação"
com feedback imediato, encorajador e barato para os puzzles do Centro de Jogos. A criança deve
perceber acerto, tentativa incorreta e conclusão sem depender apenas de texto ou cor.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 198"; continuação direta do
`labs/lab-214-trilha-do-foguete/`, que deixou feedback de puzzle como única peça pendente.

## Funcionalidades planejadas

- [ ] Criar um anel 3D reutilizável no ponto de interação, com animações distintas para acerto,
  tentativa incorreta e conclusão; sem partículas contínuas ou pós-processamento novo.
- [ ] Integrar o feedback a Memória/Padrões, Contar e Soletrar, cobrindo respostas corretas e
  incorretas sem punir ou remover progresso.
- [ ] Adicionar sons sintetizados curtos e diferentes para acerto/conclusão e "tente novamente",
  respeitando o mute já existente.
- [ ] Reduzir duração/complexidade visual em `isLowEndDevice` e manter texto/emoji como canal não
  dependente de cor.
- [ ] Verificar TypeScript forçado, testes, build e fluxo no Edge quando o ambiente 3D permitir.
- [ ] Atualizar `docs/backlog-status.md` quando a última peça do backlog 198 estiver comprovadamente
  concluída.

## Fora de escopo (explicitamente adiado)

- Alterar regras, recompensas, dificuldade ou analytics dos mini-jogos.
- Shader, bloom, partículas contínuas ou novos assets de áudio.
- Levar o efeito para quizzes em modais React ou missões físicas fora do Centro de Jogos.
- Corrigir a limitação de medição em Android físico do backlog de performance.
