# Laboratório 58 — Foguete pro planetinha secundário + qualidade gráfica adaptativa

Status: concluído
Início: 2026-08-20
Fim: 2026-08-20
Commit inicial: 796245e6b34c6bbce5f98cf37e5937f8838cf3b4

## Objetivo do laboratório
Usuário: "a qualidade no celular ficou muito baixa pode trabalhar para melhorar. Agora também
que crie um foguete e uma estação de decolagem espacial, como se fosse um prédio, em que você
aperta a tecla E e consegue voar pra um outro planetinha. crie um segundo planetinha que só
aparece quando você embarca na nave, por enquanto o planetinha pode ter só árvores e rochas, não
precisa NPC, se você estiver no celular precisa de um pequeno botão transparente de função de
ação da tecla E. A área do avatar com o nome a barra de nível está muito grande em baixa
resolução, ela precisa diminuir quando a tela é pequena também."

## Funcionalidades planejadas
- [x] **Qualidade gráfica adaptativa por FPS medido** — em vez de continuar adivinhando um
      `hardwareScalingLevel` fixo às cegas (lab-53: 1.5, lab-56: 1.75, lab-57: 1.5 de novo),
      mede o FPS real ~6s depois do carregamento inicial e ajusta uma vez pro valor certo desse
      aparelho específico (pode inclusive voltar pra quase resolução cheia se o aparelho aguentar).
- [x] **HUD do avatar/nome/nível com `clamp()` fluido** — trocado o breakpoint fixo
      (`@media max-width:420px`, lab-57, que o usuário reportou continuar grande demais) por
      `clamp(mín, %vw, máx)` em todos os tamanhos — acompanha a largura real da tela de forma
      contínua, sem depender de acertar um número de corte específico.
- [x] **Foguete + estação de lançamento** no planeta principal — construído só com primitivas
      (mesmo padrão do resto do jogo), com plataforma "tipo prédio" (pilares + base) e o foguete
      em si (corpo, nariz cônico, janela, barbatanas). Posicionado numa direção com ~34° de folga
      de qualquer outro marco existente (mesma técnica de varredura já usada pro deserto/piscina).
- [x] **Planetinha secundário construído só quando o jogador embarca pela primeira vez** — "só
      aparece quando você embarca na nave" (pedido do usuário): não existe na cena até então.
      Bem mais simples que o principal, de propósito ("por enquanto... só árvores e rochas, não
      precisa NPC"): esfera lisa, sem relevo/bacias/biomas, árvores/rochas reaproveitando os
      mesmos modelos glTF já carregados, colisor físico esférico único.
- [x] **Viagem instantânea de ida e volta** apertando E perto do foguete certo (o do planeta
      onde o jogador está agora) — teleporte seguro (mesmo padrão físico já usado no jogo),
      generalizando o sistema de gravidade radial/altura do chão (que assumia implicitamente
      planeta único centrado na origem) pra funcionar em qualquer um dos dois planetas sem
      duplicar a lógica inteira.
- [x] **Botão de toque transparente pra ação da tecla E** — cobre tanto entrar/sair do carro
      (lab-25, até agora só teclado) quanto embarcar/desembarcar do foguete, mesma função por
      trás dos dois.
- [x] Build (typecheck + produção) passa.
- [x] Verificado ao vivo (dev server + teleporte de debug, já que a estação fica bem longe do
      ponto de partida): foguete renderiza corretamente, embarcar transporta pro planetinha
      secundário (esfera visível com árvores/rochas + foguete de volta), desembarcar volta pro
      planeta principal perto do ponto de partida, testado pelos três caminhos de entrada (chamada
      direta, botão de toque físico clicado, tecla E de verdade pelo teclado) — todos funcionando.
      Confirmado que visitar de novo não reconstrói/duplica o planetinha. Sem erro no console.

## Fora de escopo (explicitamente adiado)
- Múltiplos planetas simultâneos, ou mais de um planetinha secundário — só um, fixo, por enquanto
  (pedido do usuário: "por enquanto").
- Sincronizar a viagem com o multiplayer (outros jogadores não veem quando alguém embarca/some) —
  não quebra nada (o jogador só fica "invisível" pros outros enquanto no planetinha, volta a
  aparecer normalmente ao retornar), mas não foi tratado especialmente.
- Céu/luz diferentes no planetinha secundário — global, compartilhado com o principal; trocar
  exigiria salvar/restaurar esse estado inteiro ao ir e voltar. Cor do chão já é distinta o
  bastante pra sinalizar "lugar diferente" sem essa complexidade extra.
