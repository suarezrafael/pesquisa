# Contexto - Laboratorio 217 - Performance Babylon no desktop e mobile

Preenchido em: 2026-09-21
Commit inicial -> final: 057c84228bc111e9ff95004cb849e95761b6bc56..d682c39

## O que foi feito

- Removidos framebuffer preservado e stencil sem consumidor dos quatro engines Babylon.
- Comparacoes quentes usam distancia ao quadrado por helper testado em
  `app/src/world3d/spatialPerformance.ts`.
- UI de proximidade passou a 10 Hz; NPCs/fauna distantes tambem, com tempo acumulado.
- Animacoes e IA ambientais param quando o mundo correspondente nao esta ativo.
- Foram removidos clones recorrentes de quaternion e buscas lineares de indice de quest por quadro.
- Preview 3D de avatar e pet, troca de pet e camera foram verificados no Edge sem erro de console.
- O review do Copilot encontrou e a implementacao corrigiu a atualizacao de professores/luas em
  interiores acessados a partir de planetas secundarios (`outdoorWorldActive`).

## Decisoes tecnicas tomadas

- Gatilhos, fisica e movimento continuam por quadro; apenas feedback visual tolerante a 100 ms e
  simulacao distante foram escalonados. Isso protege a resposta dos controles.
- `ScenePerformancePriority.Aggressive`, octree e freeze global ficaram de fora. A cena tem muitos
  objetos dinamicos e materiais mutaveis; habilitar essas opcoes sem classificacao completa pode
  quebrar picking, culling, clima, portais e voo.
- O benchmark automatizado de FPS nao foi usado como prova de ganho porque a aba controlada limita
  `requestAnimationFrame`. A contagem estrutural, testes e equivalencia visual sao confiaveis; a
  comparacao numerica final precisa rodar em hardware fisico.

## Pendencias / dividas conhecidas

- Medir `window.__perf.sample(15000)` antes/depois em desktop real, Redmi Pad 2 e Poco C75.
- Se `activeMeshesEvaluationTimeMs` continuar dominante, criar um lab proprio para culling por
  area/planeta e octree com registro explicito de todas as malhas dinamicas.
- Se draw calls dominarem, migrar props/escolas repetidos para instancias ou thin instances por
  material, com validacao de sombras e labels.
- `World3D.tsx` continua monolitico; separar sistemas deve ocorrer por labs pequenos, sem reescrita.

## Funcionalidades planejadas que NAO foram concluidas

- Nenhuma do escopo comprometido. O baseline numerico em hardware fisico permanece como validacao
  operacional, pois nao e reproduzivel com confianca na automacao atual.

## O que o proximo laboratorio deve desenvolver

- Expandir pets com novas especies e modelos visuais mais completos, mantendo o catalogo de
  acessorios entregue no lab-216 e o orcamento de performance protegido neste lab.
- Priorizar uma fatia pequena: ao menos duas novas silhuetas realmente distintas, preview 3D,
  desbloqueio por moedas ganhas e renderizacao no mundo, sem assinatura, gacha ou vantagem.
- Definir um limite de malhas/materiais por pet e reutilizar materiais/geometria sempre que
  possivel; validar troca repetida no preview e no companheiro sem vazamento no `ShadowGenerator`.

## Estado do repositorio ao final

- Branch: `lab-217-babylon-performance-desktop`.
- Verificacao: em `app/`, executar `npx tsc -b --force`, `npm run test -- --run`, `npm run lint` e
  `npm run build`; abrir `npm run dev` no Edge para validar mundo, camera, lojinha e pets.
