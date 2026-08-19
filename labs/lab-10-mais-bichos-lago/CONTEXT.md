# Contexto — Laboratório 10 — Segundo lago, gatos, cachorros e passeio com cachorro

Preenchido em: 2026-08-16
Commit inicial → final: acccd51 (fim do lab-09) .. HEAD (commit deste wrap)

## O que foi feito

1. **Segundo lago** (`LAKE2_CENTER_DIR`, `lake2`, `lake2Critters`): local escolhido por varredura
   de candidatos (script Node, mesma técnica usada no lab-09 pra realocar a piscina) — medindo
   distância angular contra os 4 platôs, a lagoa e a piscina, escolhendo o ponto mais isolado
   dentro da faixa caminhável. Antes de escrever qualquer código no arquivo de verdade, a
   segurança da bacia (rebaixo no terreno) foi verificada numericamente simulando a mesma
   fórmula de `terrainHeight` em Node — margem de 0,136 (chão sempre mais baixo que a água em
   toda a borda do lago), evitando repetir o bug do lab-09 antes mesmo de acontecer. 3 patos
   nadando em círculo, mesma técnica de `PondCritter` já existente (raio/velocidade/fase
   diferentes por pato).
2. **Gatos e cachorros vagando** (`buildGato`, `buildCachorro`, novos `CritterKind`): mesma IA de
   vagar já usada por coelho/esquilo — não precisou de nenhuma mudança na lógica de movimento,
   só os dois construtores novos (corpo mais fino + orelhas triangulares pro gato; corpo mais
   robusto + orelhas caídas + focinho pro cachorro) e entradas na lista de tipos sorteados.
3. **Pessoas passeando com cachorro** (`DogWalker`, `dogWalkers`): a pessoa reaproveita
   `buildStudentFigure` (igual ao jogador/professor) com o ciclo de caminhada de verdade
   (`legPivotL/R`, `armPivotL/R`, `kneePivotL/R`, mesmas constantes `WALK_CYCLE_SPEED`/
   `LEG_SWING_MAX`/`KNEE_BEND_MAX` já usadas pelo jogador) — não é um bicho pulando, anda como
   gente. O cachorro não tem IA própria: a cada quadro, mira um ponto calculado a partir da
   posição/direção da pessoa (`personPos - forward*0.45 - right*0.4`, "atrás e do lado"), com um
   pulinho leve pra não parecer deslizando — o efeito de "coleira" vem inteiramente dessa conta,
   sem nenhuma restrição de física.

## Testado (metodologia corrigida, lição do lab-09)

- `npx tsc -b` limpo.
- Servidor iniciado, página carregada, **renders forçados via `window.__scene.render()`** (não
  só espera passiva) antes de qualquer verificação de posição — evita repetir o falso-alarme do
  lab-09 (bicho "parado" que na verdade só não tinha tido nenhum quadro real desde a carga).
- Contagem de objetos na cena confere com o esperado: 4 `gatoRoot`, 7 `cachorroRoot` (4 vagando +
  3 passeando), 4 `patoBody` (1 da lagoa original + 3 do lago novo).
- Orientação do novo lago verificada matematicamente (eixo Y local do cilindro de água bate
  exatamente com a direção radial do ponto — deitado, não em pé).
- Distância cachorro↔dono medida diretamente na cena: 0,602 unidades, batendo com o valor
  esperado (`√(0,45² + 0,4²) ≈ 0,602`) — confirma que a "coleira" está funcionando como
  desenhado, não por acaso.
- Console sem erros em recarga limpa.

## Decisões técnicas tomadas

- **Cachorro sem IA própria, só seguindo um offset da pessoa** — muito mais simples que dar ao
  cachorro sua própria IA de vagar coordenada com a da pessoa (que exigiria sincronizar dois
  alvos independentes pra não se afastarem demais); como está, o "efeito coleira" nunca falha
  por construção, é geometria pura a cada quadro.
- **Local do segundo lago escolhido por varredura verificada antes de codar**, não por tentativa
  visual — decisão direta em resposta ao que deu errado no lab-09 (a piscina original quebrando
  perto de um platô só foi descoberta depois de já estar em produção).

## Pendências / dívidas conhecidas

Nenhuma nova. Seguem as mesmas do lab-09 (ver `labs/lab-09-vida-selvagem-pulo/CONTEXT.md`):
ruas+carros, loja navegável, clima dinâmico, parkour, trilha do Michael Jackson (recusada).

## O que o próximo laboratório deve desenvolver

Mesma lista do lab-09, sem mudança — nenhum pedido novo específico chegou além do que foi
implementado aqui. Antes de abrir o próximo laboratório, confirmar com o usuário a prioridade
entre: ruas+carros, loja navegável, clima dinâmico (chuva/trovão/raio), parkour.

## Estado do repositório ao final

- Branch: `main`
- Como rodar: `cd app && npm install && npm run server` (num terminal) `&& npm run dev` (em
  outro).
