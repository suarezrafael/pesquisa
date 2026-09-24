# Contexto - Laboratorio 228 - Mapa de verbos e affordances

Preenchido em: 2026-09-23
Commit inicial -> entrega auditada: `2af9c78aae3033eeed61227c4860ccf87f783c25..a497db2945d70983e909388e71f42552450d312d`

## O que foi feito

- `VERB-MAP.md` inventaria 16 verbos com pistas, proximidade, controles,
  feedback, estado e referencias de codigo. O mapa separa evidencia observada,
  leitura estatica e hipotese para playtest.
- Edge mostrou o mundo e a lojinha em viewport padrao, 1138x633 e 390x844
  no build publicado `2026-09-23T17:44:47.497Z` (PR #117).
- A frase da `AvatarShop.tsx` que solicitava a crianca pedir ao responsavel
  informacoes da assinatura foi removida. Itens cosmeticos bloqueados ainda
  exigem a auditoria UX 189; nao foi alterado checkout ou entitlement.
- `docs/backlog-status.md` mapeia UX 187 para o Lab 228.
- Validacao: 289 testes, lint sem avisos novos, build e CI da PR #115 passaram.

## Decisoes tecnicas tomadas

- Nao redesenhar todos os interativos neste lab: o mapa localizou primeiro o
  problema transversal de dicas `Pressione E` no touchscreen, que deve ser
  corrigido em uma fatia propria do UX 188.
- Corrigir imediatamente a solicitacao comercial direta da lojinha, mas nao
  declarar a auditoria de monetizacao infantil completa sem revisar tags,
  estados bloqueados e o fluxo de vinculacao (UX 189).
- Manter o painel de medicao disponivel para o Redmi Pad 2; avaliar no proximo
  lab como recolhe-lo por padrao sem perder o diagnostico.

## Pendencias / dividas conhecidas

- Nao foi feito percurso com perfil novo nem planeta secundario. O Edge
  automatizado registrou 1-2 FPS e nao simula gesto touch fisico; essa amostra
  nao mede FPS do Redmi Pad 2 nem legibilidade em movimento.
- Faltam 5-8 duplas crianca/responsavel para testar compreensao sem instruir,
  pedidos de ajuda e ativacao em 10 minutos (backlogs 186/190).
- PR #116 de LOD por tamanho projetado continua separada, sem validacao no
  tablet; nao atribuir ganho de FPS ao LOD da coleta anterior.

## Funcionalidades planejadas que NAO foram concluidas

- Item 2 de `FEATURES.md`: primeira sessao, planeta secundario e teste touch.
  A parte de viewport desktop/mobile foi observada; o restante migra para o
  backlog UX 190 e matriz de playtest UX 186, nao para o codigo do Lab 229.

## O que o proximo laboratorio deve desenvolver

- Lab 229 / UX 188: padrao pequeno de dica de acao contextual para teclado e
  toque. Comecar por carro, foguete, casa e portais do hub, usando um unico
  vocabulario reconhecivel e preservando o mesmo handler de interacao.
- Registrar antes/depois em viewport desktop/mobile e verificar que o hint
  nao encobre o alvo nem aparece quando a acao esta indisponivel. Nao afirmar
  melhoria de descoberta antes de playtest infantil.

## Estado do repositorio ao final

- PR #115: auditoria e correcao pontual de texto, testada, pronta para merge
  como entrega parcial. `VERB-MAP.md` e a referencia para o proximo lab.
