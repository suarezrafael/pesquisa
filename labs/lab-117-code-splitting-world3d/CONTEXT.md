# Contexto — Laboratório 117 — Reduz o peso do bundle de World3D

Preenchido em: 2026-08-29
Commit inicial → final: 90dcaa7742bb6e355014c626b53fa266d901f796..HEAD

## O que foi feito
Escolhido pelo usuário entre 3 opções de débito técnico (relatório semanal por e-mail /
code-splitting do `World3D.tsx` / auditoria de acessibilidade). Medido com
`vite-bundle-visualizer` (via `npx`, não instalado como dependência) ANTES de decidir o que cortar
— achado: `World3D.tsx` importava só `AdvancedDynamicTexture`/`TextBlock` de `@babylonjs/gui`, mas
por importar do BARRIL (`from '@babylonjs/gui'`) puxava o pacote inteiro (695KB unminificado
dentro do chunk) — controles 2D nunca usados (botão/slider/grid/imagem) e materiais de GUI 3D
nunca usados (handle/fluent/fluentButton), já que este jogo só usa `AdvancedDynamicTexture` 2D
pra legendas flutuantes.

- **`app/src/world3d/World3D.tsx`**: troca de
  `import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'` por dois imports diretos
  dos arquivos individuais do pacote:
  ```ts
  import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture'
  import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock'
  ```
  Confirmado lendo o código-fonte do pacote (`node_modules/@babylonjs/gui/2D/advancedDynamicTexture.js`
  e `.../2D/controls/textBlock.js`) que os dois só dependem de `Container`/`Control`/`Style`/
  `Measure` — nenhum dos controles 2D genéricos nem materiais de GUI 3D.

**Resultado medido** (`npm run build`, antes → depois):
| Chunk | Antes | Depois |
|---|---|---|
| `World3D-*.js` (minificado) | 918,61 kB | 626,73 kB (**-292 kB, -32%**) |
| `World3D-*.js` (gzip) | 198,15 kB | 147,86 kB (**-50 kB, -25%**) |
| `studentFigure-*.js` | 3.678,67 kB | 3.678,67 kB (inalterado, esperado) |

## Decisões técnicas tomadas
- **Só o import de `@babylonjs/gui` mudou** — era o único achado com alta confiança (código-fonte
  do pacote confirma a dependência mínima), alto retorno (695KB de ~918KB do chunk principal) e
  baixo risco (2 símbolos, um único arquivo, fácil de verificar ao vivo). Ver `FEATURES.md` pros
  outros 2 achados investigados e conscientemente adiados:
  1. **`@babylonjs/loaders/glTF` inclui glTF 1.0 morto** (~65KB) — sem confirmação de como
     reconstruir a cadeia de registro do loader só com 2.0 sem quebrar carregamento de modelo;
     risco não compensa a economia pequena.
  2. **O chunk `studentFigure-*.js` (3,68MB!) é >99% `@babylonjs/core`**, incluindo blocos como
     `XR` (450KB) e `FrameGraph` (587KB) que este jogo nunca usa — mas isso vem de acoplamento
     INTERNO das próprias classes `Scene`/`Engine` do Babylon.js (referenciam esses subsistemas
     por dentro, não por causa de como este projeto importa), não corrigível só trocando imports
     daqui. Corrigir isso exigiria reescrever TODOS os imports de `@babylonjs/core` do projeto
     inteiro (~35 símbolos em `World3D.tsx` sozinho) pra caminhos profundos, sem garantia de
     eliminar o acoplamento — é limitação documentada do próprio motor. Escopo grande demais pra
     este laboratório.
- **`vite-bundle-visualizer` não virou dependência** — rodado só via `npx` durante a investigação;
  qualquer sessão futura pode medir de novo do mesmo jeito (`npx vite-bundle-visualizer`) sem
  precisar instalar nada no projeto.
- **Nenhuma mudança de arquitetura de jogo** (a real "code-splitting por planeta", carregando cada
  `buildXIfNeeded()` sob demanda) foi tentada — exigiria desacoplar cada construtor de planeta das
  dezenas de variáveis compartilhadas do closure de `setup()` em `World3D.tsx`, um refactor grande
  e arriscado; o ganho do import escopado de `@babylonjs/gui` foi maior e muito mais seguro pro
  esforço.

## Pendências / dívidas conhecidas
- Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório (as 2 investigadas-e-adiadas nunca estiveram no
  escopo planejado, ver "Fora de escopo" no `FEATURES.md`).

## O que o próximo laboratório deve desenvolver
- Se o usuário quiser continuar reduzindo bundle: os dois achados adiados (glTF 1.0 morto,
  acoplamento `Scene`/`XR`/`FrameGraph` do `@babylonjs/core`) são o próximo degrau, mas exigem mais
  investigação/risco do que este laboratório cobriu — merece um laboratório próprio dedicado só a
  isso, não uma continuação rápida.
- As outras 2 opções que o usuário NÃO escolheu desta vez continuam disponíveis pro próximo
  laboratório: relatório semanal por e-mail (Resend, Fase F do plano comercial) ou auditoria de
  acessibilidade WCAG AA.
- Itens de backlog em aberto continuam os mesmos de antes (todos esperando ação do usuário, sem
  mudança neste laboratório): deploy real em produção, corte de DNS, secrets do CI, bug de morros
  invisíveis.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 47 testes, sem mudança de contagem (mudança de bundling, não lógica
    de domínio).
  - `cd app && npm run build` — confirma o chunk `World3D-*.js` menor (ver tabela acima nos
    números do relatório do Vite).
  - Pra medir de novo no futuro: `npx vite-bundle-visualizer` (não precisa instalar nada,
    substitui `npm run build` e abre/gera um relatório com o treemap dos chunks).
  - **Verificado ao vivo**: legendas flutuantes dos números de escola (`AdvancedDynamicTexture`/
    `TextBlock`) renderizando normalmente, escolinha abrindo por proximidade, sem erro de console.
