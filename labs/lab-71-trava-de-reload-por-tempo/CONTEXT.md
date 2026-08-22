# Contexto — Laboratório 71 — Trava de recarregamento do PWA baseada em tempo, não "1 por sessão"

Preenchido em: 2026-08-22
Commit inicial → final: aa06fe2d5a5493251d709fca936536b9437580cc..HEAD

## O que foi feito

`main.tsx`, `onNeedRefresh()` — a trava do lab-69 (`sessionStorage.getItem('sw-auto-reloaded')`,
um flag booleano que permitia no máximo 1 recarregamento automático PRA SEMPRE naquela sessão de
aba) virou uma trava por TEMPO: guarda o timestamp do último recarregamento automático
(`sw-last-auto-reload`) e só ignora `onNeedRefresh` se o último foi há MENOS de 15 segundos.

## Decisões técnicas tomadas

- **Diagnóstico do bug**: o usuário reportou "a escala 2.40... aumentar a qualidade gráfica pra
  essa escala não dá pra ler nada das legendas" (depois corrigido pra "1.80") — nenhum dos dois
  valores existe no código atual (`SCALING_TIERS` do lab-70: `[1.0, 1.15, 1.4, 1.6]`; "1.80" bate
  exatamente com a tabela ORIGINAL do lab-67, antes de qualquer correção). Isso só faz sentido se
  o Poco C75 estivesse rodando código de pelo menos dois laboratórios atrás. Juntando com o
  contexto do lab-69 (o usuário testou uma vez depois de limpar o cache, e a trava "1 por sessão"
  daquele lab permite exatamente 1 recarregamento automático), a explicação mais provável: aquele
  ÚNICO recarregamento já foi consumido nessa primeira visita, e todas as implantações
  SEGUINTES (lab-69 parte 2 com a tabela reduzida, lab-70 com a tabela ainda mais reduzida e fonte
  maior) nunca chegaram no aparelho — a aba continuou aberta (mesma sessão), e a trava bloqueava
  qualquer recarregamento novo detectado por `onNeedRefresh`.
- **Por que baseada em tempo e não simplesmente remover a trava** — o problema original que a
  trava do lab-69 resolvia (loop de recarregamento rápido travando a tela em branco pra sempre)
  continua sendo um risco real sem NENHUMA trava. Uma trava por tempo resolve os dois lados ao
  mesmo tempo: um loop de verdade precisaria de recarregamentos em MENOS de 15 segundos um do
  outro pra travar a tela (ainda bloqueado), enquanto implantações novas legítimas — que na
  prática nunca saem tão rápido uma da outra quanto 15 segundos — sempre conseguem ser
  detectadas e aplicadas na próxima vez que o usuário abrir o jogo.
- **15 segundos é uma escolha arbitrária, não medida** — folgada o bastante pra nunca atrapalhar
  o uso real (implantações levam minutos, não segundos, entre si) e ainda assim curta o bastante
  pra nunca fazer o usuário esperar muito por uma atualização genuína caso `onNeedRefresh` dispare
  de novo por engano logo após um recarregamento válido.

## Pendências / dívidas conhecidas

- **Não é possível confirmar que esta era mesmo a causa** sem acesso ao Poco C75 — é a explicação
  mais consistente com os fatos disponíveis (valor de escala impossível no código atual + timeline
  de quando a trava anterior foi introduzida), mas continua sendo uma hipótese, não uma causa
  comprovada.
- **Se o Poco C75 continuar preso em código antigo mesmo depois desta correção**, o próximo passo
  seria orientar o usuário a fechar e reabrir o navegador/PWA completamente (não só recarregar a
  mesma aba), já que algumas implementações de service worker só finalizam a troca de versão numa
  navegação nova de verdade, não só um `location.reload()` da mesma aba.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — a correção foi implementada, com build/typecheck limpos e o caminho padrão (desktop)
confirmado ao vivo sem regressão.

## O que o próximo laboratório deve desenvolver

1. Aguardar o próximo teste do usuário no Poco C75 — confirmar que a escala relatada agora bate
   com um valor real da tabela atual (`1.0`, `1.15`, `1.4` ou `1.6`), confirmando que o aparelho
   finalmente recebeu as correções dos labs 69/70.
2. Itens antigos ainda pendentes, sem mudança: confirmar se a recompensa em moeda do combate
   atualiza o HUD; decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PR #5 (labs 58-61) ainda aberto —
  este laboratório continua no mesmo PR até o usuário mesclar.
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes` (feito ao final deste laboratório).
