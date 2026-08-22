# Laboratório 70 — Legendas maiores no celular, teto de resolução mais conservador e painel estreito

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 5c02038eabdd5f2e49991150d8398ba315a48a73

## Objetivo do laboratório
Usuário, em três mensagens seguidas (a limpeza de cache do lab-69 resolveu a tela branca do Poco
C75, confirmando a hipótese registrada lá):
1. "o painel que mostra o avatar o nome e as moedas é muito largo, diminuir a largura, ocupa
   muita tela." — pedido de UI, painel do HUD estreito demais em tela de celular.
2. "o celular funcionou limpar o cache mas a qualidade é muito baixa... pro tablet agora está
   perfeito, fps bom e qualidade compatível, mas para o Poco C75 ficou muito baixa a qualidade,
   não compensa ter fps mas não dá pra ver as legendas dos personagens, fps em 20 mas mesmo assim
   sem condição visual de jogabilidade. Ou aumentar a escala das legendas também ajuda." — o
   Redmi Pad 2 está ótimo (confirma o lab-69), mas o Poco C75 ainda está ilegível mesmo no pior
   nível de resolução, e o próprio FPS nem melhora o bastante nesse pior nível pra justificar.
3. "informação: no C75 a escala é 1.80 e a do tablet é 1.15, que está perfeita a jogabilidade x
   qualidade." — número concreto direto do contador de FPS (lab-67/68), confirma que o tablet
   está no nível certo e o celular estava preso numa escala agressiva antes mesmo do lab-69
   reduzir o teto.

## Funcionalidades planejadas
- [x] Painel do HUD (avatar/nome/moedas) com largura máxima proporcional à tela (`min(420px,
      62vw)`), não mais um valor fixo que dominava telas de celular estreitas.
- [x] Inverter a direção do ajuste de fonte pra tela pequena — depois de DUAS tentativas de
      ENCOLHER a fonte pro celular (labs 67, 68) sem sucesso, o pedido direto do usuário foi
      "aumentar a escala das legendas": `mobileFontSize` agora AUMENTA (1.2×) em vez de reduzir.
- [x] Teto do pior nível do auto-ajuste de resolução reduzido de 2.2 pra 1.6 (lab-69 já tinha
      reduzido de 2.4 pra 2.2) — segundo o relato do usuário, o gargalo do Poco C75 não é
      resolução (FPS não passava de ~20 nem no pior nível), então descer mais a resolução só
      piora a legibilidade sem ganho de FPS que compense.
- [x] Build (typecheck + produção) passa; verificado ao vivo que desktop continua sem regressão,
      zero erros de console. (Tentativa de verificar visualmente a largura do painel numa janela
      estreita não funcionou — a ferramenta de redimensionar a janela do navegador não teve
      efeito no ambiente desta sessão; a correção em si é CSS `min()`/`vw` padrão, comportamento
      bem estabelecido entre navegadores, sem necessidade de verificação em runtime.)
- [x] Deploy em produção ao final — feito depois do wrap deste lab.

## Fora de escopo (explicitamente adiado)
- Investigar o gargalo real de CPU/física do Poco C75 (thin-instancing, octree de seleção) — já
  avaliado e adiado em labs anteriores (lab-66, lab-67) pelo mesmo motivo (risco de regressão sem
  conseguir testar num aparelho real). O ajuste desta rodada é só reduzir o teto de downscale (que
  já não ajudava o bastante nesse aparelho específico) e compensar legibilidade com fonte maior,
  não resolver a causa raiz do baixo FPS nesse aparelho.
