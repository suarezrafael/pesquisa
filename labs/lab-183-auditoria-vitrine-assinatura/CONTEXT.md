# Contexto — Laboratório 183 — Auditoria da vitrine adulta de assinatura

Preenchido em: 2026-09-14
Commit inicial → final: 9bd2221bcf2fe5eebaf8692a6562b22034ba1acf..(commit deste lab, ver PR)

## O que foi feito

Este lab é uma AUDITORIA, não uma feature nova (`docs/growth-retention-monetization-backlog.md`,
"Lab 183", item 9 da ordem sugerida) — leitura cuidadosa de todo ponto de contato entre a criança e
qualquer menção a preço/assinatura/checkout, e de toda superfície voltada ao responsável, contra o
critério de aceite do backlog: "criança nunca vê checkout, preço ou urgência; adulto continua vendo
preço, benefícios, cancelamento e a regra de aprendizagem grátis".

Superfícies auditadas (leitura completa do código-fonte de cada uma):

- **`TitleScreen.tsx`** (primeira tela, sem gate nenhum) — só os 4 "sinais de confiança"
  (aprendizado sempre grátis, sem chat livre, assinatura só pra itens visuais, feito pro navegador)
  e um link calmo "Área dos responsáveis" separado visualmente do CTA principal "Jogar". Nenhuma
  menção a preço/checkout. **Conforme, sem achado.**
- **`AvatarShop.tsx`** (lojinha, acessível jogando) — itens `subscriptionOnly` mostram só a tag
  "🔒 Assinantes" com o texto "peça pra quem cuida de você conferir a área dos responsáveis";
  nenhum preço em R$, nenhum botão de compra visível pra criança. **Conforme, sem achado.**
- **`MyHousePanel.tsx`** (mobília exclusiva de assinante) — mesmo padrão exato da lojinha
  (`usable = subscriptionOnly ? entitlementActive : owned`, tag "🔒 Assinantes"). **Conforme, sem
  achado.**
- **`FamilyPortal.tsx`** — `ParentalGateScreen` (portão de matemática, antes de qualquer conteúdo
  adulto) não tem nenhuma menção a preço; `FamilyValueProp` (só depois do portão, pra quem ainda
  não tem sessão) mostra preço (R$ 4,99/mês), lista grátis-vs-pago, política de cancelamento
  ("cancele quando quiser, sem multa"), e o preview do relatório semanal (lab-173) — texto sobre o
  bônus do evento semanal (lab-182) confirmado atualizado e consistente com a implementação real
  (menciona "objetivo educativo/ambiental", "sem pressa e sem cobrança"); `Dashboard` (só depois de
  login) tem o botão real de assinar/cancelar/gerenciar cobrança. **Conforme, sem achado de copy.**
- **`PairingScreen.tsx`** (criança digita o código gerado pelo responsável) — **1 achado real**: os
  dois links "Abrir área dos responsáveis" (`target="_blank"`) usavam só `rel="noreferrer"`, sem
  `noopener` — mesma classe de vulnerabilidade (reverse tabnabbing: a aba nova pode redirecionar a
  aba original via `window.opener`) já corrigida no lab-166 em 4 outras ocorrências
  (`FamilyPortal.tsx`/`LoginScreen`), mas essas duas de `PairingScreen.tsx` ficaram de fora daquela
  varredura. Corrigido trocando pra `rel="noopener noreferrer"` nas duas ocorrências.
- **Ausência de linguagem de urgência**: grep por "tempo limitado"/"últimas vagas"/"promoção"/
  "desconto"/"urgência" etc. em todo `app/src` — nenhuma ocorrência. **Conforme.**
- **Zero entrada direta de checkout infantil**: `grep` por `POST /checkout` e `trackCheckoutStarted`
  no código inteiro do app — o ÚNICO site de chamada é `Dashboard.handleSubscribe`
  (`FamilyPortal.tsx`), inacessível sem passar pelo portão de matemática E fazer login/criar conta
  de responsável. **Confirmado por auditoria de código, não é uma suposição.**

Reconciliação das métricas esperadas pelo item 9 do backlog:

