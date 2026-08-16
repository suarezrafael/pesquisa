# Laboratório 05 — Avatar de estudante, escolas, rio corrigido e trilha musical

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: 7db602a1bfe3ee1bd9e78915a88bbabe1c58b392

## Objetivo do laboratório
Feedback do usuário depois de ver o lab-04 rodando: o rio ficou "sobressalente"/"bizarro" (era um
tubo redondo flutuando sobre o chão, não uma faixa de água embutida no terreno); os portais em
anel não fazem sentido temático — deveriam ser miniescolas com um professor na porta; o avatar
esfera deveria virar um estudante andando (corpo, perna, mochila, som de passo); e a trilha
sonora sintetizada deveria soar como "musiquinha de joguinho" (chiptune), não um pad ambiente.

## Funcionalidades planejadas
- [x] Corrigir o rio: trocado o tubo (`CreateTube`, redondo, flutuando acima do chão) por uma
      faixa/fita (`CreateRibbon` com margens calculadas via produto vetorial) rente à curvatura
      do planeta — sem protuberância visual
- [x] Avatar de estudante: personagem articulado (torso, cabeça, cabelo, 2 pernas, 2 braços,
      mochila nas costas) substituindo a esfera — física com colisor invisível (cápsula), visual
      reposicionado/reorientado por cima a cada quadro via `Matrix.FromXYZAxesToRef`
- [x] Animação de caminhada: pernas/braços balançam em ciclo (seno) sincronizado com a
      velocidade (`throttle`), voltam ao repouso (decaimento) quando parado
- [x] Som de passo sintetizado (`playFootstep`), disparado a cada cruzamento de zero do ciclo de
      caminhada, só enquanto o personagem anda de verdade
- [x] Trilha sonora trocada de pad ambiente pra uma melodia curta estilo chiptune (onda quadrada
      + baixo em triângulo, sequenciada via `setTimeout`), 100% sintetizada — vento mantido
      como estava (já aprovado pelo usuário)
- [x] Portais viraram miniescolas: prédio baixo-poli (paredes + telhado piramidal colorido pelo
      tipo/estado da missão + porta) com um professor (mesmo rig do estudante, parado, roupa
      diferente) na porta — número da missão continua flutuando acima
- [x] Testado de ponta a ponta no navegador: caminhada com animação visível, rio sem
      protuberância, escola alcançada e quiz abrindo/completando normalmente, sem erros de
      console

## Fora de escopo (explicitamente adiado)
- Deploy real — pendente do usuário criar conta (links já passados)
- Trilha sonora como asset de música real baixado — usuário pode pedir depois se a versão
  sintetizada não for boa o suficiente
- Suporte ao polo sul do planeta, texturas PBR completas (herdados)
