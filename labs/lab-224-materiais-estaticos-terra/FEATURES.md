# Laboratorio 224 - Materiais estaticos da Terra

Status: em andamento
Inicio: 2026-09-22
Fim: -
Commit inicial: 1fe3205d398455751ce4aad5a9fbae6614cfe303

## Objetivo do laboratorio

Reduzir o trabalho de CPU do Babylon congelando somente materiais comprovadamente imutaveis da
Terra, com classificacao explicita, telemetria e testes que impeçam a inclusao acidental de
materiais dinamicos.

## Funcionalidades planejadas

- [ ] Criar um helper testavel para congelar materiais estaticos uma unica vez e informar a
  contagem auditada (referencia: `labs/lab-223-instancias-estrutura-escolas/CONTEXT.md`).
- [ ] Congelar uma primeira familia conservadora de materiais estaticos da Terra depois de toda a
  configuracao inicial, sem congelar materiais que mudam em runtime (referencia: backlog 193).
- [ ] Manter uma lista explicita de exclusao para avatar, pets, telhados/portais de quest, agua,
  moedas, efeitos, puzzles e qualidade grafica dinamica.
- [ ] Expor materiais totais/congelados no HUD e no relatorio `window.__perf`.
- [ ] Adicionar cobertura automatizada e comparar o mesmo roteiro do Lab 223 no Edge, alem de
  validar TypeScript forcado, suite completa, lint e build.

## Fora de escopo (explicitamente adiado)

- Congelar todos os materiais da cena ou usar `scene.freezeActiveMeshes()`.
- Alterar shader, iluminacao, textura, paleta, qualidade visual ou quantidade de objetos.
- Congelar materiais de avatar, pets, agua, quests, efeitos, minijogos ou planetas secundarios.
- Tratar o FPS da automacao como equivalente a Redmi Pad 2 ou Poco C75 fisico.
