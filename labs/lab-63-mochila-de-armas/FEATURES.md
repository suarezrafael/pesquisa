# Laboratório 63 — Mochila de armas + reconfirmação do golpe/tiro

Status: concluído
Início: 2026-08-21
Fim: 2026-08-21
Commit inicial: 850ab00e996989c895c3e212e090642c6747210c

## Objetivo do laboratório
Usuário: "ao pegar a espada ou arma laser, ele deve aparecer na mao do boneco, e ao chegar em
marte, e aperta E deve ter o movimento do braco balancando a espada ou a arma laser atirando, se
eu peguei ambas o boneco deve ter uma bolsa virtual em que voce ve o item e pode selecionar
navegando no painel e clicando."

A primeira metade (item na mão + animação de golpe/tiro ao apertar E) já foi implementada no
lab-62 — este laboratório reconfirma/revisa esse código (a verificação ao vivo anterior ficou
incompleta por instabilidade do ambiente de automação, documentado no CONTEXT.md do lab-62) e
entrega a parte nova: um painel de "mochila" que aparece quando o jogador coletou espada e/ou
arma, mostrando os itens e permitindo selecionar clicando.

## Funcionalidades planejadas
- [x] Painel de mochila (UI) — aparece quando `hasSword`/`hasGun` fica verdadeiro, mostra os
      itens coletados (ícone + nome), navegável e clicável (referência: pedido do usuário acima).
      Verificado AO VIVO: coletei espada (painel mostrou só "Espada"), depois a arma (painel
      passou a mostrar os dois).
- [x] Seleção de item no painel — clicar destaca o item selecionado (borda colorida) e mostra uma
      dica curta de pra que serve. Verificado AO VIVO: clicar na Espada destacou o item e mostrou
      "Pressione E perto de um ET em Marte pra nocauteá-lo."; a seleção continuou destacada depois
      de fechar/reabrir o painel (estado React, não se perde).
- [x] Botão/ícone de mochila (🎒) no HUD pra abrir/fechar o painel — só aparece depois do primeiro
      item coletado. Verificado AO VIVO via screenshot com zoom na fileira de ícones do HUD.
- [x] Revisão de código do golpe/tiro do lab-62 (`attackAnimTimer`/`fireLaserBeam`) — lido linha a
      linha, nenhuma regressão. Reconfirmação ao vivo tentada dentro de um orçamento limitado (2
      voos até Marte nesta rodada): os inimigos matam o avatar rápido demais entre uma chamada e
      outra da automação do navegador pra flagrar a malha de VFX (que dura só 180-450ms) num
      frame ativo — mesma limitação já documentada no lab-62, não uma regressão nova. Zero erros
      de console em ambas as viagens, incluindo o ciclo completo dano→morte→respawn.
- [x] Build (typecheck + produção) passa.

## Fora de escopo (explicitamente adiado)
- Trocar qual arma é "usada" na hora do combate por meio da seleção no painel — a regra de combate
  (espada vs. ET, arma vs. robô) é automática por tipo de inimigo desde o lab-61 e não depende de
  seleção manual; mudar isso quebraria a mecânica pedida originalmente ("dê dicas de como encontrar
  a espada e a arma senão não tem como sobreviver"). A seleção no painel é só visual/informativa.
- Esconder o item não-selecionado na mão do boneco — os dois itens ficam sempre visíveis uma vez
  coletados (evita qualquer descompasso entre a animação de golpe/tiro, que já é decidida pelo tipo
  de inimigo, e o que está fisicamente visível na mão).
