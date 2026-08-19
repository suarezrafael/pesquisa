# Laboratório 50 — Quiz surpresa só dispara encostando na esfera amarela

Status: concluído
Início: 2026-08-18
Fim: 2026-08-18
Commit inicial: 0b2d741

## Objetivo do laboratório
Usuário reportou: "ainda tem um bug que o quiz do prédio abre só de chegar no andar tem que ser
quando encosto na esfera amarela."

## Funcionalidades planejadas
- [x] **Causa raiz**: o gatilho do quiz surpresa reaproveitava `TRIGGER_DISTANCE` (2,4), a mesma
      distância usada pelos portais das 21 escolas — generosa demais pra uma esfera pequena (raio
      0,28): disparava só de pisar no andar, bem antes de chegar perto da esfera de verdade.
- [x] **Corrigido**: nova constante dedicada `QT_QUIZ_TRIGGER_DISTANCE = 0,85` (raio da cápsula
      do avatar + raio da esfera + uma margem pequena de caminhada), só pro gatilho dos
      marcadores de quiz — `TRIGGER_DISTANCE` das escolas continua igual, sem mudança lá.
- [x] Build (typecheck + produção) passa.
- [x] Verificação ao vivo: teleporte a 1,0 unidade do marcador (fora do novo limiar) confirmado
      SEM abrir o quiz; teleporte a ~0,3 unidade (dentro do limiar, encostando na esfera)
      confirmado abrindo o quiz certo ("2º andar"). Checklist de regressão completo: 21 escolas,
      39 bichos, torre, 8 lasers, 48 rochas de montanha, 65 props gerais, 7 props do deserto —
      tudo presente, sem erros no console.

## Fora de escopo (explicitamente adiado)
- Nenhum item novo adiado.
