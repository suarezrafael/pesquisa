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

- **`TitleScreen.tsx`** (primeira tela, sem gate nenhum) — os 4 "sinais de confiança" incluem a
  frase "Assinatura só para itens visuais" (divulgação NÃO-transacional — informa que assinatura
  existe e não afeta o jogo, sem preço/CTA/urgência nenhum ao lado). Nenhuma menção a preço/
  checkout, só esse aviso informativo + um link calmo "Área dos responsáveis" separado do CTA
  principal "Jogar". **Conforme com o critério do backlog** (que proíbe checkout/preço/urgência
  visível à criança, não a palavra "assinatura" em si) **, sem achado.**
- **`AvatarShop.tsx`** (lojinha, acessível jogando) — itens `subscriptionOnly` mostram só a tag
  "🔒 Assinantes" com o texto "peça pra quem cuida de você conferir a área dos responsáveis"; nenhum
  preço em R$, nenhum CTA de assinatura visível pra criança. A loja TEM botões de compra — mas só
  com a moeda do próprio jogo (🪙, ganha jogando), nunca dinheiro real; isso é a economia interna já
  auditada/aceita desde antes deste lab (nenhuma transação real de dinheiro passa por aqui). O
  achado do backlog ("criança não vê checkout") é sobre dinheiro real, não sobre a moeda do jogo.
  **Conforme, sem achado.**
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
- **`PairingScreen.tsx`** (criança digita o código gerado pelo responsável) — **2 achados reais**:
  (1) os dois links "Abrir área dos responsáveis" (`target="_blank"`) usavam só `rel="noreferrer"`,
  sem `noopener` explícito — em navegadores modernos/compatíveis `noreferrer` já implica o mesmo
  comportamento de bloquear `window.opener` (não é uma vulnerabilidade explorável hoje em
  navegador atualizado), mas `noopener` explícito é a convenção já adotada em TODAS as outras
  ocorrências do repo (lab-161/166) — essas duas ficaram inconsistentes com o resto do código por
  terem sido adicionadas antes daquela varredura. Corrigido por consistência/clareza de intenção,
  alinhando com a convenção do projeto, não por um buraco de segurança ativo. (2) Achado do review
  automático do Copilot: os mesmos dois links abrem nova aba mas o nome acessível só diz "Abrir
  área dos responsáveis", sem indicar a mudança de contexto pra quem usa leitor de tela/teclado —
  corrigido com `aria-label="Abrir área dos responsáveis (abre em nova aba)"` nos dois. Esse mesmo
  padrão de `target="_blank"` sem indicação de nova aba existia também em `TitleScreen.tsx` (1
  link) e `FamilyPortal.tsx` (4 links, `/termos`/`/privacidade`) — como essas duas telas SÃO
  superfícies auditadas por este próprio lab (ver acima), a correção foi estendida a elas também
  (achado da 2ª rodada de review, ver seção de review abaixo): os 7 links `target="_blank"` do app
  todos têm `aria-label` de nova aba agora.
- **Ausência de linguagem de urgência**: grep por "tempo limitado"/"últimas vagas"/"promoção"/
  "desconto"/"urgência" etc. em todo `app/src` — nenhuma ocorrência. **Conforme.**
- **Zero entrada direta de checkout infantil**: `grep` por `POST /checkout` e `trackCheckoutStarted`
  no código inteiro do app — o ÚNICO site de chamada é `Dashboard.handleSubscribe`
  (`FamilyPortal.tsx`), inacessível sem passar pelo portão de matemática E fazer login/criar conta
  de responsável. **Confirmado por auditoria de código, não é uma suposição.**

Reconciliação das métricas esperadas pelo item 9 do backlog:

