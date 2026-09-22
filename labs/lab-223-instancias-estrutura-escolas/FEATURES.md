# Laboratorio 223 - Instancias da estrutura das escolinhas

Status: em andamento
Inicio: 2026-09-22
Fim: -
Commit inicial: 5027387268f63c48b2d5ee4c56f651c608dc5fb5

## Objetivo do laboratorio

Compartilhar as geometrias repetidas de paredes, fundacoes e portas das 30 escolinhas da Terra,
preservando colisao Havok individual por escola, sombras, assentamento no relevo, estado visual da
quest e o culling dos Labs 221-222.

## Funcionalidades planejadas

- [ ] Montar uma estrutura-fonte com paredes, fundacao e porta e instanciar suas folhas nas outras
  29 escolas (referencia: `labs/lab-222-instancias-professores-escolas/CONTEXT.md`).
- [ ] Manter um `PhysicsAggregate` estatico independente em cada parede instanciada, validando o
  suporte explicito de `InstancedMesh` no Havok instalado (referencia: backlog 193).
- [ ] Preservar materiais compartilhados, sombras, relevo, telhado dinamico, labels, professor e
  culling por escola (referencia: Labs 95, 206, 221 e 222).
- [ ] Expor contagens de meshes-fonte/instancias da estrutura no HUD e no relatorio de performance.
- [ ] Adicionar cobertura automatizada, medir contra o Lab 222 e validar TypeScript forcado, suite
  completa, lint, build e fluxo visual no Edge.

## Fora de escopo (explicitamente adiado)

- Instanciar telhados, que mantem material/estado dinamico proprio por quest.
- Alterar dimensoes, posicoes, relevo, quests, recompensas ou layout das escolas.
- Trocar `PhysicsAggregate` por colisores agregados ou remover colisao individual.
- Considerar FPS da automacao equivalente a Redmi/Poco fisico.
