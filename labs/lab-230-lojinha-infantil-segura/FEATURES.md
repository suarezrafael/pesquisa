# Laboratorio 230 - Lojinha infantil segura

Status: em andamento
Inicio: 2026-09-23
Fim: -
Commit inicial: 9dda215bea9132aa25dc384b3929f3f5ef5caad5

## Objetivo do laboratorio

Deixar a crianca explorar e escolher visuais sem convite para adquirir uma
assinatura. O responsavel continua encontrando preco e beneficios em `/familia`.
Origem: UX 189 em `docs/growth-retention-monetization-backlog.md` e achado P0
do `VERB-MAP.md` do Lab 228.

## Funcionalidades planejadas

- [x] Auditar textos, badges e estados de itens da lojinha e da casa; separar
  moeda conquistada, recompensa jogada e colecao da familia (UX 189; Lab 228).
- [x] Aplicar linguagem neutra para visual familiar indisponivel, sem coroa,
  cadeado de venda, preco real, urgencia ou link de compra na area infantil;
  manter o fluxo adulto em `/familia` (UX 189; `01-seguranca.md` secao 1).
- [x] Verificar que o vinculo por codigo nao pede a crianca para comprar ou
  solicitar compra; preservar o acesso adulto e o pareamento existente (UX
  189; `docs/plano-comercial-backend.md`).
- [x] Validar as telas em desktop/mobile, executar testes, lint e build e
  registrar limites de playtest com crianca/responsavel (UX 189;
  `02-design-profissional.md`).

## Metricas e guardrails

- Observar compreensao de itens visuais por 5-8 duplas crianca/responsavel,
  sem usar abertura da loja como meta de venda infantil.
- Nenhum conteudo educativo, progresso ou cooperacao passa a depender de
  assinatura. Nenhuma coleta nova de PII.

## Fora de escopo

- Alterar Stripe, preco, entitlement, catalogos ou a regra de desbloqueio.
- Mudar a PR #116 de LOD ou afirmar ganho de FPS com esta revisao de copia.
- Encerrar UX 189 sem verificacao com usuarios reais.

## Evidencia e pendencias

Ver `AUDIT.md` para a matriz antes/depois, verificacao no Edge e o risco de
cosmetico equipado quando o acesso familiar deixa de estar ativo. A PR deve
permanecer separada da PR #116 de LOD; o estudo com criancas e responsaveis
ainda nao foi feito.
