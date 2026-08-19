# Laboratório 42 — Rochas nas montanhas + regressão crítica corrigida

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 88977be3109dbca6998e242505b080d5174f75bf

## Objetivo do laboratório
Pedido do usuário, chegado no meio da investigação de climbability do lab-41: "as montanhas estão
invisíveis, se não corrigir pode apagar, elas devem ficar como as rochas ao lado dos cactos."

## Funcionalidades planejadas
- [x] Investigação de climbability das montanhas (pendência aberta desde antes deste pedido) —
      confirmado com um teste de movimento controlado por quadro (`scene.render()` chamado
      manualmente em loop, contornando a ambiguidade de timing de automação documentada no
      lab-40): a altura radial do jogador sobe suavemente (13,617 → 14,340+) conforme ele anda em
      direção ao centro de uma montanha — confirma que SUBIR já funciona via a colisão do próprio
      relevo do planeta.
- [x] Rochas de verdade em cada uma das 12 montanhas (4 por montanha, 48 no total) — mesmos
      modelos glTF já usados nas rochas do deserto (pedido explícito do usuário), bem maiores,
      posicionadas por raycast físico real (não só a fórmula) — garante presença visual sólida
      independente da sutileza da cor do relevo.
- [x] **Bug real crítico encontrado e corrigido**: a primeira versão das rochas reaproveitava
      `schoolGroundRadial` (já existente, comprovada em labs anteriores) — mas essa função
      depende de um `const schoolRaycastResult` declarado só MAIS ADIANTE no arquivo. Chamá-la
      antes dessa declaração rodar disparava `ReferenceError: Cannot access 'schoolRaycastResult'
      before initialization`, e a exceção não tratada interrompia o resto de `setup()` inteiro —
      escolas, torre, parkours, bichos, tudo que vem depois no código simplesmente nunca rodava.
      `npm run build` passou normalmente (é um erro de runtime, não de tipo) — só apareceu jogando
      de verdade. Corrigido com uma cópia local independente da mesma função/raycast.
- [x] Verificação: depois do fix, confirmado ao vivo que TUDO que tinha sumido voltou — 21
      escolas, 39 bichos, torre, 8 lasers do parkour — mais 48/48 colisores de rocha de montanha e
      confirmação visual (screenshot mostrando formações rochosas marrons bem distintas, coerente
      com "rochas ao lado dos cactos"). Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Nenhum — pedido coberto, e o bug encontrado no meio do caminho foi corrigido antes de fechar o
  laboratório (não fazia sentido documentar como "concluído" uma versão que quebrava o resto do
  jogo).
