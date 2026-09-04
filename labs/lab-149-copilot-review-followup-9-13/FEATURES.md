# Laboratório 149 — Corrige achados do review automático do Copilot nos PRs 9-13

Status: concluído
Início: 2026-09-04
Fim: 2026-09-04
Commit inicial: 7dcd9ccf6393ea275f5261b374d3c4ad20857f28

## Objetivo do laboratório

Continuação do lab-147: os PRs 9-13 (labs 138-142), mergeados NESTA MESMA SESSÃO antes da prática
de ler o review do Copilot ter sido estabelecida, também tinham review "🟡 Changes recommended"
nunca lido. Este laboratório fecha essa lacuna.

## Achados e correções

**PR #9 (lab-138, login diário)**:
- [x] Duas leituras de relógio independentes (`touchLastPlayed()` interno + `new Date()` em
  `App.tsx`) podiam cair em dias UTC diferentes bem na virada da meia-noite, permitindo reivindicar
  a recompensa duas vezes. `touchLastPlayed` agora aceita um `nowIso` opcional; `App.tsx` lê o
  relógio uma vez só e reaproveita pros dois lados.
- [x] `dayGap` negativo (relógio do aparelho ajustado pra trás) caía no mesmo caminho de "dia
  seguinte" — resetava a streak e CONCEDIA moeda, permitindo farm infinito. `dayGap <= 0` agora
  conta como "não concede" (mesmo teste de idempotência de `dayGap === 0`). Teste novo.

**PR #10 (lab-139, câmera livre em casa)**:
- [x] `onHouseCameraPointerMove` só checava `houseCameraDragging`, não `insideHouseInterior` — um
  arraste iniciado dentro de casa continuava alterando yaw/pitch se o jogador saísse de casa antes
  de soltar o botão. Adicionada a checagem, mais um reset defensivo de `houseCameraDragging` em
  `exitHouseInterior`.
- [x] Zoom via wheel durante posicionamento de mobília: **avaliado e mantido como está** — o
  comentário do cabeçalho deste bloco (lab-140) documenta explicitamente que giro/zoom da câmera
  FUNCIONAM de propósito durante o posicionamento (pedido real do usuário: "não consigo acompanhar
  pra onde estou movendo"), então isso não é um bug, é o comportamento pretendido — ver Decisões.

**PR #11 (lab-140, colisão de mobília)**:
- [x] `setFurniturePieceValidTint` forçava `emissiveColor = Color3.Black()` quando a posição
  ficava válida — apagava PRA SEMPRE o emissive original de peças que usam emissive por design
  (ex.: luminária). Corrigido guardando a cor original por material (`WeakMap`, na primeira vez que
  o material é tingido) e restaurando ela em vez de zerar.

**PR #12 (lab-141, cartão-postal)**: 4 achados cosméticos/acessibilidade, todos corrigidos —
`aria-label` do modal de conquistas atualizado pra mencionar os cartões-postais; 2 inline-codes/
palavras quebrados por quebra de linha em Markdown (`labs/CURRENT.md`,
`labs/lab-141-.../FEATURES.md`); uma palavra em inglês ("already") que escapou no meio de um texto
em português (`labs/lab-141-.../CONTEXT.md`).

**PR #13 (lab-142, backup/restauração)**:
- [x] `handleRestoreBackup` gravava o payload do backend DIRETO no `localStorage`, assumindo que
  era um `Profile`/`Progress` completo — como a validação do backend é só ESTRUTURAL (de
  propósito, ver lab-142), um backup de versão antiga do jogo (campo que não existia ainda quando
  foi feito) podia chegar incompleto e quebrar o jogo depois do reload. Agora mescla por cima do
  que já está no aparelho, não um objeto em branco.
- [x] `setState` depois de `await` em `PairingScreen.tsx` sem checar se o modal continua montado —
  fechar o modal (× ou Esc) enquanto `onRedeem`/`onFetchBackup` ainda estão em voo disparava
  warning/leak. `mountedRef` + `useEffect` de cleanup checado antes de cada `setState` pós-`await`.
- [ ] **Backup por família em vez de por perfil** (famílias com 2+ filhos sobrescrevem o backup um
  do outro) — achado real, mas exige mudança de schema (chave composta) + desenho de UX de
  restauração (qual perfil escolher). Documentado como limitação conhecida em
  `docs/plano-comercial-backend.md` e `labs/lab-142-.../CONTEXT.md`, não corrigido aqui — fora do
  escopo de "corrige achados de review", é decisão de produto nova.

## Fora de escopo
- Verificação visual ao vivo dos fixes de câmera/emissive (mesma limitação de ambiente de
  automação de navegador documentada nos labs 140-142/146 — 3D não carrega de forma confiável
  nesta sessão). Confiança alta pela leitura cuidadosa do código Babylon.js + testes/typecheck.
- O item de schema de backup multi-perfil (ver acima) — candidato a laboratório próprio.
