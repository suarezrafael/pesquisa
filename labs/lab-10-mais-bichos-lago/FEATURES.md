# Laboratório 10 — Segundo lago com patos, gatos, cachorros e gente passeando com cachorro

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: acccd51

## Objetivo do laboratório

Sequência curta de pedidos logo depois do lab-09 fechar: "um espaco em branco no jogo bote um
lago nele com patos" e "bote gatos, cachorros pessoas passeando com cachorros". Como o lab-09
já tinha sido encerrado/commitado, isso virou um laboratório novo em vez de reabrir o anterior.

## Funcionalidades planejadas
- [x] Segundo lago, num canto vazio do mapa (longe de platôs, escolas, lagoa e piscina —
      escolhido por varredura de candidatos e verificado numericamente antes de aplicar, pra não
      repetir o bug de "chão furando a água" do lab-09), com 3 patos nadando em círculo
- [x] Gatos (4) e cachorros (4) vagando pelo planeta, mesma IA de vagar dos coelhos/esquilos
- [x] Pessoas passeando com cachorro (3 duplas): a pessoa anda de verdade (mesmo ciclo de
      caminhada do jogador — perna/braço/joelho), o cachorro segue um ponto fixo relativo a ela
      (atrás e do lado, como se estivesse na coleira), sem precisar de física de restrição
- [x] Testado com a metodologia corrigida no lab-09 (renders forçados via
      `window.__scene.render()`, não espera passiva) — posições/orientações conferidas
      diretamente na cena, distância pessoa↔cachorro confirmada batendo com o offset esperado

## Fora de escopo (herdado do lab-09, ainda não implementado)
- Ruas e carros andando
- Loja que dá pra entrar
- Clima dinâmico: chuva, trovões, raios
- Parkour
- Trilha do Michael Jackson — recusado (direito autoral de terceiro)
