# Laboratório 71 — Trava de recarregamento do PWA baseada em tempo, não "1 por sessão"

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: aa06fe2d5a5493251d709fca936536b9437580cc

## Objetivo do laboratório
Usuário: "a escala 2.40 esta com a qualidade muito baixa como eu falei, abri no c75 aumentar a
qualidade grafica pra essa escala nao da pra ler nada das legendas, e os bonecos fica com
pixerizado." (corrigido logo depois: "desculpe a escala do c75 eh 1.80").

Nem 2.40 nem 1.80 existem no código atual (`SCALING_TIERS`, lab-70: `[1.0, 1.15, 1.4, 1.6]`) — o
Poco C75 está rodando código de PELO MENOS dois laboratórios atrás (1.80 bate exatamente com a
tabela original do lab-67, antes de qualquer correção). Causa provável: a trava de recarregamento
do lab-69 ("no máximo 1 recarregamento automático por sessão de aba") já tinha sido consumida
quando o usuário testou uma vez depois de limpar o cache — todas as implantações seguintes (labs
69 parte 2, 70) nunca chegaram no aparelho porque a aba continuou aberta e a trava bloqueava
qualquer recarregamento novo.

## Funcionalidades planejadas
- [x] Trocar a trava de recarregamento de "1 por sessão pra sempre" pra "baseada em tempo" — só
      ignora `onNeedRefresh` se o ÚLTIMO recarregamento automático foi há menos de 15 segundos.
      Continua protegendo contra o loop rápido que o lab-69 corrigiu (que precisaria de vários
      recarregamentos em segundos) sem impedir pegar cada implantação nova de verdade ao longo de
      uma sessão de teste mais longa.
- [x] Build (typecheck + produção) passa; verificado ao vivo que desktop continua sem regressão,
      zero erros de console.
- [x] Deploy em produção ao final — feito depois do wrap deste lab.

## Fora de escopo (explicitamente adiado)
- Nenhum item novo de escopo — laboratório curto e focado só em corrigir a trava de recarregamento
  que impedia o Poco C75 de receber as correções mais recentes.
