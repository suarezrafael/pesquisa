# Laboratório 49 — Porta do Prédio dos Enigmas virada pro lado errado

Status: concluído
Início: 2026-08-18
Fim: 2026-08-18
Commit inicial: e11a37e

## Objetivo do laboratório
Usuário reportou: "eu não consigo entrar no prédio não tem porta". A porta existia e estava
fisicamente aberta (confirmado com raycast antes de investigar mais), mas virada pro lado errado.

## Funcionalidades planejadas
- [x] **Causa raiz encontrada**: `alignmentQuaternion(QT_ANCHOR_UP)` alinha o prédio ao "up"
      local do planeta, mas não controla pra qual lado a fachada (porta) fica virada — isso
      sempre dependeu de sorte/coincidência nos outros prédios. Medido ao vivo: o ângulo entre a
      direção que a porta encara e a direção da rua mais próxima era 177,6° — ou seja, a porta
      ficava de COSTAS pra rua. Um jogador chegando andando da rua (o jeito natural de se
      aproximar do prédio) esbarrava direto na parede de trás, sólida, sem nunca ver a porta do
      outro lado — daí "não tem porta".
- [x] **Corrigido**: giro extra de 180° ao redor do próprio eixo "up" do prédio (mesmo padrão de
      `spin` já usado em props/rochas), aplicado por cima do `alignmentQuaternion` já existente.
      Reconfirmado ao vivo: ângulo porta↔rua caiu de 177,6° pra 2,35° (a porta agora encara quase
      exatamente a rua).
- [x] Build (typecheck + produção) passa.
- [x] Verificação ao vivo: raycast horizontal pela porta confirmando passagem livre (sem
      colisão) antes E depois do giro; screenshot parado na rua olhando pro prédio confirmando o
      lado com a escada visível (paredes transparentes) de frente pro caminho natural de
      aproximação. Checklist de regressão completo: 21 escolas, 39 bichos, torre, 8 lasers, 48
      rochas de montanha, 65 props gerais, 7 props do deserto — tudo presente, sem erros no
      console.

## Fora de escopo (explicitamente adiado)
- Nenhum item novo adiado.