- `weekly_report_preview_viewed` — já existe desde o lab-173, confirmado disparando (efeito reage à
  transição de `showReportPreview`, mesmo padrão desde a correção do PR #47).
- `checkout_started_from_parent_area` — não é um evento novo: `checkout_started` (lab-166) já
  satisfaz esse critério por construção, já que o único site de disparo já fica atrás da área dos
  pais (ver achado acima). Nota adicionada em `docs/event-catalog.md` explicando essa equivalência,
  pra qualquer lab futuro que leia o backlog literalmente e ache que falta um evento.
- `parent_value_comprehension_rate` — o próprio backlog descreve como "em teste, 8/10 explicam o
  que é grátis, pago, seguro e sem chat livre" (§12 do documento) — é uma métrica de pesquisa
  qualitativa com usuário real, não algo que um evento de client mede; fora de escopo de
  laboratório de código, mesma exclusão já usada em labs anteriores (178, 185) pra itens de
  pesquisa pura.
- "Zero entrada direta de checkout infantil" — ver achado acima, confirmado por auditoria de
  código.

`npx tsc -b` limpo; testes: app 208/208 (inalterado — este lab não mexe em lógica de domínio, só
copy/atributo HTML); `npm run build` sem regressão de bundle.

## Decisões técnicas tomadas

- **Auditoria em vez de feature nova, seguindo o escopo literal do backlog.** O item 9 pede
  explicitamente "não é construir a página de novo; é provar que a copy e os pontos de entrada
  ainda separam criança e responsável" — resistir à tentação de redesenhar `AvatarShop`/
  `FamilyPortal` mesmo cabendo naturalmente no lab, já que o backlog marca isso como fora de
  escopo ("Fora de escopo: pedir compra no fluxo infantil, bloquear escola/quest, urgência
  artificial" — não menciona redesenho, e o objetivo do lab é confiança na separação já existente,
  não polimento visual).
- **Corrigir o achado de `noopener` mesmo sendo pequeno e um pouco fora do tema central
  ("copy"/"preço"), porque toca diretamente uma superfície em escopo** (o link "Abrir área dos
  responsáveis" É o CTA adulto que este lab audita) e é a mesma classe de bug de segurança
  (OWASP: reverse tabnabbing) já tratada como MUST em `docs/prompts/01-seguranca.md` e corrigida
  no lab-166 — deixar de fora seria uma auditoria incompleta da mesma superfície.
- **Não criar `checkout_started_from_parent_area` como evento novo.** Duplicar
  `checkout_started` com um nome mais descritivo criaria dois eventos medindo exatamente a mesma
  coisa (mesmo site de disparo, mesma condição de gate) — mesmo raciocínio já usado no
  `event-catalog.md` pra outras métricas do documento que já são cobertas por eventos existentes
  com nome diferente (ex. `house_visited` cobrindo "visitas por criança").

## Pendências / dívidas conhecidas

- Nenhuma nova. O achado de `noopener` foi corrigido nesta mesma sessão.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — todos os itens do `FEATURES.md` foram auditados; o único ajuste concreto necessário
  (link sem `noopener`) foi corrigido.

## O que o próximo laboratório deve desenvolver

Próximo item da ordem sugerida em `docs/growth-retention-monetization-backlog.md` (item 10): **Lab
184 - Qualidade visual dos planetas e mundo** — passe de art direction nos planetas existentes
(materiais, escala, iluminação, landmarks, silhuetas, props interativos, feedback audiovisual e
performance mobile), não um redesenho completo. Critérios de aceite do backlog: cada planeta tem
identidade visual reconhecível em 5 segundos; FPS segue a meta; screenshots desktop/mobile entram
no `CONTEXT.md`. Métricas citadas: `return_after_planet_visit`, tempo de exploração voluntária,
feedback de playtest.

## Estado do repositório ao final

- Branch: `lab-183-auditoria-vitrine-assinatura` (a mesclar em `main` via PR).
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (208/208, inalterado).
  - `cd app && npm run build` (build de produção limpo).
  - Ler `app/src/components/PairingScreen.tsx` (linhas do link "Abrir área dos responsáveis") e
    confirmar `rel="noopener noreferrer"` nas duas ocorrências.
  - Ler `docs/event-catalog.md` (nota nova na seção "Confiança do responsável" explicando a
    equivalência `checkout_started` ≡ `checkout_started_from_parent_area`).
