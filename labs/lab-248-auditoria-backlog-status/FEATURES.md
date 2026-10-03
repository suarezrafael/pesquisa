# Laboratório 248 — Auditoria de docs/backlog-status.md (labs 227-247)

Status: concluído
Início: 2026-10-03
Fim: 2026-10-03
Commit inicial: f6c5c414eb89291b487639ffd0226377ec7d6227
Prioridade: manutenção — documentação

## Objetivo do laboratório

`docs/backlog-status.md` não era atualizado desde 2026-09-23 (parava no lab-226), ~20
laboratórios atrás. Pedido do usuário: verificar PRs em draft (resolvido separadamente — PR #125/
lab-236 rebaseada sobre main) e seguir para o próximo laboratório; sem um item de backlog pronto
para avançar sem dispositivo físico/playtest/assinatura real (auditoria feita antes de escolher o
escopo), o usuário escolheu reconciliar este índice como o trabalho do lab-248.

## Funcionalidades planejadas

- [x] Conferir, via `git log`/PRs mesclados, o destino real de cada lab 227-247 (merged em `main`,
  draft, ou nunca rodou) — não confiar no texto antigo do arquivo.
- [x] Atualizar as tabelas de "Crescimento e UX" e "Jogabilidade e qualidade 3D" com os labs novos
  que avançaram itens já listados (187-190, 191, 193, 208, 210, 212-217).
- [x] Registrar as Fases D/E do backend comercial (lab-234 concluído; lab-236 em rascunho,
  rebaseado neste mesmo lab, pendente de validação com assinatura real).
- [x] Documentar os labs 241-247 (achados de review automático/acessibilidade) numa seção própria
  — não forçar encaixe num item de backlog numerado que não existe para eles.
- [x] Atualizar "Pesquisa pendente" e "Próxima ordem recomendada" refletindo que quase todo item
  restante depende de dispositivo físico, assinatura real ou playtest — não de mais código
  especulativo.

## Fora de escopo (explicitamente adiado)

- Qualquer mudança de código, comportamento ou conteúdo do jogo.
- Validar a PR #125 (lab-236) com assinatura real — depende do usuário.
- Rodar o playtest do Lab 186 ou as Pesquisas A-H — dependem de acesso a famílias/dispositivo.
