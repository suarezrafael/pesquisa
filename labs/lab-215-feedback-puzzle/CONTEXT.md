# Contexto — Laboratório 215 — Feedback visual e sonoro de puzzle

Preenchido em: 2026-09-20
Commit inicial → final: `d6612c4a3670bb468c5f3378527279ffaa1c03ae..HEAD`

## O que foi feito

- Criado um `Torus` 3D único e reutilizável no Centro de Jogos. Acerto e conclusão expandem;
  tentativa incorreta contrai. Cada disparo atualiza posição, cor, escala e duração sem criar nova
  malha, partícula ou pós-processamento.
- Integrado a Memória/Padrões, Contar e Soletrar para respostas corretas, incorretas e conclusão.
- Adicionados dois efeitos Web Audio sintetizados: sequência ascendente para acerto/conclusão e
  sequência descendente suave para tentar novamente. Ambos respeitam o mute global.
- A tesselação e a duração do efeito são reduzidas quando `isLowEndDevice`; texto/emoji e a direção
  do movimento mantêm o resultado compreensível sem depender apenas da cor.
- O efeito é cancelado ao iniciar outra arena ou sair do Centro de Jogos.
- Atualizado o índice operacional: o backlog 198 agora está concluído pelos labs 207, 211, 212,
  213, 214 e 215.

## Decisões técnicas tomadas

- Reutilizar uma única malha evita alocação por resposta e mantém o custo previsível em mobile.
- `Mesh.visibility` faz o fade de modo independente do modo de transparência do `PBRMaterial`.
- Sons sintetizados evitam novos downloads e seguem o padrão já usado por `ambientAudio.ts`.
- Não foram alteradas regras, dificuldade, progresso, recompensa ou eventos de analytics.

## Verificação

- `npx tsc -b --force`: passou.
- `npm run test -- --run`: 257/257 testes passaram.
- `npm run lint`: passou com dois avisos preexistentes fora do escopo.
- `npm run build`: passou; aviso preexistente de chunks acima de 500 kB.
- Edge real: entrada no Centro de Jogos, início da arena de Memória e tentativa incorreta com duas
  cartas diferentes. O anel foi inspecionado visualmente sem cobrir HUD ou placas. O interior ficou
  entre 32 e 41 FPS durante a maior parte da validação. Um atalho temporário apenas em `DEV` foi
  usado para desacelerar a captura do efeito e removido antes do commit.

## Pendências / dívidas conhecidas

- A sessão desktop não substitui o baseline em Redmi Pad 2, Poco C75 e Android intermediário já
  pedido pelo backlog 191.
- A arena de Memória ainda é a prova de conceito documentada pelo lab 201; seu polimento mais amplo
  não faz parte deste laboratório.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma.

## O que o próximo laboratório deve desenvolver

- Fechar o baseline do backlog 191 em Android físico antes de otimizar draw calls (backlog 193).
  Se esses aparelhos não estiverem disponíveis, o próximo item implementável é completar o
  catálogo de pets e cosméticos do backlog 206, preservando o orçamento de performance.

## Estado do repositório ao final

- Branch: `lab-215-feedback-puzzle`.
- Verificação: em `app/`, executar `npx tsc -b --force`, `npm run test -- --run`, `npm run lint` e
  `npm run build`; no jogo, entrar no Centro de Jogos e responder nas arenas de Memória/Padrões,
  Contar e Soletrar.
