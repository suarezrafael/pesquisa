# Laboratório 56 — Otimização de FPS, rodada 3 (Redmi Pad 2)

Status: concluído
Início: 2026-08-19
Fim: 2026-08-19
Commit inicial: 8cd6f8ae8c21b638da9c367e69b5562e77df7ce9

## Objetivo do laboratório
Usuário: "o gráfico ainda é um pouco pesado para o tablet, o que é possível fazer para melhorar a
performance." — depois de duas rodadas anteriores (lab-53: config de engine/pipeline; lab-55:
contagem de objetos + freeze de matriz), ainda sobrava um pouco de peso. Identificados mais três
alavancas seguras (baixo risco, sem tocar em instancing/arquitetura) antes de considerar o
refactor maior de thin instancing.

## Funcionalidades planejadas
- [x] **`GlowLayer` pulado em dispositivo fraco** — passe extra de blur sobre material emissivo
      todo quadro (só usado pro brilho dos portais das escolas); custo real de post-processing
      que ainda não tinha sido cortado.
- [x] **`hardwareScalingLevel` 1.5 → 1.75** em dispositivo fraco — mais resolução interna cortada
      (a alavanca mais direta pra GPU limitada por fill-rate).
- [x] **Densidade de grama reduzida pela metade** (2600 → 1300) em dispositivo fraco — já é 1 draw
      call só (thin instances, lab anterior), mas cada instância ainda é vértice/fragmento de
      verdade pra GPU processar.
- [x] Build (typecheck + produção) passa.
- [x] Verificado ao vivo: build de produção, caminho desktop (alta qualidade) carrega sem erro no
      console, visualmente idêntico ao anterior (glow/grama cheia continuam ativos em
      `isLowEndDevice === false`, confirmando que as mudanças só afetam o caminho de dispositivo
      fraco).

## Fora de escopo (explicitamente adiado)
- Thin instancing de verdade (props/pedras/bichos) — continua sendo o maior alavanca de
  performance restante, documentado desde o lab-53. Se esta rodada ainda não for suficiente no
  Redmi Pad 2 real, é o próximo passo, mas exige um refactor mais profundo (buffer de thin
  instance por malha-filha/material, não por objeto inteiro) e idealmente testar no aparelho
  físico antes de confiar no resultado.
