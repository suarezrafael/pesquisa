# Contexto — Laboratório 49 — Porta do Prédio dos Enigmas virada pro lado errado

Preenchido em: 2026-08-18

## O que foi feito

1. **Diagnóstico** — antes de mexer em qualquer código, verificado ao vivo se a porta realmente
   existia e estava fisicamente aberta: raycast horizontal passando pela posição x=0 (centro do
   vão da porta) na altura de caminhada não bateu em nada — a porta ESTAVA aberta. Isso descartou
   a hipótese de "porta bloqueada por parede" (o mesmo tipo de bug do lab-47) e apontou pra outra
   explicação.
2. **Causa raiz real**: medida a direção que a porta encara (`local -Z`, transformada pro mundo)
   contra a direção da rua mais próxima (`streetCenter`) — ângulo de 177,6°, ou seja, a porta
   ficava de COSTAS pra rua, praticamente o oposto exato. Um jogador chegando andando da rua (o
   caminho natural, já que o prédio foi posicionado "ao lado da estrada" no lab-46) bateria direto
   na parede de TRÁS do prédio (sólida em todo andar) e nunca veria a porta, que fica do lado
   oposto — completamente escondida da rota de chegada óbvia.
3. **Correção**: `quizTowerBase.rotationQuaternion` recebeu um giro extra de 180° ao redor do
   próprio eixo "up" (`Quaternion.RotationAxis(Vector3.Up(), Math.PI)`, multiplicado por cima do
   `alignmentQuaternion(QT_ANCHOR_UP)` já existente) — mesmo padrão de composição de rotação já
   usado em props com `spin` (ex. rochas de montanha). Reconfirmado ao vivo: ângulo porta↔rua caiu
   pra 2,35° (a porta agora encara quase exatamente a direção da rua).

## Decisões técnicas tomadas

- **Girar o prédio inteiro (180° ao redor do eixo up), não reconstruir a porta no lado oposto** —
  mais simples e sem risco de quebrar a geometria interna (escada em espiral, marcadores, etc.):
  como tudo é filho de `quizTowerBase`, girar o nó raiz gira o conjunto inteiro de forma
  consistente, sem precisar recalcular nada internamente.
- **Medir o ângulo real via `streetCenter` em vez de supor visualmente** — a mesma lição dos
  laboratórios anteriores (não confiar só na inspeção visual/suposição): o bug só ficou óbvio
  depois de medir o ângulo exato entre a normal da porta e a direção da rua, não só "olhando" pra
  posição do prédio.

## Pendências / dívidas conhecidas

- Nenhuma nova. Vale notar como lição geral pro projeto: `alignmentQuaternion` sozinho não
  garante que a fachada/porta de um prédio fique virada pro lado certo — sempre que um prédio
  novo for adicionado perto de uma rota de chegada óbvia (rua, trilha), vale medir esse ângulo
  explicitamente em vez de confiar em coincidência.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. Nenhum pedido novo pendente no momento em que este laboratório foi encerrado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu explicitamente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar. Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