- `weekly_report_preview_viewed` — já existe desde o lab-173, confirmado disparando (efeito reage à
  transição de `showReportPreview`, mesmo padrão desde a correção do PR #47).
- `checkout_started_from_parent_area` — não é um evento de INSTRUMENTAÇÃO novo: `checkout_started`
  (lab-166) já satisfaz esse critério por construção, já que o único site de disparo já fica atrás
  da área dos pais (ver achado acima) — a linha bruta já chega em `product_events`. Achado do
  review automático: isso cobre só a captura, não a EXPOSIÇÃO — `checkout_started` ainda não
  aparece em `weeklyFunnel` (`GET /admin/metrics`), que só expõe campos explicitamente mapeados;
  um consumidor do dashboard não consegue ler essa métrica hoje. Nota adicionada em
  `docs/event-catalog.md` explicando as duas partes (equivalência de instrumentação + gap de
  exposição no dashboard, deixado como possível item de lab futuro se a visibilidade no admin
  virar prioridade real).
- `parent_value_comprehension_rate` — o próprio backlog descreve como "em teste, 8/10 explicam o
  que é grátis, pago, seguro e sem chat livre" (§6, "North Star e metricas" → "Metricas do
  responsavel") — é uma métrica de pesquisa
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
- **Corrigir a inconsistência de `noopener` e o `aria-label` de nova aba mesmo sendo pequenos e um
  pouco fora do tema central ("copy"/"preço"), porque tocam diretamente uma superfície em escopo**
  (o link "Abrir área dos responsáveis" É o CTA adulto que este lab audita) — deixar de fora seria
  uma auditoria incompleta da mesma superfície, mesmo o `noopener` não sendo uma vulnerabilidade
  ativa em navegador atualizado (ver achado acima).
- **Estender a correção de `aria-label` de "abre em nova aba" pra `TitleScreen.tsx` e
  `FamilyPortal.tsx` também** (achado do review automático, 2ª rodada) — inicialmente corrigido só
  em `PairingScreen.tsx` por parecer fora do diff que este lab já estava tocando, mas
  `TitleScreen`/`FamilyPortal` SÃO superfícies explicitamente auditadas por este próprio lab (ver
  lista acima); deixar o mesmo padrão sem correção nelas, enquanto corrigido em `PairingScreen`,
  criaria orientação inconsistente pra usuário de leitor de tela entre os pontos de entrada da área
  dos pais — revertida a decisão original, todos os 7 links `target="_blank"` do app (2 em
  `PairingScreen.tsx`, 1 em `TitleScreen.tsx`, 4 em `FamilyPortal.tsx`) agora têm `aria-label`
  anunciando a nova aba.
- **Não criar `checkout_started_from_parent_area` como evento novo.** Duplicar
  `checkout_started` com um nome mais descritivo criaria dois eventos medindo exatamente a mesma
  coisa (mesmo site de disparo, mesma condição de gate) — mesmo raciocínio já usado no
  `event-catalog.md` pra outras métricas do documento que já são cobertas por eventos existentes
  com nome diferente (ex. `house_visited` cobrindo "visitas por criança").

## Pendências / dívidas conhecidas

- **`checkout_started` não aparece em `weeklyFunnel`** (`GET /admin/metrics`) — a instrumentação
  já existe (lab-166), mas o dashboard não expõe essa métrica hoje. Exposição trivial se algum dia
  for prioridade (ver nota em `docs/event-catalog.md`).

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — todos os itens do `FEATURES.md` foram auditados; os ajustes concretos necessários
  (consistência de `rel="noopener noreferrer"` e `aria-label` de "abre em nova aba" em todos os 7
  links `target="_blank"` do app) foram corrigidos.

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
  - Ler os 7 links `target="_blank"` do app (`PairingScreen.tsx` x2, `TitleScreen.tsx` x1,
    `FamilyPortal.tsx` x4) e confirmar `rel="noopener noreferrer"` + `aria-label` de nova aba em
    todos.
  - Ler `docs/event-catalog.md` (nota nova na seção "Confiança do responsável" explicando a
    equivalência `checkout_started` ≡ `checkout_started_from_parent_area` e o gap de exposição no
    `weeklyFunnel`).

## Review automático do Copilot (PR #64)

- **Rodada 1** (2 reviews consecutivas do mesmo pedido, tratadas juntas): 4 achados reais, todos de
  precisão de documentação/acessibilidade, nenhum de lógica de domínio. (1) Os 2 links "Abrir área
  dos responsáveis" de `PairingScreen.tsx` abrem nova aba mas o nome acessível não avisava —
  corrigido com `aria-label` explícito nos dois. (2) O texto novo em `docs/event-catalog.md`/
  `CONTEXT.md` citava "§12" do backlog pra "Metricas do responsavel", mas essa lista mora em §6
  ("North Star e metricas") — §12 é só o prompt de execução que lista "Lab 183" na ordem sugerida;
  corrigido nos dois lugares. (3) A nota sobre `checkout_started` ≡ `checkout_started_from_parent_area`
  cobria só a captura bruta do evento, não a exposição — `weeklyFunnel` não inclui esse campo,
  então um consumidor de `GET /admin/metrics` não lê essa métrica hoje; corrigido qualificando a
  nota e registrando como pendência. (4) O texto do achado do `noopener` classificava o estado
  anterior como "vulnerabilidade real" de reverse tabnabbing, mas `rel="noreferrer"` sozinho já
  implica o mesmo bloqueio de `window.opener` em navegador moderno — reclassificado como correção
  de consistência com a convenção do resto do repo, não uma correção de furo de segurança ativo.
  Achados adicionais da 2ª review (mesma rodada): o texto do audit de `AvatarShop.tsx` dizia "nenhum
  botão de compra visível" mas a loja TEM botões de compra com moeda do jogo (nunca dinheiro real)
  — corrigido qualificando que o achado do backlog é sobre dinheiro real, não a economia interna; e
  o checklist de `TitleScreen` dizia "nenhuma menção a assinatura" quando a própria tela mostra o
  sinal de confiança "Assinatura só para itens visuais" — corrigido esclarecendo que é divulgação
  informativa, não transacional (sem preço/CTA/urgência ao lado), o que já satisfaz o critério real
  do backlog.
- **Rodada 2**: 2 achados reais, ambos de completude/consistência da própria documentação da
  auditoria. (1) O `Pendências` da rodada 1 registrava o `aria-label` de nova aba como corrigido só
  em `PairingScreen.tsx`, deixando `TitleScreen.tsx`/`FamilyPortal.tsx` de fora por decisão
  explícita de não expandir o diff — mas essas duas SÃO superfícies auditadas por este mesmo lab
  (ver lista de "O que foi feito"), então deixar o mesmo padrão sem correção nelas geraria
  orientação inconsistente pra usuário de leitor de tela entre pontos de entrada equivalentes da
  área dos pais. Revertida a decisão original: os 7 links `target="_blank"` do app (2 em
  `PairingScreen.tsx`, 1 em `TitleScreen.tsx`, 4 em `FamilyPortal.tsx` — 2 na `FamilyValueProp`, 2
  no consentimento de cadastro da `LoginScreen`) agora têm `aria-label` anunciando a nova aba. (2) A
  seção "Funcionalidades planejadas que NÃO foram concluídas" ainda dizia "o único ajuste concreto
  necessário (link sem `noopener`) foi corrigido", omitindo o `aria-label` do resumo — corrigido
  pra mencionar as duas correções.
- **Rodada 3**: 2 achados reais, ambos erros introduzidos pela própria pressa de documentar a
  rodada 2. (1) O parágrafo de `PairingScreen.tsx` em "O que foi feito" não tinha sido atualizado
  junto com a correção da rodada 2 — ainda dizia que o `aria-label` ficou como pendência pra
  `TitleScreen`/`FamilyPortal`, contradizendo o código real e as outras seções deste mesmo arquivo;
  corrigido pra refletir que a correção foi estendida. (2) Erro de aritmética: "2 em
  `PairingScreen.tsx` + 1 em `TitleScreen.tsx` + 4 em `FamilyPortal.tsx`" soma 7, não 6 como estava
  escrito em 4 lugares deste arquivo — corrigido em todos.
