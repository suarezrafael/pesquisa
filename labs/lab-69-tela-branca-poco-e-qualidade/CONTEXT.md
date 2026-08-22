# Contexto — Laboratório 69 — Tela branca no Poco C75 e resolução presa baixa demais

Preenchido em: 2026-08-22
Commit inicial → final: 9bde42a030a13fdf7dc03145c177a6f486654308..HEAD

## O que foi feito

1. **Trava de recarregamento único do PWA** (`main.tsx`) — `onNeedRefresh()` agora verifica um
   flag em `sessionStorage` (`sw-auto-reloaded`) antes de chamar `location.reload()`; se já
   recarregou uma vez nesta sessão de aba, ignora chamadas seguintes em vez de recarregar de novo.
2. **Limiares de resolução retrabalhados** (`World3D.tsx`, dentro do bloco `isLowEndDevice` do
   auto-ajuste de FPS) — `SCALING_TIERS = [1.0, 1.15, 1.6, 2.2]` (do melhor pro pior), com
   `desiredTierIndex(avgFps)` decidindo o degrau ideal: `>=35` → 0 (resolução cheia, era só
   `>=45` antes), `<35` → 1, `<30` → 2, `<20` → 3. A partir do SEGUNDO ciclo de amostragem, o
   ajuste só anda UM degrau por vez em direção ao degrau desejado (não pula direto pro extremo); o
   PRIMEIRO ciclo (logo após carregar) ainda define o degrau diretamente, sem essa gradação.

## Decisões técnicas tomadas

- **Trava de sessão em vez de remover o recarregamento automático** — o recarregamento automático
  em si resolve um bug real e já confirmado (lab-65: "instalei e ainda tava a versão antiga");
  removê-lo desfaria essa correção. A trava (`sessionStorage`, não `localStorage` — reseta a cada
  nova aba/sessão, então uma versão realmente nova ainda consegue recarregar na PRÓXIMA vez que o
  usuário abrir o jogo) só limita a NO MÁXIMO 1 recarregamento automático por sessão de aba, que já
  é o suficiente pra pegar uma atualização — se `onNeedRefresh` disparar de novo depois disso
  (sintoma de algo errado, como um loop), o pior caso vira "não pegou a versão mais nova agora",
  nunca mais "não abre nunca".
- **Não foi possível confirmar que o loop de recarregamento era mesmo a causa da tela branca** —
  sem acesso ao Poco C75, não dá pra reproduzir o bug exato. É a hipótese mais provável dado o
  timing (o problema apareceu especificamente DEPOIS do lab-65 introduzir o recarregamento
  automático, e só nesse aparelho — o Redmi Pad 2 continuou abrindo normal), mas é uma correção
  defensiva pra essa hipótese, não uma correção comprovada. Documentado honestamente pro usuário
  que, se a tela branca persistir mesmo com a trava, o aparelho provavelmente já está preso num
  estado de cache/service-worker corrompido de ANTES desta correção, que só se resolve limpando
  manualmente os dados do site (ou desinstalando e reinstalando o PWA) — código novo não alcança
  retroativamente um estado que já quebrou antes dele existir.
- **Novo limiar de 35fps pra resolução cheia** — pedido direto e específico do usuário ("o fps
  estabilizou acima de 35 fps está bom"), usado como o novo piso pra "aparelho com folga
  suficiente" em vez do 45fps anterior (lab-59). Mesmo cuidado já documentado no lab-59: limiares
  fixos podem estar certos pra ESTE aparelho e errados pro próximo a reportar algo — se um
  aparelho diferente reclamar de lag EXATAMENTE na faixa 35-44fps depois desta mudança, não é um
  erro de implementação, é a mesma tensão já registrada entre nitidez (Poco C75) e FPS (Redmi Pad
  2) se manifestando nos limiares de novo.
- **Passo gradual (escada) em vez de pulo direto** — resolve dois problemas ao mesmo tempo sem
  precisar de lógica separada pra cada um: (1) uma amostra ruim isolada (ex.: um pico de carga
  passageiro) não derruba a resolução direto pro pior nível, já que precisa de vários ciclos
  ruins seguidos (~12s cada) pra chegar lá; (2) perto de um limiar, evita oscilar resolução cheia
  ⇄ reduzida a cada ciclo só porque o FPS medido flutua ligeiramente acima/abaixo do corte — só
  anda um degrau por vez, então a transição fica mais suave e menos perceptível visualmente.

## Pendências / dívidas conhecidas

- **Tela branca**: correção defensiva (trava de recarregamento), não uma causa raiz confirmada.
  Se persistir depois desta correção, orientar o usuário a limpar os dados do site/desinstalar e
  reinstalar o PWA no Poco C75 especificamente (ver decisão acima).
- **Limiares de resolução**: mudança bem-intencionada baseada no relato específico do usuário,
  mas nenhuma das duas mudanças (limiar de 35fps, passo gradual) foi medida de verdade num
  aparelho fraco nesta sessão — só revisão de código + verificação de que o caminho padrão
  (desktop, onde esse bloco nem roda) continua funcionando sem regressão.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as três correções (trava de recarregamento, novo limiar de resolução, passo gradual)
foram implementadas, com build/typecheck limpos e o caminho padrão confirmado ao vivo.

## O que o próximo laboratório deve desenvolver

1. Aguardar o próximo teste do usuário no Poco C75 — confirmar se a tela branca foi resolvida e
   se a qualidade gráfica melhorou com o FPS estável relatado (35+).
2. Se a tela branca persistir, orientar limpeza manual de dados do site/reinstalação do PWA nesse
   aparelho específico antes de investigar mais no código.
3. Itens antigos ainda pendentes, sem mudança: confirmar se a recompensa em moeda do combate
   atualiza o HUD; decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54); avaliar
   `createOrUpdateSelectionOctree()` (lab-67) se "lag ao mover a câmera" persistir.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PR #5 (labs 58-61) ainda aberto —
  este laboratório continua no mesmo PR até o usuário mesclar.
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes` (feito ao final deste laboratório).
