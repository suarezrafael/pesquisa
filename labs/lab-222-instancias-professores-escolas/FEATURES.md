# Laboratorio 222 - Instancias dos professores das escolinhas

Status: concluido
Inicio: 2026-09-22
Fim: 2026-09-22
Commit inicial: 715e806170f94fb6257d559f2841247894757613

## Objetivo do laboratorio

Compartilhar geometria e materiais entre os 30 professores estaticos das escolinhas da Terra,
reduzindo meshes-fonte, materiais e draw calls sem alterar aparencia, sombras, assentamento no
relevo ou o culling entregue pelo Lab 221.

## Funcionalidades planejadas

- [x] Criar uma fabrica de instancias que preserve a hierarquia articulada e os transforms locais
  da figura de professor (referencia: `labs/lab-221-culling-escolinhas-terra/CONTEXT.md`).
- [x] Fazer os 30 professores das escolinhas da Terra compartilharem geometria e materiais, sem
  alterar avatar do jogador nem NPCs animados dos planetas secundarios (referencia: backlog 193 e
  proximo laboratorio recomendado pelo Lab 221).
- [x] Preservar sombras, posicao, escala, orientacao, assentamento no relevo, proximidade e culling
  por escola (referencia: Labs 95, 206 e 221).
- [x] Adicionar cobertura automatizada para a hierarquia instanciada e medir o mesmo roteiro de
  performance usado nos Labs 220 e 221 (referencia: Lab 219).
- [x] Validar TypeScript forcado, suite completa, lint, build e fluxo visual no Edge.

PR: #106

## Fora de escopo (explicitamente adiado)

- Thin instances, fusao de toda a figura em uma unica malha ou troca do modelo visual.
- Instanciar professores animados dos planetas secundarios, avatares remotos ou o jogador.
- Alterar quests, recompensas, monetizacao, colisao ou comportamento de camera.
- Considerar FPS da automacao como equivalente a Redmi/Poco fisico.
