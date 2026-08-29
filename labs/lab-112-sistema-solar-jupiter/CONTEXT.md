# Contexto — Laboratório 112 — Sistema Solar: Júpiter

Preenchido em: 2026-08-29
Commit inicial → final: 1ec902598fba4c0c11cfa652889b1fa044e243ff..HEAD

## O que foi feito
Terceiro planeta novo da frente "Sistema Solar" (continuação dos labs 110-111) — primeiro gigante
gasoso, primeira vez usando textura procedural (`DynamicTexture`) pra um planeta inteiro.

- **`app/src/world3d/World3D.tsx`**:
  - `JUPITER_RADIUS = 20` (maior que o planeta principal=13 — é o maior planeta do sistema solar de
    verdade), `JUPITER_CENTER = (58, 0, -58)` (quarto ponto no espaço, diagonal), `JUPITER_LANDING_UP
    = (0, 1, 0)`.
  - Entrada `jupiter` em `DESTINATION_PLANETS` (nome "Júpiter", emoji 🟠).
  - `buildJupiterIfNeeded()` (novo):
    - Textura de faixas horizontais: `DynamicTexture` 8×512, desenhada com `fillRect` em listras
      de altura variável (14-54px) alternando entre 8 tons de laranja/bege/marrom, aplicada como
      `albedoTexture` — UV padrão de `CreateSphere` (V=latitude) já projeta isso como faixas ao
      redor da esfera inteira, sem UV customizado.
    - Grande Mancha Vermelha: disco raso avermelhado (`Color3(0.72, 0.32, 0.22)`) num ponto FIXO
      (`spotDir` constante, não sorteado), esticado num eixo (`scaling.x = 1.6`) pra virar oval.
    - 8 moedas escondidas (mesmo padrão dos outros planetas-destino).
    - Foguete de volta, mesmo padrão.
    - **Sem rocha/cratera nenhuma** — Júpiter não tem superfície sólida de verdade.
  - `buildPlanetIfNeeded` ganhou o `case 'jupiter'`.

## Decisões técnicas tomadas
- **Faixas via `DynamicTexture` procedural**, não arquivo de imagem — mantém o padrão do projeto
  (tudo primitivas/procedural pra planetas/decoração, nenhum asset de imagem externo pra isso).
  Técnica provada aqui, reaproveitável em Saturno/Urano/Netuno.
- **Grande Mancha Vermelha em posição FIXA**, não sorteada — é a característica mais
  reconhecível de Júpiter isoladamente; sortear a posição arriscaria ela nascer escondida atrás do
  foguete ou nunca aparecer perto de onde o jogador chega primeiro.
- **Raio bem maior que o planeta principal** — reforça a escala real (maior planeta do sistema
  solar) sem tentar ser literalmente proporcional (inviável pro jogo).
- **Sem segunda casca de atmosfera** (diferente de Vênus) — Júpiter não tem uma superfície sólida
  SEPARADA de uma atmosfera; a esfera com textura de faixas já É a "atmosfera" vista de fora, uma
  segunda casca só duplicaria o mesmo efeito sem ganho visual.

## Pendências / dívidas conhecidas
- **Achado de ferramenta, não do produto**: descoberto durante a verificação que
  `keysDown['e']` pode ficar travado em `true` por um par keydown/keyup incompleto de uma tentativa
  de automação anterior, fazendo `handleInteractPress` nunca disparar silenciosamente (sem erro,
  sem log) até um `keyup` explícito ser despachado. Registrado em
  `browser_automation_frame_throttle.md` (memória do projeto) — não afeta jogadores reais (eles
  sempre soltam a tecla fisicamente), só ambiente de automação de teclado sintético.
- **Viagem de volta de Júpiter não re-verificada ao vivo nesta sessão** — mesma decisão consciente
  do lab-111: é código genérico idêntico ao já comprovado 2x (Marte, Mercúrio) no lab-110.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver
- **Saturno** — reaproveita a MESMA técnica de faixas (`DynamicTexture`) de Júpiter, mas precisa
  também dos ANÉIS — viáveis com `MeshBuilder.CreateTorus` bem achatado no eixo Y (`scaling.y`
  pequeno), mesma técnica já usada no anel sonoro de combate de Marte, só numa escala bem maior e
  sem animação de pulso (estático, decorativo).
- **Urano/Netuno** depois — gigantes de gelo, azul-esverdeado/azul profundo. Urano tem eixo de
  rotação bem tombado na vida real (~98°) — possível toque visual reconhecível (orientar
  `JUPITER_LANDING_UP`-equivalente de um jeito visualmente "deitado" em vez do padrão "de pé"), a
  decidir na hora de construir.
- Bug de morros invisíveis (lab-95), secrets do lab-104 e corte de DNS do lab-109 continuam em
  aberto, esperando o usuário.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 44 testes, sem mudança de contagem.
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev`, `window.__debugTeleport(-0.3797213687147455, -0.913545457642601,
    0.14576137678401327)` (dev-only), "E" abre o seletor (agora com 4 opções, em duas linhas de
    grade: Marte/Mercúrio/Vênus/Júpiter).
