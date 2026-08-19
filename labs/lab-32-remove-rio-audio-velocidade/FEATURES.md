# Laboratório 32 — Remove rio, ajusta mixagem de áudio, acelera o andar

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 78c2cee8b0f6a3ff5e7e0af1d5ea9de9b3f24bef

## Objetivo do laboratório
Três pedidos novos do usuário, chegados na mesma rodada de feedback:

1. "eu também vi que o rio existe mas ele está dentro do planeta, dentro da esfera, e não na
   superfície. se não conseguir fazer funcionar nessa rodada pode apagar" — depois de quatro
   laboratórios (28, 29, 30, 31) tentando corrigir a água enterrada/invisível, o usuário ainda via
   o problema jogando ao vivo, mesmo com o fix do lab-31 (raycast filtrado + folga 0,15) já
   comprovado por raycast físico contra a malha real. Em vez de insistir numa quinta rodada,
   remover o rio (com permissão explícita do usuário).
2. "tire a musiquinha, deixe só o barulho dos animais e do vento. a versão mais calma da música
   até pode deixar mas baixinho" — trilha de fundo (rádio sintetizado com 4 faixas) tocando alto
   demais / faixas agitadas demais.
3. "o andar do boneco é meio lento acelere ele um pouco" — velocidade de caminhada.

## Funcionalidades planejadas
- [x] Rio removido por completo: bacia (`terrainHeight`), cor de margem (blend de vértice), malha
      de água (ribbon + material), pato do rio e sua atualização por quadro. Lagoa e piscina
      (bacias separadas, não afetadas) continuam com bacia, margem e água normalmente — cada uma
      ganhou seu próprio material de água independente (a lagoa reaproveitava o material do rio).
- [x] Trilha de fundo: só as duas faixas mais calmas (`Tarde Tranquila`, `Noite Estrelada` — onda
      triangular/senoidal, andamento mais lento) continuam no "rádio"; as duas mais agitadas
      (`Manhã no Planeta`, `Hora da Aventura` — onda quadrada, andamento rápido) saíram. Volume da
      música (`MUSIC_VOLUME`) caiu de 0,05 pra 0,016 — bem mais baixo que vento (0,05)/chuva
      (0,07), claramente em segundo plano. Som de vento e de bicho (pássaro) não foram tocados.
- [x] Velocidade de caminhada (`MAX_SPEED`) subiu de 6 pra 7,5 (+25%); `WALK_CYCLE_SPEED` subiu na
      mesma proporção (7 → 8,75) pra pernas/braços continuarem batendo no ritmo certo do passo.
- [x] Verificação: `npm run build` passa (typecheck + build de produção); nenhuma referência a
      rio/água-do-rio sobrando no código (`grep` limpo). Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Os outros pedidos da mesma rodada de feedback (montanhas maiores + casinhas em cima delas com
  colisão; novo desafio de parkour mais alto com mais moedas; sons engraçados de bicho/conversa;
  prédios navegáveis com escada, moedas e desafios) ficam pra próximo(s) laboratório(s) — grande
  demais pra caber junto com estas três correções pontuais num `CONTEXT.md` legível.
