# Contexto — Laboratório 138 — Recompensa de login diário + correção de mobília de assinante invisível

Preenchido em: 2026-09-02
Commit inicial → final: d7d607e81d156c3498b3d1eddd0e013a05a37d4f..HEAD

## O que foi feito

1. **Login diário** (`Progress.loginStreak` novo): `applyDailyLoginReward` (`progression.ts`)
   reaproveita o par `touchLastPlayed`/`loadLastPlayedAt` (lab-91) sem storage novo — `App.tsx`
   lê o `lastPlayedAt` da sessão ANTERIOR antes de `touchLastPlayed()` sobrescrever, e passa esse
   valor + agora pra `useProgress().claimDailyLogin`. Mesmo dia = nada (idempotente); dia seguinte
   = incrementa e premia; hiato de 2+ dias (ou primeira sessão de todas, `lastPlayedAt === null`)
   = reinicia em 1 e premia. Recompensa em ciclo de 7 dias (`[5, 8, 12, 15, 20, 25, 40]`, repete no
   dia 8), só moeda — nunca XP, mesmo padrão de baú/pote de Marte/combo (bônus sem responder
   pergunta não abre nível/conteúdo educacional). `DailyLoginToast.tsx` novo (mesmo padrão visual
   de `MarsRewardToast.tsx`) anuncia o dia da sequência e a moeda ganha.
2. **Achado e corrigido na mesma sessão**: bug real reportado pelo usuário testando
   `missaoaprendizado.com` — "na casa o catalog aparece a cama foguete marcada como habilitado
   mover sendo que nao tenho esse objeto colocado na casa". Ver `FEATURES.md` pra investigação
   completa; resumo: `World3D.tsx` decidia o que construir/mostrar na sala 3D olhando só
   `unlockedFurnitureIds`, que mobília `subscriptionOnly` (lab-107) nunca preenche — corrigido
   passando `entitlementActive` como prop nova de `App.tsx` pra `World3D`, aplicada em
   `refreshHouseFurnitureVisuals` com a MESMA regra que `MyHousePanel.tsx` já usava.

## Decisões técnicas tomadas

- **Login diário reaproveita o carimbo existente de `lastPlayedAt` em vez de um campo de data
  novo** — esse carimbo já é atualizado uma vez por sessão exatamente no ponto certo (`App.tsx`,
  mesmo `useEffect` que já chama `touchLastPlayed()`); guardar uma segunda data só pra isto
  duplicaria a mesma informação sem necessidade.
- **Comparação de "dia" em UTC** (`Math.floor(new Date(iso).getTime() / 86_400_000)`), não meia-
  noite local — simplificação conhecida e documentada no código (`utcDayNumber`, `progression.ts`):
  pro fuso do Brasil (UTC-3) a virada do dia acontece 21h no relógio local, não à meia-noite.
  Não afeta a CONTAGEM em si (os dois lados da comparação usam a mesma regra), só em que horário
  exato ela vira — aceitável pro que o recurso pede, documentado em vez de escondido.
- **Ciclo de 7 dias em vez de tabela crescendo sem fim** — `((streak - 1) % 7) + 1` mapeia
  qualquer sequência (por maior que fique) pra uma posição 1-7 numa tabela fixa; dia 8 volta a
  valer o mesmo que o dia 1. `Progress.loginStreak` continua crescendo sem limite (pra eventual
  exibição futura de "sua sequência: N dias"), só a RECOMPENSA que repete em ciclo.
- **Sem multiplicador de evento semanal/assinante na recompensa** — mesmo raciocínio já registrado
  pro baú de tesouro/pote de Marte (lab-131/128): é recompensa de "abrir o jogo", não de responder
  pergunta, então fica fora do sistema de bônus daquele fluxo.
- **Bug de mobília: corrigido nos DOIS pontos onde a regra `usable` existe** (`MyHousePanel.tsx`
  já estava certo; `World3D.tsx` estava desatualizado) em vez de mudar só um — a causa raiz era
  exatamente a MESMA regra existindo em dois lugares e só um deles ter sido atualizado quando o
  lab-107 introduziu mobília de assinante. `entitlementActive` também entrou na lista de
  dependência do `useEffect` que atualiza a visibilidade (`__refreshHouseFurniture`), não só
  `unlockedFurnitureIds` — sem isso, resgatar um código de assinatura DURANTE o jogo não revelaria
  a mobília sem sair/voltar de casa.

## Pendências / dívidas conhecidas

- **Toast de login diário não verificado ao vivo** — a mudança de dia de calendário é difícil de
  simular numa sessão só sem manipular relógio do sistema; confiança vem dos 6 testes unitários
  cobrindo os 4 casos (mesmo dia/dia seguinte/hiato/primeira sessão) + ciclo de 7 dias + XP
  intocado, não de um teste end-to-end real.
- **Bug real reportado pelo usuário na mesma sessão, NÃO investigado ainda**: avatar "bugado"
  (deformado) na lojinha ao equipar óculos — tentativa de reprodução direta em produção
  (`missaoaprendizado.com`, compra + equipagem real de "Óculos de Sol") não reproduziu o problema,
  sem erro de console. Precisa de mais informação do usuário (aparelho, óculos exato, se
  recarregar a página resolve) antes de investigar mais fundo — ver
  `labs/CURRENT.md` pra detalhes da tentativa.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas em `FEATURES.md` — todas concluídas. O bug de óculos é uma pendência NOVA,
reportada durante a sessão, não parte do escopo original deste lab.

## O que o próximo laboratório deve desenvolver

Pedidos do usuário na mesma sessão, ainda não implementados:
1. **Câmera dentro de casa**: precisa girar pra cima/baixo, dar zoom in/out e olhar de um lado pro
   outro segurando e arrastando o mouse (hoje, dentro do interior da casa, o controle de câmera é
   mais limitado que no planeta principal — investigar `enterHouseInterior`/câmera do interior em
   `World3D.tsx`).
2. **Comprar mais de uma unidade do mesmo móvel**: hoje cada item de `FURNITURE_CATALOG` só existe
   como 0 ou 1 na casa (`unlockedFurnitureIds` é uma lista de IDS ÚNICOS, `housePlacements` é um
   `Record<string, {...}>` por ID) — permitir múltiplas cópias do mesmo item precisa de uma
   mudança de modelo de dados (de "tenho o item X" pra "tenho N unidades do item X, cada uma com
   sua própria posição"), não é só destravar um botão.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 84/84 passando (6 testes novos de `applyDailyLoginReward`).
- `npm run build`: typecheck (`tsc -b`) + build de produção sem erros.
- **Verificado ao vivo** (produção real, `missaoaprendizado.com` + `app-two-flax-92.vercel.app`,
  ANTES desta correção): reprodução do bug de mobília confirmada por leitura de código (não por
  teste ao vivo COM assinatura real — sem uma conta assinante de teste disponível). Login diário
  não verificado ao vivo (ver Pendências).
- Deploy: pendente — este `CONTEXT.md` é escrito ANTES do commit/push/merge/deploy deste
  laboratório (fluxo pedido pelo usuário: "coloque em produção, depois siga corrigindo...").
